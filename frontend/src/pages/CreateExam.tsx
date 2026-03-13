import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import CustomPopup, { PopupType } from "../components/CustomPopup";
import API_BASE_URL from "../config";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Option {
  text: string;
  is_correct: boolean;
}

interface Question {
  text: string;
  options: Option[];
  explanation?: string;
}

type DifficultyLevel = "Beginner" | "Intermediate" | "Advanced";
type ProctoringType = "video" | "screen" | "both";

interface DifficultyConfig {
  label: string;
  description: string;
  color: string;
  bg: string;
  border: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const DIFFICULTY_MAP: Record<DifficultyLevel, DifficultyConfig> = {
  Beginner: {
    label: "Beginner",
    description: "Foundational concepts & basic recall",
    color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0",
  },
  Intermediate: {
    label: "Intermediate",
    description: "Applied knowledge & problem solving",
    color: "#b45309", bg: "#fffbeb", border: "#fde68a",
  },
  Advanced: {
    label: "Advanced",
    description: "Complex analysis & critical thinking",
    color: "#b91c1c", bg: "#fef2f2", border: "#fecaca",
  },
};

const PROCTORING_OPTIONS: { value: ProctoringType; label: string; icon: string; desc: string }[] = [
  { value: "video", label: "Video Only", icon: "📹", desc: "Webcam monitoring" },
  { value: "screen", label: "Screen Only", icon: "🖥️", desc: "Browser tab tracking" },
  { value: "both", label: "Video + Screen", icon: "🛡️", desc: "Full hybrid coverage" },
];

const AI_TIPS = [
  "Analysing subject matter depth…",
  "Calibrating difficulty parameters…",
  "Generating diverse question types…",
  "Ensuring topic coverage breadth…",
  "Validating answer accuracy…",
  "Creating meaningful distractors…",
  "Polishing explanations…",
  "Finalising exam blueprint…",
];

// ─── Icons ─────────────────────────────────────────────────────────────────────
const Icons = {
  Brain: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z" />
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Refresh: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  Trash: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),
  Sparkles: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  X: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Shield: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Upload: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  Edit: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Save: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
};

// ─── Step indicator ────────────────────────────────────────────────────────────
type StepId = "configure" | "generating" | "review";

function StepBar({ active }: { active: StepId }) {
  const steps: { id: StepId; label: string; n: number }[] = [
    { id: "configure", label: "Configure", n: 1 },
    { id: "generating", label: "Generating", n: 2 },
    { id: "review", label: "Review", n: 3 },
  ];
  return (
    <div className="step-bar">
      {steps.map((s, i) => (
        <>
          <div key={s.id} className={`step ${active === s.id ? "step--active" : active === "review" && s.id !== "review" ? "step--done" : ""}`}>
            <div className="step-num">
              {active === "review" && s.id !== "review" ? <Icons.Check /> : s.n}
            </div>
            <span>{s.label}</span>
          </div>
          {i < steps.length - 1 && <div key={`sep-${i}`} className="step-sep" />}
        </>
      ))}
    </div>
  );
}

