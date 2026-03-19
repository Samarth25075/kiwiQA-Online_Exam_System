import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import API_BASE_URL from "../config";

interface ReportData {
    candidate: any;
    exam_title: string;
    stats: Record<string, { correct: number; total: number }>;
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
.report-container { max-width: 1000px; margin: 0 auto; padding: 24px; animation: reportFade 0.6s ease-out; }
@keyframes reportFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.report-header { background: var(--bg); border: 1px solid var(--border); border-radius: 16px; padding: 32px; margin-bottom: 24px; box-shadow: var(--shadow-sm); display: flex; justify-content: space-between; align-items: flex-start; }
.report-title { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 900; color: var(--text); margin: 0; }
.report-badge { padding: 4px 12px; border-radius: 100px; font-size: 11px; font-weight: 800; text-transform: uppercase; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }

.section-card { background: var(--bg); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: var(--shadow-sm); }
.section-title { font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 800; color: var(--text); margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.stat-pill { background: var(--bg-neutral); border: 1px solid var(--border); border-radius: 12px; padding: 16px; text-align: center; }
.stat-val { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 900; color: var(--primary); }
.stat-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px; }

.cat-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
.cat-table th { text-align: left; padding: 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--border); }
.cat-table td { padding: 12px; border-bottom: 1px solid var(--border); font-size: 13px; }
.progress-bar { height: 8px; background: var(--border); border-radius: 100px; overflow: hidden; margin-top: 4px; }
.progress-fill { height: 100%; background: var(--primary); border-radius: 100px; }

.proctor-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.proctor-frame { background: var(--bg-neutral); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; position: relative; aspect-ratio: 4/3; }
.proctor-img { width: 100%; height: 100%; object-fit: cover; }
.proctor-label { position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.6); color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; backdrop-filter: blur(4px); }

