import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import html2canvas from "html2canvas";
import CustomPopup, { PopupType } from "../components/CustomPopup";
import * as faceapi from 'face-api.js';
import API_BASE_URL from "../config";
import logo from "../assets/logo.png";

// ─── Types ────────────────────────────────────────────────────────────────
interface Option {
    text: string;
    is_correct: boolean;
    image?: string;
    originalIndex?: number;
}

interface Question {
    text: string;
    options: Option[];
    image?: string;
    image_required?: boolean;
    marks?: number;
    category?: string;
    originalIndex?: number;
}

interface Exam {
    id: string;
    title: string;
    questions: Question[];
    duration?: number;
    proctoring_enabled?: boolean;
    proctoring_type?: string;
}

interface TestData {
    candidate_name: string;
    exam: Exam;
}

// ─── Utils ────────────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Seeded Shuffle ───────────────────────────────────────────────────────
function shuffleArrayWithSeed<T>(array: T[], seed: string): T[] {
    const arr = [...array];
    // Simple hash for the seed string
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
        h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
    }

    // Mulberry32 seeded PRNG
    const rand = () => {
        h = h + 0x6D2B79F5 | 0;
        let t = Math.imul(h ^ h >>> 15, h | 1);
        t = t + Math.imul(t ^ t >>> 7, t | 61) | 0;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };

    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ─── Styles ───────────────────────────────────────────────────────────────
const STYLES = `
.test-wrap {
  min-height: 100vh;
  background: var(--bg-neutral);
  padding: 40px;
  font-family: var(--font-body);
  color: var(--text);
  line-height: 1.6;
}

.test-container {
  max-width: 1200px;
  margin: 0 auto;
}

.main-layout {
  display: flex;
  gap: 32px;
  align-items: flex-start;
}
.main-content {
  flex: 1;
  min-width: 0;
}
.q-palette {
  width: 300px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 40px;
}
.q-palette-title {
  font-family: var(--font-heading);
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.q-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(42px, 1fr));
  gap: 12px;
}
.q-btn {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--bg-neutral);
  color: var(--text-muted);
  transition: all 0.2s;
}
.q-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}
.q-btn.current {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary);
}
.q-btn.answered {
  background: var(--q-answered-bg);
  border-color: var(--q-answered-border);
  color: var(--q-answered-text);
}
.q-btn.visited-unanswered {
  background: var(--q-visited-bg);
  border-color: var(--q-visited-border);
  color: var(--q-visited-text);
}
.q-legend {
  margin-top: 24px;
  border-top: 1px solid var(--border);
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.q-legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 500;
}
.q-legend-box {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid var(--border);
}

.test-header {
  margin-bottom: 40px;
  background: var(--bg);
  padding: 32px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.test-badge {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
  padding: 6px 14px;
  border-radius: 100px;
  display: inline-block;
  border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent);
}

.test-title {
  font-family: var(--font-heading);
  font-size: 28px;
  font-weight: 800;
  margin: 8px 0 0;
  color: var(--text);
}

.test-q-card {
  background: var(--bg);
  border: 1px solid var(--border);
  padding: 40px;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  animation: fadeIn 0.4s ease-out both;
  margin-bottom: 32px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.test-q-num {
  font-size: 14px;
  color: var(--primary);
  font-weight: 700;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.test-q-text {
  font-family: var(--font-heading);
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 32px;
  color: var(--text);
  line-height: 1.4;
}

.test-opts {
  display: grid;
  gap: 16px;
}

.test-opt {
  padding: 20px 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 16px;
  font-weight: 500;
  background: var(--bg);
}

.test-opt:hover {
  background: var(--bg-neutral);
  border-color: var(--primary);
  transform: translateX(4px);
}

.test-opt.selected {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}

.test-opt-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  transition: all 0.2s;
}

.test-opt.selected .test-opt-circle {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.test-nav {
  display: flex;
  justify-content: space-between;
  margin-top: 40px;
  gap: 20px;
}

.test-btn {
  padding: 14px 40px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.test-btn:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(28, 132, 143, 0.2);
}

.test-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.test-btn.secondary {
  background: white;
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.test-btn.secondary:hover {
  background: var(--bg-neutral);
  color: var(--text);
  border-color: var(--text-muted);
}

.test-btn.finish {
  background: var(--secondary);
}

.test-btn.finish:hover {
  background: var(--secondary-hover);
  box-shadow: 0 4px 12px rgba(147, 199, 61, 0.2);
}

.test-timer {
  position: sticky;
  top: 20px;
  background: var(--text);
  color: white;
  padding: 12px 24px;
  border-radius: 100px;
  font-weight: 700;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  margin-bottom: 24px;
  width: fit-content;
  margin-left: auto;
}

.test-timer.urgent {
  background: var(--primary);
  animation: pulse 1s infinite;
}

@keyframes pulse {
    0% { transform: scale(1); box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary) 40%, transparent); }
    70% { transform: scale(1.05); box-shadow: 0 0 0 10px transparent; }
    100% { transform: scale(1); box-shadow: 0 0 0 0 transparent; }
}

.welcome-card {
  background: var(--bg);
  padding: 60px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  max-width: 600px;
  margin: 60px auto;
  text-align: center;
}

.info-pill {
    background: var(--bg-neutral);
    padding: 16px 24px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
}

.info-val {
    font-family: var(--font-heading);
    font-size: 20px;
    font-weight: 800;
    color: var(--primary);
}

/* ── Declaration / Rules Section ───────────────────────────────────── */
.decl-box {
  background: var(--bg-neutral);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 24px 28px;
  margin: 28px 0;
  text-align: left;
}

.decl-rules {
  list-style: disc;
  padding: 0 0 0 20px;
  margin: 0 0 20px;
  display: grid;
  gap: 10px;
}

.decl-rules li {
  font-size: 13.5px;
  color: var(--text);
  line-height: 1.6;
  padding-left: 4px;
}

.decl-rules li::marker {
  color: var(--primary);
  font-size: 16px;
}

.decl-checks {
  display: grid;
  gap: 12px;
  margin: 20px 0 24px;
  border-top: 1px solid var(--border);
  padding-top: 20px;
}

.decl-check-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  padding: 4px 0;
}

.decl-check-row input[type="checkbox"] {
  width: 17px;
  height: 17px;
  accent-color: var(--primary);
  cursor: pointer;
  flex-shrink: 0;
  margin-top: 3px;
}

.decl-check-row span {
  font-size: 13.5px;
  color: var(--text);
  line-height: 1.6;
  font-weight: 500;
  text-align: left;
}

.decl-agree-btn {
  width: 100%;
  padding: 14px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 12px;
}

.decl-agree-btn:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(28,132,143,0.25);
}

.decl-agree-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.decl-agreed-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--q-answered-bg);
  border: 1px solid var(--q-answered-border);
  color: var(--q-answered-text);
  border-radius: var(--radius-sm);
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
}

/* ── Security Warning Popup ─────────────────────────────────────────── */
.sec-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(6px);
  animation: overlayIn 0.2s ease-out;
}

@keyframes overlayIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.sec-modal {
  background: #ffffff;
  width: 90%;
  max-width: 420px;
  border-radius: 16px;
  padding: 32px 24px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.2);
  animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  text-align: center;
  border: 1px solid var(--border, #e2e8f0);
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.9) translateY(10px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.sec-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 10%, #fff), color-mix(in srgb, var(--primary) 20%, #fff));
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  font-size: 32px;
  border: 2px solid var(--primary);
}

.sec-label {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--primary);
  margin-bottom: 12px;
  background: color-mix(in srgb, var(--primary) 8%, #fff);
  display: inline-block;
  padding: 4px 14px;
  border-radius: 100px;
}

.sec-heading {
  margin: 0 0 16px;
  font-size: 20px;
  color: var(--text, #1e293b);
  font-weight: 800;
  font-family: var(--font-heading, sans-serif);
}

.sec-body {
  font-size: 15px;
  color: var(--text-muted, #64748b);
  margin-bottom: 24px;
  line-height: 1.6;
}

.sec-violation-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: var(--bg-neutral);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 20px;
  margin: 0 0 28px;
}

.sec-vio-dot {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: #fff;
  transition: all 0.3s;
}

.sec-vio-dot.active {
  background: var(--primary);
  border-color: var(--primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 20%, transparent);
}

.sec-dismiss-btn {
  width: 100%;
  padding: 12px 24px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-family: var(--font-body);
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(28, 132, 143, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.sec-dismiss-btn:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(28, 132, 143, 0.35);
}

.sec-dismiss-btn:active {
  transform: translateY(0);
}

.sec-terminate-btn {
  background: var(--text);
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}

.sec-note {
  margin-top: 16px;
  font-size: 12px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

/* ── Gaze / Eye-tracking status ───────────────────────────────────── */
.gaze-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  margin-top: 10px;
  transition: all 0.4s ease;
}
.gaze-badge.ok {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #86efac;
}
.gaze-badge.warning {
  background: #fefce8;
  color: #854d0e;
  border: 1px solid #fde047;
}
.gaze-badge.away {
  background: color-mix(in srgb, var(--primary) 10%, var(--bg));
  color: var(--primary);
  border: 1px solid color-mix(in srgb, var(--primary) 30%, var(--bg));
  animation: gazeAlert 0.5s ease infinite alternate;
}
.gaze-badge.noface {
  background: #fdf2f8;
  color: #701a75;
  border: 1px solid #e879f9;
  animation: gazeAlert 0.5s ease infinite alternate;
}
@keyframes gazeAlert {
  from { opacity: 1; }
  to   { opacity: 0.6; }
}
.gaze-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}
`;


