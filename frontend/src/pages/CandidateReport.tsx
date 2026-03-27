import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import API_BASE_URL from "../config";
import logo from "../assets/logo.png";

interface ReportData {
    candidate: any;
    exam_title: string;
    passing_score: number;
    stats: Record<string, { correct: number; total: number; count: number; attempted: number }>;
    questions: Array<{
        text: string;
        options: Array<{ text: string; is_correct: boolean }>;
        selected_index: number | null;
        category: string;
        explanation?: string;
        marks?: number;
    }>;
    proctoring: {
        start: string | null;
        mid: string | null;
        end: string | null;
    };
}

const STYLES = `
.report-container { 
    max-width: 1000px; 
    margin: 0 auto; 
    padding: 40px 24px; 
    color: var(--text);
    background: var(--bg);
}

.report-top-branding { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    margin-bottom: 40px; 
    padding-bottom: 24px; 
    border-bottom: 1px solid var(--border); 
}
.company-logo { height: 48px; object-fit: contain; }
.report-id { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); font-weight: 700; letter-spacing: 0.05em; }

.report-header { 
    background: var(--bg-neutral); 
    border: 1px solid var(--border); 
    padding: 30px; 
    margin-bottom: 32px; 
    display: flex; 
    gap: 40px; 
    align-items: center; 
}

.header-info { flex: 1; }
.report-title { font-family: var(--font-heading); font-size: 30px; font-weight: 800; color: var(--text); margin: 6px 0 10px; }
.report-badge { 
    padding: 4px 10px; 
    font-size: 10px; 
    font-weight: 700; 
    text-transform: uppercase; 
    background: var(--bg-neutral); 
    color: var(--text-muted); 
    border: 1px solid var(--border); 
    display: inline-block; 
}

.status-box { text-align: right; min-width: 160px; }
.status-val { font-size: 28px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.02em; }
.status-val.pass { color: var(--color-success); }
.status-val.fail { color: var(--color-danger); }
.status-val.eliminated { color: var(--color-danger); }

.section-card { background: var(--bg); border: 1px solid var(--border); padding: 30px; margin-bottom: 32px; border-radius: var(--radius-lg); }
.section-title { font-family: var(--font-heading); font-size: 20px; font-weight: 800; color: var(--text); margin-bottom: 24px; border-bottom: 2px solid var(--primary); padding-bottom: 8px; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 32px; }
.stat-pill { background: var(--bg-neutral); border: 1px solid var(--border); padding: 20px; text-align: center; border-radius: var(--radius-md); }
.stat-val { font-size: 24px; font-weight: 800; color: var(--text); }
.stat-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-top: 8px; }

.cat-table { width: 100%; border-collapse: collapse; }
.cat-table th { text-align: left; padding: 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); border-bottom: 2px solid var(--border); }
.cat-table td { padding: 12px; border-bottom: 1px solid var(--border); font-size: 14px; color: var(--text); }
.cat-table .cat-name { font-weight: 700; color: var(--text); }

.score-cell { font-weight: 800; color: var(--primary); }

.proctor-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.proctor-frame { background: var(--bg-sunken); border: 1px solid var(--border); overflow: hidden; position: relative; aspect-ratio: 4/3; border-radius: var(--radius-md); }
.proctor-img { width: 100%; height: 100%; object-fit: cover; }
.proctor-label { position: absolute; bottom: 0; left: 0; right: 0; background: var(--bg-raised); color: var(--text); padding: 6px; font-size: 9px; font-weight: 700; text-align: center; border-top: 1px solid var(--border); opacity: 0.9; }

.q-item { border-left: 3px solid var(--border); padding: 0 0 10px 20px; margin-bottom: 30px; }
.q-item.correct { border-left-color: var(--color-success); }
.q-item.incorrect { border-left-color: var(--color-danger); }

.q-text { font-size: 15px; font-weight: 700; margin-bottom: 12px; color: var(--text); }
.opt-list { display: grid; gap: 8px; }
.opt-item { padding: 10px 14px; border: 1px solid var(--border); font-size: 13px; display: flex; justify-content: space-between; align-items: center; border-radius: var(--radius-sm); color: var(--text); }
.opt-item.selected { background: var(--bg-neutral); border-color: var(--primary); }
.opt-item.correct { border-color: var(--color-success); background: var(--color-success-light); font-weight: 700; }
.opt-item.both { border-color: var(--color-success); background: var(--color-success-light); font-weight: 700; color: var(--color-success); }

.no-print-controls { text-align: center; padding: 40px 0 80px; display: flex; justify-content: center; gap: 16px; }
.basic-btn { padding: 12px 24px; border: 1px solid var(--border); background: var(--bg); color: var(--text); font-weight: 700; cursor: pointer; transition: all 0.2s; border-radius: var(--radius-md); }
.basic-btn:hover { background: var(--primary); color: var(--text-on-primary); border-color: var(--primary); }

@media print {
    body { background: white !important; color: black !important; }
    .report-container { padding: 0; margin: 0; max-width: 100%; background: white !important; color: black !important; }
    .section-card, .report-header, .stat-pill, .proctor-frame { background: white !important; border: 1px solid #ddd !important; }
    .no-print, .no-print-controls { display: none !important; }
    .section-title { border-bottom-color: black !important; color: black !important; }
    .report-title, .stat-val, .cat-name, .score-cell, .q-text, .opt-item { color: black !important; }
}
`;

