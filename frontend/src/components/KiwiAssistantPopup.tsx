import React, { useState, useEffect, useRef } from "react";
import "./KiwiAssistantPopup.css";

interface QAData {
    id: string;
    question: string;
    subtitle: string;
    answer: string;
    subQuestions?: QAData[];
    icon: string;
}

const FAQ_DATA: QAData[] = [
    {
        id: "create_exam",
        question: "Create New Exam",
        subtitle: "Setup, Question Bank & Uploads",
        icon: "📋",
        answer: "To create an exam, go to the <b>Create Exam</b> module. You can pick questions from the Question Bank, add them manually, or use the <b>Bulk Upload</b> feature (JSON/CSV).",
        subQuestions: [
            { id: "ce1", icon: "➕", question: "Manual Creation", subtitle: "Define titles & rules", answer: "Our wizard guides you through setting titles, time limits, and specific exam rules step-by-step." },
            { id: "ce2", icon: "📤", question: "Bulk Import", subtitle: "Using JSON or CSV files", answer: "You can import questions using the <b>JSON/CSV Upload</b> tool. Ensure your file follows the required schema as shown in the documentation." }
        ]
    },
    {
        id: "proctoring",
        question: "Proctoring Logic",
        subtitle: "AI Verification & Tab tracking",
        icon: "🥝",
        answer: "Our smart proctoring includes <b>Webcam monitoring</b>, <b>Face detection</b>, and <b>Tab-switch tracking</b>. If a candidate switches tabs, it's logged and they may be cautioned or eliminated.",
        subQuestions: [
            { id: "p1", icon: "🤳", question: "Face Detection", subtitle: "Real-time identity check", answer: "The system monitors the webcam in real-time to ensure the candidate remains present and no unauthorized persons are visible." },
            { id: "p2", icon: "🌐", question: "Tab Monitoring", subtitle: "Log visibility changes", answer: "The system detects when a browser tab is switched or the window is minimized, acting as a deterrent to cheating." }
        ]
    },
    {
        id: "enrollment",
        question: "Candidate Management",
        subtitle: "Invites, Bulk Enrollment & Status",
        icon: "👥",
        answer: "Candidates are managed in the <b>Candidate Management</b> section. You can enroll them individually, send email invites, and track their status in real-time.",
        subQuestions: [
            { id: "cn1", icon: "📧", question: "Email Invites", subtitle: "Individual or group invites", answer: "Send unique exam links directly to candidate emails from the dashboard to start the testing process." },
            { id: "cn2", icon: "📈", question: "Live Tracking", subtitle: "Monitor progress in real-time", answer: "See which candidates have started, are in-progress, or have successfully submitted their assessments." }
        ]
    },
    {
        id: "reports",
        question: "Results & Reports",
        subtitle: "Analysis, Scores & Logs",
        icon: "📊",
        answer: "Detailed results are available in the <b>Results & Reports</b> section. You can view category-wise performance, proctoring logs, and pass/fail analysis for every candidate.",
        subQuestions: [
            { id: "r1", icon: "📑", question: "Categorized Scores", subtitle: "Analyze strengths & gaps", answer: "View performance breakdowns across different subject categories to identify where candidates excel or struggle." },
            { id: "r2", icon: "🕵️", question: "Proctoring Logs", subtitle: "Review flag timestamps", answer: "Audit every security flag raised during the exam, complete with timestamps and visual context where applicable." }
        ]
    },
    {
        id: "otp",
        question: "Master OTP System",
        subtitle: "Security & Verification Codes",
        icon: "🔐",
        answer: "The <b>Master OTP</b> is a rotating code displayed on your Admin Dashboard. Share this with candidates during enrollment to verify their identity.",
        subQuestions: [
            { id: "o1", icon: "🔑", question: "How it works", subtitle: "Shared via OTP field", answer: "The admin provides the code verbally or via message. The candidate enters it during enrollment to proceed into the exam environment." }
        ]
    }
];

interface KiwiAssistantPopupProps {
    isOpen: boolean;
    onClose: () => void;
}

