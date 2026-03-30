import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import CustomPopup, { PopupType } from "../components/CustomPopup";
import API_BASE_URL from "../config";

// --- Types ------------------------------------------------------------------
interface Candidate {
    id: number;
    candidate_id?: string;
    name: string;
    email: string;
    phone_number: string;
    country_code?: string;
    dob?: string;
    gender?: string;
    address?: string;
    profile_photo?: string;
    cv_url: string;
    status: string;
    joined_date: string;
    device_id?: string;
    assigned_exam_id?: string;
    token?: string;
    admin_name?: string;
    completed_at?: string;
}

interface ExamStat {
    id: string;
    title: string;
}

const Icons = {
    Edit: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
    ),
    Trash: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
    ),
    FileText: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
    ),
    X: ({ style }: { style?: any }) => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={style}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
    ),
    Check: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
    ),
    CPU: () => (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /></svg>
    ),
    Send: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
    ),
    Copy: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
    ),
    User: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
    ),
    Plus: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
    ),
};

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 1);
const getAvatarColor = (name: string) => {
    const colors = ['var(--primary)', 'var(--color-info)', 'var(--color-warning)', 'var(--color-danger)', 'var(--text)'];
    return colors[name.charCodeAt(0) % colors.length];
};

const StatusChip = ({ status }: { status: string }) => {
    const s = (status || 'PENDING').toLowerCase();
    const statusStyles: Record<string, { bg: string; color: string }> = {
        completed: { bg: 'var(--color-success-light)', color: 'var(--color-success)' },
        pending: { bg: 'var(--color-warning-light)', color: 'var(--color-warning)' },
        active: { bg: 'var(--color-info-light)', color: 'var(--color-info)' },
        failed: { bg: 'var(--color-danger-light)', color: 'var(--color-danger)' },
    };
    const style = statusStyles[s] || statusStyles.pending;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '4px 12px', borderRadius: 100,
            fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
            background: style.bg, color: style.color
        }}>
            {s}
        </span>
    );
};