function getStatus(pct: number, violations: number, passingScore: number) {
    if (violations >= 3) return "ELIMINATED";
    if (pct >= passingScore) return "PASSED";
    return "FAILED";
}

export default function CandidateReport() {
    const { candidateId } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReport = async () => {
            const token = sessionStorage.getItem("access_token");
            if (!token) { navigate("/"); return; }

            try {
                const res = await fetch(`${API_BASE_URL}/candidates/${candidateId}/report`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setReport(data);
                } else if (res.status === 401) {
                    navigate("/");
                }
            } catch (err) {
                console.error("Report fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [candidateId, navigate]);

    if (loading) return (
        <AdminLayout>
            <div style={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 44, height: 44, border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
                    <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: '18px' }}>Generating Detailed Analysis...</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: 8 }}>Cross-referencing proctoring logs and category performance.</p>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </AdminLayout>
    );

    if (!report) return (
        <AdminLayout>
            <div style={{ textAlign: 'center', padding: 80 }}>
                <div style={{ fontSize: 48, marginBottom: 20 }}>{"\u{1F4D1}"}</div>
                <h2 style={{ color: 'var(--text)', fontWeight: 800 }}>Report Not Found</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>We couldn't locate the assessment data for this candidate.</p>
                <button className="test-btn" onClick={() => navigate("/manage-candidates")}>Return to Candidate List</button>
            </div>
        </AdminLayout>
    );

    const { candidate, stats, questions, proctoring, exam_title, passing_score } = report;
    const scorePct = Math.round((candidate.score / (candidate.total_marks || candidate.total_questions || 1)) * 100);
    const status = getStatus(scorePct, candidate.violations || 0, passing_score || 50);

    // Time calculations
    const formatDateTime = (dateStr: string) => {
        if (!dateStr) return "N/A";
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr; // Return as is if not a valid date string
            return date.toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) { return dateStr; }
    };

    const calculateDuration = () => {
        if (!candidate.joined_date || !candidate.completed_at) return null;
        try {
            const start = new Date(candidate.joined_date).getTime();
            const end = new Date(candidate.completed_at).getTime();
            if (isNaN(start) || isNaN(end)) return null;

            const diffMs = end - start;
            if (diffMs < 0) return null;

            const totalSeconds = Math.floor(diffMs / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;

            return `${minutes}m ${seconds}s`;
        } catch (e) { return null; }
    };

    const duration = calculateDuration();

    return (
        <AdminLayout plain={true}>
            <style>{STYLES}</style>
            <div className="report-container">
                <div className="no-print" style={{ marginBottom: 20 }}>
                    <button 
                        className="basic-btn" 
                        onClick={() => navigate(-1)} 
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 13 }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                        Back
                    </button>
                </div>
                <div className="report-top-branding">
                    <img src={logo} alt="Company Logo" className="company-logo" />
                    <div className="report-id">REF: REPT-{candidate.candidate_id || candidate.id}-{new Date().getFullYear()}</div>
                </div>

                <header className="report-header">

                    <div className="header-info">
                        <div className="report-badge">Confidential Candidate Evaluation</div>
                        <h1 className="report-title">{candidate.name}</h1>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>
                            <span>{exam_title}</span>
                            <span>•</span>
                            <span>ID: {candidate.candidate_id || `CAND-${candidate.id}`}</span>
                            <span>•</span>
                            <span>{candidate.country_code} {candidate.phone_number}</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', color: 'var(--text-muted)', fontSize: 12, fontWeight: 500, marginTop: 8 }}>
                            <span>Started: {formatDateTime(candidate.joined_date)}</span>
                            {candidate.completed_at && (
                                <>
                                    <span>•</span>
                                    <span>Finished: {formatDateTime(candidate.completed_at)}</span>
                                </>
                            )}
                            {duration && (
                                <>
                                    <span>•</span>
                                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Duration: {duration}</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="status-box">
                        <div className={`status-val ${status.toLowerCase()}`}>{status}</div>
                        <div className="stat-label">Final Decision</div>
                    </div>
                </header>

                <div className="stats-grid">
                    <div className="stat-pill">
                        <div className="stat-val" style={{ color: 'var(--primary)' }}>{scorePct}%</div>
                        <div className="stat-label">Overall Accuracy</div>
                    </div>
                    <div className="stat-pill">
                        <div className="stat-val">{candidate.score} / {candidate.total_marks || candidate.total_questions}</div>
                        <div className="stat-label">Weighted Marks</div>
                    </div>
                    <div className="stat-pill">
                        <div className="stat-val" style={{ color: candidate.violations > 0 ? '#ef4444' : 'inherit' }}>{candidate.violations}</div>
                        <div className="stat-label">Violations Flagged</div>
                    </div>
                    <div className="stat-pill">
                        <div className="stat-val">{passing_score}%</div>
                        <div className="stat-label">Passing Threshold</div>
                    </div>
                </div>

                <div className="section-card">
                    <h2 className="section-title">{"\u{1F4CA}"} Skill-Wise Performance Matrix</h2>
                    <table className="cat-table">
                        <thead>
                            <tr>
                                <th>Category Name</th>
                                <th style={{ textAlign: 'center' }}>Total Qs</th>
                                <th style={{ textAlign: 'center' }}>Attempted</th>
                                <th style={{ textAlign: 'center' }}>Max Marks</th>
                                <th style={{ textAlign: 'center' }}>Obtained</th>
                                <th style={{ width: '120px' }}>Accuracy</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(stats).map(([cat, data]: [string, any]) => {
                                const pct = Math.round((data.correct / (data.total || 1)) * 100);
                                return (
                                    <tr key={cat}>
                                        <td className="cat-name">{cat}</td>
                                        <td style={{ textAlign: 'center' }}>{data.count}</td>
                                        <td style={{ textAlign: 'center' }}>{data.attempted}</td>
                                        <td style={{ textAlign: 'center' }}>{data.total.toFixed(1)}</td>
                                        <td style={{ textAlign: 'center' }} className="score-cell">{data.correct.toFixed(1)}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ flex: 1, height: 6, background: '#eee', borderRadius: 10, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${pct}%`, background: '#333', borderRadius: 10 }} />
                                                </div>
                                                <span style={{ fontSize: 11, fontWeight: 800 }}>{pct}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="section-card">
                    <h2 className="section-title">Detailed Question Submission Log</h2>
                    {questions.map((q, idx) => {
                        const isCorrect = q.selected_index !== null && q.options[q.selected_index]?.is_correct;
                        const marksAwarded = isCorrect ? (q.marks || 1) : 0;
                        return (
                            <div key={idx} className={`q-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', background: 'var(--bg-neutral)', padding: '2px 8px', borderRadius: 4 }}>Q {idx + 1}</span>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{q.category}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        {q.selected_index === null && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 800, padding: '2px 8px', border: '1px solid #fee2e2', borderRadius: 4 }}>UNANSWERED</span>}
                                        <span style={{ fontSize: 12, fontWeight: 800 }}>Marks: {marksAwarded} / {q.marks || 1}</span>
                                    </div>
                                </div>
                                <div className="q-text">{q.text}</div>
                                <div className="opt-list">
                                    {q.options.map((opt, oIdx) => {
                                        const isSelected = q.selected_index === oIdx;
                                        const isCorrectOpt = opt.is_correct;
                                        let classStr = "opt-item";
                                        if (isSelected && isCorrectOpt) classStr += " both";
                                        else if (isSelected) classStr += " selected";
                                        else if (isCorrectOpt) classStr += " correct";

                                        return (
                                            <div key={oIdx} className={classStr}>
                                                <span>{opt.text}</span>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    {isCorrectOpt && <span style={{ fontSize: 10, fontWeight: 700, background: '#10b981', color: 'white', padding: '1px 6px', borderRadius: 4 }}>CORRECT</span>}
                                                    {(isSelected && !isCorrectOpt) && <span style={{ fontSize: 10, fontWeight: 700, background: '#ef4444', color: 'white', padding: '1px 6px', borderRadius: 4 }}>YOUR CHOICE</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {q.explanation && (
                                    <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-neutral)', borderRadius: 12, border: '1px solid var(--border)', fontSize: 13, color: 'var(--text)' }}>
                                        <div style={{ fontWeight: 800, fontSize: 10, marginBottom: 8, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Explanation & Rationale:</div>
                                        {q.explanation}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="section-card">
                    <h2 className="section-title">Proctoring & Integrity Audit</h2>
                    {(!proctoring.start && !proctoring.mid && !proctoring.end) ? (
                        <div style={{ padding: '60px', textAlign: 'center', background: 'var(--bg-neutral)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
                            <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Proctoring evidence has been purged for privacy reasons.</p>
                        </div>
                    ) : (
                        <>
                            <div className="proctor-grid" style={{ gridTemplateColumns: 'repeat(1, 1fr)', maxWidth: '400px', margin: '0 auto' }}>
                                <div className="proctor-frame">
                                    {proctoring.start ? <img src={proctoring.start} className="proctor-img" alt="Start" /> : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-muted)' }}>No Record</div>}
                                    <div className="proctor-label">INITIAL PHASE Â· Q1 Snapshot</div>
                                </div>
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 16, fontStyle: 'italic', fontWeight: 500 }}>
                                * Automated snapshots captured using AI-driven proctoring technology to maintain assessment integrity.
                            </p>
                        </>
                    )}
                </div>

                <div className="no-print-controls">
                    <button
                        className="basic-btn"
                        onClick={() => window.print()}
                    >
                        Print Official Report
                    </button>
                    <button
                        className="basic-btn"
                        onClick={async () => {
                            if (window.confirm("This will permanently delete all snapshots for this candidate. Verify you have saved or printed the report first. Proceed?")) {
                                const token = sessionStorage.getItem("access_token");
                                try {
                                    const res = await fetch(`${API_BASE_URL}/candidates/${candidateId}/cleanup-screenshots`, {
                                        method: "POST",
                                        headers: { "Authorization": `Bearer ${token}` }
                                    });
                                    if (res.ok) {
                                        setReport(prev => prev ? { ...prev, proctoring: { start: null, mid: null, end: null } } : null);
                                    }
                                } catch (err) { console.error(err); }
                            }
                        }}
                        style={{ border: '1px solid #ef4444', color: '#ef4444' }}
                    >
                        Purge Proctoring Media
                    </button>
                    <button
                        className="basic-btn"
                        onClick={() => navigate("/manage-candidates")}
                    >
                        Return
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
}
