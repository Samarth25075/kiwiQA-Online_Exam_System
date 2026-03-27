import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import CustomPopup, { PopupType } from "../components/CustomPopup";
import API_BASE_URL from "../config";

const Icons = {
    Check: ({ size = 14 }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
    ),
    Trash: ({ size = 14 }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
    ),
    ChevronLeft: ({ size = 14 }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
    ),
    Merge: ({ size = 14 }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><circle cx="3" cy="6" r="1"></circle><circle cx="3" cy="12" r="1"></circle><circle cx="3" cy="18" r="1"></circle></svg>
    ),
    Plus: ({ size = 14 }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
    ),
    Layers: ({ size = 14 }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
    ),
    Shield: ({ size = 14 }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
    ),
    Copy: ({ size = 14 }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
    )
};


interface Option {
    text: string;
    is_correct: boolean;
}

interface Question {
    text: string;
    options: Option[];
    explanation?: string;
}

interface Exam {
    id: string;
    title: string;
    topic: string;
    difficulty: string;
    duration: number;
    num_questions?: number;
    created_at?: string;
    total_assigned?: number;
    completed?: number;
    avg_incorrect?: number;
    total_incorrect?: number;
    questions?: Question[];
    proctoring_enabled: boolean;
    proctoring_type: string;
    auto_delete?: string;
}

