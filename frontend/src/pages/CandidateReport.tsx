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
.report-container { max-width: 1000px; margin: 0 auto; padding: 40px 24px; animation: reportFade 0.7s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes reportFade { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

.report-top-branding { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid var(--border); }
.company-logo { height: 48px; object-fit: contain; filter: brightness(1.1); }
.report-id { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-muted); font-weight: 700; opacity: 0.6; letter-spacing: 0.05em; }

.report-header { 
    background: var(--bg); 
    border: 1px solid var(--border); 
    border-radius: 24px; 
    padding: 40px; 
    margin-bottom: 32px; 
    box-shadow: 0 12px 40px rgba(0,0,0,0.06); 
    display: flex; 
    gap: 40px; 
    align-items: center; 
    position: relative; 
    overflow: hidden; 
}
.header-glass { position: absolute; top: -100px; right: -100px; width: 400px; height: 400px; background: radial-gradient(circle, color-mix(in srgb, var(--primary) 12%, transparent) 0%, transparent 70%); pointer-events: none; }

.candidate-photo-frame { 
    width: 130px; 
    height: 130px; 
    border-radius: 20px; 
    border: 5px solid var(--bg-neutral); 
    box-shadow: var(--shadow-sm); 
    overflow: hidden; 
    flex-shrink: 0; 
    background: var(--bg-neutral); 
    display: grid; 
    place-items: center; 
    z-index: 2;
}
.candidate-photo { width: 100%; height: 100%; object-fit: cover; }
.candidate-initial { font-family: 'Outfit', sans-serif; font-size: 56px; font-weight: 900; color: color-mix(in srgb, var(--primary) 20%, var(--text-muted)); }

.header-info { flex: 1; z-index: 2; }
.report-title { font-family: 'Outfit', sans-serif; font-size: 34px; font-weight: 900; color: var(--text); margin: 6px 0 10px; letter-spacing: -0.02em; line-height: 1.1; }
.report-badge { padding: 5px 14px; border-radius: 100px; font-size: 10px; font-weight: 800; text-transform: uppercase; background: var(--bg-neutral); color: var(--primary); border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent); display: inline-block; letter-spacing: 0.08em; }

