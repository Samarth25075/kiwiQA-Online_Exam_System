import { useState, useEffect } from "react";
import AdminLayout from "../components/AdminLayout";
import CustomPopup, { PopupType } from "../components/CustomPopup";
import API_BASE_URL from "../config";

// ─── Types ────────────────────────────────────────────────────────────────
interface Candidate {
    id: number;
    name: string;
    email: string;
    phone_number: string;
    cv_url: string;
    status: string;
    joined_date: string;
    device_id?: string;
    assigned_exam_id?: string;
    token?: string;
}

const Icons = {
    Edit: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    ),
    Trash: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
    ),
    FileText: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
    ),
    X: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    ),
    Check: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    ),
    CPU: () => (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/></svg>
    ),
};

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
const getAvatarColor = (name: string) => {
    const colors = ['#1c848f', '#7c3aed', '#0284c7', '#e11d48', '#d97706', '#059669'];
    return colors[name.charCodeAt(0) % colors.length];
};

const StatusChip = ({ status }: { status: string }) => {
    const s = (status || 'PENDING').toUpperCase();
    const map: Record<string, { bg: string; color: string; border: string }> = {
        COMPLETED: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
        PENDING: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
        ACTIVE: { bg: '#f0f9fa', color: '#1c848f', border: '#ccf1f5' },
        FAILED: { bg: '#fff1f2', color: '#e11d48', border: '#ffe4e6' },
    };
    const style = map[s] || map.PENDING;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '2px 8px', borderRadius: 100,
            fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em',
            background: style.bg, color: style.color, border: `1px solid ${style.border}`
        }}>
            {s}
        </span>
    );
};