export default function ManageExams() {
    const navigate = useNavigate();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedExamIds, setSelectedExamIds] = useState<Set<string>>(new Set());
    const [mergedExam, setMergedExam] = useState<Partial<Exam> | null>(null);
    const [saving, setSaving] = useState(false);

    const [popup, setPopup] = useState<{ isOpen: boolean; type: PopupType; title?: string; message: string; onConfirm: () => void; onCancel?: () => void; confirmText?: string; } | null>(null);

    useEffect(() => {
        fetchExams(true); // Bypass cache on initial load to ensure new fields are loaded
        const bc = new BroadcastChannel("exam_portal_updates");
        bc.onmessage = (msg) => {
            if (msg.data === "refresh_dashboard") {
                console.log("INFO: Refreshing Management UI due to cross-tab update");
                fetchExams(true); // Bypass cache on notification
            }
        };

        return () => bc.close();
    }, []);

    const fetchExams = async (bypassCache: boolean = false) => {
        const token = sessionStorage.getItem("access_token");
        if (!token) { navigate("/"); return; }
        try {
            const url = new URL(`${API_BASE_URL}/exams/stats`);
            if (bypassCache) url.searchParams.append("bypass_cache", "true");
            url.searchParams.append("v", Date.now().toString()); // Cache breaker

            const res = await fetch(url.toString(), {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.status === 401) {
                sessionStorage.removeItem("access_token");
                sessionStorage.removeItem("admin-profile");
                navigate("/");
                return;
            }

            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) setExams(data);
            }
        } catch {
            console.error("Failed to fetch exams");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setPopup({
            isOpen: true,
            type: 'confirm',
            title: 'Delete Exam',
            message: 'Are you sure you want to delete this exam?',
            confirmText: 'Delete',
            onConfirm: async () => {
                setPopup(null);
                const token = sessionStorage.getItem("access_token");
                try {
                    const res = await fetch(`${API_BASE_URL}/exams/${id}`, {
                        method: "DELETE",
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    if (res.ok) {
                        // Optimistically remove from state
                        setExams(prev => prev.filter(e => e.id !== id));
                        setSelectedExamIds(prev => {
                            const next = new Set(prev);
                            next.delete(id);
                            return next;
                        });
                        // Notify other tabs/dashboard
                        new BroadcastChannel("exam_portal_updates").postMessage("refresh_dashboard");
                    } else {
                        throw new Error();
                    }
                } catch {
                    setPopup({ isOpen: true, type: 'alert', title: 'Error', message: 'Failed to delete exam.', onConfirm: () => setPopup(null) });
                }
            },
            onCancel: () => setPopup(null)
        });
    };

    const handleDuplicate = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSaving(true);
        const token = sessionStorage.getItem("access_token");
        try {
            const res = await fetch(`${API_BASE_URL}/exams/${id}/duplicate`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                fetchExams(true);
                setPopup({ isOpen: true, type: 'alert', title: 'Success', message: 'Exam duplicated successfully!', onConfirm: () => setPopup(null) });
            } else {
                throw new Error();
            }
        } catch {
            setPopup({ isOpen: true, type: 'alert', title: 'Error', message: 'Failed to duplicate exam.', onConfirm: () => setPopup(null) });
        } finally {
            setSaving(false);
        }
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedExamIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedExamIds(newSet);
    };

    const toggleAll = () => {
        if (selectedExamIds.size === exams.length && exams.length > 0) {
            setSelectedExamIds(new Set());
        } else {
            setSelectedExamIds(new Set(exams.map(e => e.id)));
        }
    };

    const handleMergeSetup = async () => {
        const selected = exams.filter(e => selectedExamIds.has(e.id));
        if (selected.length < 2) return;

        setSaving(true);
        try {
            const token = sessionStorage.getItem("access_token");
            const fullExams = await Promise.all(
                selected.map(async (e) => {
                    const res = await fetch(`${API_BASE_URL}/exams/${e.id}`, {
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    if (res.ok) return await res.json();
                    return e;
                })
            );

            const mergedQuestions = fullExams.flatMap(e => e.questions || []);
            const mergedDuration = selected.reduce((sum, e) => sum + (e.duration || 30), 0);
            const topics = Array.from(new Set(selected.map(e => e.topic).filter(Boolean)));

            const diffLevels = ["Beginner", "Intermediate", "Advanced"];
            let maxDiffIndex = 0;
            selected.forEach(e => {
                const idx = diffLevels.indexOf(e.difficulty);
                if (idx > maxDiffIndex) maxDiffIndex = idx;
            });

            setMergedExam({
                title: `Merged Exam (${selected.length} combined)`,
                topic: topics.join(", "),
                difficulty: diffLevels[maxDiffIndex] || "Intermediate",
                duration: mergedDuration,
                questions: mergedQuestions
            });
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handlePublishMerged = async () => {
        if (!mergedExam || !mergedExam.questions) return;
        setSaving(true);
        try {
            const token = sessionStorage.getItem("access_token");
            const res = await fetch(`${API_BASE_URL}/exams`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    title: mergedExam.title,
                    topic: mergedExam.topic,
                    difficulty: mergedExam.difficulty,
                    duration: mergedExam.duration,
                    num_questions: mergedExam.questions.length,
                    questions: mergedExam.questions,
                    proctoring_enabled: true, // Default for merged
                    proctoring_type: "video"
                })
            });
            if (res.ok) {
                setPopup({
                    isOpen: true,
                    type: 'alert',
                    title: 'Success',
                    message: 'Merged exam published successfully!',
                    onConfirm: () => {
                        setPopup(null);
                        setMergedExam(null);
                        setSelectedExamIds(new Set());
                        // Optimistically fetch or just rely on the fact that we'll re-fetch anyway
                        // But let's at least clear the local state to show it's gone
                        fetchExams();
                    }
                });
            } else {
                throw new Error();
            }
        } catch {
            setPopup({ isOpen: true, type: 'alert', title: 'Error', message: 'Failed to publish merged exam.', onConfirm: () => setPopup(null) });
        } finally {
            setSaving(false);
        }
    };

    const updateMergedExam = (field: string, value: string | number | Question[]) => {
        setMergedExam(prev => prev ? { ...prev, [field]: value } : prev);
    };

    if (loading) {
        return (
            <AdminLayout>
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    height: '60vh', gap: '12px'
                }}>
                    <div className="mc-spinner" style={{
                        width: '40px', height: '40px', border: '4px solid var(--border)',
                        borderTop: '4px solid var(--primary)', borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }}></div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>Loading Assessments...</div>
                </div>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <style>{`
        .me-header { padding: 1.5rem 2.5rem 1rem; background: var(--bg); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        @media (max-width: 768px) {
          .me-header { padding: 1rem; flex-direction: column; align-items: flex-start; gap: 1rem; }
        }
        .me-header-title { font-family: var(--font-heading); font-size: 1.375rem; font-weight: 700; color: var(--text); margin: 0; }
        .me-content { padding: 2.5rem; }
        @media (max-width: 768px) {
          .me-content { padding: 1rem; }
        }
        .me-table-wrap { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-sm); overflow: hidden; }
        .me-table { width: 100%; border-collapse: collapse; }
        .me-table th { text-align: left; padding: 1rem 1.5rem; font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); background: var(--bg-neutral); border-bottom: 1px solid var(--border); }
        .me-table td { padding: 1rem 1.5rem; font-size: 0.875rem; border-bottom: 1px solid var(--border); color: var(--text); }
        .me-row { cursor: pointer; transition: 0.2s; }
        .me-row:hover { background: var(--bg-neutral); }
        .me-row.selected { background: color-mix(in srgb, var(--primary) 8%, var(--bg)); }
        
        .select-pill { display: flex; align-items: center; gap: 8px; padding: 6px 14px; background: var(--bg-neutral); border: 1px solid var(--border); border-radius: 100px; cursor: pointer; transition: all 0.2s; }
        .select-pill:hover { border-color: var(--primary); }
        .select-pill-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; }
        
        .difficulty-badge { padding: 4px 12px; border-radius: 100px; font-size: 11px; font-weight: 700; text-transform: uppercase; display: inline-flex; }
        .diff-beginner { background: var(--color-success-light); color: var(--color-success); border: 1px solid var(--color-success-border); }
        .diff-intermediate { background: var(--color-warning-light); color: var(--color-warning); border: 1px solid var(--color-warning-border); }
        .diff-advanced { background: var(--primary-light); color: var(--primary); border: 1px solid var(--primary-border, var(--primary-light)); }
        
        .delete-btn { padding: 8px 16px; background: var(--bg); border: 1px solid var(--border); color: var(--text-muted); border-radius: 8px; font-weight: 700; font-size: 11px; transition: all 0.2s; cursor: pointer; text-transform: uppercase; letter-spacing: 0.02em; }
        .delete-btn:hover { background: var(--color-danger-light); border-color: var(--color-danger); color: var(--color-danger); }
        .me-btn-pill {
            padding: 9px 23px; background: transparent; color: var(--primary); 
            border: 2px solid var(--primary); border-radius: 999px !important; 
            font-weight: 700; font-size: 13px; cursor: pointer;
            transition: all 0.3s cubic-bezier(0.16,1,0.3,1); display: flex; align-items: center; gap: 8px;
            text-decoration: none;
        }
        .me-btn-pill:hover { 
            background: #00609b !important; color: white !important; 
            border-color: #00609b !important; transform: translateY(-1px); 
        }
        .me-btn-pill:active { transform: translateY(0); }

        .create-btn { display: none; } /* Replaced by class logic */
        .merge-btn { display: none; } /* Replaced by class logic */

        /* Modern Exam Card Layout */
        .mgmt-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; padding-bottom: 40px; }
        .mgmt-card { background: var(--bg); border: 1px solid var(--border); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 16px; position: relative; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); cursor: pointer; }
        .mgmt-card:hover { border-color: var(--primary); transform: translateY(-2px); }
        .mgmt-card.selected { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 6%, var(--bg)); }
        .mgmt-card-select-overlay { position: absolute; top: 16px; right: 16px; z-index: 10; }
        .mgmt-card-title { font-size: 19px; font-weight: 800; color: var(--text); line-height: 1.3; }
        .mgmt-card-meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
        .mgmt-card-id { font-family: monospace; font-size: 10px; color: var(--text-muted); background: var(--bg-neutral); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border); }
        
        .mgmt-stat-box { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 8px 0; }
        .mgmt-stat { background: var(--bg-neutral); border: 1px solid var(--border); padding: 12px; border-radius: 12px; text-align: center; display: flex; flex-direction: column; gap: 4px; }
        .mgmt-stat-val { font-size: 16px; font-weight: 800; color: var(--text); }
        .mgmt-stat-lbl { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.02em; }

        .mgmt-footer { margin-top: auto; display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid var(--border); }
        .mgmt-proctor-pill { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; color: var(--text-muted); background: var(--bg-neutral); padding: 4px 10px; border-radius: 100px; text-transform: uppercase; }


        /* Review Mode UI */
        .aig-summary-bar { background: var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 20px 24px; display: flex; gap: 32px; flex-wrap: wrap; margin-bottom: 32px; }
        .aig-summary-item { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 150px; }
        .aig-summary-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; }
        .aig-summary-input { font-size: 14px; font-weight: 600; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; outline: none; width: 100%; box-sizing: border-box; background: var(--bg-neutral); color: var(--text); }
        .aig-summary-input:focus { border-color: var(--primary); }

        .aig-q-card { background: var(--bg); border: 1px solid var(--border); border-radius: 16px; padding: 32px; margin-bottom: 24px; transition: all 0.2s; }
        .aig-q-card:hover { border-color: var(--primary); box-shadow: var(--shadow-md); }
        .aig-q-top { display: flex; gap: 20px; margin-bottom: 28px; }
        .aig-q-num { width: 34px; height: 34px; background: var(--bg-neutral); border: 1px solid var(--border); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: var(--text-muted); flex-shrink: 0; }
        .aig-q-text { font-size: 17px; font-weight: 600; line-height: 1.6; color: var(--text); flex: 1; }
        .aig-q-delete { width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .aig-q-delete:hover { background: var(--color-danger-light); color: var(--color-danger); border-color: var(--color-danger-border); transform: scale(1.05); }

        .aig-opt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .aig-opt { padding: 16px 20px; border: 1px solid var(--border); border-radius: 12px; font-size: 14px; background: var(--bg-neutral); color: var(--text-muted); display: flex; align-items: center; gap: 12px; }
        .aig-opt-correct { background: var(--color-success-light); border-color: var(--color-success-border); color: var(--color-success); font-weight: 600; }
        
        .aig-btn-confirm { padding: 10px 24px; background: var(--primary); color: #fff; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 10px; box-shadow: 0 4px 12px rgba(28, 132, 143, 0.15); }
        .aig-btn-confirm:hover:not(:disabled) { background: var(--primary-hover); transform: translateY(-1px); }
        .aig-btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
        
        .aig-btn-back { padding: 8px 16px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; color: var(--text-muted); font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 6px; margin-bottom: 24px; }
        .aig-btn-back:hover { border-color: var(--primary); color: var(--primary); background: var(--bg-neutral); }
      `}</style>

            {mergedExam ? (
                // Preview Merged Exam Mode
                <>
                    <header className="me-header">
                        <h2 className="me-header-title">Verify Merged Exam</h2>
                    </header>
                    <div className="me-content">
                        <button className="aig-btn-back" onClick={() => setMergedExam(null)}>
                            <Icons.ChevronLeft size={12} /> Back to Assessments
                        </button>
                        <div className="aig-summary-bar">
                            <div className="aig-summary-item">
                                <label className="aig-summary-label">Exam Title</label>
                                <input className="aig-summary-input" value={mergedExam.title || ''} onChange={e => updateMergedExam('title', e.target.value)} />
                            </div>
                            <div className="aig-summary-item">
                                <label className="aig-summary-label">Topic</label>
                                <input className="aig-summary-input" value={mergedExam.topic || ''} onChange={e => updateMergedExam('topic', e.target.value)} />
                            </div>
                            <div className="aig-summary-item">
                                <label className="aig-summary-label">Difficulty</label>
                                <select className="aig-summary-input" value={mergedExam.difficulty || 'Intermediate'} onChange={e => updateMergedExam('difficulty', e.target.value)}>
                                    <option value="Beginner">Beginner</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Advanced">Advanced</option>
                                </select>
                            </div>
                            <div className="aig-summary-item">
                                <label className="aig-summary-label">Duration (Min)</label>
                                <input className="aig-summary-input" type="text" value={mergedExam.duration || ""} onChange={e => {
                                    const val = e.target.value.replace(/\D/g, "");
                                    updateMergedExam('duration', val ? Number(val) : 0);
                                }} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28, alignItems: 'center', background: 'var(--bg)', padding: '16px 24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 4, height: 24, background: "var(--primary)", borderRadius: 2 }} />
                                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>Questions ({mergedExam.questions?.length})</h2>
                            </div>
                            <button className="aig-btn-confirm" onClick={handlePublishMerged} disabled={saving}>
                                {saving ? (
                                    "Publishing..."
                                ) : (
                                    <><Icons.Check size={14} /> Finalize & Publish Assessment</>
                                )}
                            </button>
                        </div>

                        {mergedExam.questions?.map((q, idx) => (
                            <div className="aig-q-card" key={idx}>
                                <div className="aig-q-top">
                                    <div className="aig-q-num">{idx + 1}</div>
                                    <div className="aig-q-text">{q.text}</div>
                                    <button className="aig-q-delete" onClick={() => {
                                        const newQ = [...(mergedExam.questions || [])];
                                        newQ.splice(idx, 1);
                                        updateMergedExam('questions', newQ);
                                    }}>
                                        <Icons.Trash size={14} />
                                    </button>
                                </div>
                                <div className="aig-opt-grid">
                                    {q.options?.map((opt, oIdx) => (
                                        <div key={oIdx} className={`aig-opt ${opt.is_correct ? 'aig-opt-correct' : ''}`}>
                                            {String.fromCharCode(65 + oIdx)}. {opt.text}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                // List Exams Mode
                <>
                    <header className="me-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            {exams.length > 0 && (
                                <div className="select-pill" onClick={toggleAll}>
                                    <input
                                        type="checkbox"
                                        checked={selectedExamIds.size === exams.length}
                                        onChange={toggleAll}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--primary)' }}
                                    />
                                    <span className="select-pill-lbl">Select All</span>
                                </div>
                            )}
                            <div>
                                <h2 className="me-header-title">Management Dashboard</h2>
                                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
                                    {exams.length} Assessments  &nbsp;&nbsp;&nbsp; {selectedExamIds.size} Marked
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            {selectedExamIds.size >= 2 && (
                                <button className="me-btn-pill" style={{ background: 'var(--text)', color: 'var(--bg)' }} onClick={handleMergeSetup} disabled={saving}>
                                    <Icons.Merge size={12} /> {saving ? "Loading..." : "Merge Marked"}
                                </button>
                            )}
                            <a href="/#/create-exam" className="me-btn-pill">
                                <Icons.Plus size={12} /> New AI Assessment
                            </a>
                        </div>
                    </header>

                    <div className="me-content">
                        {exams.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '100px 40px', background: 'var(--bg)', borderRadius: 24, border: '1px dashed var(--border)' }}>
                                <div style={{ fontSize: 48, marginBottom: 20 }}>{"\u{1F4CB}"}</div>
                                <h3 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>Empty Exam Repository</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: 16, maxWidth: 400, margin: '0 auto 32px' }}>
                                    You haven't generated any assessments yet. Boost your testing process by creating a new one.
                                </p>
                                <a href="/#/create-exam" className="create-btn" style={{ width: 'fit-content', margin: '0 auto' }}>
                                    <Icons.Plus /> Generate Your First Exam
                                </a>
                            </div>
                        ) : (
                            <div className="me-table-wrap">
                                <table className="me-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 40 }}></th>
                                            <th>Assessment Title</th>
                                            <th>Topic</th>
                                            <th>Difficulty</th>
                                            <th>Time</th>
                                            <th>Questions</th>
                                            <th>Proctoring</th>
                                            <th style={{ textAlign: "right" }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {exams.map(exam => (
                                            <tr
                                                key={exam.id}
                                                className={`me-row ${selectedExamIds.has(exam.id) ? 'selected' : ''}`}
                                                onClick={() => toggleSelection(exam.id)}
                                            >
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedExamIds.has(exam.id)}
                                                        onChange={() => toggleSelection(exam.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--primary)' }}
                                                    />
                                                </td>
                                                <td style={{ fontWeight: 600 }}>{exam.title}</td>
                                                <td style={{ color: 'var(--text-muted)' }}>{exam.topic}</td>
                                                <td>
                                                    <span className={`difficulty-badge diff-${exam.difficulty.toLowerCase()}`}>
                                                        {exam.difficulty}
                                                    </span>
                                                </td>
                                                <td>{exam.duration}m</td>
                                                <td>{exam.num_questions || 0}</td>
                                                <td>
                                                    {exam.proctoring_enabled ? (
                                                        <div className="mgmt-proctor-pill" style={{ color: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 10%, var(--bg))', display: 'inline-flex', width: 'fit-content' }}>
                                                            <Icons.Shield size={10} /> Secure Mode
                                                        </div>
                                                    ) : (
                                                        <div className="mgmt-proctor-pill" style={{ display: 'inline-flex', width: 'fit-content' }}>Standard</div>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: "right", display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        className="delete-btn"
                                                        style={{ padding: '6px 10px', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                                                        onClick={(e) => handleDuplicate(exam.id, e)}
                                                        title="Duplicate Assessment"
                                                        disabled={saving}
                                                    >
                                                        <Icons.Copy size={14} />
                                                    </button>
                                                    <button
                                                        className="delete-btn"
                                                        style={{ padding: '6px 10px' }}
                                                        onClick={(e) => handleDelete(exam.id, e)}
                                                        title="Delete Assessment"
                                                    >
                                                        <Icons.Trash size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>

            )}

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
        </AdminLayout>
    );
}