// ─── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="section-card">
      <div className="section-card-header">
        <h3 className="section-card-title">{title}</h3>
        {desc && <p className="section-card-desc">{desc}</p>}
      </div>
      <div className="section-card-body">{children}</div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CreateExam() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("Beginner");
  const [duration, setDuration] = useState(30);
  const [numQuestions, setNumQuestions] = useState(10);
  const [creationMode, setCreationMode] = useState<"ai" | "manual" | "file">("ai");
  const [proctoringEnabled, setProctoringEnabled] = useState(true);
  const [proctoringType, setProctoringType] = useState<ProctoringType>("video");
  const [passingScore, setPassingScore] = useState(50);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [aiTipIndex, setAiTipIndex] = useState(0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        let parsedQuestions: Question[] = [];
        
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(text);
          parsedQuestions = Array.isArray(data) ? data : data.questions || [];
        } else {
           const lines = text.split('\n').filter(l => l.trim().length > 0);
           for(let i=1; i<lines.length; i++) {
              const row = lines[i].split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
              if(!row[0] || !row[1]) continue;
              let options = [];
              options.push({text: row[1], is_correct: row[5]?.toUpperCase() === 'A'});
              options.push({text: row[2], is_correct: row[5]?.toUpperCase() === 'B'});
              if(row[3]) options.push({text: row[3], is_correct: row[5]?.toUpperCase() === 'C'});
              if(row[4]) options.push({text: row[4], is_correct: row[5]?.toUpperCase() === 'D'});
              parsedQuestions.push({
                 text: row[0],
                 options
              });
           }
        }
        
        if (parsedQuestions.length > 0) {
           setQuestions(parsedQuestions);
        } else {
           throw new Error("No questions found");
        }
      } catch (err) {
        setPopup({ isOpen: true, type: "alert", title: "Error", message: "Failed to parse file. Ensure it is a valid format.", onConfirm: () => setPopup(null) });
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };
  const [popup, setPopup] = useState<{
    isOpen: boolean; type: PopupType; title?: string;
    message: string; onConfirm: () => void; onCancel?: () => void;
  } | null>(null);

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setAiTipIndex(i => (i + 1) % AI_TIPS.length), 2500);
    return () => clearInterval(id);
  }, [loading]);

  const getToken = () => localStorage.getItem("access_token");
  const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` });

  const buildPayload = () => ({
    title, topic: subject, difficulty, duration,
    num_questions: numQuestions,
    proctoring_enabled: proctoringEnabled,
    proctoring_type: proctoringType,
    passing_score: passingScore,
  });

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim() || !subject.trim()) return;
    
    if (creationMode === "manual") {
      setQuestions([{
        text: "New Question",
        options: [
          { text: "Option A", is_correct: true },
          { text: "Option B", is_correct: false },
        ]
      }]);
      setEditingIdx(0);
      return;
    }
    
    if (creationMode === "file") {
      document.getElementById('exam-upload-input')?.click();
      return;
    }
    
    setLoading(true);
    setQuestions(null);
    try {
      const res = await fetch(`${API_BASE_URL}/exams/preview`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) throw new Error();
      setQuestions(await res.json());
    } catch {
      setPopup({
        isOpen: true, type: "alert", title: "Generation Failed",
        message: "Failed to generate exam questions. Please try again.",
        onConfirm: () => setPopup(null)
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!questions) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/exams`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ ...buildPayload(), questions }),
      });
      if (!res.ok) throw new Error();
      setPopup({
        isOpen: true, type: "alert", title: "Published",
        message: "Exam has been saved and is ready to deploy.",
        onConfirm: () => navigate("/manage-exams")
      });
    } catch {
      setPopup({
        isOpen: true, type: "alert", title: "Save Failed",
        message: "Failed to save the exam. Please try again.",
        onConfirm: () => setPopup(null)
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = (idx: number) =>
    setQuestions(prev => prev?.filter((_, i) => i !== idx) ?? null);

  const activeStep: StepId = loading ? "generating" : questions ? "review" : "configure";

  return (
    <AdminLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');

        :root {
          --ink:        var(--text);
          --ink-2:      color-mix(in srgb, var(--text) 80%, var(--bg));
          --ink-3:      var(--text-muted);
          --line:       var(--border);
          --bg:         var(--bg-neutral);
          --white:      var(--bg);
          --teal:       var(--primary);
          --teal-hover: var(--primary-hover);
          --teal-light: color-mix(in srgb, var(--primary) 10%, var(--bg));
          --teal-mid:   color-mix(in srgb, var(--primary) 30%, var(--bg));
          --danger:     #dc2626;
          --danger-bg:  color-mix(in srgb, #dc2626 10%, var(--bg));
          --danger-ln:  color-mix(in srgb, #dc2626 30%, var(--bg));
          --success:    #15803d;
          --success-bg: color-mix(in srgb, #15803d 10%, var(--bg));
          --success-ln: color-mix(in srgb, #15803d 30%, var(--bg));
          --font-serif: 'DM Serif Display', serif;
          --font-sans:  'DM Sans', sans-serif;
          --font-mono:  'JetBrains Mono', monospace;
          --radius:     10px;
          --radius-sm:  6px;
          --radius-lg:  14px;
          --shadow-sm:  var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.05));
          --shadow-md:  var(--shadow, 0 4px 16px rgba(0,0,0,0.1));
          --transition: 0.2s cubic-bezier(0.4,0,0.2,1);
        }

        *, *::before, *::after { box-sizing: border-box; }

        /* ── Shell ───────────────────────────────────────────────────── */
        .ce-page {
          min-height: 100vh;
          background: var(--bg);
          font-family: var(--font-sans);
          color: var(--ink);
          padding: 28px;
        }

        @media (max-width: 768px) { .ce-page { padding: 16px; } }

        .ce-container {
          max-width: 860px;
          margin: 0 auto;
          animation: ceIn 0.35s ease;
        }

        @keyframes ceIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Top Bar ─────────────────────────────────────────────────── */
        .ce-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          gap: 16px;
          flex-wrap: wrap;
        }

        .ce-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ce-brand-icon {
          width: 40px;
          height: 40px;
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--teal);
          box-shadow: var(--shadow-sm);
          flex-shrink: 0;
        }

        .ce-brand-title {
          font-family: var(--font-serif);
          font-size: 20px;
          color: var(--ink);
          margin: 0;
          letter-spacing: -0.01em;
        }

        .ce-brand-subtitle {
          font-size: 12px;
          color: var(--ink-3);
          margin: 2px 0 0;
        }

        /* ── Step Bar ────────────────────────────────────────────────── */
        .step-bar {
          display: flex;
          align-items: center;
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 10px 16px;
          margin-bottom: 24px;
          box-shadow: var(--shadow-sm);
          overflow-x: auto;
          gap: 0;
        }

        .step {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-3);
          white-space: nowrap;
          transition: background var(--transition), color var(--transition);
        }

        .step--active {
          background: var(--teal-light);
          color: var(--teal);
        }

        .step--done { color: var(--success); }

        .step-num {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 1px solid currentColor;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .step--active .step-num {
          background: var(--teal);
          color: var(--white);
          border-color: var(--teal);
        }

        .step--done .step-num {
          background: var(--success-bg);
          border-color: var(--success-ln);
          color: var(--success);
        }

        .step-sep {
          flex: 1;
          height: 1px;
          background: var(--line);
          min-width: 16px;
          max-width: 40px;
        }

        /* ── Section Card ────────────────────────────────────────────── */
        .section-card {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          margin-bottom: 16px;
          box-shadow: var(--shadow-sm);
          overflow: hidden;
        }

        .section-card-header {
          padding: 20px 24px 0;
        }

        .section-card-title {
          font-family: var(--font-serif);
          font-size: 17px;
          color: var(--ink);
          margin: 0 0 4px;
          letter-spacing: -0.01em;
        }

        .section-card-desc {
          font-size: 13px;
          color: var(--ink-3);
          margin: 0 0 0;
          line-height: 1.5;
        }

        .section-card-body {
          padding: 20px 24px 24px;
        }

        /* ── Form Fields ─────────────────────────────────────────────── */
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--ink-2);
          letter-spacing: 0.02em;
        }

        .form-input {
          height: 40px;
          padding: 0 14px;
          border: 1px solid var(--line);
          border-radius: var(--radius-sm);
          background: var(--bg);
          color: var(--ink);
          font-family: var(--font-sans);
          font-size: 14px;
          font-weight: 500;
          outline: none;
          transition: border-color var(--transition), background var(--transition), box-shadow var(--transition);
        }

        .form-input::placeholder { color: #b0bec5; }

        .form-input:focus {
          background: var(--white);
          border-color: var(--teal);
          box-shadow: 0 0 0 3px rgba(15,113,115,0.1);
        }

        /* ── Difficulty Cards ────────────────────────────────────────── */
        .diff-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
        }

        @media (max-width: 600px) { .diff-grid { grid-template-columns: 1fr; } }

        .diff-card {
          padding: 16px;
          border: 1.5px solid var(--line);
          border-radius: var(--radius);
          cursor: pointer;
          transition: border-color var(--transition), box-shadow var(--transition), background var(--transition);
          background: var(--white);
        }

        .diff-card:hover {
          border-color: var(--teal-mid);
          background: var(--teal-light);
        }

        .diff-card--active {
          border-color: var(--teal) !important;
          background: var(--teal-light) !important;
          box-shadow: 0 0 0 3px rgba(15,113,115,0.08);
        }

        .diff-card-name {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .diff-card-desc {
          font-size: 12.5px;
          color: var(--ink-3);
          line-height: 1.4;
        }

        /* ── Proctoring Toggle ───────────────────────────────────────── */
        .proctor-toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: var(--bg);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          margin-bottom: 16px;
        }

        .proctor-toggle-label { font-size: 14px; font-weight: 600; color: var(--ink); }
        .proctor-toggle-sub   { font-size: 12px; color: var(--ink-3); margin-top: 2px; }

        .toggle-switch { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-track {
          position: absolute; cursor: pointer; inset: 0;
          background: var(--line); border-radius: 22px;
          transition: background var(--transition);
        }
        .toggle-thumb {
          position: absolute; content: "";
          height: 16px; width: 16px;
          left: 3px; bottom: 3px;
          background: white; border-radius: 50%;
          transition: transform var(--transition);
          pointer-events: none;
        }
        .toggle-switch input:checked ~ .toggle-track { background: var(--teal); }
        .toggle-switch input:checked ~ .toggle-thumb { transform: translateX(18px); }

        .proctor-options {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }

        @media (max-width: 600px) { .proctor-options { grid-template-columns: 1fr; } }

        .proctor-card {
          padding: 14px;
          border: 1.5px solid var(--line);
          border-radius: var(--radius);
          cursor: pointer;
          text-align: center;
          transition: all var(--transition);
          background: var(--white);
        }

        .proctor-card:hover { border-color: var(--teal-mid); background: var(--teal-light); }
        .proctor-card--active { border-color: var(--teal) !important; background: var(--teal-light) !important; }

        .proctor-card-icon  { font-size: 20px; margin-bottom: 6px; }
        .proctor-card-label { font-size: 13px; font-weight: 700; color: var(--ink); }
        .proctor-card-desc  { font-size: 11.5px; color: var(--ink-3); margin-top: 2px; }

        /* ── Action Buttons ──────────────────────────────────────────── */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-family: var(--font-sans);
          font-weight: 600;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition);
          outline: none;
          border: 1px solid transparent;
          white-space: nowrap;
        }

        .file-upload-box {
          border: 2px dashed var(--line);
          border-radius: var(--radius-lg);
          padding: 48px 32px;
          text-align: center;
          margin-top: 16px;
          background: var(--bg);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          position: relative;
          overflow: hidden;
        }

        .file-upload-box:hover {
          border-color: var(--teal);
          background: var(--teal-light);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .file-upload-icon-container {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: var(--teal-light);
          color: var(--teal);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
          transition: transform 0.3s ease;
        }

        .file-upload-box:hover .file-upload-icon-container {
          transform: scale(1.1) rotate(5deg);
        }

        .file-upload-text {
          font-size: 16px;
          font-weight: 700;
          color: var(--ink);
          margin-bottom: 4px;
        }

        .file-upload-sub {
          font-size: 13px;
          color: var(--ink-3);
          max-width: 260px;
          line-height: 1.5;
        }

        .file-upload-hint {
          margin-top: 12px;
          font-size: 11px;
          font-weight: 700;
          color: var(--teal);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: color-mix(in srgb, var(--teal) 10%, transparent);
          padding: 4px 12px;
          border-radius: 100px;
        }

        .btn-generate {
          flex: 1;
          height: 44px;
          font-size: 14px;
          background: var(--teal);
          color: var(--white);
          border-color: var(--teal);
          box-shadow: 0 2px 8px rgba(15,113,115,0.25);
        }

        .btn-generate:hover:not(:disabled) {
          background: var(--teal-hover);
          box-shadow: 0 4px 16px rgba(15,113,115,0.35);
          transform: translateY(-1px);
        }

        .btn-generate:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-outline {
          height: 44px;
          padding: 0 20px;
          font-size: 13px;
          background: var(--white);
          color: var(--ink-3);
          border-color: var(--line);
        }

        .btn-outline:hover { border-color: var(--ink-3); color: var(--ink); }

        .btn-publish {
          height: 38px;
          padding: 0 20px;
          font-size: 13px;
          background: var(--teal);
          color: var(--white);
          box-shadow: 0 2px 8px rgba(15,113,115,0.2);
        }

        .btn-publish:hover:not(:disabled) {
          background: var(--teal-hover);
          transform: translateY(-1px);
        }

        .btn-publish:disabled { opacity: 0.55; cursor: not-allowed; }

        .btn-secondary {
          height: 38px;
          padding: 0 16px;
          font-size: 13px;
          background: var(--white);
          color: var(--ink-2);
          border-color: var(--line);
        }

        .btn-secondary:hover { border-color: var(--ink-3); }

        .btn-back {
          height: 34px;
          padding: 0 14px;
          font-size: 13px;
          background: var(--white);
          color: var(--ink-3);
          border-color: var(--line);
          margin-bottom: 20px;
        }

        .btn-back:hover { border-color: var(--teal); color: var(--teal); background: var(--teal-light); }

        .btn-row {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        /* ── Loading State ───────────────────────────────────────────── */
        .ce-loading {
          text-align: center;
          padding: 80px 24px;
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
        }

        .ce-spinner {
          width: 40px;
          height: 40px;
          border: 2.5px solid var(--line);
          border-top-color: var(--teal);
          border-radius: 50%;
          animation: spin 0.9s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .ce-loading-title {
          font-family: var(--font-serif);
          font-size: 20px;
          color: var(--ink);
          margin: 0 0 8px;
          letter-spacing: -0.01em;
        }

        .ce-loading-tip {
          font-size: 13.5px;
          color: var(--ink-3);
          margin: 0;
          min-height: 20px;
          transition: opacity 0.4s;
        }

        /* ── Summary Bar ─────────────────────────────────────────────── */
        .summary-bar {
          display: flex;
          gap: 0;
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          overflow: hidden;
          margin-bottom: 16px;
          box-shadow: var(--shadow-sm);
        }

        .summary-item {
          flex: 1;
          padding: 14px 18px;
          border-right: 1px solid var(--line);
        }

        .summary-item:last-child { border-right: none; }

        .summary-label {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--ink-3);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 3px;
        }

        .summary-value {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--ink);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Review Header ───────────────────────────────────────────── */
        .review-header {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          box-shadow: var(--shadow-sm);
          gap: 12px;
          flex-wrap: wrap;
        }

        .review-title {
          font-family: var(--font-serif);
          font-size: 17px;
          color: var(--ink);
          margin: 0;
          letter-spacing: -0.01em;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .review-title-accent {
          width: 3px;
          height: 18px;
          background: var(--teal);
          border-radius: 2px;
        }

        .review-actions { display: flex; gap: 10px; }

        /* ── Question Card ───────────────────────────────────────────── */
        .q-card {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          padding: 24px;
          margin-bottom: 12px;
          transition: border-color var(--transition), box-shadow var(--transition);
        }

        .q-card:hover {
          border-color: var(--teal-mid);
          box-shadow: var(--shadow-md);
        }

        .q-header {
          display: flex;
          gap: 14px;
          margin-bottom: 20px;
          align-items: flex-start;
        }

        .q-num {
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
          background: var(--bg);
          border: 1px solid var(--line);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 700;
          color: var(--ink-3);
          flex-shrink: 0;
        }

        .q-text {
          font-size: 15px;
          font-weight: 600;
          line-height: 1.6;
          color: var(--ink);
          flex: 1;
        }

        .q-delete {
          width: 30px;
          height: 30px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--line);
          background: var(--white);
          color: var(--ink-3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition);
          outline: none;
          flex-shrink: 0;
        }

        .q-delete:hover {
          background: var(--danger-bg);
          border-color: var(--danger-ln);
          color: var(--danger);
        }

        .opt-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        @media (max-width: 540px) { .opt-grid { grid-template-columns: 1fr; } }

        .opt {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          border: 1px solid var(--line);
          border-radius: var(--radius-sm);
          background: var(--bg);
          font-size: 13.5px;
          color: var(--ink-2);
          line-height: 1.45;
        }

        .opt--correct {
          background: var(--success-bg);
          border-color: var(--success-ln);
          color: var(--success);
          font-weight: 600;
        }

        .opt-letter {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
          margin-top: 1px;
          opacity: 0.7;
        }

        .q-explanation {
          margin-top: 16px;
          padding: 14px 16px;
          background: var(--teal-light);
          border-left: 3px solid var(--teal);
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
          font-size: 13px;
          color: var(--ink-2);
          line-height: 1.6;
        }

        .q-explanation strong {
          color: var(--teal);
          font-weight: 700;
        }
      `}</style>

      <div className="ce-page">
        <div className="ce-container">

          {/* Top Bar */}
          <div className="ce-topbar">
            <div className="ce-brand">
              <div className="ce-brand-icon"><Icons.Brain /></div>
              <div>
                <h1 className="ce-brand-title">AI Exam Generator</h1>
                <p className="ce-brand-subtitle">Configure, preview, and publish assessments</p>
              </div>
            </div>
            <button className="btn btn-outline" onClick={() => navigate("/manage-exams")}>
              <Icons.X /> Cancel
            </button>
          </div>

          {/* Step Bar */}
          <StepBar active={activeStep} />

          {/* ── Step 1: Configure ─────────────────────────────────────── */}
          {activeStep === "configure" && (
            <form onSubmit={handleGenerate}>
              <SectionCard
                title="Creation Method"
                desc="Choose how you want to build this assessment."
              >
                <div className="diff-grid" style={{ marginBottom: creationMode === 'file' ? 0 : 20 }}>
                  <div className={`diff-card ${creationMode === 'manual' ? "diff-card--active" : ""}`} onClick={() => setCreationMode('manual')}>
                    <div className="diff-card-name" style={{ color: 'var(--ink)' }}>✋ Manual Entry</div>
                    <div className="diff-card-desc">Start from scratch and build your questions completely by hand.</div>
                  </div>
                  <div className={`diff-card ${creationMode === 'ai' ? "diff-card--active" : ""}`} onClick={() => setCreationMode('ai')}>
                    <div className="diff-card-name" style={{ color: 'var(--teal)' }}>✨ AI Generation</div>
                    <div className="diff-card-desc">Automatically generate questions using our AI engine based on topic.</div>
                  </div>
                  <div className={`diff-card ${creationMode === 'file' ? "diff-card--active" : ""}`} onClick={() => setCreationMode('file')}>
                    <div className="diff-card-name" style={{ color: 'var(--ink)' }}>📁 Upload File</div>
                    <div className="diff-card-desc">Import existing questions from a CSV, Excel, or JSON document.</div>
                  </div>
                </div>

                {creationMode === 'file' && (
                  <div className="file-upload-box" onClick={() => document.getElementById('exam-upload-input')?.click()}>
                    <input type="file" id="exam-upload-input" style={{ display: 'none' }} accept=".csv,.xlsx,.json" onChange={handleFileUpload} />
                    <div className="file-upload-icon-container">
                      <Icons.Upload />
                    </div>
                    <div className="file-upload-text">Import Assessment Data</div>
                    <div className="file-upload-sub">Drag and drop your files here, or click to browse from your computer</div>
                    <div className="file-upload-hint">Supports .JSON, .CSV, and .XLSX</div>
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Exam Details"
                desc="Define the title, subject topic, and session parameters."
              >
                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label">Exam Title</label>
                    <input className="form-input" value={title} onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. Advanced Python Patterns" required />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Subject Topic</label>
                    <input className="form-input" value={subject} onChange={e => setSubject(e.target.value)}
                      placeholder="e.g. React Hooks & Performance" required />
                  </div>
                </div>
                <div className="form-grid" style={{ marginBottom: 0 }}>
                  <div className="form-field">
                    <label className="form-label">Duration (minutes)</label>
                    <input className="form-input" type="text" value={duration}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, "");
                        setDuration(val ? Number(val) : 0);
                      }} required />
                  </div>
                  {creationMode === 'ai' && (
                    <div className="form-field">
                      <label className="form-label">Number of Questions</label>
                      <input className="form-input" type="text" value={numQuestions}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, "");
                          setNumQuestions(val ? Number(val) : 0);
                        }} required />
                    </div>
                  )}
                  <div className="form-field">
                    <label className="form-label">Passing Score (%)</label>
                    <input className="form-input" type="text" value={passingScore}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, "");
                        const num = val ? Number(val) : 0;
                        setPassingScore(num > 100 ? 100 : num);
                      }} required placeholder="e.g. 50" />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Difficulty Level"
                desc="Select the cognitive complexity for generated questions."
              >
                <div className="diff-grid">
                  {(Object.keys(DIFFICULTY_MAP) as DifficultyLevel[]).map(level => {
                    const cfg = DIFFICULTY_MAP[level];
                    return (
                      <div
                        key={level}
                        className={`diff-card ${difficulty === level ? "diff-card--active" : ""}`}
                        onClick={() => setDifficulty(level)}
                      >
                        <div className="diff-card-name" style={{ color: cfg.color }}>{cfg.label}</div>
                        <div className="diff-card-desc">{cfg.description}</div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard
                title="Proctoring"
                desc="Configure AI monitoring for candidate sessions."
              >
                <div className="proctor-toggle-row">
                  <div>
                    <div className="proctor-toggle-label">Enable Proctoring</div>
                    <div className="proctor-toggle-sub">Webcam and browser state monitoring</div>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={proctoringEnabled}
                      onChange={e => setProctoringEnabled(e.target.checked)} />
                    <div className="toggle-track" />
                    <div className="toggle-thumb" />
                  </label>
                </div>

                {proctoringEnabled && (
                  <div className="proctor-options">
                    {PROCTORING_OPTIONS.map(opt => (
                      <div
                        key={opt.value}
                        className={`proctor-card ${proctoringType === opt.value ? "proctor-card--active" : ""}`}
                        onClick={() => setProctoringType(opt.value)}
                      >
                        <div className="proctor-card-icon">{opt.icon}</div>
                        <div className="proctor-card-label">{opt.label}</div>
                        <div className="proctor-card-desc">{opt.desc}</div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <div className="btn-row">
                <button className="btn btn-generate" type="submit"
                  disabled={!title.trim() || !subject.trim()}>
                  {creationMode === 'ai' ? <><Icons.Sparkles /> Generate AI Exam</> : creationMode === 'manual' ? <><Icons.Check /> Start Manual Entry</> : <><Icons.Check /> Process Uploaded File</>}
                </button>
              </div>
            </form>
          )}

          {/* ── Step 2: Generating ────────────────────────────────────── */}
          {activeStep === "generating" && (
            <div className="ce-loading">
              <div className="ce-spinner" />
              <h2 className="ce-loading-title">Generating your exam…</h2>
              <p className="ce-loading-tip">{AI_TIPS[aiTipIndex]}</p>
            </div>
          )}

          {/* ── Step 3: Review ────────────────────────────────────────── */}
          {activeStep === "review" && questions && (
            <>
              <button className="btn btn-back" onClick={() => setQuestions(null)}>
                <Icons.ChevronLeft /> Back to Configuration
              </button>

              {/* Summary */}
              <div className="summary-bar">
                {[
                  { label: "Title", value: title },
                  { label: "Topic", value: subject },
                  { label: "Difficulty", value: difficulty },
                  { label: "Questions", value: `${questions.length}` },
                  { label: "Duration", value: `${duration} min` },
                ].map(item => (
                  <div key={item.label} className="summary-item">
                    <div className="summary-label">{item.label}</div>
                    <div className="summary-value">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Review Header */}
              <div className="review-header">
                <h2 className="review-title">
                  <span className="review-title-accent" />
                  {creationMode === 'manual' ? 'Build Questions' : 'Review Questions'}
                </h2>
                <div className="review-actions">
                  {creationMode === 'ai' && (
                    <button className="btn btn-secondary" onClick={() => handleGenerate()}>
                      <Icons.Refresh /> Regenerate
                    </button>
                  )}
                  <button className="btn btn-publish" onClick={handleFinalSubmit} disabled={saving || (questions.length === 0)}>
                    {saving
                      ? <><div className="ce-spinner" style={{ width: 13, height: 13, margin: 0, borderWidth: 2, opacity: 0.6 }} /> Publishing…</>
                      : <><Icons.Check /> Publish Exam</>
                    }
                  </button>
                </div>
              </div>

              {/* Question Cards */}
              {questions.map((q, idx) => (
                <div className="q-card" key={idx}>
                  {editingIdx === idx ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                         <input className="form-input" style={{ fontWeight: 600, fontSize: 16 }} value={q.text} onChange={e => {
                            const nq = [...questions]; nq[idx].text = e.target.value; setQuestions(nq);
                         }} placeholder="Question Text" />
                         
                         <div style={{ paddingLeft: 10, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                             {q.options.map((opt, oIdx) => (
                                 <div key={oIdx} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <input type="radio" checked={opt.is_correct} style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }} onChange={() => {
                                       const nq = [...questions];
                                       nq[idx].options = nq[idx].options.map((o, i) => ({...o, is_correct: i === oIdx}));
                                       setQuestions(nq);
                                    }} />
                                    <input className="form-input" style={{ flex: 1 }} value={opt.text} onChange={e => {
                                       const nq = [...questions]; nq[idx].options[oIdx].text = e.target.value; setQuestions(nq);
                                    }} placeholder={`Option ${String.fromCharCode(65 + oIdx)}`} />
                                    <button className="q-delete" type="button" onClick={() => {
                                       const nq = [...questions]; nq[idx].options.splice(oIdx, 1); setQuestions(nq);
                                    }}><Icons.Trash /></button>
                                 </div>
                             ))}
                         </div>
                         
                         <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                            <button className="btn btn-secondary" type="button" onClick={() => {
                               const nq = [...questions]; nq[idx].options.push({text: "", is_correct: false}); setQuestions(nq);
                            }}><Icons.Plus /> Add Option</button>
                            <button className="btn btn-publish" type="button" style={{ marginLeft: 'auto' }} onClick={() => setEditingIdx(null)}>
                               <Icons.Save /> Save Question
                            </button>
                         </div>
                      </div>
                  ) : (
                    <>
                      <div className="q-header">
                        <div className="q-num">{idx + 1}</div>
                        <div className="q-text">{q.text}</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="q-delete" type="button" onClick={() => setEditingIdx(idx)} title="Edit question">
                            <Icons.Edit />
                          </button>
                          <button className="q-delete" type="button" onClick={() => deleteQuestion(idx)} title="Remove question">
                            <Icons.Trash />
                          </button>
                        </div>
                      </div>

                      <div className="opt-grid">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className={`opt ${opt.is_correct ? "opt--correct" : ""}`}>
                            <span className="opt-letter">{String.fromCharCode(65 + oIdx)}.</span>
                            {opt.text}
                          </div>
                        ))}
                      </div>

                      {q.explanation && (
                        <div className="q-explanation">
                          <strong>Explanation: </strong>{q.explanation}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
              
              {creationMode !== 'ai' && (
                 <button className="btn btn-secondary" type="button" style={{ width: '100%', marginBottom: 20, padding: 16, borderStyle: 'dashed' }} onClick={() => {
                     setQuestions(prev => [...(prev||[]), { text: "New Question", options: [{text: "Option A", is_correct: true}, {text: "Option B", is_correct: false}] }]);
                     setEditingIdx((questions?.length || 0));
                 }}>
                     <Icons.Plus /> Add Another Question
                 </button>
              )}
            </>
          )}
        </div>
      </div>

      {popup && (
        <CustomPopup
          isOpen={popup.isOpen}
          type={popup.type}
          title={popup.title}
          message={popup.message}
          onConfirm={popup.onConfirm}
          onCancel={popup.onCancel}
        />
      )}
    </AdminLayout>
  );
}