.status-box { text-align: right; min-width: 160px; z-index: 2; }
.status-val { font-family: 'Outfit', sans-serif; font-size: 30px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.02em; }
.status-val.pass { color: #059669; }
.status-val.fail { color: #dc2626; }
.status-val.eliminated { color: #d97706; }

.section-card { background: var(--bg); border: 1px solid var(--border); border-radius: 24px; padding: 40px; margin-bottom: 32px; box-shadow: var(--shadow-sm); }
.section-title { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 800; color: var(--text); margin-bottom: 32px; display: flex; align-items: center; gap: 12px; letter-spacing: -0.01em; }
.section-title::before { content: ''; width: 4px; height: 24px; background: var(--primary); border-radius: 4px; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 32px; }
.stat-pill { background: var(--bg-neutral); border: 1px solid var(--border); border-radius: 20px; padding: 24px; text-align: center; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.stat-pill:hover { transform: translateY(-3px); border-color: var(--primary); box-shadow: var(--shadow-md); background: var(--bg); }
.stat-val { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 900; color: var(--text); line-height: 1; }
.stat-label { font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 10px; opacity: 0.8; }

.cat-table { width: 100%; border-collapse: separate; border-spacing: 0; }
.cat-table th { text-align: left; padding: 16px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); border-bottom: 2px solid var(--border); letter-spacing: 0.05em; }
.cat-table td { padding: 16px; border-bottom: 1px solid var(--border); font-size: 14px; font-weight: 500; }
.cat-table tr:last-child td { border-bottom: none; }
.cat-table .cat-name { font-weight: 700; color: var(--text); font-size: 15px; }

.score-cell { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--primary); }

.proctor-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.proctor-frame { background: var(--bg-neutral); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; position: relative; aspect-ratio: 4/3; box-shadow: var(--shadow-sm); }
.proctor-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.proctor-frame:hover .proctor-img { transform: scale(1.05); }
.proctor-label { position: absolute; bottom: 12px; left: 12px; right: 12px; background: rgba(0,0,0,0.7); color: white; padding: 6px 10px; border-radius: 8px; font-size: 10px; font-weight: 800; text-align: center; backdrop-filter: blur(8px); }

.q-item { border-left: 4px solid var(--border); padding: 0 0 8px 24px; margin-bottom: 40px; position: relative; }
.q-item::before { content: ''; position: absolute; left: -8px; top: 0; width: 12px; height: 12px; border-radius: 50%; background: var(--border); }
.q-item.correct { border-left-color: #10b981; }
.q-item.correct::before { background: #10b981; }
.q-item.incorrect { border-left-color: #ef4444; }
.q-item.incorrect::before { background: #ef4444; }

.q-text { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; margin-bottom: 16px; color: var(--text); line-height: 1.5; }
.opt-list { display: grid; gap: 10px; }
.opt-item { padding: 12px 16px; border: 1px solid var(--border); border-radius: 12px; font-size: 14px; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; }
.opt-item.selected { background: #fef2f2; border-color: #fecaca; }
.opt-item.correct { background: #f0fdf4; border-color: #bbf7d0; color: #065f46; font-weight: 600; }
.opt-item.both { background: #ecfdf5; border-color: #10b981; color: #065f46; font-weight: 700; box-shadow: 0 0 0 1px #10b981; }

.no-print-controls { text-align: center; padding: 40px 0 80px; display: flex; justify-content: center; gap: 16px; }

@media print {
    body { background: white !important; -webkit-print-color-adjust: exact; }
    .report-container { padding: 0; margin: 0; max-width: 100%; box-shadow: none; }
    .no-print, .admin-sidebar, .admin-header, .no-print-controls { display: none !important; }
    .section-card, .report-header { box-shadow: none; border: 1px solid #eee; break-inside: avoid; }
    .report-header { background: #fafafa !important; }
    .q-item { break-inside: avoid; }
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
                <div style={{ fontSize: 48, marginBottom: 20 }}>📑</div>
                <h2 style={{ color: 'var(--text)', fontWeight: 800 }}>Report Not Found</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>We couldn't locate the assessment data for this candidate.</p>
                <button className="test-btn" onClick={() => navigate("/manage-candidates")}>Return to Candidate List</button>
            </div>
        </AdminLayout>
    );

    const { candidate, stats, questions, proctoring, exam_title, passing_score } = report;
    const scorePct = Math.round((candidate.score / (candidate.total_marks || candidate.total_questions || 1)) * 100);
    const status = getStatus(scorePct, candidate.violations || 0, passing_score || 50);

    return (
        <AdminLayout>
            <style>{STYLES}</style>
            <div className="report-container">
                <div className="report-top-branding">
                    <img src={logo} alt="Company Logo" className="company-logo" />
                    <div className="report-id">REF: REPT-{candidate.candidate_id || candidate.id}-{new Date().getFullYear()}</div>
                </div>

                <header className="report-header">
                    <div className="header-glass" />
                    <div className="candidate-photo-frame">
                        {candidate.profile_photo ? (
                            <img src={candidate.profile_photo} alt={candidate.name} className="candidate-photo" />
                        ) : proctoring.start ? (
                            <img src={proctoring.start} alt={candidate.name} className="candidate-photo" />
                        ) : (
                            <div className="candidate-initial">{candidate.name.charAt(0)}</div>
                        )}
                    </div>
                    
                    <div className="header-info">
                        <div className="report-badge">Confidential Candidate Evaluation</div>
                        <h1 className="report-title">{candidate.name}</h1>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>
                            <span>{exam_title}</span>
                            <span>•</span>
                            <span>ID: {candidate.candidate_id || `CAND-${candidate.id}`}</span>
                            <span>•</span>
                            <span>{new Date(candidate.joined_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
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
                    <h2 className="section-title">📊 Skill-Wise Performance Matrix</h2>
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
                                                <div style={{ flex: 1, height: 6, background: 'var(--bg-neutral)', borderRadius: 10, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${pct}%`, background: pct < 40 ? '#ef4444' : pct < 70 ? '#f59e0b' : '#10b981', borderRadius: 10 }} />
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
                    <h2 className="section-title">📝 Detailed Question Submission Log</h2>
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
                    <h2 className="section-title">🛡️ Proctoring & Integrity Audit</h2>
                    {(!proctoring.start && !proctoring.mid && !proctoring.end) ? (
                        <div style={{ padding: '60px', textAlign: 'center', background: 'var(--bg-neutral)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
                            <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Proctoring evidence has been purged for privacy reasons.</p>
                        </div>
                    ) : (
                        <>
                            <div className="proctor-grid">
                                <div className="proctor-frame">
                                    {proctoring.start ? <img src={proctoring.start} className="proctor-img" alt="Start" /> : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-muted)' }}>No Record</div>}
                                    <div className="proctor-label">SESSION START PHASE</div>
                                </div>
                                <div className="proctor-frame">
                                    {proctoring.mid ? <img src={proctoring.mid} className="proctor-img" alt="Mid" /> : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-muted)' }}>No Record</div>}
                                    <div className="proctor-label">SESSION PROGRESSION PHASE</div>
                                </div>
                                <div className="proctor-frame">
                                    {proctoring.end ? <img src={proctoring.end} className="proctor-img" alt="End" /> : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-muted)' }}>No Record</div>}
                                    <div className="proctor-label">SESSION TERMINATION PHASE</div>
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
                        className="test-btn" 
                        onClick={() => window.print()} 
                        style={{ padding: '14px 40px', background: 'var(--primary)', color: 'white' }}
                    >
                         Print Official Report
                    </button>
                    <button 
                        className="test-btn" 
                        onClick={async () => {
                            if (window.confirm("This will permanently delete all snapshots for this candidate. Verify you have saved or printed the report first. Proceed?")) {
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
                        }} 
                        style={{ padding: '14px 32px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}
                    >
                         Purge Proctoring Media
                    </button>
                    <button 
                        className="test-btn secondary" 
                        onClick={() => navigate("/manage-candidates")} 
                        style={{ padding: '14px 40px' }}
                    >
                         Return
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
}
