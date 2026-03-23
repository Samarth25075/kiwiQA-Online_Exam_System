import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import API_BASE_URL from "../config";

// ─── Types ────────────────────────────────────────────────────────────────
interface AdminProfile {
    email: string;
    username?: string;
    role: string;
    full_name: string;
    permissions: string[];
}

interface Member {
    email: string;
    username?: string;
    full_name: string;
    role: string;
    permissions: string[];
}

// ─── Theme Definitions ────────────────────────────────────────────────────
const THEMES = [
    { id: "default", name: "KiwiQA", description: "Teal & green", primary: "#1c848f", secondary: "#93c73d", bg: "#ffffff", bgNeutral: "#f8fafb", dark: false },
    { id: "dark", name: "Dark", description: "Dark navy", primary: "#2ab3c0", secondary: "#a3d44a", bg: "#1a1f2e", bgNeutral: "#141824", dark: true },
    { id: "purple", name: "Purple", description: "Bold violet", primary: "#7c3aed", secondary: "#c026d3", bg: "#ffffff", bgNeutral: "#faf5ff", dark: false },
    { id: "rose", name: "Rose", description: "Warm red", primary: "#e11d48", secondary: "#f97316", bg: "#ffffff", bgNeutral: "#fff1f2", dark: false },
    { id: "ocean", name: "Ocean", description: "Cool sky blue", primary: "#0284c7", secondary: "#06b6d4", bg: "#ffffff", bgNeutral: "#f0f9ff", dark: false },
    { id: "dark-purple", name: "Midnight", description: "Dark with violet", primary: "#a78bfa", secondary: "#f472b6", bg: "#1e1b2e", bgNeutral: "#16132a", dark: true },
];

// ─── SVG Icons ────────────────────────────────────────────────────────────
const Icons = {
    User: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
    ),
    Mail: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
    ),
    Shield: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z" />
        </svg>
    ),
    Palette: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
        </svg>
    ),
    Lock: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    ),
    Eye: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
        </svg>
    ),
    EyeOff: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" />
        </svg>
    ),
    Check: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    Plus: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    ),
    Trash: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
        </svg>
    ),
    Users: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),

};

