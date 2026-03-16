import { useState, useEffect, useMemo } from "react";
import AdminLayout from "../components/AdminLayout";
import API_BASE_URL from "../config";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Candidate {
    id: number;
    candidate_id?: string;
    name: string;
    email: string;
    profile_photo?: string;
    status: string;
    joined_date: string;
    score?: string;
    total_questions?: string;
    assigned_exam_id?: string;
    violations?: string;
}

interface Exam {
    id: string;
    title: string;
    passing_score: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function calcScore(c: Candidate) {
    const score = parseInt(c.score ?? "0", 10);
    const total = parseInt(c.total_questions ?? "1", 10) || 1;
    const pct = Math.round((score / total) * 100);
    return { score, total, pct };
}

function scoreTier(pct: number): "high" | "mid" | "low" {
    if (pct >= 80) return "high";
    if (pct >= 50) return "mid";
    return "low";
}

function formatDate(dateStr: string): string {
    if (!dateStr) return "";
    // If it's already in YYYY-MM-DD format (possibly with T... suffix)
    const isoPart = dateStr.split('T')[0];
    const parts = isoPart.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
        // YYYY-MM-DD -> DD-MM-YYYY
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    try {
        const date = new Date(dateStr);
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        return `${d}-${m}-${y}`;
    } catch {
        return dateStr;
    }
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function ScoreBadge({ pct }: { pct: number }) {
    const tier = scoreTier(pct);
    return (
        <span className={`score-badge score-badge--${tier}`}>
            {pct}%
        </span>
    );
}

function ProgressBar({ pct }: { pct: number }) {
    const tier = scoreTier(pct);
    return (
        <div className="progress-track" aria-hidden="true">
            <div
                className={`progress-fill progress-fill--${tier}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

function EmptyRow({ colSpan, hasFilters }: { colSpan: number; hasFilters: boolean }) {
    return (
        <tr>
            <td colSpan={colSpan} className="empty-cell">
                <div className="empty-icon">📋</div>
                <p className="empty-title">
                    {hasFilters ? "No results match your filters" : "No assessment results yet"}
                </p>
                <p className="empty-sub">
                    {hasFilters
                        ? "Try adjusting your filter criteria."
                        : "Completed assessments will appear here."}
                </p>
            </td>
        </tr>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CandidateResults() {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [exams, setExams] = useState<Record<string, Exam>>({});
    const [loading, setLoading] = useState(true);
    const [filterExam, setFilterExam] = useState("");
    const [minScore, setMinScore] = useState("");
    const [minPct, setMinPct] = useState("");
    const [filterDate, setFilterDate] = useState("");

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        const token = localStorage.getItem("access_token");
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const [cRes, eRes] = await Promise.all([
                fetch(`${API_BASE_URL}/candidates`, { headers }),
                fetch(`${API_BASE_URL}/exams`, { headers }),
            ]);

            const cData: Candidate[] = await cRes.json();
            const eData: Exam[] = await eRes.json();

            // Sort all candidates by date DESC initially
            const sortedData = cData
                .filter(c => c.status === "Completed" || c.score || parseInt(c.violations || "0", 10) >= 3)
                .sort((a, b) => new Date(b.joined_date).getTime() - new Date(a.joined_date).getTime());

            setCandidates(sortedData);
            setExams(Object.fromEntries(eData.map(e => [e.id, e])));
        } catch (err) {
            console.error("Failed to fetch results:", err);
        } finally {
            setLoading(false);
        }
    };

    const hasFilters = !!(filterExam || minScore || minPct || filterDate);

    const groupedCandidates = useMemo(() => {
        const filtered = candidates.filter(c => {
            const exam = exams[c.assigned_exam_id ?? ""] || { title: "", passing_score: 50 };
            const examName = exam.title;
            const { score, pct } = calcScore(c);
            
            if (filterDate) {
                const cDateStr = formatDate(c.joined_date);
                if (!cDateStr.includes(filterDate)) return false;
            }
            
            return (
                (!filterExam || examName.toLowerCase().includes(filterExam.toLowerCase())) &&
                (!minScore || score >= parseInt(minScore, 10)) &&
                (!minPct || pct >= parseInt(minPct, 10))
            );
        });

        // Group by Status: Passed, Failed, Eliminated
        const groups: Record<string, Candidate[]> = {
            "Passed": [],
            "Failed": [],
            "Eliminated": []
        };

        filtered.forEach(c => {
            const exam = exams[c.assigned_exam_id ?? ""] || { passing_score: 50 };
            const { pct } = calcScore(c);
            const violations = parseInt(c.violations || "0", 10);

            if (violations >= 3) {
                groups["Eliminated"].push(c);
            } else if (pct >= exam.passing_score) {
                groups["Passed"].push(c);
            } else {
                groups["Failed"].push(c);
            }
        });

        return [
            { title: "Passed", items: groups["Passed"], color: "#065f46", bg: "#d1fae5" },
            { title: "Failed", items: groups["Failed"], color: "#991b1b", bg: "#fee2e2" },
            { title: "Eliminated", items: groups["Eliminated"], color: "#92400e", bg: "#fef3c7" }
        ].filter(g => g.items.length > 0 || !hasFilters);
    }, [candidates, exams, filterExam, minScore, minPct, filterDate, hasFilters]);

    const clearFilters = () => { 
        setFilterExam(""); 
        setMinScore(""); 
        setMinPct(""); 
        setFilterDate("");
    };

    if (loading) return null;

    return (
        <AdminLayout>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&display=swap');

        /* -- Page Shell -------------------------------- */
        .cr-page {
          background: var(--bg-neutral);
          min-height: 100vh;
          color: var(--text);
        }

        /* -- Top Bar ----------------------------------- */
        .cr-topbar {
          height: 60px;
          background: var(--bg);
          border-bottom: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
          display: flex;
          align-items: center;
          padding: 0 28px;
          gap: 12px;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .cr-topbar-title {
          font-family: var(--font-heading);
          font-size: 18px;
          color: var(--text);
          margin: 0;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .cr-topbar-sep {
          width: 1px; height: 20px;
          background: var(--border);
        }

        .cr-topbar-count {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text);
          opacity: 0.8;
        }

        /* -- Content ----------------------------------- */
        .cr-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 28px 28px 48px;
          animation: pageIn 0.35s ease;
        }

        @keyframes pageIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* -- Filter Bar -------------------------------- */
        .filter-bar {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 20px 24px;
          margin-bottom: 20px;
          box-shadow: var(--shadow-sm);
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.5fr auto;
          gap: 16px;
          align-items: flex-end;
        }

        .date-header-row {
            display: none;
        }

        .day-card {
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            box-shadow: var(--shadow-sm);
            margin-bottom: 32px;
            overflow: hidden;
            animation: cardIn 0.4s ease forwards;
        }

        @keyframes cardIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .day-header {
            background: var(--bg-neutral);
            padding: 14px 24px;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .day-title {
            font-size: 13px;
            font-weight: 800;
            color: var(--text);
            display: flex;
            align-items: center;
            gap: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .day-count {
            font-size: 11px;
            font-weight: 700;
            color: var(--text);
            background: color-mix(in srgb, var(--primary) 12%, var(--bg));
            padding: 2px 10px;
            border-radius: 100px;
            border: 1px solid color-mix(in srgb, var(--primary) 25%, var(--bg));
        }

        .cr-table-wrap {
            border: none;
            border-radius: 0;
            box-shadow: none;
        }

        @media (max-width: 768px) {
          .filter-bar { grid-template-columns: 1fr 1fr; }
          .filter-bar > :last-child { grid-column: 1 / -1; }
        }

        @media (max-width: 480px) {
          .filter-bar { grid-template-columns: 1fr; }
          .cr-content { padding: 16px 16px 40px; }
        }

        .filter-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text);
          letter-spacing: 0.02em;
        }

        .filter-input {
          height: 38px;
          padding: 0 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--bg-neutral);
          color: var(--text);
          font-size: 13.5px;
          font-weight: 500;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .filter-input::placeholder { color: var(--text-muted); opacity: 0.6; }

        .filter-input:focus {
          background: var(--bg);
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-light);
        }

        .date-input-active::-webkit-calendar-picker-indicator {
            display: none;
        }

        .filter-input[type="date"] {
            position: relative;
        }

        .filter-input[type="date"]::before {
            content: attr(placeholder);
            position: absolute;
            color: var(--text-muted);
            opacity: 0.6;
        }

        .filter-input[type="date"]:focus::before,
        .filter-input[type="date"]:valid::before {
            display: none;
        }

        .btn-clear {
          height: 38px;
          padding: 0 18px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          cursor: pointer;
          white-space: nowrap;
          transition: border-color 0.2s, color 0.2s;
          outline: none;
        }

        .btn-clear:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        /* -- Table ------------------------------------- */
        .cr-table-wrap {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--card-shadow);
          overflow: hidden;
        }

        .cr-table {
          width: 100%;
          border-collapse: collapse;
        }

        .cr-table thead tr {
          background: var(--bg-neutral);
          border-bottom: 1px solid var(--border);
        }

        .cr-table th {
          text-align: left;
          padding: 13px 20px;
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #475569;
          white-space: nowrap;
        }

        .cr-table tbody tr {
          border-bottom: 1px solid var(--border);
          transition: background 0.2s;
        }

        .cr-table tbody tr:last-child { border-bottom: none; }
        .cr-table tbody tr:hover { background: var(--bg-neutral); }

        .cr-table td {
          padding: 14px 20px;
          font-size: 14px;
          color: var(--text);
          vertical-align: middle;
        }

        /* -- Candidate Cell ---------------------------- */
        .candidate-name {
          font-weight: 600;
          color: var(--text);
          line-height: 1.3;
        }

        .candidate-email {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        /* -- Exam Cell --------------------------------- */
        .exam-title {
          font-weight: 500;
          color: var(--text);
        }

        /* -- Date Cell --------------------------------- */
        .date-text {
          font-size: 13px;
          color: var(--text-muted);
          white-space: nowrap;
        }

        /* -- Score Cell -------------------------------- */
        .score-wrap {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .score-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
        }

        .score-sep {
          font-size: 13px;
          color: #64748b;
          font-weight: 600;
        }

        .score-total {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          color: #475569;
          font-weight: 600;
        }

        /* -- Score Badge ------------------------------- */
        .score-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 100px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12.5px;
          font-weight: 700;
          border: 1px solid transparent;
        }

        .score-badge--high {
          background: #d1fae5;
          color: #065f46;
          border-color: #a7f3d0;
        }

        .score-badge--mid {
          background: #fef3c7;
          color: #92400e;
          border-color: #fce788;
        }

        .score-badge--low {
          background: #dbeafe;
          color: #1e40af;
          border-color: #bfdbfe;
        }

        /* -- Progress Bar ------------------------------ */
        .progress-track {
          height: 4px;
          background: var(--border);
          border-radius: 2px;
          overflow: hidden;
          margin-top: 6px;
          width: 80px;
        }

        .progress-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.6s ease;
        }

        .progress-fill--high { background: #059669; }
        .progress-fill--mid  { background: #d97706; }
        .progress-fill--low  { background: #2563eb; }

        /* -- Performance Cell -------------------------- */
        .perf-cell {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        /* -- Empty State ------------------------------- */
        .empty-cell {
          text-align: center;
          padding: 72px 24px !important;
          color: var(--text-muted);
        }

        .empty-icon {
          font-size: 36px;
          margin-bottom: 12px;
          opacity: 0.6;
        }

        .empty-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
          margin: 0 0 6px;
        }

        .empty-sub {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0;
        }

        .pass-fail-badge {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            padding: 2px 6px;
            border-radius: 4px;
            letter-spacing: 0.05em;
        }

        .pass-fail-badge.pass {
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #a7f3d0;
        }

        .pass-fail-badge.fail {
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #fecaca;
        }

        .pass-fail-badge.eliminated {
            background: #fef3c7;
            color: #92400e;
            border: 1px solid #fce788;
        }

        .res-avatar {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: var(--bg-neutral);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 800;
            overflow: hidden;
            flex-shrink: 0;
            border: 1px solid var(--border);
        }
        .res-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .res-id {
            font-size: 10px;
            font-weight: 800;
            color: var(--primary);
            font-family: 'JetBrains Mono', monospace;
            letter-spacing: -0.02em;
        }
      `}</style>

            {/* ── Top Bar ───────────────────────────────────────────────────────── */}
            <header className="cr-topbar">
                <h2 className="cr-topbar-title">Assessment Results</h2>
                <div className="cr-topbar-sep" />
                <span className="cr-topbar-count">
                    {candidates.length} Candidate Results
                    {hasFilters ? " (filtered)" : ""}
                </span>
            </header>

            <div className="cr-content">

                {/* ── Filters ─────────────────────────────────────────────────────── */}
                <div className="filter-bar">
                    <div className="filter-field">
                        <label className="filter-label">Exam Title</label>
                        <input
                            className="filter-input"
                            placeholder="Search by exam name…"
                            value={filterExam}
                            onChange={e => setFilterExam(e.target.value)}
                        />
                    </div>

                    <div className="filter-field">
                        <label className="filter-label">Min Score</label>
                        <input
                            className="filter-input"
                            type="text"
                            placeholder="e.g. 5"
                            value={minScore}
                            onChange={e => setMinScore(e.target.value.replace(/\D/g, ""))}
                        />
                    </div>

                    <div className="filter-field">
                        <label className="filter-label">Min Percentage (%)</label>
                        <input
                            className="filter-input"
                            type="text"
                            placeholder="e.g. 80"
                            value={minPct}
                            onChange={e => setMinPct(e.target.value.replace(/\D/g, ""))}
                        />
                    </div>

                    <div className="filter-field">
                        <label className="filter-label">Exam Date</label>
                        <input
                            className="filter-input"
                            type="text"
                            placeholder="dd-mm-yyyy"
                            value={filterDate}
                            onChange={e => {
                                let val = e.target.value.replace(/\D/g, "");
                                if (val.length > 2) val = val.slice(0, 2) + "-" + val.slice(2);
                                if (val.length > 5) val = val.slice(0, 5) + "-" + val.slice(5, 9);
                                setFilterDate(val);
                            }}
                        />
                    </div>

                    <button className="btn-clear" onClick={clearFilters} disabled={!hasFilters}>
                        Clear Filters
                    </button>
                </div>

                {/* ── Results ─────────────────────────────────────────────────────── */}
                <div className="cr-results-list">
                    {groupedCandidates.length === 0 ? (
                        <div className="cr-table-wrap">
                            <table className="cr-table">
                                <tbody>
                                    <EmptyRow colSpan={5} hasFilters={hasFilters} />
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        groupedCandidates.map(group => (
                            <div key={group.title} className="day-card">
                                <div className="day-header" style={{ background: group.bg }}>
                                    <div className="day-title" style={{ color: group.color }}>
                                        {group.title === "Passed" && "✅ "}
                                        {group.title === "Failed" && "❌ "}
                                        {group.title === "Eliminated" && "⚠️ "}
                                        {group.title}
                                    </div>
                                    <div className="day-count">
                                        {group.items.length} {group.items.length === 1 ? 'Candidate' : 'Candidates'}
                                    </div>
                                </div>
                                <div className="cr-table-wrap">
                                    <table className="cr-table">
                                        <thead>
                                            <tr>
                                                <th>Candidate</th>
                                                <th>Exam</th>
                                                <th>Exam Date</th>
                                                <th>Score</th>
                                                <th>Performance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {group.items.map(candidate => {
                                                const { score, total, pct } = calcScore(candidate);
                                                const exam = exams[candidate.assigned_exam_id ?? ""] || { title: "Unknown Exam", passing_score: 50 };
                                                const violations = parseInt(candidate.violations || "0", 10);
                                                const isEliminated = violations >= 3;
                                                const isPassed = pct >= exam.passing_score && !isEliminated;

                                                return (
                                                    <tr key={candidate.id}>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                <div className="res-avatar">
                                                                    {candidate.profile_photo ? (
                                                                        <img src={candidate.profile_photo} alt={candidate.name} />
                                                                    ) : (
                                                                        candidate.name.charAt(0).toUpperCase()
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="res-id">{candidate.candidate_id || `CAND-${candidate.id}`}</div>
                                                                    <div className="candidate-name">{candidate.name}</div>
                                                                    <div className="candidate-email">{candidate.email}</div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td>
                                                            <span className="exam-title">{exam.title}</span>
                                                        </td>

                                                        <td>
                                                            <span className="date-text">{formatDate(candidate.joined_date)}</span>
                                                        </td>

                                                        <td>
                                                            <div className="score-wrap">
                                                                <span className="score-value">{score}</span>
                                                                <span className="score-sep">/</span>
                                                                <span className="score-total">{total}</span>
                                                            </div>
                                                        </td>

                                                        <td>
                                                            <div className="perf-cell">
                                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                                    <ScoreBadge pct={pct} />
                                                                    <span className={`pass-fail-badge ${isEliminated ? 'eliminated' : isPassed ? 'pass' : 'fail'}`}>
                                                                        {isEliminated ? 'Eliminated' : isPassed ? 'Passed' : 'Failed'}
                                                                    </span>
                                                                </div>
                                                                <ProgressBar pct={pct} />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