// ─── SecurityPopup Component ──────────────────────────────────────────────
interface SecurityPopupProps {
    message: string;
    violations: number;
    maxViolations: number;
    isTerminal: boolean;
    isWarning?: boolean;
    onDismiss: () => void;
}

function SecurityPopup({ message, violations, maxViolations, isTerminal, isWarning, onDismiss }: SecurityPopupProps) {
    return (
        <div className="sec-overlay" onClick={(e) => { if (e.target === e.currentTarget && !isTerminal) onDismiss(); }}>
            <div className="sec-modal">
                <div className="sec-icon">{isTerminal ? '🚫' : (isWarning ? '💡' : '⚠️')}</div>
                <div className="sec-label">{isTerminal ? 'Exam Terminated' : (isWarning ? 'Security Warning' : 'Security Violation')}</div>
                <h2 className="sec-heading">
                    {isTerminal ? 'Tab Switch Blocked & Exam Ended' : (isWarning ? 'Attention Required' : 'Tab Switch Blocked!')}
                </h2>
                <p className="sec-body">{message}</p>

                <div className="sec-violation-bar">
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginRight: 4 }}>Violations:</span>
                    {Array.from({ length: maxViolations }).map((_, i) => (
                        <div key={i} className={`sec-vio-dot ${i < violations ? 'active' : ''}`} />
                    ))}
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginLeft: 4 }}>{violations}/{maxViolations}</span>
                </div>

                <button
                    id="sec-dismiss-btn"
                    className={`sec-dismiss-btn ${isTerminal ? 'sec-terminate-btn' : ''}`}
                    onClick={onDismiss}
                >
                    {isTerminal ? '🚫 Exam Submitted — Close' : '✅ I Understand — Return to Exam'}
                </button>
                <div className="sec-note">
                    🔒 This incident has been logged for review.
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function TakeTest() {
    const { token } = useParams();
    const [testData, setTestData] = useState<TestData | null>(null);
    const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);

    const needsVideo = !!(testData?.exam.proctoring_enabled && (testData.exam.proctoring_type === 'video' || testData.exam.proctoring_type === 'both'));
    const needsScreen = !!(testData?.exam.proctoring_enabled && (testData.exam.proctoring_type === 'screen' || testData.exam.proctoring_type === 'both'));

    // ─── Theme ─────────────────────────────────────────────────────────────
    useEffect(() => {
      const saved = localStorage.getItem("kiwi-theme") || "default";
      if (saved === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
      } else if (saved === "default") {
        document.documentElement.removeAttribute("data-theme");
      } else {
        document.documentElement.setAttribute("data-theme", saved);
      }
    }, []);

    // ─── Block Inspect / Developer Tools ────────────────────────────────────
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
            if (
                e.key === "F12" ||
                (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
                (e.ctrlKey && e.key === "u")
            ) {
                e.preventDefault();
                return false;
            }
        };

        document.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [visited, setVisited] = useState<number[]>([0]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [started, setStarted] = useState(false);
    const [finished, setFinished] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [violations, setViolations] = useState(0);
    const [warningPopup, setWarningPopup] = useState<{ message: string; isTerminal: boolean; isWarning?: boolean } | null>(null);
    const [popup, setPopup] = useState<{ isOpen: boolean; type: PopupType; title?: string; message: string; onConfirm: () => void; onCancel?: () => void; confirmText?: string; } | null>(null);
    const [declared, setDeclared] = useState(false);
    const [checks, setChecks] = useState({ c1: false, c2: false, c3: false, c4: false });
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [gazeStatus, setGazeStatus] = useState<'ok' | 'warning' | 'away' | 'noface' | 'multiface'>('ok');
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [closeCountdown, setCloseCountdown] = useState<number | null>(null);
    const [resendTimer, setResendTimer] = useState(0);
    const snapshotStartRef = useRef<string | null>(null);
    const snapshotMidRef = useRef<string | null>(null);
    const midCapturedRef = useRef(false);

    // ── Refs ──────────────────────────────────────────────────────────────
    const videoRef = useRef<HTMLVideoElement>(null);
    const gazeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastGazeViolationRef = useRef(0);
    const lookAwayCountRef = useRef(0);
    // FIX #6: Single source of truth for violations to avoid race conditions
    const violationsRef = useRef(0);
    const startedRef = useRef(false);
    const finishedRef = useRef(false);
    const lastViolationTimeRef = useRef(0);
    // FIX #3: Prevent double submission
    const submittedRef = useRef(false);
    // FIX #8: Prevent countdown from starting twice
    const countdownStartedRef = useRef(false);
    const softWarnedRef = useRef<{ type: 'away' | 'noface' | 'multiface' | null, timestamp: number }>({ type: null, timestamp: 0 });

    const allChecked = checks.c1 && checks.c2 && checks.c3 && checks.c4;
    const toggleCheck = (key: keyof typeof checks) =>
        setChecks(prev => ({ ...prev, [key]: !prev[key] }));

    useEffect(() => {
        if (testData?.exam?.title) {
            document.title = `${testData.exam.title} | KiwiQA`;
        } else {
            document.title = "Take Test | KiwiQA";
        }
    }, [testData]);

    // Keep refs in sync so event handlers always see latest values
    useEffect(() => { startedRef.current = started; }, [started]);
    useEffect(() => { finishedRef.current = finished; }, [finished]);

    // FIX #6: Unified violation setter — keeps ref and state always in sync atomically
    const addViolation = (): number => {
        const next = violationsRef.current + 1;
        violationsRef.current = next;
        setViolations(next);
        return next;
    };

    // Resend Timer Effect
    useEffect(() => {
        if (resendTimer <= 0) return;
        const interval = setInterval(() => {
            setResendTimer(prev => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [resendTimer]);

    // ── Load face-api models ───────────────────────────────────────────────
    useEffect(() => {
        if (!testData) return;

        if (!needsVideo) {
            setModelsLoaded(true);
            return;
        }

        const MODEL_URL = '/models';
        Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        ]).then(() => {
            setModelsLoaded(true);
            console.log('Face-api models loaded.');
        }).catch(err => console.error('Face-api model load error:', err));
        // FIX: depends on testData so it actually runs after testData is set
    }, [testData, needsVideo]);

    // FIX #1: Request camera AFTER testData is available so the condition evaluates correctly
    useEffect(() => {
        if (!testData) return;

        if (!needsVideo) return;

        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then(s => {
                console.log("Camera stream obtained successfully");
                setStream(s);
            })
            .catch(err => {
                console.warn("Camera access denied or unavailable", err);
            });
        // Depend on testData so this runs once testData arrives
    }, [testData, needsVideo]);

    // Cleanup camera when finished
    useEffect(() => {
        if (finished) {
            if (stream) stream.getTracks().forEach(track => track.stop());
            if (gazeIntervalRef.current) clearInterval(gazeIntervalRef.current);
        }
    }, [finished, stream]);

    // FIX #7: Add [stream] dependency so this only runs when stream changes, not on every render
    useEffect(() => {
        if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(err => console.error("Video play error:", err));
        }
    }); // Runs on every render to ensure stream is attached to newly mounted elements

    // ── Eye/Gaze Tracking Loop ────────────────────────────────────────────────
    useEffect(() => {
        if (!started || finished || !modelsLoaded) return;

        const needsVideo = testData?.exam.proctoring_enabled &&
            (testData.exam.proctoring_type === 'video' || testData.exam.proctoring_type === 'both');
        if (!needsVideo) return;

        const triggerGazeViolation = (message: string, type: 'away' | 'noface' | 'multiface', isSoft: boolean = false) => {
            const now = Date.now();
            if (now - lastGazeViolationRef.current < 8000) return;
            
            if (isSoft) {
                softWarnedRef.current = { type, timestamp: now };
                setWarningPopup({ 
                    message: `${message}. Please correct this immediately. You have 10 seconds before a violation is recorded.`, 
                    isTerminal: false,
                    isWarning: true 
                });
                lastGazeViolationRef.current = now;
                return;
            }

            // If it's a real violation, increment count
            lastGazeViolationRef.current = now;
            softWarnedRef.current = { type: null, timestamp: 0 }; // reset soft warning

            // FIX #6: Use addViolation for atomic update
            const next = addViolation();
            if (next >= 3) {
                finishedRef.current = true;
                setFinished(true);
                fetch(`${API_BASE_URL}/candidates/test/${token}/status?status=Completed`, { method: 'POST' }).catch(() => { });
                setWarningPopup({ message: 'Proctoring system detected persistent security violations. Your exam has been automatically submitted.', isTerminal: true });
            } else {
                setWarningPopup({ message: `${message} (Violation ${next}/3)`, isTerminal: false });
            }
        };

        const detectGaze = async () => {
            if (!videoRef.current || !startedRef.current || finishedRef.current) return;

            const detections = await faceapi
                .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 }))
                .withFaceLandmarks(true);

            // 1. Multiple Face Detection
            if (detections.length > 1) {
                setGazeStatus('multiface');
                lookAwayCountRef.current += 1;
                
                if (lookAwayCountRef.current >= 3) {
                    const now = Date.now();
                    const isSoftWarned = softWarnedRef.current.type === 'multiface';
                    
                    if (!isSoftWarned) {
                        triggerGazeViolation('Multiple people detected in the camera frame.', 'multiface', true);
                    } else if (now - softWarnedRef.current.timestamp >= 10000) {
                        triggerGazeViolation('Multiple people detected for more than 10 seconds.', 'multiface', false);
                        lookAwayCountRef.current = 0; // Reset after violation
                    }
                }
                return;
            }

            const detection = detections[0];

            if (!detection) {
                lookAwayCountRef.current += 1;
                setGazeStatus('noface');
                
                if (lookAwayCountRef.current >= 3) {
                    const now = Date.now();
                    const isSoftWarned = softWarnedRef.current.type === 'noface';
                    
                    if (!isSoftWarned) {
                        triggerGazeViolation('No face detected. You must remain in camera view.', 'noface', true);
                    } else if (now - softWarnedRef.current.timestamp >= 10000) {
                        triggerGazeViolation('Face not detected for more than 10 seconds.', 'noface', false);
                        lookAwayCountRef.current = 0; // Reset after violation
                    }
                }
                return;
            }

            const landmarks = detection.landmarks;
            const leftEye = landmarks.getLeftEye();
            const rightEye = landmarks.getRightEye();

            const leftSpan = leftEye[3].x - leftEye[0].x;
            const rightSpan = rightEye[3].x - rightEye[0].x;

            const avgX = (pts: faceapi.Point[]) => pts.reduce((s, p) => s + p.x, 0) / pts.length;
            const avgY = (pts: faceapi.Point[]) => pts.reduce((s, p) => s + p.y, 0) / pts.length;

            const leftIrisX = avgX(leftEye);
            const rightIrisX = avgX(rightEye);
            const leftIrisY = avgY(leftEye);
            const rightIrisY = avgY(rightEye);

            const leftRatioH = (leftIrisX - leftEye[0].x) / leftSpan;
            const rightRatioH = (rightIrisX - rightEye[0].x) / rightSpan;
            const gazeH = (leftRatioH + rightRatioH) / 2;

            const leftHeight = Math.abs(leftEye[1].y - leftEye[5].y);
            const rightHeight = Math.abs(rightEye[1].y - rightEye[5].y);
            const leftRatioV = (leftIrisY - leftEye[1].y) / (leftHeight || 1);
            const rightRatioV = (rightIrisY - rightEye[1].y) / (rightHeight || 1);
            const gazeV = (leftRatioV + rightRatioV) / 2;

            const faceBox = detection.detection.box;
            const aspectRatio = faceBox.width / (faceBox.height || 1);

            const lookingAway = gazeH < 0.2 || gazeH > 0.8 || gazeV < 0.05 || gazeV > 0.85 || aspectRatio < 0.4;
            const lookingWarn = gazeH < 0.28 || gazeH > 0.72 || gazeV < 0.1 || gazeV > 0.78;

            if (lookingAway) {
                lookAwayCountRef.current += 1;
                setGazeStatus('away');
                
                if (lookAwayCountRef.current >= 3) {
                    const now = Date.now();
                    const isSoftWarned = softWarnedRef.current.type === 'away';
                    
                    if (!isSoftWarned) {
                        triggerGazeViolation('You appear to be looking away or showing a side-profile.', 'away', true);
                    } else if (now - softWarnedRef.current.timestamp >= 10000) {
                        triggerGazeViolation('Looking away detected for more than 10 seconds.', 'away', false);
                        lookAwayCountRef.current = 0; // Reset after violation
                    }
                }
            } else if (lookingWarn) {
                lookAwayCountRef.current = Math.max(0, lookAwayCountRef.current - 1);
                setGazeStatus('warning');
                // Optional: reset soft warning if they fixed it for a while? 
                // For now, we'll keep it simple: once warned, next persist = violation.
            } else {
                lookAwayCountRef.current = 0;
                setGazeStatus('ok');
                // If they are 'ok' for a bit, we could reset softWarnedRef.current.type = null;
                // But usually better to be strict after the first warning.
            }
        };

        gazeIntervalRef.current = setInterval(detectGaze, 400);

        return () => {
            if (gazeIntervalRef.current) clearInterval(gazeIntervalRef.current);
        };
    }, [started, finished, modelsLoaded, token, testData, needsVideo, stream]);

    useEffect(() => {
        setVisited(prev => prev.includes(currentIdx) ? prev : [...prev, currentIdx]);
    }, [currentIdx]);

    // ── Inject styles & fetch exam data ──────────────────────────────────
    useEffect(() => {
        const id = "test-styles";
        if (!document.getElementById(id)) {
            const el = document.createElement("style");
            el.id = id;
            el.textContent = STYLES;
            document.head.appendChild(el);
        }

        const getOrCreateDeviceId = () => {
            let id = localStorage.getItem('kiwi_device_mac_address');
            if (!id) {
                id = window.crypto && window.crypto.randomUUID
                    ? window.crypto.randomUUID()
                    : Math.random().toString(36).substring(2, 15);
                localStorage.setItem('kiwi_device_mac_address', id);
            }
            return id;
        };

        const deviceId = getOrCreateDeviceId();

        if (!testData) {
            fetch(`${API_BASE_URL}/candidates/test/${token}?device_id=${deviceId}`)
                .then(async res => {
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                        throw new Error(data.detail || "Failed to load exam. Please contact support.");
                    }
                    return data as TestData;
                })
                .then(data => {
                    setTestData(data);
                    if (data.exam.duration) setTimeLeft(data.exam.duration * 60);

                    // Stable shuffle once here based on token to ensure unique order per candidate
                    const qs = shuffleArrayWithSeed(
                        data.exam.questions.map((q, i) => ({ ...q, originalIndex: i })), 
                        token || ""
                    ).map(q => ({
                        ...q,
                        options: shuffleArrayWithSeed(
                            q.options.map((o, i) => ({ ...o, originalIndex: i })), 
                            (token || "") + q.text
                        )
                    }));
                    setShuffledQuestions(qs);
                    setLoading(false);

                    // Remove automatic status update on load to wait for explicit start
                    // const url = `${API_BASE_URL}/candidates/test/${token}/status?status=Active`;
                    // fetch(url, { method: 'POST' }).catch(() => { });
                })
                .catch(err => {
                    setErrorMsg(err.message);
                    setLoading(false);
                });
        }
    }, [token]); // Only depends on token — testData guard prevents re-fetching

    // ── Security & Anti-cheat Event Listeners ────────────────────────────
    useEffect(() => {
        const updateStatus = (s: string) => {
            const url = `${API_BASE_URL}/candidates/test/${token}/status?status=${s}`;
            if (s === 'Completed') {
                navigator.sendBeacon(url);
            } else {
                fetch(url, { method: 'POST' }).catch(() => { });
            }
        };

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (startedRef.current && !finishedRef.current) {
                e.preventDefault();
                e.returnValue = 'Are you sure you want to leave the assessment? Your progress will be lost.';
            }
        };

        const handleExit = () => updateStatus('Completed');

        const handlePopState = (_e: PopStateEvent) => {
            if (startedRef.current && !finishedRef.current) {
                // Trap the user on the current page
                window.history.pushState(null, "", window.location.href);
                
                const now = Date.now();
                if (now - lastViolationTimeRef.current < 1000) return;
                lastViolationTimeRef.current = now;

                const next = addViolation();
                setWarningPopup({
                    message: `Using the browser's Back or Forward buttons is strictly prohibited during the exam. (Violation ${next}/3)`,
                    isTerminal: next >= 3,
                });

                if (next >= 3) {
                    finishedRef.current = true;
                    setFinished(true);
                    updateStatus('Completed');
                }
            }
        };

        // FIX #4 & #5: Check started/finished via refs; check proctoring_type from testData ref
        const handleVisible = () => {
            if (!needsScreen) return;

            if (document.visibilityState === 'hidden' && startedRef.current && !finishedRef.current) {
                window.focus();

                const now = Date.now();
                if (now - lastViolationTimeRef.current < 1000) return;
                lastViolationTimeRef.current = now;

                // FIX #6: Use addViolation for atomic update
                const next = addViolation();

                if (next >= 3) {
                    finishedRef.current = true;
                    setFinished(true);
                    updateStatus('Completed');
                    setWarningPopup({
                        message: 'You have switched tabs 3 times. Your exam has been automatically submitted and this incident has been reported.',
                        isTerminal: true,
                    });
                } else {
                    setWarningPopup({
                        message: `Tab switching is strictly prohibited during the exam. Your attempt to switch tabs has been blocked. This is violation ${next} of 3. Further violations will result in automatic exam termination.`,
                        isTerminal: false,
                    });
                    setTimeout(() => window.focus(), 100);
                }
            } else if (document.visibilityState === 'visible') {
                window.focus();
                updateStatus('Live');
            }
        };

        const handleBlur = () => {
            if (startedRef.current && !finishedRef.current) {
                window.focus();

                const now = Date.now();
                if (now - lastViolationTimeRef.current < 1000) return;
                lastViolationTimeRef.current = now;

                // FIX #6: Use addViolation for atomic update
                const next = addViolation();
                if (next >= 3) {
                    finishedRef.current = true;
                    setFinished(true);
                    updateStatus('Completed');
                    setWarningPopup({
                        message: 'Focus was lost from the exam window 3 times. Your exam has been automatically submitted.',
                        isTerminal: true,
                    });
                } else {
                    setWarningPopup({
                        message: `Switching to another window or application is not allowed during the exam. This is violation ${next} of 3. Stay on this screen!`,
                        isTerminal: false,
                    });
                }
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.altKey ||
                e.metaKey ||
                e.ctrlKey ||
                e.key === 'Tab' ||
                e.key === 'Escape' ||
                e.key === 'PrintScreen' ||
                /^F\d+$/.test(e.key)
            ) {
                e.preventDefault();
                e.stopPropagation();

                const now = Date.now();
                if (now - lastViolationTimeRef.current < 1000) return false;
                lastViolationTimeRef.current = now;

                // FIX #6: Use addViolation for atomic update
                const next = addViolation();
                setWarningPopup({
                    message: `Keyboard shortcuts (like Alt+Tab, Ctrl, or Windows key) are strictly disabled during the exam. (Violation ${next}/3)`,
                    isTerminal: next >= 3,
                });
                if (next >= 3) {
                    finishedRef.current = true;
                    setFinished(true);
                    updateStatus('Completed');
                }
                return false;
            }
        };

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            return false;
        };

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && startedRef.current && !finishedRef.current) {
                // FIX #6: Use addViolation for atomic update
                const next = addViolation();
                if (next >= 3) {
                    finishedRef.current = true;
                    setFinished(true);
                    updateStatus('Completed');
                    setWarningPopup({
                        message: 'You exited fullscreen mode 3 times. Your exam has been automatically submitted.',
                        isTerminal: true,
                    });
                } else {
                    setWarningPopup({
                        message: `Exiting fullscreen is not allowed. Re-enter fullscreen to continue. (Violation ${next}/3)`,
                        isTerminal: false,
                    });
                }
            }
        };

        // FIX #4: Only attach keydown/blur/contextmenu/fullscreen when exam is active
        if (started && !finished) {
            window.addEventListener('keydown', handleKeyDown);
            window.addEventListener('contextmenu', handleContextMenu);
            window.addEventListener('blur', handleBlur);
            window.addEventListener('beforeunload', handleBeforeUnload);
            window.addEventListener('popstate', handlePopState);
            window.history.pushState(null, "", window.location.href);
            document.addEventListener('fullscreenchange', handleFullscreenChange);
        }

        // visibilitychange is always attached but internally guards on startedRef
        window.addEventListener('pagehide', handleExit);
        window.addEventListener('visibilitychange', handleVisible);

        return () => {
            window.removeEventListener('pagehide', handleExit);
            window.removeEventListener('visibilitychange', handleVisible);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handlePopState);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
        // FIX #5: Include testData so handlers see the correct proctoring config
    }, [token, started, finished, testData]);

    // FIX #2: Guard handleStart against non-video proctoring types
    // Capture webcam snapshot helper
    const takeSnapshot = () => {
        if (videoRef.current) {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = videoRef.current.videoWidth || 640;
                canvas.height = videoRef.current.videoHeight || 480;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    // Draw video frame
                    ctx.drawImage(videoRef.current, 0, 0);
                    
                    // Add Date/Time Overlay (Top-right)
                    const now = new Date();
                    const timestamp = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    
                    ctx.font = "bold 16px Inter, sans-serif";
                    const textWidth = ctx.measureText(timestamp).width;
                    
                    // Draw semi-transparent background for text
                    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
                    ctx.fillRect(canvas.width - textWidth - 30, 10, textWidth + 20, 25);
                    
                    // Draw text
                    ctx.fillStyle = "white";
                    ctx.fillText(timestamp, canvas.width - textWidth - 20, 28);
                    
                    return canvas.toDataURL("image/png");
                }
            } catch (e) { console.error("Snapshot error:", e); }
        }
        return null;
    };

    const handleStart = () => {
        if (needsVideo && !stream) {
            setPopup({
                isOpen: true,
                type: 'alert',
                title: 'Camera Required',
                message: 'You must allow camera access to start the exam. Please check your browser permissions.',
                onConfirm: () => setPopup(null),
                confirmText: 'OK'
            });
            return;
        }

        const element = document.documentElement;
        if (element.requestFullscreen) {
            element.requestFullscreen().catch(err => {
                console.error("Fullscreen request failed:", err);
            });
        }
        
        // Take START snapshot
        if (needsVideo) {
            const shot = takeSnapshot();
            if (shot) snapshotStartRef.current = shot;
        }

        setStarted(true);
        fetch(`${API_BASE_URL}/candidates/test/${token}/status?status=Live`, { method: 'POST' }).catch(() => { });
    };

    useEffect(() => {
        if (!started || timeLeft === null || finished) return;

        if (timeLeft <= 0) {
            setFinished(true);
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                const next = (prev !== null && prev > 0) ? prev - 1 : 0;
                
                // Take MID snapshot (around 50% time left)
                if (testData?.exam.duration && next <= Math.floor((testData.exam.duration * 60) / 2) && !midCapturedRef.current) {
                    const shot = takeSnapshot();
                    if (shot) {
                        snapshotMidRef.current = shot;
                        midCapturedRef.current = true;
                    }
                }
                
                return next;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [started, timeLeft, finished]);

    // FIX #3: Use submittedRef to prevent double submission
    useEffect(() => {
        if (!finished || submittedRef.current) return;
        submittedRef.current = true;

        const processSubmission = async () => {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { });
            }

            let base64Image = null; // This will hold the END snapshot
            try {
                const shot = takeSnapshot();
                if (shot) {
                    base64Image = shot;
                } else {
                    // Fallback to html2canvas if webcam fails
                    const canvas = await html2canvas(document.body, { useCORS: true });
                    base64Image = canvas.toDataURL("image/png");
                }
            } catch (err) {
                console.error("Snapshot capture failed:", err);
            }

            let score = 0;
            let totalMarks = 0;
            const answersArray: any[] = [];
            shuffledQuestions.forEach((q, idx) => {
                const qMarks = q.marks ?? 1;
                totalMarks += qMarks;
                const answerIdx = answers[idx];
                answersArray.push({
                    question_index: q.originalIndex ?? idx,
                    selected_option_index: answerIdx !== undefined ? q.options[answerIdx].originalIndex : null
                });
                if (answerIdx !== undefined && q.options[answerIdx].is_correct) {
                    score += qMarks;
                }
            });

            // Last resort: If mid snapshot is null but we are finishing, take it now
            if (!snapshotMidRef.current && needsVideo) {
                snapshotMidRef.current = takeSnapshot();
            }

            fetch(`${API_BASE_URL}/candidates/test/${token}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    score: score,
                    total_questions: shuffledQuestions.length,
                    total_marks: totalMarks,
                    violations: violationsRef.current,
                    screenshot: base64Image, // backward compatibility
                    screenshot_start: snapshotStartRef.current,
                    screenshot_mid: snapshotMidRef.current,
                    screenshot_end: base64Image,
                    answers: answersArray
                })
            }).catch(err => console.error("Failed to submit result:", err));

            setCloseCountdown(10);
        };

        processSubmission();
    }, [finished, token, answers, shuffledQuestions]);

    // Handle the auto-close countdown
    useEffect(() => {
        if (closeCountdown === null) return;
        if (closeCountdown <= 0) {
            handleTabClose();
            return;
        }

        const timer = setInterval(() => {
            setCloseCountdown(prev => (prev !== null && prev > 0) ? prev - 1 : 0);
        }, 1000);

        return () => clearInterval(timer);
    }, [closeCountdown]);

    // FIX #8: Use a ref to prevent the countdown from starting twice on re-renders
    useEffect(() => {
        if (errorMsg && !countdownStartedRef.current) {
            countdownStartedRef.current = true;
            setCloseCountdown(10);
        }
    }, [errorMsg]);

    const handleResendResults = async () => {
        if (resendTimer > 0) return;
        try {
            const res = await fetch(`${API_BASE_URL}/candidates/test/${token}/resend-results`, {
                method: 'POST'
            });
            if (res.ok) {
                setResendTimer(60);
                alert("Results email has been resent successfully.");
            } else {
                alert("Failed to resend results email. Please try again later.");
            }
        } catch (err) {
            console.error("Resend error:", err);
        }
    };

    const handleTabClose = () => {
        window.close();

        setTimeout(() => {
            if (!window.closed) {
                window.open('about:blank', '_self');
            }
        }, 300);

        setTimeout(() => {
            if (!window.closed) {
                window.location.href = "about:blank";
            }
        }, 600);
    };

    const handleSelect = (qIdx: number, oIdx: number) => {
        setAnswers(prev => ({ ...prev, [qIdx]: oIdx }));
    };

    // ── Render: Loading ───────────────────────────────────────────────────
    if (loading) return (
        <div className="test-wrap" style={{ display: 'grid', placeItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#1c848f', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
                <p style={{ fontWeight: 600, color: 'var(--primary)' }}>Preparing your assessment...</p>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    // ── Render: Error / Access Denied ─────────────────────────────────────
    if (errorMsg || !testData || shuffledQuestions.length === 0) return (
        <div className="test-wrap" style={{ display: 'grid', placeItems: 'center' }}>
            <div className="welcome-card">
                <h1 className="test-title">Access Denied</h1>
                <p style={{ color: errorMsg ? 'var(--primary)' : 'var(--text-muted)', marginTop: 16, fontWeight: errorMsg ? 600 : 400 }}>
                    {errorMsg || "This assessment link is invalid or has expired. Please contact support if you believe this is an error."}
                </p>

                {closeCountdown !== null && (
                    <div style={{ marginTop: 40, borderTop: '1px solid var(--border)', paddingTop: 32 }}>
                        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                            {closeCountdown > 0
                                ? `This tab will automatically close in ${closeCountdown} seconds...`
                                : "Closing Assessment..."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );

    // ── Render: Finished ──────────────────────────────────────────────────
    if (finished) {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        }

        const autoTerminated = violationsRef.current >= 3;

        return (
            <div className="test-wrap" style={{ display: 'grid', placeItems: 'center' }}>
                <div className="welcome-card" style={{ maxWidth: 800, border: autoTerminated ? '2px solid var(--primary)' : undefined }}>
                    <div className="test-badge" style={{
                        background: autoTerminated ? 'color-mix(in srgb, var(--primary) 10%, white)' : '#f0fdf4',
                        color: autoTerminated ? 'var(--primary)' : '#166534',
                        borderColor: autoTerminated ? 'color-mix(in srgb, var(--primary) 25%, white)' : '#bbf7d0'
                    }}>
                        {autoTerminated ? '⚠️ Security Termination' : 'Completed'}
                    </div>
                    <h1 className="test-title" style={{ marginTop: 24, fontSize: 36, color: autoTerminated ? 'var(--primary)' : 'var(--text)' }}>
                        {autoTerminated ? 'Assessment Terminated' : 'Assessment Finished'}
                    </h1>
                    <p style={{ color: autoTerminated ? 'var(--primary)' : 'var(--text-muted)', fontSize: 18, marginTop: 16, maxWidth: 500, margin: '16px auto 40px' }}>
                        {autoTerminated ? (
                            <>
                                <strong>Assessment Auto-Submitted.</strong> You have exceeded the maximum allowed security violations (3/3).
                            </>
                        ) : (
                            <>
                                Thank you, <strong>{testData.candidate_name}</strong>. Your responses for <strong>{testData.exam.title}</strong> have been securely submitted.
                            </>
                        )}
                    </p>
                    <div className="info-pill" style={{ display: 'inline-block', padding: '12px 32px', background: autoTerminated ? 'color-mix(in srgb, var(--primary) 5%, white)' : 'var(--bg-neutral)', borderColor: autoTerminated ? 'var(--primary)' : 'var(--border)' }}>
                        <p style={{ margin: 0, fontSize: 14, color: autoTerminated ? 'var(--primary)' : 'var(--text-muted)' }}>Status</p>
                        <p style={{ margin: 0, fontWeight: 700, color: autoTerminated ? 'var(--primary)' : '#166534' }}>
                            {autoTerminated ? 'Auto-Submission Logged' : 'Submission Received'}
                        </p>
                    </div>

                    {closeCountdown !== null && (
                        <div style={{ marginTop: 40, borderTop: '1px solid var(--border)', paddingTop: 32 }}>
                            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
                                {closeCountdown > 0
                                    ? `This tab will automatically close in ${closeCountdown} seconds...`
                                    : "Please close this tab manually if it did not close automatically."}
                            </p>
                            <button
                                onClick={handleTabClose}
                                className="test-btn"
                                style={{ background: 'var(--text)', padding: '12px 32px' }}
                            >
                                Close Assessment Now
                            </button>
                        </div>
                    )}

                    {!autoTerminated && (
                        <div style={{ marginTop: 20 }}>
                            <button
                                onClick={handleResendResults}
                                disabled={resendTimer > 0}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: resendTimer > 0 ? '#94a3b8' : 'var(--primary, #1c848f)',
                                    cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    textDecoration: 'underline'
                                }}
                            >
                                {resendTimer > 0 ? `Resend email in ${resendTimer}s` : "Didn't get the email? Resend results"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── Render: Welcome / Pre-start ───────────────────────────────────────
    if (!started) {
        return (
            <div className="test-wrap">
                <div className="welcome-card" style={{ maxWidth: 680, padding: '48px 48px 40px' }}>
                    <div className="test-badge">{testData.exam.title}</div>
                    <h1 className="test-title" style={{ fontSize: 36, marginTop: 16 }}>Welcome, {testData.candidate_name.split(' ')[0]}!</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 15, margin: '12px 0 24px' }}>
                        Please read the exam rules carefully and confirm your understanding before proceeding.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
                        <div className="info-pill">
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>DURATION</div>
                            <div className="info-val">{testData.exam.duration} Minutes</div>
                        </div>
                        <div className="info-pill">
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>QUESTIONS</div>
                            <div className="info-val">{shuffledQuestions.length} Questions</div>
                        </div>
                    </div>

                    {needsVideo && (
                        <div style={{ marginBottom: 28, textAlign: 'center' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
                                📷 Camera Check & Readiness
                            </div>
                            <div style={{ 
                                background: '#000', 
                                border: stream ? '2px solid #22c55e' : '2px solid var(--border)', 
                                borderRadius: '16px', 
                                overflow: 'hidden', 
                                width: '300px', 
                                height: '180px', 
                                margin: '0 auto', 
                                position: 'relative',
                                boxShadow: 'var(--shadow)'
                            }}>
                                {stream ? (
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                                    />
                                ) : (
                                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: 12, padding: 20 }}>
                                        <div style={{ fontSize: 24 }}>📷</div>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>Camera loading or access denied</div>
                                        <p style={{ fontSize: 11, margin: 0 }}>Please allow camera access in your browser to proceed.</p>
                                    </div>
                                )}
                                {stream && (
                                    <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(34, 197, 94, 0.9)', color: 'white', padding: '4px 12px', borderRadius: 100, fontSize: 10, fontWeight: 800 }}>
                                        READY
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="decl-box">
                        <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)', marginBottom: 14 }}>
                            📋 Exam Rules &amp; Declaration
                        </div>
                        <ul className="decl-rules">
                            {needsScreen && (
                                <>
                                    <li>This exam must be taken in <strong>Fullscreen mode</strong>. Exiting fullscreen will be treated as a violation.</li>
                                    <li>Tab switching, window switching, or navigating away from this page is strictly <strong>prohibited</strong>.</li>
                                </>
                            )}
                            {testData.exam.proctoring_enabled && (
                                <li><strong>3 violations</strong> ({needsVideo && needsScreen ? 'tab/window switch, fullscreen exit, looking away' : needsVideo ? 'looking away' : 'tab/window switch, fullscreen exit'}) will result in <strong>automatic exam termination</strong> and submission.</li>
                            )}
                            <li>Keyboard shortcuts (Ctrl+C, Ctrl+V, F12, etc.) and right-click are <strong>disabled</strong> during the exam.</li>
                            <li><strong>Randomized Content</strong>: Questions and their multiple-choice options are shuffled for each candidate.</li>
                            {needsVideo && (
                                <li><strong>Live eye tracking</strong> is active via your webcam. Looking away from the screen repeatedly will count as a violation.</li>
                            )}
                            <li>All activities during the exam are <strong>monitored and logged</strong> for security and integrity purposes.</li>
                        </ul>

                        <div className="decl-checks">
                            {needsScreen ? (
                                <>
                                    <label className="decl-check-row">
                                        <input type="checkbox" checked={checks.c1} onChange={() => toggleCheck('c1')} />
                                        <span>I understand that tab switching or leaving this page will be counted as a violation.</span>
                                    </label>
                                    <label className="decl-check-row">
                                        <input type="checkbox" checked={checks.c2} onChange={() => toggleCheck('c2')} />
                                        <span>I agree to remain in fullscreen mode throughout the entire exam duration.</span>
                                    </label>
                                </>
                            ) : (
                                <label className="decl-check-row">
                                    <input type="checkbox" checked={checks.c1 || checks.c2} onChange={() => { toggleCheck('c1'); toggleCheck('c2'); }} />
                                    <span>I agree to follow all instructions and complete the exam with integrity.</span>
                                </label>
                            )}
                            <label className="decl-check-row">
                                <input type="checkbox" checked={checks.c3} onChange={() => toggleCheck('c3')} />
                                <span>I confirm that I am the authorized candidate and will complete this exam honestly without external help.</span>
                            </label>
                            {testData.exam.proctoring_enabled ? (
                                <label className="decl-check-row">
                                    <input type="checkbox" checked={checks.c4} onChange={() => toggleCheck('c4')} />
                                    <span>I accept that 3 violations will result in automatic termination and submission of my exam.</span>
                                </label>
                            ) : (
                                <label className="decl-check-row">
                                    <input type="checkbox" checked={checks.c4} onChange={() => toggleCheck('c4')} />
                                    <span>I am ready to begin the assessment.</span>
                                </label>
                            )}
                        </div>

                        {!declared ? (
                            <button
                                id="decl-agree-btn"
                                className="decl-agree-btn"
                                disabled={!allChecked}
                                onClick={() => setDeclared(true)}
                            >
                                ✅ I Understand &amp; Agree — Proceed
                            </button>
                        ) : (
                            <div className="decl-agreed-badge">
                                ✅ &nbsp;Declaration accepted. You may now start the exam.
                            </div>
                        )}
                    </div>

                    <button
                        id="start-exam-btn"
                        className="test-btn"
                        disabled={!declared}
                        onClick={handleStart}
                        style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '18px', opacity: declared ? 1 : 0.4, cursor: declared ? 'pointer' : 'not-allowed' }}
                    >
                        🖥️ &nbsp;Enter Fullscreen &amp; Start Exam
                    </button>
                    {!declared && (
                        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
                            Please read and accept the declaration above to enable this button.
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // ── Render: Fullscreen Lost ───────────────────────────────────────────
    if (started && !document.fullscreenElement && !finished) {
        return (
            <div className="test-wrap" style={{ display: 'grid', placeItems: 'center', backgroundColor: 'color-mix(in srgb, var(--primary) 10%, white)' }}>
                <div className="welcome-card" style={{ border: '2px solid var(--primary)' }}>
                    <div className="test-badge" style={{ background: 'var(--primary)', color: 'white' }}>Security Lockout</div>
                    <h1 className="test-title" style={{ color: 'var(--primary)', marginTop: 20 }}>QUESTIONS ARE LOCKED</h1>
                    <p style={{ margin: '20px 0', fontSize: 18, color: 'var(--primary)', fontWeight: 600 }}>
                        Violation {violations}/3 Detected.
                    </p>
                    <p style={{ color: 'var(--primary)', opacity: 0.8, marginBottom: 32 }}>
                        Exiting fullscreen or switching tabs is not permitted.
                        <strong> If you reach 3 violations, your exam will be automatically disqualified.</strong>
                    </p>
                    <button
                        className="test-btn"
                        style={{ background: 'var(--primary)', width: '100%', justifyContent: 'center' }}
                        onClick={() => document.documentElement.requestFullscreen().catch(() => { })}
                    >
                        Resume Assessment (Re-enter Fullscreen)
                    </button>
                    <p style={{ marginTop: 16, fontSize: 12, color: 'var(--primary)', opacity: 0.7 }}>
                        * This incident has been logged for review.
                    </p>
                </div>
            </div>
        );
    }

    // ── Render: Active Exam ───────────────────────────────────────────────
    const currentQ = shuffledQuestions[currentIdx];

    return (
        <div className="test-wrap">
            {warningPopup && (
                <SecurityPopup
                    message={warningPopup.message}
                    violations={violations}
                    maxViolations={3}
                    isTerminal={warningPopup.isTerminal}
                    isWarning={warningPopup.isWarning}
                    onDismiss={() => {
                        if (warningPopup.isTerminal) {
                            handleTabClose();
                        }
                        setWarningPopup(null);
                        if (!document.fullscreenElement && !warningPopup.isTerminal) {
                            document.documentElement.requestFullscreen().catch(() => { });
                        }
                        window.focus();
                    }}
                />
            )}
            <div className="test-container">
                <header className="test-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <img src={logo} alt="KiwiQA Logo" style={{ height: 40 }} />
                        <div>
                            <div className="test-badge">{testData.exam.title}</div>
                            <h1 className="test-title" style={{ marginTop: 0 }}>Assessment Portal</h1>
                        </div>
                    </div>
                    {timeLeft !== null && (
                        <div style={{ display: 'flex', gap: 16 }}>
                            {violations > 0 && (
                                <div className="test-timer urgent" style={{ background: 'var(--primary)' }}>
                                    <span style={{ fontSize: 11, fontWeight: 700 }}>ALERTS:</span>
                                    <span style={{ fontSize: 18 }}>{violations}</span>
                                </div>
                            )}
                            <div className={`test-timer ${timeLeft < 60 ? 'urgent' : ''}`} style={{ margin: 0 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.8 }}>TIME REMAINING:</span>
                                <span style={{ fontSize: 18 }}>{formatTime(timeLeft)}</span>
                            </div>
                        </div>
                    )}
                </header>

                <div className="main-layout">
                    <main className="main-content">
                        <div className="test-q-card" key={currentIdx}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <div className="test-q-num">Question {currentIdx + 1} of {shuffledQuestions.length}</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
                                    {Math.round(((currentIdx + 1) / shuffledQuestions.length) * 100)}% Complete
                                </div>
                            </div>
                            <div className="test-q-text">
                                {currentQ.text}
                                {currentQ.image && (
                                    <div style={{ marginTop: 20 }}>
                                        <img src={currentQ.image} alt="Question Attachment" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }} />
                                    </div>
                                )}
                            </div>
                            <div className="test-opts">
                                {currentQ.options.map((opt, idx) => (
                                    <div
                                        key={idx}
                                        className={`test-opt ${answers[currentIdx] === idx ? 'selected' : ''}`}
                                        onClick={() => handleSelect(currentIdx, idx)}
                                    >
                                        <div className="test-opt-circle">
                                            {String.fromCharCode(65 + idx)}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                                            <span>{opt.text}</span>
                                            {opt.image && (
                                                <img src={opt.image} alt="Option Attachment" style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: 8, border: '1px solid var(--border)' }} />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="test-nav">
                            <button
                                className="test-btn secondary"
                                disabled={currentIdx === 0}
                                onClick={() => setCurrentIdx(i => i - 1)}
                            >
                                &larr; Previous Question
                            </button>

                            <div style={{ display: 'flex', gap: 16 }}>
                                {currentIdx === shuffledQuestions.length - 1 ? (
                                    <button
                                        className="test-btn finish"
                                        onClick={() => {
                                            setPopup({
                                                isOpen: true,
                                                type: 'confirm',
                                                title: 'Submit Assessment',
                                                message: 'Are you sure you want to submit your assessment?',
                                                confirmText: 'Submit',
                                                onConfirm: () => {
                                                    setPopup(null);
                                                    setFinished(true);
                                                },
                                                onCancel: () => setPopup(null)
                                            });
                                        }}
                                    >
                                        Submit Final Responses
                                    </button>
                                ) : (
                                    <button
                                        className="test-btn"
                                        onClick={() => setCurrentIdx(i => i + 1)}
                                    >
                                        Next Question &rarr;
                                    </button>
                                )}
                            </div>
                        </div>
                    </main>

                    <aside className="q-palette">
                        {needsVideo && (
                            <div style={{ marginBottom: 24 }}>
                            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                📷 Live Proctoring
                                {modelsLoaded
                                    ? <span style={{ fontSize: 10, background: '#f0fdf4', color: '#166534', border: '1px solid #86efac', borderRadius: 100, padding: '2px 8px', fontWeight: 700 }}>AI Active</span>
                                    : <span style={{ fontSize: 10, background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047', borderRadius: 100, padding: '2px 8px', fontWeight: 700 }}>Loading…</span>
                                }
                            </div>

                            <div style={{ background: '#000', borderRadius: '12px', overflow: 'hidden', height: '160px', position: 'relative', border: (gazeStatus === 'away' || gazeStatus === 'noface' || gazeStatus === 'multiface') ? '2px solid #ef4444' : '1px solid var(--border)', transition: 'border 0.3s' }}>
                                {stream ? (
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                                    />
                                ) : (
                                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', textAlign: 'center', padding: '10px' }}>
                                        <span style={{ fontSize: '20px', marginBottom: '8px' }}>🚫</span>
                                        <span style={{ fontSize: '10px', fontWeight: 600 }}>Camera Disconnected</span>
                                    </div>
                                )}
                                <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 5, alignItems: 'center', background: 'rgba(0,0,0,0.65)', padding: '3px 8px', borderRadius: 100 }}>
                                    <div style={{ width: 7, height: 7, background: stream ? '#ef4444' : '#64748b', borderRadius: '50%', animation: stream ? 'pulse 1.5s infinite' : 'none' }} />
                                    <span style={{ fontSize: 10, fontWeight: 800, color: 'white', letterSpacing: '0.06em' }}>{stream ? 'REC' : 'OFF'}</span>
                                </div>
                                {(gazeStatus === 'away' || gazeStatus === 'noface' || gazeStatus === 'multiface') && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                        <span style={{ fontSize: 26 }}>{gazeStatus === 'noface' ? '🚫' : (gazeStatus === 'multiface' ? '👥' : '👁️')}</span>
                                    </div>
                                )}
                            </div>

                            {gazeStatus === 'ok' && (
                                <div className="gaze-badge ok">
                                    <div className="gaze-dot" style={{ background: '#22c55e' }} />
                                    👁️ Gaze: On Screen
                                </div>
                            )}
                            {gazeStatus === 'warning' && (
                                <div className="gaze-badge warning">
                                    <div className="gaze-dot" style={{ background: '#f59e0b' }} />
                                    ⚠️ Eyes drifting — look ahead
                                </div>
                            )}
                            {gazeStatus === 'away' && (
                                <div className="gaze-badge away">
                                    <div className="gaze-dot" style={{ background: '#ef4444' }} />
                                    🚨 Looking Away! Focus on screen
                                </div>
                            )}
                            {gazeStatus === 'noface' && (
                                <div className="gaze-badge noface">
                                    <div className="gaze-dot" style={{ background: '#a855f7' }} />
                                    🚫 No Face Detected!
                                </div>
                            )}
                            {gazeStatus === 'multiface' && (
                                <div className="gaze-badge away" style={{ background: '#fff1f2', color: '#9f1239', border: '1px solid #fda4af' }}>
                                    <div className="gaze-dot" style={{ background: '#e11d48' }} />
                                    🚨 Multiple Faces Detected!
                                </div>
                            )}
                        </div>
                        )}

                        <div className="q-palette-title">
                            <span>Question Palette</span>
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>
                                {Object.keys(answers).length} / {shuffledQuestions.length}
                            </span>
                        </div>
                        <div className="q-grid">
                            {shuffledQuestions.map((_, i) => {
                                const isAnswered = answers[i] !== undefined;
                                const isVisited = visited.includes(i);
                                const isCurrent = currentIdx === i;

                                let btnClass = "q-btn";
                                if (isCurrent) btnClass += " current";
                                if (isAnswered) btnClass += " answered";
                                else if (isVisited) btnClass += " visited-unanswered";

                                return (
                                    <button
                                        key={i}
                                        className={btnClass}
                                        onClick={() => setCurrentIdx(i)}
                                    >
                                        {i + 1}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="q-legend">
                            <div className="q-legend-item">
                                <div className="q-legend-box" style={{ background: 'var(--q-answered-bg)', borderColor: 'var(--q-answered-border)' }} />
                                Answered
                            </div>
                            <div className="q-legend-item">
                                <div className="q-legend-box" style={{ background: 'var(--q-visited-bg)', borderColor: 'var(--q-visited-border)' }} />
                                Visited (Not Answered)
                            </div>
                            <div className="q-legend-item">
                                <div className="q-legend-box" style={{ background: 'var(--bg-neutral)', borderColor: 'var(--border)' }} />
                                Not Visited
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            {popup && (
                <CustomPopup
                    isOpen={popup.isOpen}
                    type={popup.type}
                    title={popup.title}
                    message={popup.message}
                    onConfirm={popup.onConfirm}
                    onCancel={popup.onCancel || (() => setPopup(null))}
                    confirmText={popup.confirmText}
                />
            )}
        </div>
    );
}