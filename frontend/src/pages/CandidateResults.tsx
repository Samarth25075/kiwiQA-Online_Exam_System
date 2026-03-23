import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  const pct = Math.round((total > 0 ? score / total : 0) * 100);
  return { score, total, pct };
}

function formatDate(dateStr: string): string {
    if (!dateStr) return "";
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
}

// ─── Icons ─────────────────────────────────────────────────────────────────────
const Icons = {
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Filter: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Download: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  User: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  ArrowRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CandidateResults() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [exams, setExams] = useState<Record<string, Exam>>({});
  const [loading, setLoading] = useState(true);
  
  // States for filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Passed" | "Failed" | "Eliminated">("All");

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) { navigate("/"); return; }
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [cRes, eRes] = await Promise.all([
          fetch(`${API_BASE_URL}/candidates`, { headers }),
          fetch(`${API_BASE_URL}/exams`, { headers }),
        ]);

        if (cRes.status === 401 || eRes.status === 401) { navigate("/"); return; }

        if (cRes.ok && eRes.ok) {
          const cData = await cRes.json();
          const eData = await eRes.json();
          if (Array.isArray(cData)) {
            setCandidates(cData.filter((c: any) => c.status === "Completed" || c.score || parseInt(c.violations || "0") >= 3));
          }
          if (Array.isArray(eData)) {
            setExams(Object.fromEntries(eData.map((e: any) => [e.id, e])));
          }
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [navigate]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const { pct } = calcScore(c);
      const exam = exams[c.assigned_exam_id || ""] || { passing_score: 50 };
      const violations = parseInt(c.violations || "0");
      
      let status: "Passed" | "Failed" | "Eliminated";
      if (violations >= 3) status = "Eliminated";
      else if (pct >= exam.passing_score) status = "Passed";
      else status = "Failed";

      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                           c.email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [candidates, exams, search, statusFilter]);

  const stats = useMemo(() => {
    const total = candidates.length;
    let passed = 0, failed = 0, eliminated = 0;
    candidates.forEach(c => {
      const { pct } = calcScore(c);
      const exam = exams[c.assigned_exam_id || ""] || { passing_score: 50 };
      const violations = parseInt(c.violations || "0");
      if (violations >= 3) eliminated++;
      else if (pct >= exam.passing_score) passed++;
      else failed++;
    });
    return { total, passed, failed, eliminated };
  }, [candidates, exams]);

  const exportToCSV = () => {
    if (filteredCandidates.length === 0) {
      alert("No data available to export.");
      return;
    }
    // Collect data from filtered candidates
    const headers = [
      "Candidate Name", 
      "Email Address", 
      "Candidate ID", 
      "Assessment Domain", 
      "Attempt Date", 
      "Violations", 
      "Score Obtained", 
      "Total Questions", 
      "Percentage", 
      "Status"
    ];
    
    const rows = filteredCandidates.map(c => {
      const { score, total, pct } = calcScore(c);
      const exam = exams[c.assigned_exam_id || ""] || { title: "Archived Exam", passing_score: 50 };
      const violations = parseInt(c.violations || "0");
      
      let status: "Passed" | "Failed" | "Eliminated";
      if (violations >= 3) status = "Eliminated";
      else if (pct >= exam.passing_score) status = "Passed";
      else status = "Failed";

      return [
        c.name,
        c.email,
        c.candidate_id || `CAND-${c.id}`,
        exam.title,
        formatDate(c.joined_date),
        violations,
        score,
        total,
        `${pct}%`,
        status
      ];
    });

    // Generate CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map(row => 
        row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")
      )
    ].join("\r\n");

    try {
      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename = `Assessment_Results_${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export data:", err);
      alert("Failed to export data. Please try again.");
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="cr-loading">
          <div className="cr-spinner" />
          <span>Synchronizing Assessment Data...</span>
        </div>
        <style>{`
          .cr-loading { height: 70vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: var(--text-muted); font-weight: 600; font-family: 'Inter', sans-serif; }
          .cr-spinner { width: 48px; height: 48px; border: 4px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');

        .cr-wrap {
          padding: 32px;
          font-family: 'Inter', sans-serif;
          animation: crIn 0.5s ease-out;
          max-width: 1400px;
          margin: 0 auto;
        }

        @keyframes crIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Header */
        .cr-header {
          margin-bottom: 32px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .cr-header-text h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 32px;
          font-weight: 900;
          color: var(--text);
          margin: 0 0 6px;
          letter-spacing: -0.02em;
        }
        .cr-header-text p {
          color: var(--text-muted);
          font-weight: 500;
          margin: 0;
        }

        /* Stat Cards */
        .cr-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }
        .cr-stat-card {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
          box-shadow: var(--shadow-sm);
          position: relative;
          overflow: hidden;
        }
        .cr-stat-card::after {
            content: '';
            position: absolute;
            top: 0; right: 0; width: 80px; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(var(--primary-rgb, 99, 102, 241), 0.03));
            pointer-events: none;
        }
        .stat-label {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          margin-bottom: 12px;
          display: block;
        }
        .stat-val {
          font-family: 'Outfit', sans-serif;
          font-size: 28px;
          font-weight: 900;
          color: var(--text);
        }
        .stat-pct {
            font-size: 12px;
            font-weight: 700;
            margin-left: 8px;
            padding: 2px 8px;
            border-radius: 6px;
        }
        .stat-pct.pos { background: #d1fae5; color: #065f46; }
        .stat-pct.neg { background: #fee2e2; color: #991b1b; }

        /* Controls */
        .cr-controls {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 24px;
          display: flex;
          gap: 16px;
          align-items: center;
          box-shadow: var(--shadow-sm);
        }
        .cr-search-wrap {
          flex: 1;
          position: relative;
        }
        .cr-search-wrap i {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          opacity: 0.6;
        }
        .cr-search-input {
          width: 100%;
          height: 44px;
          background: var(--bg-neutral);
          border: 1.5px solid var(--border);
          border-radius: 12px;
          padding: 0 16px 0 44px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          color: var(--text);
          outline: none;
          transition: all 0.2s;
        }
        .cr-search-input:focus {
          border-color: var(--primary);
          background: var(--bg);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 12%, transparent);
        }

        .cr-tabs {
          display: flex;
          background: var(--bg-neutral);
          padding: 4px;
          border-radius: 10px;
          border: 1.5px solid var(--border);
        }
        .cr-tab {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }
        .cr-tab:hover { color: var(--text); }
        .cr-tab.active {
          background: var(--bg);
          color: var(--primary);
          box-shadow: var(--shadow-sm);
        }

        /* Table */
        .cr-table-card {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: var(--shadow-md);
        }
        .cr-table {
          width: 100%;
          border-collapse: collapse;
        }
        .cr-table th {
          background: var(--bg-neutral);
          text-align: left;
          padding: 18px 24px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border);
        }
        .cr-table tr {
            transition: background 0.15s;
            cursor: pointer;
        }
        .cr-table tr:hover {
            background: #f8fafc;
        }
        .cr-table td {
            padding: 20px 24px;
            border-bottom: 1px solid var(--border);
        }
        .cr-table tr:last-child td { border-bottom: none; }

        /* Candidate Cell */
        .cand-cell {
            display: flex;
            align-items: center;
            gap: 14px;
        }
        .cand-avatar {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            background: var(--bg-neutral);
            border: 1.5px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 800;
            color: var(--primary);
            overflow: hidden;
        }
        .cand-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .cand-info h3 {
            font-size: 14px;
            font-weight: 700;
            margin: 0 0 2px;
            color: var(--text);
        }
        .cand-info p {
            font-size: 12px;
            color: var(--text-muted);
            margin: 0;
            font-weight: 500;
        }

        /* Statuses */
        .badge {
            display: inline-flex;
            align-items: center;
            padding: 5px 12px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }
        .badge.passed { background: #ecfdf5; color: #065f46; border: 1px solid #10b98133; }
        .badge.failed { background: #fff1f2; color: #9f1239; border: 1px solid #f43f5e33; }
        .badge.eliminated { background: #fff7ed; color: #9a3412; border: 1px solid #f9731633; }

        /* Score Display */
        .score-display {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .score-top {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
        }
        .score-val {
            font-family: 'JetBrains Mono', monospace;
            font-size: 15px;
            font-weight: 700;
            color: var(--text);
        }
        .score-pct {
            font-size: 11px;
            font-weight: 800;
            color: var(--primary);
        }
        .score-bar-bg {
            width: 100px;
            height: 6px;
            background: var(--bg-neutral);
            border-radius: 10px;
            overflow: hidden;
        }
        .score-bar-fill {
            height: 100%;
            border-radius: 10px;
            transition: width 1s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .view-rpt-btn {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            border: 1.5px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-muted);
            background: var(--bg);
            transition: all 0.2s;
        }
        .view-rpt-btn:hover {
            border-color: var(--primary);
            color: var(--primary);
            background: var(--bg-neutral);
            transform: translateX(2px);
        }

        /* Empty State */
        .cr-empty {
            padding: 80px 24px;
            text-align: center;
            color: var(--text-muted);
        }
        .cr-empty-icon {
            font-size: 40px;
            margin-bottom: 20px;
            opacity: 0.5;
        }
        .cr-empty h3 { color: var(--text); margin-bottom: 8px; }

        .cr-export-btn:hover {
            border-color: var(--primary) !important;
            color: var(--primary) !important;
            background: var(--bg-neutral) !important;
            transform: translateY(-1.5px);
            box-shadow: var(--shadow-md);
        }
        .cr-export-btn:active {
            transform: translateY(0);
        }
      `}</style>

      <div className="cr-wrap">
        <header className="cr-header">
          <div className="cr-header-text">
            <h1>Assessment Intelligence</h1>
            <p>Comprehensive performance monitoring and candidate analytics.</p>
          </div>
          <button 
            className="cr-tab active cr-export-btn" 
            onClick={exportToCSV}
            style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                height: 40, 
                border: '1.5px solid var(--border)', 
                background: 'var(--bg)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <Icons.Download /> Export Data
          </button>
        </header>

        <section className="cr-stats">
          <div className="cr-stat-card">
            <span className="stat-label">Total Submissions</span>
            <div className="stat-val">{stats.total}</div>
          </div>
          <div className="cr-stat-card">
            <span className="stat-label">Completion Threshold Met</span>
            <div className="stat-val" style={{ color: '#10b981' }}>{stats.passed}</div>
            <span className="stat-pct pos">+{Math.round((stats.passed/stats.total || 0)*100)}%</span>
          </div>
          <div className="cr-stat-card">
            <span className="stat-label">Below Threshold</span>
            <div className="stat-val" style={{ color: '#f43f5e' }}>{stats.failed}</div>
            <span className="stat-pct neg">-{Math.round((stats.failed/stats.total || 0)*100)}%</span>
          </div>
          <div className="cr-stat-card">
            <span className="stat-label">Integrity Flags</span>
            <div className="stat-val" style={{ color: '#f97316' }}>{stats.eliminated}</div>
          </div>
        </section>

        <div className="cr-controls">
          <div className="cr-search-wrap">
            <i><Icons.Search /></i>
            <input 
              className="cr-search-input" 
              placeholder="Search by name, email or candidate ID..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          <div className="cr-tabs">
            {(["All", "Passed", "Failed", "Eliminated"] as const).map(t => (
              <div 
                key={t}
                className={`cr-tab ${statusFilter === t ? 'active' : ''}`}
                onClick={() => setStatusFilter(t)}
              >
                {t}
              </div>
            ))}
          </div>
        </div>

        <div className="cr-table-card">
          <table className="cr-table">
            <thead>
              <tr>
                <th>Candidate Profile</th>
                <th>Assessment Domain</th>
                <th>Attempt Date</th>
                <th>Violations</th>
                <th>Performance Insight</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="cr-empty">
                      <div className="cr-empty-icon">📊</div>
                      <h3>No results found</h3>
                      <p>Try adjusting your filters or search query.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCandidates.map(c => {
                  const { score, total, pct } = calcScore(c);
                  const exam = exams[c.assigned_exam_id || ""] || { title: "Archived Exam", passing_score: 50 };
                  const violations = parseInt(c.violations || "0");
                  
                  let status: "Passed" | "Failed" | "Eliminated";
                  if (violations >= 3) status = "Eliminated";
                  else if (pct >= exam.passing_score) status = "Passed";
                  else status = "Failed";

                  return (
                    <tr key={c.id} onClick={() => navigate(`/report/${c.id}`)}>
                      <td>
                        <div className="cand-cell">
                          <div className="cand-avatar">
                            {c.profile_photo ? <img src={c.profile_photo} alt="" /> : c.name.charAt(0)}
                          </div>
                          <div className="cand-info">
                            <h3>{c.name}</h3>
                            <p>{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="cand-info">
                          <h3 style={{ fontSize: 13 }}>{exam.title}</h3>
                          <p style={{ fontFamily: 'JetBrains Mono', fontSize: 10 }}>ID: {c.candidate_id || `CAND-${c.id}`}</p>
                        </div>
                      </td>
                      <td>
                        <div className="cr-header-text">
                          <p style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>{formatDate(c.joined_date)}</p>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ 
                            width: 8, height: 8, borderRadius: '50%', 
                            background: violations > 0 ? '#f43f5e' : '#10b981' 
                          }} />
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{violations}</span>
                        </div>
                      </td>
                      <td style={{ width: '180px' }}>
                        <div className="score-display">
                          <div className="score-top">
                            <span className="score-val">{score} <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>/ {total}</span></span>
                            <span className="score-pct">{pct}%</span>
                          </div>
                          <div className="score-bar-bg">
                            <div className="score-bar-fill" style={{ 
                                width: `${pct}%`, 
                                background: pct < 40 ? '#f43f5e' : pct < 70 ? '#f59e0b' : '#10b981' 
                            }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${status.toLowerCase()}`}>{status}</span>
                      </td>
                      <td>
                        <div className="view-rpt-btn">
                          <Icons.ArrowRight />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