.q-item { border-left: 3px solid var(--border); padding-left: 20px; margin-bottom: 32px; }
.q-item.correct { border-left-color: #166534; }
.q-item.incorrect { border-left-color: #e11d48; }
.q-text { font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; margin-bottom: 12px; }
.opt-list { display: grid; gap: 8px; }
.opt-item { padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 13px; display: flex; justify-content: space-between; }
.opt-item.selected { background: #fef2f2; border-color: #fecaca; }
.opt-item.correct { background: #f0fdf4; border-color: #bbf7d0; color: #166534; font-weight: 600; }
.opt-item.both { background: #f0fdf4; border-color: #166534; color: #166534; font-weight: 700; }
`;

export default function CandidateReport() {
    const { candidateId } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReport = async () => {
            const token = localStorage.getItem("access_token");
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
                    <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                    <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Generating detailed report...</p>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </AdminLayout>
    );

    if (!report) return (
        <AdminLayout>
            <div style={{ textAlign: 'center', padding: 60 }}>
                <h2 style={{ color: 'var(--text-muted)' }}>Report not available.</h2>
                <button className="test-btn" onClick={() => navigate("/manage-candidates")} style={{ marginTop: 20 }}>Back to Candidates</button>
            </div>
        </AdminLayout>
    );

    const { candidate, stats, questions, proctoring, exam_title } = report;
    const scorePct = Math.round((candidate.score / (candidate.total_marks || candidate.total_questions || 1)) * 100);

    return (
        <AdminLayout>
            <style>{STYLES}</style>
            <div className="report-container">
                <header className="report-header">
                    <div>
                        <div className="report-badge">Final Assessment Report</div>
                        <h1 className="report-title" style={{ marginTop: 12 }}>{candidate.name}</h1>
                        <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: 13, fontWeight: 500 }}>
                            {exam_title} • Completed on {candidate.joined_date?.split('T')[0]}
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 32, fontWeight: 900, color: scorePct >= 50 ? 'var(--secondary)' : 'var(--primary)', lineHeight: 1 }}>{scorePct}%</div>
                        <div className="stat-label">Total Score</div>
                    </div>
                </header>

                <div className="stats-grid" style={{ marginBottom: 24 }}>
                    <div className="stat-pill">
                        <div className="stat-val">{candidate.score} / {candidate.total_marks || candidate.total_questions}</div>
                        <div className="stat-label">Total Weighted Score</div>
                    </div>
                    <div className="stat-pill">
                        <div className="stat-val">{candidate.violations}</div>
                        <div className="stat-label">Security Violations</div>
                    </div>
                    <div className="stat-pill">
                        <div className="stat-val">{proctoring.start ? 'Active' : 'N/A'}</div>
                        <div className="stat-label">Video Proctoring</div>
                    </div>
                </div>

                <div className="section-card">
                    <h2 className="section-title">📊 Category-wise Analysis</h2>
                    <table className="cat-table">
                        <thead>
                            <tr>
                                <th>Category / Skill Area</th>
                                <th>Accuracy</th>
                                <th style={{ textAlign: 'center' }}>Score</th>
                            </tr>
                        </thead>
                        <tbody>                             {Object.entries(stats).map(([cat, data]: [string, any]) => {
                                const pct = Math.round((data.correct / (data.total || 1)) * 100);
                                return (
                                    <tr key={cat}>
                                        <td style={{ fontWeight: 700 }}>{cat}</td>
                                        <td style={{ width: '50%' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div className="progress-bar" style={{ flex: 1 }}>
                                                    <div className="progress-fill" style={{ width: `${pct}%`, background: pct < 40 ? '#e11d48' : pct < 70 ? '#d97706' : 'var(--primary)' }} />
                                                </div>
                                                <span style={{ fontSize: 12, fontWeight: 800, minWidth: 35 }}>{pct}%</span>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--text-muted)' }}>
                                            {data.correct.toFixed(1)} / {data.total.toFixed(1)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="section-card">
                    <h2 className="section-title">🛡️ Proctoring Snapshots</h2>
                    {(!proctoring.start && !proctoring.mid && !proctoring.end) ? (
                        <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-neutral)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                            <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Proctoring data has been cleaned up for this candidate.</p>
                        </div>
                    ) : (
                        <>
                            <div className="proctor-grid">
                                <div className="proctor-frame">
                                    {proctoring.start ? <img src={proctoring.start} className="proctor-img" alt="Start" /> : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-muted)' }}>No Image</div>}
                                    <div className="proctor-label">START OF EXAM</div>
                                </div>
                                <div className="proctor-frame">
                                    {proctoring.mid ? <img src={proctoring.mid} className="proctor-img" alt="Mid" /> : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-muted)' }}>No Image</div>}
                                    <div className="proctor-label">MIDDLE OF EXAM</div>
                                </div>
                                <div className="proctor-frame">
                                    {proctoring.end ? <img src={proctoring.end} className="proctor-img" alt="End" /> : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-muted)' }}>No Image</div>}
                                    <div className="proctor-label">END OF EXAM</div>
                                </div>
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, fontStyle: 'italic' }}>
                                * Snapshots are taken automatically at key points to verify candidate identity and environment.
                            </p>
                        </>
                    )}
                </div>

                <div className="section-card">
                    <h2 className="section-title">📝 Question Breakdown</h2>
                    {questions.map((q, idx) => {
                        const isCorrect = q.selected_index !== null && q.options[q.selected_index]?.is_correct;
                        const marksAwarded = isCorrect ? (q.marks || 1) : 0;
                        return (
                            <div key={idx} className={`q-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase' }}>Question {idx + 1} • {q.category} • {marksAwarded} / {q.marks || 1} Marks</span>
                                    {q.selected_index === null && <span style={{ fontSize: 10, color: '#e11d48', fontWeight: 700, marginLeft: 'auto' }}>NOT ANSWERED</span>}
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
                                                {isCorrectOpt && <span style={{ fontSize: 10 }}>✓ Correct</span>}
                                                {(isSelected && !isCorrectOpt) && <span style={{ fontSize: 10 }}>✕ Your Selection</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                                {q.explanation && (
                                    <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-neutral)', borderRadius: 8, fontSize: 12 }}>
                                        <div style={{ fontWeight: 800, fontSize: 10, marginBottom: 4, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Explanation:</div>
                                        {q.explanation}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div style={{ textAlign: 'center', padding: '24px 0 48px' }} className="no-print">
                    <button 
                        className="test-btn" 
                        onClick={async () => {
                            window.print();
                            // Optional: Small delay to ensure print dialog opened
                            setTimeout(async () => {
                                if (window.confirm("Report downloaded? Would you like to permanently delete the proctoring images from the server now to save space and ensure privacy?")) {
                                    const token = localStorage.getItem("access_token");
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
                            }, 500);
                        }} 
                        style={{ padding: '12px 32px', background: 'var(--secondary)' }}
                    >
                         Download & Cleanup
                    </button>
                    <button 
                        className="test-btn secondary" 
                        onClick={() => navigate("/manage-candidates")} 
                        style={{ marginLeft: 16, padding: '12px 32px' }}
                    >
                         Back to Candidates
                    </button>
                </div>
                <style>{`
                    @media print {
                        .no-print, .admin-sidebar, .admin-header { display: none !important; }
                        .report-container { padding: 0; margin: 0; max-width: 100%; }
                        body { background: white !important; }
                    }
                `}</style>
            </div>
        </AdminLayout>
    );
}