export default function ManageCandidates() {
    const navigate = useNavigate();
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [exams, setExams] = useState<ExamStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        country_code: "",
        phone_number: "",
        dob: "",
        gender: "",
        address: "",
        cv_url: ""
    });

    const [searchTerm, setSearchTerm] = useState("");
    const [filterTab, setFilterTab] = useState<"all" | "completed" | "pending" | "in_progress">("all");
    const [popup, setPopup] = useState<{ isOpen: boolean; type: PopupType; title?: string; message: string; onConfirm: () => void; onCancel?: () => void; confirmText?: string; } | null>(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        const token = sessionStorage.getItem("access_token");
        if (!token) { navigate("/"); return; }

        try {
            const [candRes, examRes] = await Promise.all([
                fetch(`${API_BASE_URL}/candidates`, { headers: { "Authorization": `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/exams`, { headers: { "Authorization": `Bearer ${token}` } })
            ]);

            if (candRes.status === 401 || examRes.status === 401) {
                sessionStorage.removeItem("access_token");
                sessionStorage.removeItem("admin-profile");
                navigate("/");
                return;
            }

            if (candRes.ok) {
                const cData = await candRes.json();
                if (Array.isArray(cData)) setCandidates(cData);
            }
            if (examRes.ok) {
                const eData = await examRes.json();
                if (Array.isArray(eData)) setExams(eData);
            }
        } catch {
            setPopup({ isOpen: true, type: 'alert', title: 'Error', message: 'Failed to connect to server.', onConfirm: () => setPopup(null) });
        } finally { setLoading(false); }
    };

    const handleEdit = (candidate: Candidate) => {
        setEditingId(candidate.id);
        setFormData({
            name: candidate.name,
            email: candidate.email,
            country_code: candidate.country_code || "",
            phone_number: candidate.phone_number || "",
            dob: candidate.dob || "",
            gender: candidate.gender || "",
            address: candidate.address || "",
            cv_url: candidate.cv_url || ""
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = (id: number) => {
        setPopup({
            isOpen: true, type: 'confirm', title: 'Delete Candidate',
            message: 'Are you sure you want to permanently delete this candidate?',
            confirmText: 'Delete',
            onConfirm: async () => {
                setPopup(null);
                const token = sessionStorage.getItem("access_token");
                try {
                    const res = await fetch(`${API_BASE_URL}/candidates/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } });
                    if (res.ok) { fetchData(); }
                    else {
                        const data = await res.json().catch(() => ({}));
                        setPopup({ isOpen: true, type: 'alert', title: 'Deletion Failed', message: data.detail || "Could not delete the candidate.", onConfirm: () => setPopup(null) });
                    }
                } catch { setPopup({ isOpen: true, type: 'alert', title: 'Error', message: "Error deleting candidate", onConfirm: () => setPopup(null) }); }
            },
            onCancel: () => setPopup(null)
        });
    };


    const handleSendLink = async (id: number) => {
        const token = sessionStorage.getItem("access_token");
        try {
            const res = await fetch(`${API_BASE_URL}/candidates/${id}/send-link`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                setPopup({ isOpen: true, type: 'alert', title: 'Success', message: 'Exam link has been sent to the candidate.', onConfirm: () => setPopup(null) });
            } else {
                const data = await res.json();
                setPopup({ isOpen: true, type: 'alert', title: 'Error', message: data.detail || 'Failed to send link.', onConfirm: () => setPopup(null) });
            }
        } catch {
            setPopup({ isOpen: true, type: 'alert', title: 'Error', message: 'Network error while sending link.', onConfirm: () => setPopup(null) });
        }
    };

    const handleRetest = async (id: number) => {
        setPopup({
            isOpen: true, type: 'confirm', title: 'Reset Session',
            message: 'Are you sure you want to reset this candidate session? This will clear their previous results and allow them to take the exam again from any device.',
            confirmText: 'Reset Now',
            onConfirm: async () => {
                setPopup(null);
                const token = sessionStorage.getItem("access_token");
                try {
                    const res = await fetch(`${API_BASE_URL}/candidates/${id}/retest`, {
                        method: "POST",
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    if (res.ok) {
                        fetchData();
                        setPopup({ isOpen: true, type: 'alert', title: 'Session Resetted', message: 'Candidate session has been reset. They can now access the exam using their original link.', onConfirm: () => setPopup(null) });
                    }
                    else {
                        const data = await res.json().catch(() => ({}));
                        setPopup({ isOpen: true, type: 'alert', title: 'Reset Failed', message: data.detail || "Could not reset the candidate session.", onConfirm: () => setPopup(null) });
                    }
                } catch { setPopup({ isOpen: true, type: 'alert', title: 'Error', message: "Error resetting candidate", onConfirm: () => setPopup(null) }); }
            },
            onCancel: () => setPopup(null)
        });
    };

    const copyToClipboard = (text: string, id: number) => {
        navigator.clipboard.writeText(text);
        setPopup({
            isOpen: true,
            type: 'confirm',
            title: 'Link Copied!',
            message: 'Test link copied to clipboard. Would you like to also send this link to the candidate via email?',
            confirmText: 'Send Email',
            onConfirm: () => {
                setPopup(null);
                handleSendLink(id);
            },
            onCancel: () => setPopup(null)
        });
    };

    // Enhanced list of candidates with exam names and filtering logic
    const displayCandidates = useMemo(() => {
        try {
            const examMap = new Map(exams.map(e => [e.id, e.title]));
            let filtered = candidates.map(candidate => ({
                ...candidate,
                examName: examMap.get(candidate.assigned_exam_id || "") || (candidate.assigned_exam_id ? "Unknown Exam" : "Unassigned")
            }));

            // Search Filter
            if (searchTerm) {
                const s = searchTerm.toLowerCase();
                filtered = filtered.filter(c =>
                    c.name.toLowerCase().includes(s) ||
                    c.email.toLowerCase().includes(s) ||
                    c.examName.toLowerCase().includes(s)
                );
            }

            // Tab Filter
            if (filterTab !== "all") {
                filtered = filtered.filter(c => {
                    const status = (c.status || "").toLowerCase();
                    if (filterTab === "completed") return status === "completed";
                    if (filterTab === "pending") return status === "pending";
                    if (filterTab === "in_progress") return status === "active" || status === "in_progress";
                    return true;
                });
            }

            return filtered;
        } catch (err) {
            console.error("Error processing candidates:", err);
            return [];
        }
    }, [candidates, exams, searchTerm, filterTab]);

    const counts = useMemo(() => {
        const stats = { all: candidates.length, completed: 0, pending: 0, in_progress: 0 };
        candidates.forEach(c => {
            const s = (c.status || "").toLowerCase();
            if (s === "completed") stats.completed++;
            else if (s === "pending") stats.pending++;
            else if (s === "active" || s === "in_progress") stats.in_progress++;
        });
        return stats;
    }, [candidates]);

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
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>Loading Candidates...</div>
                </div>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <style>{`
                .mc-header {
                    height: 52px;
                    background: var(--bg);
                    border-bottom: 1px solid var(--border);
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 0 24px; position: sticky; top: 0; z-index: 100;
                }
                .mc-header-title { font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 900; color: var(--text); letter-spacing: -0.03em; margin: 0; }
                .mc-header-count { font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 1px; }

                .mc-content { padding: 20px 24px; animation: mcFadeUp 0.6s cubic-bezier(0.16,1,0.3,1); }
                @keyframes mcFadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

                .mc-modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 1000; animation: mcFadeIn 0.2s ease-out;
                }
                @keyframes mcFadeIn { from { opacity: 0; } to { opacity: 1; } }

                .mc-modal-box {
                    background: var(--bg-raised); border: 1px solid var(--border);
                    border-radius: 16px; padding: 32px; width: 90%; max-width: 500px;
                    animation: mcModalSlide 0.3s cubic-bezier(0.16,1,0.3,1);
                }
                @keyframes mcModalSlide { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

                .mc-edit-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
                .mc-edit-title { font-family:'Inter',sans-serif; font-size:18px; font-weight:800; color:var(--text); letter-spacing: -0.02em; }
                .mc-edit-cancel {
                    width:32px; height:32px; display:flex; align-items:center; justify-content:center;
                    background:var(--bg-neutral); border:1px solid var(--border); border-radius:10px;
                    cursor:pointer; color:var(--text-muted); transition:all 0.2s;
                }
                .mc-edit-cancel:hover { background:var(--color-danger-light); color:var(--color-danger); border-color:var(--color-danger-border); }
                .mc-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
                @media(max-width:640px) { .mc-form-grid { grid-template-columns:1fr; } }
                .mc-field { display:flex; flex-direction:column; gap:8px; }
                .mc-label { font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; }
                .mc-input {
                    padding:11px 14px; border:1px solid var(--border); border-radius:10px;
                    font-size:14px; font-family:'Inter',sans-serif; background:var(--bg-sunken);
                    color:var(--text); outline:none; transition:all 0.2s;
                }
                .mc-input:focus { border-color:var(--primary); background:var(--bg-raised); }
                .mc-search-bar:focus { border-bottom: 2px solid var(--primary) !important; box-shadow: none !important; }
                .mc-save-btn {
                    grid-column:span 2; padding:12px; margin-top:8px;
                    background:var(--primary);
                    color:white; border:none; border-radius:100px;
                    font-family:'Inter',sans-serif; font-size:13px; font-weight:700;
                    cursor:pointer; transition:all 0.3s cubic-bezier(0.16,1,0.3,1); display:flex; align-items:center; justify-content:center; gap:8px;
                }
                .mc-save-btn:hover { background:var(--primary-hover); transform:translateY(-1px); }

                .mc-table-wrap { background:var(--bg); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
                .mc-table { width:100%; border-collapse:collapse; }
                .mc-table th { text-align:left; padding:10px 16px; font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-muted); background:var(--bg-neutral); border-bottom:1px solid var(--border); }
                .mc-table td { padding:10px 16px; border-bottom:1px solid var(--border); vertical-align:middle; }
                .mc-table tr:last-child td { border-bottom:none; }
                .mc-table tr:hover td { background:var(--bg-neutral); }

                .mc-avatar { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:600; color:white; flex-shrink:0; overflow:hidden; }
                .mc-avatar img { width:100%; height:100%; object-fit:cover; }
                .mc-name { font-size:14px; font-weight:600; color:var(--text); }
                .mc-sub { font-size:12px; color:var(--text-muted); font-weight:400; margin-top:2px; }

                .mc-action-btn { width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:4px; border:none; background:transparent; cursor:pointer; transition:all 0.2s; color:var(--text); }
                .mc-action-btn:hover { background:var(--bg-neutral); }
                .mc-action-btn:hover { transform:scale(1.1); }
                .mc-btn-edit:hover { background:color-mix(in srgb, var(--primary) 10%, var(--bg)); color:var(--primary); border-color:color-mix(in srgb, var(--primary) 30%, transparent); }
                .mc-btn-send:hover { background:var(--primary-light); color:var(--primary); border-color:var(--primary-border); }
                .mc-btn-copy:hover { background:var(--bg-neutral); color:var(--text); border-color:var(--border); }
                .mc-btn-del:hover { background:var(--color-danger-light); color:var(--color-danger); border-color:var(--color-danger-border); }

                .mc-resume-link { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:100px; font-size:10px; font-weight:700; text-decoration:none; background:var(--color-success-light); color:var(--color-success); border:1px solid var(--color-success-border); transition:all 0.2s; }
                .mc-resume-link:hover { opacity: 0.8; }

                .mc-empty { text-align:center; padding:60px 40px; color:var(--text-muted); }
                .mc-empty-icon { font-size:40px; margin-bottom:16px; }
                .mc-empty-title { font-family:'Inter',sans-serif; font-size:16px; font-weight:800; color:var(--text); margin-bottom:6px; }
                .mc-empty-sub { font-size:12px; }
            `}</style>

            <header style={{ padding: '24px 24px 12px', background: 'transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '20px' }}>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>Candidate management</h1>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{counts.all} total candidates</div>
                    </div>
                    <button
                        onClick={() => {
                            setEditingId(-1);
                            setFormData({ name: "", email: "", country_code: "", phone_number: "", dob: "", gender: "", address: "", cv_url: "" });
                        }}
                        className="btn btn-primary"
                    >
                        <Icons.Plus /> Add Candidate
                    </button>
                </div>

                <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '400px' }}>
                    <input
                        type="text"
                        placeholder="Search by name, email or exam..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="mc-search-bar"
                        style={{
                            width: '100%', padding: '8px 0', border: 'none',
                            borderBottom: '1px solid var(--border)', background: 'transparent',
                            fontSize: '14px', outline: 'none', color: 'var(--text)',
                            boxShadow: 'none', borderRadius: 0
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '32px', borderBottom: 'none', paddingBottom: '0' }}>
                    {[
                        { id: 'all', label: 'All', color: 'var(--primary)' },
                        { id: 'completed', label: 'Completed', color: 'var(--color-success)' },
                        { id: 'pending', label: 'Pending', color: 'var(--color-warning)' },
                        { id: 'in_progress', label: 'In Progress', color: 'var(--color-info)' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterTab(tab.id as any)}
                            style={{
                                background: 'none', border: 'none', padding: '0 0 12px 0',
                                fontSize: '14px', fontWeight: filterTab === tab.id ? 700 : 500,
                                color: filterTab === tab.id ? 'var(--text)' : 'var(--text-muted)',
                                borderBottom: filterTab === tab.id ? `3px solid ${tab.color}` : '3px solid transparent',
                                cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
                                boxShadow: 'none', borderRadius: 0
                            }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {tab.label}
                                <span style={{
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    background: filterTab === tab.id ? tab.color : 'var(--bg-neutral)',
                                    color: filterTab === tab.id ? '#fff' : 'var(--text-muted)',
                                    transition: 'all 0.2s'
                                }}>
                                    {counts[tab.id as keyof typeof counts]}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            </header>

            <div style={{ padding: '0 24px 32px' }}>

                {editingId !== null && (
                    <div className="mc-modal-overlay">
                        <div className="mc-modal-box">
                            <div className="mc-edit-header">
                                <div className="mc-edit-title">
                                    {editingId === -1 ? "&#x1F195; Add New Candidate" : "Update Candidate Profile"}
                                </div>
                                <button className="mc-edit-cancel" onClick={() => { setEditingId(null); setFormData({ name: "", email: "", country_code: "", phone_number: "", dob: "", gender: "", address: "", cv_url: "" }); }}>
                                    <Icons.X />
                                </button>
                            </div>
                            <form className="mc-form-grid" onSubmit={async (e) => {
                                e.preventDefault();
                                const token = sessionStorage.getItem("access_token");
                                try {
                                    const method = editingId === -1 ? "POST" : "PUT";
                                    const url = editingId === -1 ? `${API_BASE_URL}/candidates` : `${API_BASE_URL}/candidates/${editingId}`;

                                    const res = await fetch(url, {
                                        method,
                                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                                        body: JSON.stringify(formData)
                                    });

                                    if (res.ok) {
                                        setFormData({ name: "", email: "", country_code: "", phone_number: "", dob: "", gender: "", address: "", cv_url: "" });
                                        setEditingId(null);
                                        fetchData();
                                    } else {
                                        const data = await res.json();
                                        setPopup({ isOpen: true, type: 'alert', title: 'Error', message: data.detail || "Failed to save candidate.", onConfirm: () => setPopup(null) });
                                    }
                                } catch { setPopup({ isOpen: true, type: 'alert', title: 'Error', message: "Error saving candidate", onConfirm: () => setPopup(null) }); }
                            }}>
                                <div className="mc-field">
                                    <label className="mc-label">Full Name</label>
                                    <input className="mc-input" placeholder="John Doe" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                </div>
                                <div className="mc-field">
                                    <label className="mc-label">Email Address</label>
                                    <input className="mc-input" type="email" placeholder="john@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                                </div>
                                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '8px' }}>
                                    <div className="mc-field" style={{ width: '80px' }}>
                                        <label className="mc-label">Code</label>
                                        <input className="mc-input" placeholder="+91" value={formData.country_code} onChange={e => setFormData({ ...formData, country_code: e.target.value })} />
                                    </div>
                                    <div className="mc-field" style={{ width: '180px', flex: 1 }}>
                                        <label className="mc-label">Phone Number</label>
                                        <input className="mc-input" style={{ width: '100%' }} placeholder="9876543210" value={formData.phone_number} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} />
                                    </div>
                                </div>
                                <button type="submit" className="mc-save-btn">
                                    <Icons.Check /> {editingId === -1 ? "Create Candidate" : "Save Changes"}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {candidates.length === 0 ? (
                    <div className="mc-table-wrap">
                        <div className="mc-empty">
                            <div className="mc-empty-icon">{"\u1F465"}</div>
                            <div className="mc-empty-title">No Candidates Yet</div>
                            <div className="mc-empty-sub">Enroll candidates via the dashboard or add them manually to get started.</div>
                        </div>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                <th style={{ textAlign: 'left', padding: '16px 0', fontSize: '9px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CANDIDATE</th>
                                <th style={{ textAlign: 'left', padding: '16px 0', fontSize: '9px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CONTACT & CV</th>
                                <th style={{ textAlign: 'left', padding: '16px 0', fontSize: '9px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ASSIGNED EXAM</th>
                                <th style={{ textAlign: 'left', padding: '16px 0', fontSize: '9px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>STATUS</th>
                                <th style={{ padding: '16px 24px 16px 0' }}>
                                    <div style={{ display: 'flex', gap: 20, justifyContent: 'flex-end', fontSize: '9px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <div style={{ width: 36, textAlign: 'center' }}>REPORT</div>
                                        <div style={{ width: 36, textAlign: 'center' }}>RESET</div>
                                        <div style={{ width: 36, textAlign: 'center' }}>COPY</div>
                                        <div style={{ width: 36, textAlign: 'center' }}>SEND</div>
                                        <div style={{ width: 36, textAlign: 'center' }}>EDIT</div>
                                        <div style={{ width: 36, textAlign: 'center' }}>DELETE</div>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayCandidates.map(candidate => (
                                <tr key={candidate.id}>
                                    <td style={{ padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div className="mc-avatar" style={{ background: getAvatarColor(candidate.name) }}>
                                                {getInitials(candidate.name)}
                                            </div>
                                            <div>
                                                <div className="mc-name" style={{ color: 'var(--text)' }}>{candidate.name}</div>
                                                <div className="mc-sub" style={{ color: 'var(--text-muted)' }}>Joined {candidate.joined_date?.split('T')[0] || '—'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: '13px', color: 'var(--text)' }}>{candidate.email}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{candidate.country_code} {candidate.phone_number}</div>
                                    </td>
                                    <td style={{ padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 500, color: "var(--text)" }}>
                                            {candidate.examName}
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
                                        <StatusChip status={candidate.status} />
                                    </td>
                                    <td style={{ padding: '20px 24px 20px 0', borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                                            {candidate.status.toLowerCase() === 'completed' ? (
                                                <button className="mc-action-btn" onClick={() => navigate(`/report/${candidate.id}`)} title="View Report" style={{ color: 'var(--text)' }}>
                                                    <Icons.FileText />
                                                </button>
                                            ) : (
                                                <div style={{ width: 32 }} />
                                            )}
                                            <button className="mc-action-btn" onClick={() => handleRetest(candidate.id)} title="Reset / Retest Session" style={{ color: 'var(--color-info)' }}>
                                                <Icons.CPU />
                                            </button>
                                            <button className="mc-action-btn" onClick={() => copyToClipboard(`${window.location.origin}/#/test/${candidate.token}`, candidate.id)} title="Copy Link" style={{ color: 'var(--text)' }}>
                                                <Icons.Copy />
                                            </button>
                                            <button className="mc-action-btn" onClick={() => handleSendLink(candidate.id)} title="Send Email" style={{ color: 'var(--text)' }}>
                                                <Icons.Send />
                                            </button>
                                            <button className="mc-action-btn" onClick={() => handleEdit(candidate)} title="Edit" style={{ color: 'var(--text)' }}>
                                                <Icons.Edit />
                                            </button>
                                            <button className="mc-action-btn" onClick={() => handleDelete(candidate.id)} title="Delete" style={{ color: 'var(--text-muted)' }}>
                                                <Icons.Trash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