const KiwiAssistantPopup: React.FC<KiwiAssistantPopupProps> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<{ text: string; sender: "ai" | "user"; timestamp: string }[]>([]);
    const [currentOptions, setCurrentOptions] = useState<QAData[]>(FAQ_DATA);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messages.length === 0) {
            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
            setMessages([{ text: "Hi! I'm your KiwiAssistant Guide.<br/>Select a topic to explore our documentation! 🥝", sender: "ai", timestamp: now }]);
        }
    }, [messages]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSelectOption = (option: QAData) => {
        setSelectedId(option.id);
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
        
        setMessages(prev => [...prev, { text: option.question, sender: "user", timestamp: now }]);

        setTimeout(() => {
            const aiNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
            setMessages(prev => [...prev, { text: option.answer, sender: "ai", timestamp: aiNow }]);
            
            if (option.subQuestions && option.subQuestions.length > 0) {
                setCurrentOptions(option.subQuestions);
                setSelectedId(null);
            } else {
                setTimeout(() => {
                    setCurrentOptions(FAQ_DATA);
                    setSelectedId(null);
                }, 1000);
            }
        }, 300);
    };

    const resetChat = () => {
        setMessages([]);
        setCurrentOptions(FAQ_DATA);
        setSelectedId(null);
    };

    if (!isOpen) return null;

    return (
        <div className="custom-kap-container">
            <div className="custom-kap-header">
                <div className="custom-kap-header-left">
                    <div className="custom-kap-avatar-wrap">
                        <span className="custom-kap-main-kiwi">🥝</span>
                    </div>
                    <div className="custom-kap-brand">
                        <span className="custom-kap-bot-name">KiwiAssistant</span>
                        <div className="custom-kap-status">
                            <span className="custom-kap-dot"></span>
                            <span>Guide Online</span>
                        </div>
                    </div>
                </div>
                <div className="custom-kap-header-right">
                    <button className="custom-kap-tile-btn" onClick={resetChat} title="Restart Guide">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><polyline points="21 3 21 8 16 8"/></svg>
                    </button>
                    <button className="custom-kap-tile-btn" onClick={onClose} title="Hide Assistant">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            </div>

            <div className="custom-kap-chat-body" ref={scrollRef}>
                {messages.map((m, i) => (
                    <div key={i} className={`custom-kap-msg-row ${m.sender}`}>
                        {m.sender === "ai" && <div className="custom-kap-bot-pfp">🥝</div>}
                        <div className="custom-kap-bubble-group">
                            <div className={`custom-kap-bubble ${m.sender}`} dangerouslySetInnerHTML={{ __html: m.text }} />
                            <span className="custom-kap-timestamp">{m.timestamp}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="custom-kap-topics-section">
                <div className="custom-kap-section-lbl">GUIDE CATEGORIES</div>
                <div className="custom-kap-topics-list">
                    {currentOptions.map((opt) => (
                        <button 
                            key={opt.id} 
                            className={`custom-kap-topic-btn ${selectedId ? (selectedId === opt.id ? 'highlighted' : 'dimmed') : ''}`}
                            onClick={() => handleSelectOption(opt)}
                        >
                            <div className="custom-kap-opt-badge">{opt.icon}</div>
                            <div className="custom-kap-opt-info">
                                <span className="custom-kap-opt-q">{opt.question}</span>
                                <span className="custom-kap-opt-sub">{opt.subtitle}</span>
                            </div>
                            <span className="custom-kap-chevron">›</span>
                        </button>
                    ))}
                    {currentOptions !== FAQ_DATA && (
                        <button className="custom-kap-topic-btn back" onClick={() => { setCurrentOptions(FAQ_DATA); setSelectedId(null); }}>
                             <div className="custom-kap-opt-badge">↺</div>
                             <div className="custom-kap-opt-info">
                                <span className="custom-kap-opt-q">Main Documentation</span>
                                <span className="custom-kap-opt-sub">Back to initial guide</span>
                            </div>
                        </button>
                    )}
                </div>
            </div>

            <div className="custom-kap-footer">
                <span>Synchronized with latest KiwiQA User Guide documentation ✨</span>
            </div>
        </div>
    );
};

export default KiwiAssistantPopup;