export default function Settings() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<AdminProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Theme
    const [activeTheme, setActiveTheme] = useState<string>(() =>
        localStorage.getItem("kiwi-theme") || "default"
    );



    // Password change
    const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
    const [pwLoading, setPwLoading] = useState(false);
    const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);

    // Member Management
    const [members, setMembers] = useState<Member[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);
    const [memberForm, setMemberForm] = useState({
        email: "",
        username: "",
        full_name: "",
        password: "",
        role: "member",
        permissions: [] as string[]
    });
    const [memberMsg, setMemberMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // ── Fetch profile ──────────────────────────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) { navigate("/"); return; }
        fetch(`${API_BASE_URL}/me`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => {
                setProfile(data);
                if (data.role === "admin") {
                    fetchMembers(token);
                }
            })
            .catch(() => navigate("/"))
            .finally(() => setLoading(false));
    }, [navigate]);

    const fetchMembers = async (token: string) => {
        setMembersLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/members`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMembers(data);
            }
        } catch (err) {
            console.error("Failed to fetch members", err);
        } finally {
            setMembersLoading(false);
        }
    };





    // ── Apply theme ────────────────────────────────────────────────────────
    const applyTheme = (id: string) => {
        setActiveTheme(id);
        
        // Always save to global key for current session persistence
        localStorage.setItem("kiwi-theme", id);
        
        // Save to user-specific key if profile exists
        if (profile?.email) {
            localStorage.setItem(`kiwi-theme-${profile.email}`, id);
        }

        if (id === "default") {
            document.documentElement.removeAttribute("data-theme");
        } else {
            document.documentElement.setAttribute("data-theme", id);
        }
    };

    useEffect(() => {
        const saved = localStorage.getItem("kiwi-theme") || "default";
        if (saved === "default") {
            document.documentElement.removeAttribute("data-theme");
        } else {
            document.documentElement.setAttribute("data-theme", saved);
        }
        setActiveTheme(saved);
    }, []);

    // ── Password strength ──────────────────────────────────────────────────
    const getStrength = (pw: string) => {
        if (!pw) return null;
        const score =
            (pw.length >= 6 ? 1 : 0) +
            (pw.length >= 10 ? 1 : 0) +
            (/[A-Z]/.test(pw) ? 1 : 0) +
            (/[0-9]/.test(pw) ? 1 : 0) +
            (/[^a-zA-Z0-9]/.test(pw) ? 1 : 0);
        if (score <= 1) return { label: "Weak", color: "var(--primary)", pct: "25%" };
        if (score <= 2) return { label: "Fair", color: "#f97316", pct: "50%" };
        if (score <= 3) return { label: "Good", color: "#eab308", pct: "75%" };
        return { label: "Strong", color: "#22c55e", pct: "100%" };
    };
    const strength = getStrength(pwForm.newPw);

    // ── Change password ────────────────────────────────────────────────────
    const handlePwSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwMsg(null);
        if (pwForm.newPw.length < 6) {
            setPwMsg({ type: "error", text: "New password must be at least 6 characters." });
            return;
        }
        if (pwForm.newPw !== pwForm.confirm) {
            setPwMsg({ type: "error", text: "New passwords do not match." });
            return;
        }
        const token = localStorage.getItem("access_token");
        setPwLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/change-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.newPw }),
            });
            if (res.ok) {
                setPwMsg({ type: "success", text: "Password changed successfully." });
                setPwForm({ current: "", newPw: "", confirm: "" });
            } else {
                const data = await res.json();
                setPwMsg({ type: "error", text: data.detail || "Failed to change password." });
            }
        } catch {
            setPwMsg({ type: "error", text: "Network error. Please try again." });
        } finally {
            setPwLoading(false);
        }
    };

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        setMemberMsg(null);
        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch(`${API_BASE_URL}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(memberForm),
            });
            if (res.ok) {
                setMemberMsg({ type: "success", text: "Member added successfully." });
                setMemberForm({ email: "", username: "", full_name: "", password: "", role: "member", permissions: [] });
                setShowAddMember(false);
                fetchMembers(token!);
            } else {
                const data = await res.json();
                setMemberMsg({ type: "error", text: data.detail || "Failed to add member." });
            }
        } catch {
            setMemberMsg({ type: "error", text: "Network error." });
        }
    };

    const handleDeleteMember = async (email: string) => {
        if (!confirm(`Are you sure you want to remove ${email}?`)) return;
        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch(`${API_BASE_URL}/members/${email}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                fetchMembers(token!);
            }
        } catch (err) {
            console.error("Failed to delete member", err);
        }
    };

    if (loading || !profile) return null;

    return (
        <AdminLayout>
            <style>{`
                .st-header {
                    height: 64px;
                    background: var(--bg);
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    align-items: center;
                    padding: 0 var(--space-32);
                }
                .st-header-title {
                    font-family: var(--font-heading);
                    font-size: var(--font-size-title);
                    font-weight: 700;
                    color: var(--text);
                }
                .st-content {
                    padding: var(--space-24) var(--space-32);
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: var(--space-24);
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .st-full-width {
                    grid-column: span 2;
                }
                @media (max-width: 1024px) {
                    .st-content {
                        grid-template-columns: 1fr;
                        padding: 24px;
                    }
                    .st-full-width {
                        grid-column: span 1;
                    }
                }

                /* ── Section card — matches mc-form-card ─────────────────── */
                .st-card {
                    background: var(--bg);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-sm);
                    overflow: hidden;
                }
                .st-card-header {
                    padding: var(--space-16) var(--space-24);
                    border-bottom: 1px solid var(--border);
                    background: var(--bg-neutral);
                }
                .st-card-title {
                    font-family: var(--font-heading);
                    font-size: var(--font-size-header);
                    font-weight: 700;
                    color: var(--text);
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: var(--space-8);
                }
                .st-card-title svg { color: var(--primary); }
                .st-card-sub {
                    font-size: 13px;
                    color: var(--text-muted);
                    margin-top: 3px;
                    padding-left: 26px;
                }
                .st-card-body {
                    padding: var(--space-24);
                }

                /* ── Profile fields ──────────────────────────────────────── */
                .st-profile-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }
                .st-field {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-8);
                }
                .st-field-label {
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text);
                }
                .st-field-value {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 14px;
                    background: var(--bg-neutral);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-sm);
                    font-size: 14px;
                    color: var(--text);
                    font-weight: 500;
                }
                .st-field-value svg { color: var(--text-muted); flex-shrink: 0; }
                .st-role-badge {
                    display: inline-block;
                    background: color-mix(in srgb, var(--primary) 12%, transparent);
                    color: var(--primary);
                    border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent);
                    font-size: 11px;
                    font-weight: 700;
                    padding: 2px 10px;
                    border-radius: 100px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                /* ── Theme grid ──────────────────────────────────────────── */
                .st-theme-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                }
                .st-theme-card {
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    overflow: hidden;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .st-theme-card:hover {
                    border-color: var(--primary);
                    transform: translateY(-2px);
                    box-shadow: var(--shadow);
                }
                .st-theme-card.st-theme-active {
                    border-color: var(--primary);
                    box-shadow: 0 0 0 2px var(--primary);
                }
                .st-theme-preview {
                    height: 64px;
                    padding: 10px 10px 0;
                    display: flex;
                    gap: 6px;
                }
                .st-preview-sidebar {
                    width: 20px;
                    border-radius: 4px 4px 0 0;
                    opacity: 0.9;
                }
                .st-preview-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                    padding-top: 2px;
                }
                .st-preview-bar {
                    height: 7px;
                    border-radius: 2px;
                }
                .st-theme-foot {
                    padding: 10px 14px;
                    border-top: 1px solid var(--border);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .st-theme-name {
                    font-size: 13px;
                    font-weight: 700;
                }
                .st-theme-desc {
                    font-size: 11px;
                    margin-top: 1px;
                }
                .st-theme-check {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: var(--primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    flex-shrink: 0;
                }
                .st-active-label {
                    font-size: 13px;
                    color: var(--text-muted);
                    margin-bottom: 16px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .st-active-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--primary);
                    display: inline-block;
                }

                /* ── Password form ────────────────────────────────────────── */
                .st-pw-grid {
                    display: grid;
                    gap: var(--space-16);
                }
                .st-pw-field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .st-pw-label {
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text);
                }
                .st-pw-wrap {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .st-pw-input {
                    width: 100%;
                    padding: 10px 42px 10px 14px;
                    border: 1px solid var(--border);
                    border-radius: var(--radius-sm);
                    font-family: var(--font-body);
                    font-size: 14px;
                    background: var(--bg-neutral);
                    color: var(--text);
                    outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                .st-pw-input:focus {
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(28, 132, 143, 0.1);
                }
                .st-pw-eye {
                    position: absolute;
                    right: 12px;
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                    border-radius: 4px;
                    transition: color 0.2s;
                }
                .st-pw-eye:hover { color: var(--text); }
                .st-match-icon {
                    position: absolute;
                    right: 12px;
                    font-size: 13px;
                    font-weight: 700;
                    pointer-events: none;
                }

                /* strength bar */
                .st-strength-track {
                    height: 4px;
                    background: var(--border);
                    border-radius: 2px;
                    margin-top: 8px;
                    overflow: hidden;
                }
                .st-strength-fill {
                    height: 100%;
                    border-radius: 2px;
                    transition: width 0.3s, background 0.3s;
                }
                .st-strength-label {
                    font-size: 11px;
                    font-weight: 700;
                    margin-top: 4px;
                }

                /* status banner */
                .st-msg {
                    padding: 12px 16px;
                    border-radius: var(--radius-sm);
                    font-size: 13px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .st-msg.success {
                    background: color-mix(in srgb, #22c55e 12%, transparent);
                    border: 1px solid color-mix(in srgb, #22c55e 30%, transparent);
                    color: #16a34a;
                }
                .st-msg.error {
                    background: color-mix(in srgb, var(--primary) 12%, transparent);
                    border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
                    color: var(--primary);
                }
                .st-msg svg { flex-shrink: 0; }

                /* submit button */
                .st-pw-btn {
                    padding: 11px 28px;
                    background: var(--primary);
                    color: white;
                    border: none;
                    border-radius: var(--radius-sm);
                    font-family: var(--font-body);
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    width: fit-content;
                }
                .st-pw-btn:hover:not(:disabled) {
                    background: var(--primary-hover);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(28, 132, 143, 0.25);
                }
                .st-pw-btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

                .st-spinner {
                    width: 14px;
                    height: 14px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: st-spin 0.7s linear infinite;
                }
                @keyframes st-spin { to { transform: rotate(360deg); } }

                /* ── Member Table ────────────────────────────────────────── */
                .st-member-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                .st-member-table th {
                    text-align: left;
                    padding: 12px 16px;
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    border-bottom: 1px solid var(--border);
                }
                .st-member-table td {
                    padding: 14px 16px;
                    font-size: 14px;
                    color: var(--text);
                    border-bottom: 1px solid var(--border);
                }
                .st-member-info {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .st-member-name { font-weight: 600; }
                .st-member-email { font-size: 12px; color: var(--text-muted); }
                
                .st-delete-btn {
                    padding: 6px;
                    border-radius: 6px;
                    color: var(--text-muted);
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .st-delete-btn:hover {
                    color: var(--primary);
                    background: color-mix(in srgb, var(--primary) 10%, white);
                }

                .st-perm-tag {
                    display: inline-block;
                    padding: 2px 8px;
                    background: var(--bg-neutral);
                    border: 1px solid var(--border);
                       padding: 8px 16px;
                    background: transparent;
                    color: var(--text-muted);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-sm);
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                }
                .st-add-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 16px;
                    background: var(--primary);
                    color: white;
                    border: none;
                    border-radius: var(--radius-sm);
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                }
                .st-add-btn:hover { background: var(--primary-hover); }


            `}</style>

            {/* ── Page Header ── */}
            <header className="st-header">
                <h2 className="st-header-title">Settings</h2>
            </header>

            <div className="st-content">

                {/* ── Admin Profile ── */}
                <div className="st-card" style={{ alignSelf: 'start' }}>
                    <div className="st-card-header">
                        <div className="st-card-title"><Icons.User /> Admin Profile</div>
                        <div className="st-card-sub">Your account information</div>
                    </div>
                    <div className="st-card-body">
                        <div className="st-profile-grid">
                            <div className="st-field">
                                <div className="st-field-label">Full Name</div>
                                <div className="st-field-value"><Icons.User /> {profile.full_name}</div>
                            </div>
                            <div className="st-field">
                                <div className="st-field-label">Email Address</div>
                                <div className="st-field-value"><Icons.Mail /> {profile.email}</div>
                            </div>
                            <div className="st-field">
                                <div className="st-field-label">Role</div>
                                <div className="st-field-value">
                                    <Icons.Shield />
                                    <span className="st-role-badge">{profile.role}</span>
                                </div>
                            </div>
                            <div className="st-field">
                                <div className="st-field-label">Username</div>
                                <div className="st-field-value"><Icons.User /> {profile.username || "—"}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Security / Password ── */}
                <div className="st-card" style={{ alignSelf: 'start' }}>
                    <div className="st-card-header">
                        <div className="st-card-title"><Icons.Lock /> Change Password</div>
                        <div className="st-card-sub">Update your admin credentials</div>
                    </div>
                    <div className="st-card-body">
                        <form className="st-pw-grid" onSubmit={handlePwSubmit}>
                            <div className="st-pw-field">
                                <label className="st-pw-label" htmlFor="st-curr-pw">Current Password</label>
                                <div className="st-pw-wrap">
                                    <input
                                        id="st-curr-pw" className="st-pw-input"
                                        type={showCurrent ? "text" : "password"}
                                        placeholder="Enter current password"
                                        value={pwForm.current}
                                        onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                                        required
                                    />
                                    <button type="button" className="st-pw-eye" onClick={() => setShowCurrent(v => !v)}>
                                        {showCurrent ? <Icons.EyeOff /> : <Icons.Eye />}
                                    </button>
                                </div>
                            </div>
                            <div className="st-pw-field">
                                <label className="st-pw-label" htmlFor="st-new-pw">New Password</label>
                                <div className="st-pw-wrap">
                                    <input
                                        id="st-new-pw" className="st-pw-input"
                                        type={showNew ? "text" : "password"}
                                        placeholder="Min 6 characters"
                                        value={pwForm.newPw}
                                        onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))}
                                        required
                                    />
                                    <button type="button" className="st-pw-eye" onClick={() => setShowNew(v => !v)}>
                                        {showNew ? <Icons.EyeOff /> : <Icons.Eye />}
                                    </button>
                                </div>
                                {strength && (
                                    <div style={{ marginTop: 8 }}>
                                        <div className="st-strength-track"><div className="st-strength-fill" style={{ width: strength.pct, background: strength.color }} /></div>
                                        <div className="st-strength-label" style={{ color: strength.color }}>{strength.label}</div>
                                    </div>
                                )}
                            </div>
                            <div className="st-pw-field">
                                <label className="st-pw-label" htmlFor="st-conf-pw">Confirm New Password</label>
                                <div className="st-pw-wrap">
                                    <input
                                        id="st-conf-pw" className="st-pw-input"
                                        type="password" placeholder="Re-enter password"
                                        value={pwForm.confirm}
                                        onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                                        required
                                    />
                                    {pwForm.confirm && (
                                        <span className="st-match-icon" style={{ color: pwForm.confirm === pwForm.newPw ? "#22c55e" : "var(--primary)" }}>
                                            {pwForm.confirm === pwForm.newPw ? "✓" : "✗"}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {pwMsg && (
                                <div className={`st-msg ${pwMsg.type}`}>
                                    {pwMsg.text}
                                </div>
                            )}
                            <button type="submit" className="st-pw-btn" disabled={pwLoading}>
                                {pwLoading ? <div className="st-spinner" /> : <Icons.Lock />} Update Password
                            </button>
                        </form>
                    </div>
                </div>



                {/* ── Appearance ── */}
                <div className="st-card st-full-width">
                    <div className="st-card-header">
                        <div className="st-card-title"><Icons.Palette /> Appearance</div>
                        <div className="st-card-sub">Choose your preferred colour theme</div>
                    </div>
                    <div className="st-card-body">
                        <div className="st-active-label">
                            <span className="st-active-dot" />
                            Active theme: <strong>{THEMES.find(t => t.id === activeTheme)?.name}</strong>
                        </div>
                        <div className="st-theme-grid">
                            {THEMES.map(theme => {
                                const isActive = activeTheme === theme.id;
                                return (
                                    <div key={theme.id} className={`st-theme-card${isActive ? " st-theme-active" : ""}`} onClick={() => applyTheme(theme.id)}>
                                        <div className="st-theme-preview" style={{ background: theme.bgNeutral }}>
                                            <div className="st-preview-sidebar" style={{ background: theme.primary }} />
                                            <div className="st-preview-main">
                                                <div className="st-preview-bar" style={{ background: theme.primary, width: "100%" }} />
                                                <div className="st-preview-bar" style={{ background: theme.secondary, width: "70%" }} />
                                            </div>
                                        </div>
                                        <div className="st-theme-foot" style={{ background: theme.bg }}>
                                            <div className="st-theme-name" style={{ color: theme.dark ? "#e2e8f0" : "#1a202c" }}>{theme.name}</div>
                                            {isActive && <div className="st-theme-check"><Icons.Check /></div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ── Team Management ── */}
                {profile.role === "admin" && (
                    <div className="st-card st-full-width">
                        <div className="st-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div className="st-card-title"><Icons.Users /> Team Management</div>
                                <div className="st-card-sub">Manage portal members and their authorities</div>
                            </div>
                            {!showAddMember && (
                                <button className="st-add-btn" onClick={() => setShowAddMember(true)}><Icons.Plus /> Add Member</button>
                            )}
                        </div>
                        <div className="st-card-body">
                            {memberMsg && (
                                <div className={`st-msg ${memberMsg.type}`} style={{ marginBottom: '20px' }}>
                                    {memberMsg.text}
                                </div>
                            )}
                            {showAddMember && (
                                <form className="st-member-form" onSubmit={handleAddMember}>
                                    <div className="st-field"><label className="st-field-label">Full Name</label><input className="st-pw-input" value={memberForm.full_name} onChange={e => setMemberForm(p => ({ ...p, full_name: e.target.value }))} required /></div>
                                    <div className="st-field"><label className="st-field-label">Username</label><input className="st-pw-input" value={memberForm.username} onChange={e => setMemberForm(p => ({ ...p, username: e.target.value }))} /></div>
                                    <div className="st-field"><label className="st-field-label">Email</label><input type="email" className="st-pw-input" value={memberForm.email} onChange={e => setMemberForm(p => ({ ...p, email: e.target.value }))} required /></div>
                                    <div className="st-field"><label className="st-field-label">Password</label><input type="password" className="st-pw-input" value={memberForm.password} onChange={e => setMemberForm(p => ({ ...p, password: e.target.value }))} required /></div>
                                    <div className="st-field"><label className="st-field-label">Role</label><select className="st-pw-input" value={memberForm.role} onChange={e => setMemberForm(p => ({ ...p, role: e.target.value }))}><option value="member">Member</option><option value="admin">Admin</option></select></div>
                                    <div className="st-form-full">
                                        <label className="st-field-label">Authorities</label>
                                        <div className="st-checkbox-group">
                                            {["generate exam", "manage exam", "manage candidates"].map(perm => (
                                                <label key={perm} className="st-checkbox-item">
                                                    <input type="checkbox" checked={memberForm.permissions.includes(perm)} onChange={e => {
                                                        const checked = e.target.checked;
                                                        setMemberForm(p => ({ ...p, permissions: checked ? [...p.permissions, perm] : p.permissions.filter(x => x !== perm) }));
                                                    }} />
                                                    {perm}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="st-form-full" style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                        <button type="submit" className="st-add-btn">Create Account</button>
                                        <button type="button" className="st-cancel-btn" onClick={() => setShowAddMember(false)}>Cancel</button>
                                    </div>
                                </form>
                            )}

                            {membersLoading ? <div>Loading...</div> : (
                                <table className="st-member-table">
                                    <thead><tr><th>Member</th><th>Role</th><th>Authorities</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                                    <tbody>
                                        {members.map(m => (
                                            <tr key={m.email}>
                                                <td>
                                                    <div className="st-member-info">
                                                        <span className="st-member-name">{m.full_name}</span>
                                                        <span className="st-member-email">{m.email}</span>
                                                    </div>
                                                </td>
                                                <td><span className="st-role-badge">{m.role}</span></td>
                                                <td>
                                                    {m.permissions.length > 0 ? (
                                                        m.permissions.map(p => <span key={p} className="st-perm-tag">{p}</span>)
                                                    ) : (
                                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No authority</span>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    {m.email !== profile.email && (
                                                        <button className="st-delete-btn" onClick={() => handleDeleteMember(m.email)}><Icons.Trash /></button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