export default function ManageCandidates() {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ name: "", email: "", phone_number: "", cv_url: "" });
    const [cvFile, setCvFile] = useState<File | null>(null);
    const [popup, setPopup] = useState<{ isOpen: boolean; type: PopupType; title?: string; message: string; onConfirm: () => void; onCancel?: () => void; confirmText?: string; } | null>(null);

    useEffect(() => { fetchCandidates(); }, []);

    const fetchCandidates = async () => {
        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch(`${API_BASE_URL}/candidates`, { headers: { "Authorization": `Bearer ${token}` } });
            if (res.ok) { setCandidates(await res.json()); }
        } catch {
            setPopup({ isOpen: true, type: 'alert', title: 'Error', message: 'Failed to fetch candidates.', onConfirm: () => setPopup(null) });
        } finally { setLoading(false); }
    };

    const handleEdit = (candidate: Candidate) => {
        setEditingId(candidate.id);
        setFormData({ name: candidate.name, email: candidate.email, phone_number: candidate.phone_number || "", cv_url: candidate.cv_url || "" });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = (id: number) => {
        setPopup({
            isOpen: true, type: 'confirm', title: 'Delete Candidate',
            message: 'Are you sure you want to permanently delete this candidate?',
            confirmText: 'Delete',
            onConfirm: async () => {
                setPopup(null);
                const token = localStorage.getItem("access_token");
                try {
                    const res = await fetch(`${API_BASE_URL}/candidates/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } });
                    if (res.ok) { fetchCandidates(); }
                    else {
                        const data = await res.json().catch(() => ({}));
                        setPopup({ isOpen: true, type: 'alert', title: 'Deletion Failed', message: data.detail || "Could not delete the candidate.", onConfirm: () => setPopup(null) });
                    }
                } catch { setPopup({ isOpen: true, type: 'alert', title: 'Error', message: "Error deleting candidate", onConfirm: () => setPopup(null) }); }
            },
            onCancel: () => setPopup(null)
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch(`${API_BASE_URL}/candidates/${editingId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                const candidate = await res.json();
                if (cvFile) {
                    const uploadData = new FormData();
                    uploadData.append("file", cvFile);
                    await fetch(`${API_BASE_URL}/candidates/${candidate.id}/upload-cv`, { method: "POST", headers: { "Authorization": `Bearer ${token}` }, body: uploadData });
                }
                setFormData({ name: "", email: "", phone_number: "", cv_url: "" });
                setCvFile(null);
                setEditingId(null);
                fetchCandidates();
            }
        } catch { setPopup({ isOpen: true, type: 'alert', title: 'Error', message: "Error saving candidate", onConfirm: () => setPopup(null) }); }
    };

    if (loading) return null;

    return (
        <AdminLayout>
            <style>{`
                .mc-header {
                    height: 52px;
                    background: var(--bg);
                    border-bottom: 1px solid var(--border);
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 0 24px; position: sticky; top: 0; z-index: 100;
                    box-shadow: var(--shadow-sm);
                }
                .mc-header-title { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 900; color: var(--text); letter-spacing: -0.03em; margin: 0; }
                .mc-header-count { font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 1px; }

                .mc-content { padding: 20px 24px; animation: mcFadeUp 0.6s cubic-bezier(0.16,1,0.3,1); }
                @keyframes mcFadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

                .mc-edit-card {
                    background: var(--bg); border: 1px solid var(--border); border-left: 3px solid var(--primary);
                    border-radius: 14px; padding: 20px; margin-bottom: 20px;
                    box-shadow: var(--card-shadow);
                    animation: mcSlideDown 0.3s cubic-bezier(0.16,1,0.3,1);
                }
                @keyframes mcSlideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
                .mc-edit-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
                .mc-edit-title { font-family:'Outfit',sans-serif; font-size:14px; font-weight:800; color:var(--text); }
                .mc-edit-cancel {
                    width:28px; height:28px; display:flex; align-items:center; justify-content:center;
                    background:var(--bg-neutral); border:1px solid var(--border); border-radius:8px;
                    cursor:pointer; color:var(--text-muted); transition:all 0.2s;
                }
                .mc-edit-cancel:hover { background:#fff1f2; color:#e11d48; border-color:#ffe4e6; }
                .mc-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
                @media(max-width:640px) { .mc-form-grid { grid-template-columns:1fr; } }
                .mc-field { display:flex; flex-direction:column; gap:5px; }
                .mc-label { font-size:9px; font-weight:900; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.1em; }
                .mc-input {
                    padding:9px 12px; border:1px solid var(--border); border-radius:8px;
                    font-size:13px; font-family:'Inter',sans-serif; background:var(--bg-neutral);
                    color:var(--text); outline:none; transition:all 0.2s;
                }
                .mc-input:focus { border-color:var(--primary); background:var(--bg); box-shadow:0 0 0 3px var(--primary-light); }
                .mc-save-btn {
                    grid-column:span 2; padding:10px; margin-top:4px;
                    background:var(--primary);
                    color:white; border:none; border-radius:10px;
                    font-family:'Inter',sans-serif; font-size:12px; font-weight:700;
                    cursor:pointer; transition:all 0.3s; display:flex; align-items:center; justify-content:center; gap:6px;
                    box-shadow:0 6px 16px -4px var(--primary-light);
                }
                .mc-save-btn:hover { background:var(--primary-hover); transform:translateY(-1px); }

                .mc-table-wrap { background:var(--bg); border:1px solid var(--border); border-radius:14px; overflow:hidden; box-shadow:var(--card-shadow); }
                .mc-table { width:100%; border-collapse:collapse; }
                .mc-table th { text-align:left; padding:10px 16px; font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-muted); background:var(--bg-neutral); border-bottom:1px solid var(--border); }
                .mc-table td { padding:10px 16px; border-bottom:1px solid var(--border); vertical-align:middle; }
                .mc-table tr:last-child td { border-bottom:none; }
                .mc-table tr:hover td { background:var(--bg-neutral); }

                .mc-avatar { width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:white; flex-shrink:0; }
                .mc-name { font-size:12px; font-weight:700; color:var(--text); }
                .mc-sub { font-size:10px; color:var(--text-muted); font-weight:500; margin-top:1px; }

                .mc-action-btn { width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:8px; border:1px solid var(--border); background:var(--bg-neutral); cursor:pointer; transition:all 0.2s; color:var(--text-muted); }
                .mc-action-btn:hover { transform:scale(1.1); }
                .mc-btn-edit:hover { background:color-mix(in srgb, var(--primary) 10%, var(--bg)); color:var(--primary); border-color:color-mix(in srgb, var(--primary) 30%, transparent); }
                .mc-btn-del:hover { background:#fff1f2; color:#e11d48; border-color:#ffe4e6; }

                .mc-resume-link { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:100px; font-size:10px; font-weight:700; text-decoration:none; background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; transition:all 0.2s; }
                .mc-resume-link:hover { background:#dcfce7; }

                .mc-empty { text-align:center; padding:60px 40px; color:var(--text-muted); }
                .mc-empty-icon { font-size:40px; margin-bottom:16px; }
                .mc-empty-title { font-family:'Outfit',sans-serif; font-size:16px; font-weight:800; color:var(--text); margin-bottom:6px; }
                .mc-empty-sub { font-size:12px; }
            `}</style>

            <header className="mc-header">
                <div>
                    <div className="mc-header-title">Candidate Management</div>
                    <div className="mc-header-count">{candidates.length} Total Candidates</div>
                </div>
            </header>

            <div className="mc-content">
                {editingId && (
                    <div className="mc-edit-card">
                        <div className="mc-edit-header">
                            <div className="mc-edit-title">✏️ Update Candidate Profile</div>
                            <button className="mc-edit-cancel" onClick={() => { setEditingId(null); setFormData({ name: "", email: "", phone_number: "", cv_url: "" }); }}>
                                <Icons.X />
                            </button>
                        </div>
                        <form className="mc-form-grid" onSubmit={handleSubmit}>
                            <div className="mc-field">
                                <label className="mc-label">Full Name</label>
                                <input className="mc-input" placeholder="John Doe" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div className="mc-field">
                                <label className="mc-label">Email Address</label>
                                <input className="mc-input" type="email" placeholder="john@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                            </div>
                            <div className="mc-field">
                                <label className="mc-label">Phone Number</label>
                                <input className="mc-input" placeholder="+91 00000 00000" value={formData.phone_number} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} />
                            </div>
                            <div className="mc-field">
                                <label className="mc-label">Upload CV / Resume</label>
                                <input className="mc-input" type="file" accept=".pdf,.doc,.docx" style={{ padding: '7px 10px' }} onChange={e => setCvFile(e.target.files?.[0] || null)} />
                            </div>
                            <button type="submit" className="mc-save-btn">
                                <Icons.Check /> Save Changes
                            </button>
                        </form>
                    </div>
                )}

                {candidates.length === 0 ? (
                    <div className="mc-table-wrap">
                        <div className="mc-empty">
                            <div className="mc-empty-icon">👥</div>
                            <div className="mc-empty-title">No Candidates Yet</div>
                            <div className="mc-empty-sub">Enroll candidates via the dashboard to get started.</div>
                        </div>
                    </div>
                ) : (
                    <div className="mc-table-wrap">
                        <table className="mc-table">
                            <thead>
                                <tr>
                                    <th>Candidate</th>
                                    <th>Contact</th>
                                    <th>Resume</th>
                                    <th>Status</th>
                                    <th>Device</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {candidates.map(candidate => (
                                    <tr key={candidate.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div className="mc-avatar" style={{ background: getAvatarColor(candidate.name) }}>
                                                    {getInitials(candidate.name)}
                                                </div>
                                                <div>
                                                    <div className="mc-name">{candidate.name}</div>
                                                    <div className="mc-sub">Joined: {candidate.joined_date?.split('T')[0] || '—'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="mc-name">{candidate.email}</div>
                                            <div className="mc-sub">{candidate.phone_number || 'No phone'}</div>
                                        </td>
                                        <td>
                                            {candidate.cv_url ? (
                                                <a href={candidate.cv_url} target="_blank" rel="noreferrer" className="mc-resume-link">
                                                    <Icons.FileText /> CV
                                                </a>
                                            ) : (
                                                <span className="mc-sub">None</span>
                                            )}
                                        </td>
                                        <td><StatusChip status={candidate.status} /></td>
                                        <td>
                                            {candidate.device_id ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Icons.CPU />
                                                    <span className="mc-sub" title={candidate.device_id} style={{ fontFamily: 'monospace' }}>
                                                        {candidate.device_id.substring(0, 8)}…
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="mc-sub">Pending</span>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                <button className="mc-action-btn mc-btn-edit" onClick={() => handleEdit(candidate)} title="Edit">
                                                    <Icons.Edit />
                                                </button>
                                                <button className="mc-action-btn mc-btn-del" onClick={() => handleDelete(candidate.id)} title="Delete">
                                                    <Icons.Trash />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {popup && (
                <CustomPopup
                    isOpen={popup.isOpen} type={popup.type} title={popup.title} message={popup.message}
                    onConfirm={popup.onConfirm} onCancel={popup.onCancel || (() => setPopup(null))}
                    confirmText={popup.confirmText}
                />
            )}
        </AdminLayout>
    );
}
