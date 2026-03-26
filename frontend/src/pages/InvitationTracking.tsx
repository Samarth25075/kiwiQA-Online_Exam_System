import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config';
import AdminLayout from '../components/AdminLayout';

const Icons = {
    Mail: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
    ),
    Refresh: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
    ),
    ChevronDown: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    ),
    ChevronUp: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
    )
};

interface TrackingDetail {
    email: string;
    sent_at: string;
    status: string;
    admin_name?: string;
}

interface ExamTracking {
    exam_id: string;
    exam_title: string;
    total_invited: number;
    sat_count: number;
    not_sat_count: number;
    sent_by_counts?: Record<string, number>;
    details: TrackingDetail[];
}

const InvitationTracking: React.FC = () => {
    const [data, setData] = useState<ExamTracking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedExam, setExpandedExam] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = sessionStorage.getItem("access_token");
            const res = await fetch(`${API_BASE_URL}/exams/invitations/tracking`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const json = await res.json();
                console.log("INVITE TRACKING DEBUG:", json);
                setData(json);
            } else {
                const errData = await res.json().catch(() => ({}));
                setError(errData.detail || `Server returned ${res.status}`);
            }
        } catch (err) {
            console.error("Failed to fetch tracking data:", err);
            setError("Network error or server is offline");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <AdminLayout>
            <div className="db-container" style={{ padding: '24px' }}>
                <style>{`
                    .tracking-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 24px;
                    }
                    .tracking-title {
                        margin: 0;
                        font-size: 24px;
                        font-weight: 800;
                        color: var(--slate-900);
                    }
                    .tracking-card {
                        background: var(--white);
                        border-radius: var(--radius-lg);
                        border: 1px solid var(--slate-100);
                        margin-bottom: 16px;
                        overflow: hidden;
                        box-shadow: var(--shadow-sm);
                        transition: all 0.2s;
                    }
                    .tracking-card.expanded {
                        box-shadow: var(--shadow-md);
                        border-color: var(--slate-200);
                    }
                    .tracking-card-header {
                        padding: 16px 20px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        cursor: pointer;
                        background: var(--white);
                        transition: background 0.2s;
                    }
                    .tracking-card-header:hover {
                        background: var(--slate-50);
                    }
                    .exam-info h4 {
                        margin: 0;
                        font-size: 16px;
                        color: var(--slate-900);
                        font-weight: 700;
                    }
                    .tracking-stats {
                        display: flex;
                        gap: 12px;
                        align-items: center;
                    }
                    .stat-pill {
                        padding: 6px 14px;
                        border-radius: 20px;
                        font-size: 12px;
                        font-weight: 700;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }
                    .stat-pill.invited { background: var(--slate-100); color: var(--slate-600); }
                    .stat-pill.sat { background: #ecfdf5; color: #059669; border: 1px solid #d1fae5; }
                    .stat-pill.not-sat { background: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; }
                    
                    .tracking-details {
                        border-top: 1px solid var(--slate-100);
                        background: #f8fafc;
                    }
                    .details-table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .details-table th {
                        text-align: left;
                        padding: 12px 20px;
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        color: var(--slate-500);
                        border-bottom: 1px solid var(--slate-100);
                        background: var(--slate-50);
                    }
                    .details-table td {
                        padding: 14px 20px;
                        font-size: 13px;
                        border-bottom: 1px solid var(--slate-100);
                        color: var(--slate-600);
                    }
                    .details-table tr:last-child td {
                        border-bottom: none;
                    }
                    .status-badge {
                        padding: 4px 10px;
                        border-radius: 6px;
                        font-size: 11px;
                        font-weight: 700;
                        display: inline-block;
                    }
                    .status-badge.sat { background: #d1fae5; color: #065f46; }
                    .status-badge.not-sat { background: #fee2e2; color: #991b1b; }
                    
                    .btn-refresh {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 8px 16px;
                        background: var(--white);
                        border: 1px solid var(--slate-200);
                        color: var(--slate-600);
                        border-radius: 10px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .btn-refresh:hover {
                        background: var(--slate-50);
                        border-color: var(--slate-300);
                    }
                    .empty-tracking {
                        text-align: center;
                        padding: 60px 20px;
                        background: var(--white);
                        border-radius: var(--radius-lg);
                        border: 1px dashed var(--slate-200);
                    }
                `}</style>
    
                <header className="tracking-header">
                    <div>
                        <h2 className="tracking-title">Invitation Reports</h2>
                        <p style={{ margin: '4px 0 0', color: 'var(--slate-500)', fontSize: '14px' }}>
                            Track who shared your exams and their current status.
                        </p>
                    </div>
                    <button className="btn-refresh" onClick={fetchData} disabled={loading}>
                        <Icons.Refresh /> Refresh
                    </button>
                </header>
    
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--slate-400)' }}>
                        <div className="loader" style={{ marginBottom: '16px' }}>KiwiQA...</div>
                        Loading invitation data...
                    </div>
                ) : error ? (
                    <div className="empty-tracking" style={{ borderColor: 'rgba(220, 38, 38, 0.2)', background: 'rgba(220, 38, 38, 0.02)' }}>
                        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
                        <h4 style={{ margin: '0 0 8px', color: '#dc2626' }}>Failed to load data</h4>
                        <p style={{ margin: '0 0 16px', color: 'var(--slate-500)' }}>{error}</p>
                        <button 
                            onClick={fetchData} 
                            style={{ padding: '8px 16px', borderRadius: '8px', background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                        >
                            Try Again
                        </button>
                    </div>
                ) : data.length === 0 ? (
                    <div className="empty-tracking">
                        <div style={{ fontSize: '40px', marginBottom: '16px' }}>✉️</div>
                        <h4 style={{ margin: '0 0 8px', color: 'var(--slate-900)' }}>No invitations sent yet</h4>
                        <p style={{ margin: 0, color: 'var(--slate-500)' }}>When you send exam links through the dashboard, you'll see tracking reports here.</p>
                    </div>
                ) : (
                    <div className="tracking-list">
                        {data.map(exam => (
                            <div key={exam.exam_id} className={`tracking-card ${expandedExam === exam.exam_id ? 'expanded' : ''}`}>
                                <div 
                                    className="tracking-card-header" 
                                    onClick={() => setExpandedExam(expandedExam === exam.exam_id ? null : exam.exam_id)}
                                >
                                    <div className="exam-info">
                                        <h4>{exam.exam_title}</h4>
                                        <span style={{ fontSize: '11px', color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {exam.exam_id.split('-')[0]} • {exam.total_invited} Recipients
                                            {exam.sent_by_counts && Object.keys(exam.sent_by_counts).length > 0 && ` (Sent by: ${Object.entries(exam.sent_by_counts).map(([admin, count]) => `${admin}: ${count}`).join(', ')})`}
                                        </span>
                                    </div>
                                    <div className="tracking-stats">
                                        <span className="stat-pill sat">✅ Sat: {exam.sat_count}</span>
                                        <span className="stat-pill not-sat">⏳ Not Sat: {exam.not_sat_count}</span>
                                        <div style={{ marginLeft: '10px', color: 'var(--slate-400)' }}>
                                            {expandedExam === exam.exam_id ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                                        </div>
                                    </div>
                                </div>
                                {expandedExam === exam.exam_id && (
                                    <div className="tracking-details">
                                        {exam.details.length === 0 ? (
                                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--slate-400)', fontSize: '13px' }}>
                                                No details available for this exam.
                                            </div>
                                        ) : (
                                            <table className="details-table">
                                                <thead>
                                                    <tr>
                                                        <th>Email Address</th>
                                                        <th>Invited Date</th>
                                                        <th>Sent By</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {exam.details.map((detail, idx) => (
                                                        <tr key={idx}>
                                                            <td style={{ fontWeight: 600, color: 'var(--slate-700)' }}>{detail.email}</td>
                                                            <td>{new Date(detail.sent_at).toLocaleDateString()} at {new Date(detail.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                            <td style={{ color: 'var(--slate-600)' }}>{detail.admin_name || 'Admin'}</td>
                                                            <td>
                                                                <span className={`status-badge ${detail.status.startsWith('Sat') ? 'sat' : 'not-sat'}`}>
                                                                    {detail.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default InvitationTracking;
