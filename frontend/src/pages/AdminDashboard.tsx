import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import CustomPopup, { PopupType } from "../components/CustomPopup";
import API_BASE_URL from "../config";

// -â”€ Icon Components -----------------------------â”€
const Icons = {
    Shield: ({ size = 14 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    ),
    Copy: ({ size = 14 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    ),
    Check: ({ size = 14 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    Users: ({ size = 18 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    Activity: ({ size = 18 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
    ),
    FileText: ({ size = 18 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
    ),
    Key: ({ size = 18 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7.5" cy="15.5" r="5.5" />
            <path d="M21 2l-9.6 9.6" />
            <path d="M15.5 7.5l3 3L22 7l-3-3" />
        </svg>
    ),
    Lock: ({ size = 12 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    ),
    X: ({ size = 16 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    ),
    AlertTriangle: ({ size = 14 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    Plus: ({ size = 14 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    ),
    Clock: ({ size = 14 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    ),
    CheckCircle: ({ size = 14 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    ),
    AlertCircle: ({ size = 14 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    ),
    Zap: ({ size = 14 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    ),
    Refresh: ({ size = 14, className = "" }: { size?: number, className?: string }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
    ),
    Mail: ({ size = 14 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
        </svg>
    ),
    List: ({ size = 14 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
    ),
    Grid: ({ size = 14 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
        </svg>
    ),
};

// -â”€ Types ----------------------------------â”€
interface AdminProfile {
    email: string;
    role: string;
    full_name: string;
    permissions: string[];
}

interface Candidate {
    id: number;
    name: string;
    email: string;
    status: string;
    joined_date: string;
    token: string;
    test_link: string;
    assigned_exam_id?: string;
    score?: string;
    total_questions?: string;
    violations?: string;
}

interface ExamStat {
    id: string;
    title: string;
    difficulty: string;
    total_assigned: number;
    completed: number;
    live: number;
    not_started: number;
    passed: number;
    failed: number;
    eliminated: number;
    total_invited?: number;
    passing_score: number;
    link_expiry?: string;
    auto_delete?: string;
    proctoring_enabled?: boolean;
    proctoring_type?: string;
}

// -â”€ Dashboard Component ---------------------------â”€
export default function AdminDashboard() {
    const [viewMode, setViewMode] = useState<'card' | 'grid'>('grid');
    const [profile, setProfile] = useState<AdminProfile | null>(null);
    const [examStats, setExamStats] = useState<ExamStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, live: 0 });
    const [refreshing, setRefreshing] = useState(false);
    const [candidatesList, setCandidatesList] = useState<Candidate[]>([]);
    const [showExamPopup, setShowExamPopup] = useState<boolean>(false);
    const [adminOtp, setAdminOtp] = useState<string | null>(null);
    const [otpExpiresIn, setOtpExpiresIn] = useState<number>(80);
    const [copyingId, setCopyingId] = useState<string | null>(null);
    const [now, setNow] = useState(new Date());
    const navigate = useNavigate();

    const [sendLinkModal, setSendLinkModal] = useState<{ isOpen: boolean; examId: string; publicLink: string; emails: string; message: string; loading: boolean }>({
        isOpen: false,
        examId: "",
        publicLink: "",
        emails: "",
        message: "",
        loading: false
    });

    const handleSendLinkSubmit = async () => {
        if (!sendLinkModal.emails.trim()) return;
        setSendLinkModal(prev => ({ ...prev, loading: true }));
        try {
            const emailList = sendLinkModal.emails.split(",").map(e => e.trim()).filter(e => e.length > 0);
            const body = {
                emails: emailList,
                link: sendLinkModal.publicLink,
                message: sendLinkModal.message
            };
            const res = await fetch(`${API_BASE_URL}/exams/${sendLinkModal.examId}/send-link`, {
                method: "POST",
                headers: {
                    ...authHeaders(),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                setPopup({
                    isOpen: true,
                    type: "alert",
                    title: "Success",
                    message: `Link sent to ${emailList.length} recipient(s).`,
                    onConfirm: () => setPopup(null)
                });
                setSendLinkModal(prev => ({ ...prev, isOpen: false }));
            } else {
                const err = await res.json();
                setPopup({
                    isOpen: true,
                    type: "alert",
                    title: "Error",
                    message: err.detail || "Failed to send link",
                    onConfirm: () => setPopup(null)
                });
            }
        } catch (e) {
            setPopup({
                isOpen: true,
                type: "alert",
                title: "Error",
                message: "An error occurred while sending emails.",
                onConfirm: () => setPopup(null)
            });
        } finally {
            setSendLinkModal(prev => ({ ...prev, loading: false }));
        }
    };

    const [popup, setPopup] = useState<{
        isOpen: boolean;
        type: PopupType;
        title?: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        onConfirm: () => void;
        onCancel?: () => void;
    } | null>(null);

    // -â”€ Effects ---------------------------------
    useEffect(() => {
        let pollId: ReturnType<typeof setInterval> | null = null;
        let timerId: ReturnType<typeof setInterval> | null = null;
        let cancelled = false;

        const startPolling = async () => {
            const ok = await fetchInitialData();
            if (!ok || cancelled) return;

            // Poll every 5s instead of 15s for better responsiveness
            pollId = setInterval(() => {
                if (!sessionStorage.getItem("access_token")) { cleanup(); navigate("/"); return; }
                // Fetch in parallel
                Promise.all([
                    fetchCandidates(),
                    fetchExamStats(),
                    fetchAdminOtp()
                ]).catch(console.error);
            }, 5000);

            timerId = setInterval(() => setNow(new Date()), 1000);
        };

        const handleFocus = () => {
            if (!cancelled && sessionStorage.getItem("access_token")) {
                Promise.all([
                    fetchCandidates(),
                    fetchExamStats(),
                    fetchAdminOtp()
                ]).catch(console.error);
            }
        };

        const cleanup = () => {
            cancelled = true;
            if (pollId) clearInterval(pollId);
            if (timerId) clearInterval(timerId);
        };

        // Cross-tab synchronization
        const bc = new BroadcastChannel("exam_portal_updates");
        bc.onmessage = (msg) => {
            if (msg.data === "refresh_dashboard") {
                console.log("INFO: Refreshing dashboard due to cross-tab update");
                handleFocus();
            }
        };

        startPolling();
        return () => {
            cleanup();
            bc.close();
            window.removeEventListener("focus", handleFocus);
        };
    }, []);

    // -â”€ Auth ----------------------------------
    const handleAuthFailure = () => {
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("admin-profile");
        navigate("/");
    };

    const getToken = () => sessionStorage.getItem("access_token");

    const authHeaders = () => ({
        "Authorization": `Bearer ${getToken()}`,
        "Content-Type": "application/json",
    });

    // -â”€ Data Fetching ------------------------------
    const fetchInitialData = async (): Promise<boolean> => {
        const token = getToken();
        if (!token) { handleAuthFailure(); return false; }

        try {
            const res = await fetch(`${API_BASE_URL}/me`, { headers: authHeaders() });
            if (res.status === 401) { handleAuthFailure(); return false; }
            if (!res.ok) { handleAuthFailure(); return false; }
            setProfile(await res.json());

            // Fetch independently so one failing doesn't block others
            fetchCandidates().catch(console.error);
            fetchExamStats().catch(console.error);
            fetchAdminOtp().catch(console.error);
            return true;
        } catch (err) {
            console.error("Fetch error:", err);
            return false;
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleManualRefresh = async () => {
        setRefreshing(true);
        // Force bypass_cache=true for all calls
        await Promise.all([
            fetchCandidates(),
            fetchExamStats(),
            fetchAdminOtp()
        ]);
        setRefreshing(false);
    };

    const fetchCandidates = async () => {
        if (!getToken()) return;
        try {
            const res = await fetch(`${API_BASE_URL}/candidates?bypass_cache=true&v=${Date.now()}`, { headers: authHeaders() });
            if (res.status === 401) { handleAuthFailure(); return; }
            if (res.ok) {
                const data: Candidate[] = await res.json();
                setCandidatesList(data);
                setStats({
                    total: data.length,
                    live: data.filter(c => c.status.toLowerCase() === "live").length,
                });
            }
        } catch (err) {
            console.error("Candidates fetch failed:", err);
        }
    };

    const fetchExamStats = async () => {
        if (!getToken()) return;
        try {
            const res = await fetch(`${API_BASE_URL}/exams/stats?bypass_cache=true&v=${Date.now()}`, { headers: authHeaders() });
            if (res.status === 401) { handleAuthFailure(); return; }
            if (res.ok) setExamStats(await res.json());
        } catch (err) {
            console.error("Exam stats fetch failed:", err);
        }
    };

    const fetchAdminOtp = async () => {
        if (!getToken()) return;
        try {
            const res = await fetch(`${API_BASE_URL}/candidates/current-admin-otp`, { headers: authHeaders() });
            if (res.ok) {
                const data = await res.json();
                setAdminOtp(data.admin_otp);
                setOtpExpiresIn(data.expires_in || 80);
            }
        } catch (err) {
            console.error("OTP fetch failed:", err);
        }
    };

    // OTP Countdown effect
    useEffect(() => {
        const timer = setInterval(() => {
            setOtpExpiresIn(prev => {
                if (prev <= 1) {
                    fetchAdminOtp();
                    return 80;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // -â”€ Actions ---------------------------------
    const copyLink = (link: string, id: string) => {
        navigator.clipboard.writeText(link);
        setCopyingId(id);
        setTimeout(() => setCopyingId(null), 2000);
    };

    const putExamExpiry = async (examId: string, body: object) => {
        // Optimistically update the state
        setExamStats(prev => prev.map(stat =>
            stat.id === examId ? { ...stat, ...body } : stat
        ));

        await fetch(`${API_BASE_URL}/exams/${examId}/expiry`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify(body),
        });
    };

    const handleActivateLink = (examId: string) => {
        const inputEl = document.getElementById(`time-${examId}`) as HTMLInputElement;
        const modeEl = document.getElementById(`mode-${examId}`) as HTMLSelectElement;
        const val = parseInt(inputEl?.value || "24", 10);
        const mode = modeEl?.value || "hrs";

        if (isNaN(val) || val <= 0) {
            alert(`Please enter a valid number of ${mode === "hrs" ? "hours" : "minutes"}.`);
            return;
        }

        const expiry = new Date();
        mode === "hrs"
            ? expiry.setHours(expiry.getHours() + val)
            : expiry.setMinutes(expiry.getMinutes() + val);

        putExamExpiry(examId, { link_expiry: expiry.toISOString() }).catch(console.error);
    };

    // -â”€ Permissions -------------------------------
    const hasPermission = (permission: string): boolean => {
        if (profile?.role === "admin") return true;
        return profile?.permissions.includes(permission) ?? false;
    };

    const runIfPermitted = (perm: string, task: string, action: () => void) => {
        if (hasPermission(perm)) {
            action();
        } else {
            setPopup({
                isOpen: true, type: "alert", title: "Permission Required",
                message: `You need "${task}" permission for this action. Contact your administrator.`,
                onConfirm: () => setPopup(null),
            });
        }
    };

    // -â”€ Utilities --------------------------------
    const formatCountdown = (expiryStr?: string): string | null => {
        if (!expiryStr) return null;
        const diff = new Date(expiryStr).getTime() - now.getTime();
        if (diff <= 0) return "Expired";
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };



    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return "Good morning";
        if (h < 17) return "Good afternoon";
        return "Good evening";
    };

    if (loading || !profile) return null;

    // -â”€ Render ---------------------------------â”€
    return (
        <AdminLayout>
            <style>{`
        :root {
          --teal:        var(--primary);
          --teal-light:  color-mix(in srgb, var(--primary) 10%, var(--bg));
          --teal-mid:    color-mix(in srgb, var(--primary) 30%, var(--bg));
          --slate-900:   var(--text);
          --slate-700:   color-mix(in srgb, var(--text) 80%, var(--bg));
          --slate-500:   var(--text-muted);
          --slate-300:   var(--border);
          --slate-100:   color-mix(in srgb, var(--border) 50%, var(--bg));
          --slate-50:    var(--bg-neutral);
          --white:       var(--bg);
          --danger:      #dc2626;
          --success:     #059669;
          --amber:       #d97706;
          --transition:  0.2s cubic-bezier(0.4,0,0.2,1);
        }

        *, *::before, *::after { box-sizing: border-box; }

        .db-page {
          font-family: var(--font-body);
          background: var(--slate-50);
          min-height: 100vh;
          color: var(--slate-900);
        }

        .db-topbar {
          position: sticky;
          top: 0;
          z-index: 100;
          height: 60px;
          background: var(--white);
          border-bottom: 1px solid var(--slate-100);
          box-shadow: var(--shadow-sm);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
          gap: 16px;
        }

        .db-topbar-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .db-topbar-logo {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--teal);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--white);
        }

        .db-topbar-title {
          font-family: var(--font-heading);
          font-size: var(--font-size-emph);
          color: var(--slate-900);
          letter-spacing: -0.01em;
          margin: 0;
        }

        .db-topbar-right {
          display: flex;
          align-items: center;
          gap: var(--space-12);
        }

        .db-role-badge {
          font-size: var(--font-size-badge);
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: none;
          padding: var(--space-4) var(--space-8);
          border-radius: var(--radius-sm);
          background: var(--primary-light);
          color: var(--primary);
          border: 1px solid var(--border);
        }

        .db-role-badge.muted {
          background: var(--slate-100);
          color: var(--slate-500);
          border-color: var(--slate-300);
        }

        .db-user-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 5px 14px 5px 5px;
          border-radius: 100px;
          border: 1px solid var(--slate-100);
          background: var(--white);
          cursor: default;
          transition: border-color var(--transition), box-shadow var(--transition);
        }

        .db-user-card:hover {
          border-color: var(--slate-300);
          box-shadow: var(--shadow-sm);
        }

        .db-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--teal);
          color: var(--white);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
        }

        .db-user-name {
          font-weight: 600;
          font-size: 14px;
          color: var(--slate-900);
        }

        .db-user-role {
          font-size: 11px;
          font-weight: 500;
          color: var(--slate-500);
          text-transform: capitalize;
        }

        /* - Content Area ----------------------- */
        .db-content {
          max-width: 1440px;
          margin: 0 auto;
          padding: 16px 24px 32px;
          animation: dbFadeIn 0.35s ease;
        }

        @keyframes dbFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* - Welcome Banner ---------------------- */
        .db-banner {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: var(--space-16) var(--space-24);
          margin-bottom: var(--space-24);
          box-shadow: var(--shadow);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-24);
        }

        .db-banner-greeting {
          font-family: var(--font-heading);
          font-size: var(--font-size-title);
          color: var(--text);
          margin: 0 0 var(--space-8);
        }

        .db-banner-subtitle {
          font-size: var(--font-size-body);
          color: var(--text-muted);
          line-height: 1.5;
          margin: 0;
          max-width: 560px;
        }

        .db-banner-subtitle strong {
          color: var(--slate-700);
          font-weight: 600;
        }

        .db-banner-status {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: var(--space-8);
          padding: var(--space-8) var(--space-16);
          border-radius: var(--radius-md);
          border: 1px solid #d1fae5;
          background: #f0fdf9;
        }

        .db-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--success);
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.15);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(5,150,105,0.15); }
          50%       { box-shadow: 0 0 0 5px rgba(5,150,105,0.08); }
        }

        .db-status-text {
          font-size: 12px;
          font-weight: 600;
          color: var(--success);
          letter-spacing: 0.03em;
          text-transform: none;
        }

        /* - Deploy Button ----------------------- */
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 16px;
          background: var(--teal);
          color: var(--white);
          border: none;
          border-radius: var(--radius-md);
          font-family: var(--font-sans);
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: background var(--transition), box-shadow var(--transition), transform var(--transition);
          box-shadow: 0 2px 8px rgba(15,113,115,0.25);
          margin-top: 10px;
          outline: none;
        }

        .btn-primary:hover {
          background: #0c5e60;
          box-shadow: 0 4px 14px rgba(15,113,115,0.35);
          transform: translateY(-1px);
        }

        .btn-primary:active { transform: translateY(0); }

        /* - Stat Cards ------------------------ */
        .db-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-16);
          margin-bottom: var(--space-24);
        }

        .stat-card {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: var(--space-16);
          box-shadow: var(--shadow);
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
          overflow: hidden;
        }

        .stat-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }

        .stat-card.locked {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .stat-card-accent {
          position: absolute;
          top: 0; left: 0;
          width: 3px;
          height: 100%;
          border-radius: 2px 0 0 2px;
        }

        .stat-icon {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }

        .stat-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--slate-500);
          text-transform: none;
          letter-spacing: 0.01em;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .stat-value {
          font-family: var(--font-mono);
          font-size: 28px;
          font-weight: 800;
          color: var(--slate-900);
          line-height: 1.1;
        }

        .stat-hint {
          font-size: 11px;
          font-weight: 500;
          color: var(--slate-400);
          margin-top: 10px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        /* - Section Header ---------------------- */
        .section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--slate-100);
        }

        .section-title {
          font-family: var(--font-serif);
          font-size: 18px;
          color: var(--slate-900);
          margin: 0;
          letter-spacing: -0.02em;
        }

        .section-subtitle {
          font-size: 13px;
          color: var(--slate-400);
          margin: 4px 0 0;
          font-weight: 400;
        }

        /* - Exam Cards ------------------------ */
        .exam-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: var(--space-16);
        }

        .exam-card {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: var(--space-16);
          box-shadow: var(--shadow);
          display: flex;
          flex-direction: column;
          gap: var(--space-16);
          transition: all 0.2s;
        }

        .exam-card:hover {
          box-shadow: var(--shadow-md);
          border-color: var(--slate-300);
          transform: translateY(-2px);
        }

        /* - Exam Card Header ---------------------â”€ */
        .exam-card-title {
          font-family: var(--font-heading);
          font-size: var(--font-size-emph);
          font-weight: 700;
          color: var(--text);
          margin: 0 0 var(--space-8);
          line-height: 1.35;
        }

        .exam-card-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .exam-id-chip {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 500;
          color: var(--slate-500);
          background: var(--slate-50);
          border: 1px solid var(--slate-100);
          padding: 2px 7px;
          border-radius: 4px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 4px;
          border: 1px solid transparent;
          line-height: 1;
        }

        /* - Stat Counters ----------------------- */
        .exam-counters {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
        }

        .exam-counter {
          background: var(--slate-50);
          border: 1px solid var(--slate-100);
          border-radius: var(--radius-md);
          padding: 8px 10px;
          text-align: center;
          transition: border-color var(--transition), background var(--transition);
        }

        .exam-counter:hover {
          background: var(--white);
          border-color: var(--slate-300);
        }

        .exam-counter-value {
          font-family: var(--font-mono);
          font-size: var(--font-size-emph); /* 16px emphasized */
          font-weight: 700;
          color: var(--text);
          line-height: 1;
        }

        .exam-counter-label {
          font-size: 10.5px;
          font-weight: 500;
          color: var(--slate-400);
          text-transform: none;
          letter-spacing: 0.02em;
          margin-top: 4px;
        }

        /* - Progress Bar -----------------------â”€ */
        .progress-wrap {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .progress-track {
          height: 4px;
          background: var(--slate-100);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--teal);
          border-radius: 2px;
          transition: width 0.6s ease;
        }

        .progress-label {
          font-size: 11px;
          font-weight: 500;
          color: var(--slate-400);
          text-transform: none;
          letter-spacing: 0.02em;
        }

        .progress-pct {
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 700;
          color: var(--slate-700);
        }

        /* - Action Controls ---------------------- */
        .divider {
          border: none;
          border-top: 1px solid var(--slate-100);
          margin: 0;
        }

        /* Active state */
        .active-link-row {
          display: flex;
          gap: 8px;
          align-items: stretch;
        }

        .expiry-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f0fdf9;
          border: 1px solid #a7f3d0;
          border-radius: var(--radius-md);
          padding: 9px 12px;
          font-size: 12.5px;
          font-weight: 500;
          color: #065f46;
        }

        .expiry-timer {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 700;
          margin-left: auto;
          color: var(--teal);
        }

        /* Inactive state */
        .activate-row {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .field-input {
          padding: 8px 10px;
          border: 1px solid var(--slate-200);
          border-radius: var(--radius-sm);
          background: var(--slate-50);
          color: var(--slate-900);
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 600;
          text-align: center;
          width: 56px;
          outline: none;
          transition: border-color var(--transition), background var(--transition);
        }

        .field-input:focus {
          border-color: var(--teal);
          background: var(--white);
        }

        .field-select {
          padding: 8px 10px;
          border: 1px solid var(--slate-200);
          border-radius: var(--radius-sm);
          background: var(--slate-50);
          color: var(--slate-700);
          font-family: var(--font-sans);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          outline: none;
          transition: border-color var(--transition);
        }

        .field-select:focus { border-color: var(--teal); }

        /* - Buttons -------------------------- */
        .btn-refresh {
          padding: 8px 16px;
          font-size: 13px;
          background: var(--white);
          border: 1px solid var(--slate-200);
          color: var(--slate-600);
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }
        .btn-refresh:hover:not(:disabled) {
          background: var(--slate-50);
          border-color: var(--slate-300);
          color: var(--slate-900);
          transform: translateY(-1px);
        }
        .btn-refresh:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          background: var(--slate-50);
        }
        .spin {
          animation: spin 1.2s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-family: var(--font-sans);
          font-weight: 600;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition);
          outline: none;
          border: 1px solid transparent;
          white-space: nowrap;
        }

        .btn-copy {
          flex: 1;
          padding: 9px 14px;
          font-size: 12.5px;
          background: var(--slate-900);
          color: var(--white);
          box-shadow: var(--shadow-xs);
        }

        .btn-copy:hover {
          background: var(--slate-700);
          box-shadow: var(--shadow-sm);
          transform: translateY(-1px);
        }

        .btn-copy.copied {
          background: var(--success);
          box-shadow: 0 2px 8px rgba(5,150,105,0.25);
        }

        .btn-icon {
          width: 36px;
          height: 36px;
          padding: 0;
          background: var(--slate-50);
          border-color: var(--slate-200);
          color: var(--slate-500);
        }

        .btn-icon:hover {
          background: var(--danger-light);
          border-color: #fecaca;
          color: var(--danger);
          transform: scale(1.05);
        }

        .btn-activate {
          flex: 1;
          padding: 9px 14px;
          font-size: 12.5px;
          background: var(--teal);
          color: var(--white);
          box-shadow: 0 2px 8px rgba(15,113,115,0.2);
        }

        .btn-activate:hover {
          background: #0c5e60;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15,113,115,0.3);
        }

        .btn-danger-outline {
          width: 100%;
          padding: 8px 14px;
          font-size: 12px;
          background: var(--white);
          border-color: #fecaca;
          color: var(--danger);
        }

        .btn-danger-outline:hover {
          background: var(--danger-light);
          border-color: var(--danger);
          color: var(--danger);
        }

        .btn-schedule:hover {
            border-color: var(--slate-400);
            color: var(--slate-900);
            background: var(--slate-50);
        }

        /* - Empty State ------------------------ */
        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 80px 24px;
          background: var(--white);
          border: 1px dashed var(--slate-200);
          border-radius: var(--radius-lg);
          color: var(--slate-500);
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.6;
        }

        .empty-title {
          font-family: var(--font-serif);
          font-size: 20px;
          color: var(--slate-700);
          margin: 0 0 8px;
        }

        .empty-subtitle {
          font-size: 14px;
          color: var(--slate-500);
          margin: 0;
        }

        /* - Responsive ------------------------â”€ */
        @media (max-width: 768px) {
          .db-topbar { padding: 0 16px; }
          .db-content { padding: 16px 16px 40px; }
          .db-banner { flex-direction: column; align-items: flex-start; }
          .db-banner-status { align-self: flex-start; }
          .db-stats { grid-template-columns: 1fr 1fr; gap: 10px; }
        }

        @media (max-width: 480px) {
          .db-stats { grid-template-columns: 1fr; }
        }

        /* - Candidates Modal -------------------------â”€ */
        .candidates-modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          z-index: 999;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .candidates-modal {
          background: var(--white);
          border-radius: var(--radius-lg);
          width: 100%; max-width: 600px;
          max-height: 85vh; display: flex; flex-direction: column;
          box-shadow: var(--shadow-lg);
          animation: modalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .candidates-modal-header {
          padding: 20px 24px; border-bottom: 1px solid var(--slate-100);
          display: flex; align-items: center; justify-content: space-between;
        }
        .candidates-modal-title { margin: 0; font-family: var(--font-serif); font-size: 18px; color: var(--slate-900); }
        .candidates-modal-close { background: none; border: none; cursor: pointer; color: var(--slate-500); padding: 4px; border-radius: 4px; transition: background 0.2s; display: flex; align-items: center; justify-content: center; }
        .candidates-modal-close:hover { background: var(--slate-100); color: var(--slate-900); }
        .candidates-modal-body { padding: 24px; overflow-y: auto; }
        .exam-candidate-group { margin-bottom: 24px; }
        .exam-candidate-group:last-child { margin-bottom: 0; }
        .exam-candidate-group h5 { margin: 0 0 12px; font-size: 14px; color: var(--slate-800); font-weight: 600; display: flex; justify-content: space-between; }
        .exam-candidate-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
        .exam-candidate-item { background: var(--slate-50); border: 1px solid var(--slate-100); padding: 10px 14px; border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center; }
        .candidate-name { font-size: 13px; font-weight: 500; color: var(--slate-900); }
        .candidate-email { font-size: 12px; color: var(--slate-500); }
        .candidate-status { font-size: 11px; padding: 2px 8px; border-radius: 100px; font-weight: 600; text-transform: none; letter-spacing: 0.04em; }
        .status-started, .status-live { background: #fde68a; color: #92400e; }
        .status-completed { background: #d1fae5; color: #065f46; }
        .status-not_started { background: var(--slate-100); color: var(--slate-600); }

        /* Result Grouping */
        .result-group {
          margin-bottom: 20px;
          border: 1px solid var(--slate-100);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .result-group-header {
          padding: 8px 16px;
          font-size: 11px;
          font-weight: 700;
          text-transform: none;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .result-group-header.pass { background: #d1fae5; color: #065f46; }
        .result-group-header.fail { background: #fee2e2; color: #991b1b; }
        .result-group-header.eliminated { background: #fef3c7; color: #92400e; }
        .result-group-header.other { background: var(--slate-50); color: var(--slate-500); }
        
        .result-list { list-style: none; padding: 0; margin: 0; }
        .result-item {
          padding: 12px 16px;
          border-bottom: 1px solid var(--slate-50);
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: background 0.2s;
        }
        .result-item:last-child { border-bottom: none; }
        .result-item:hover { background: var(--slate-50); }
        
        .result-info h6 { margin: 0; font-size: 13px; color: var(--slate-900); font-weight: 600; }
        .result-info p { margin: 0; font-size: 12px; color: var(--slate-500); }
        
        .result-stats { text-align: right; }
        .result-score { font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--slate-700); }
        .result-meta { font-size: 11px; color: var(--slate-400); display: block; }

        /* - Table View ------------------------ */
        .exam-table-container {
            width: 100%;
            overflow-x: auto;
            padding: 8px 4px 20px;
        }
        .exam-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0 12px;
            text-align: left;
        }
        .exam-table th {
            padding: 0 24px 12px;
            font-size: 11px;
            font-weight: 700;
            color: var(--slate-400);
            text-transform: none;
            letter-spacing: 0.04em;
            white-space: nowrap;
        }
        .exam-table tr {
            transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .exam-table tr:hover {
            transform: translateY(-2px);
        }
        .exam-table td {
            padding: 20px 24px;
            font-size: 13.5px;
            color: var(--slate-900);
            background: var(--white);
            vertical-align: middle;
            border-top: 1px solid var(--slate-100);
            border-bottom: 1px solid var(--slate-100);
        }
        .exam-table td:first-child {
            border-left: 1px solid var(--slate-100);
            border-top-left-radius: 16px;
            border-bottom-left-radius: 16px;
        }
        .exam-table td:last-child {
            border-right: 1px solid var(--slate-100);
            border-top-right-radius: 16px;
            border-bottom-right-radius: 16px;
        }
        .exam-table tr:hover td {
            border-color: var(--teal-mid);
            box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }

        .perf-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
            font-family: var(--font-mono);
        }
        .perf-chip.p { color: var(--success); background: #ecfdf5; }
        .perf-chip.f { color: var(--danger); background: #fef2f2; }
        .perf-chip.e { color: var(--amber); background: #fffbeb; }

        .action-icon-btn {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            border: 1.2px solid var(--slate-200);
            background: var(--white);
            color: var(--slate-600);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            cursor: pointer;
        }
        .action-icon-btn:hover {
            border-color: var(--teal);
            color: var(--teal);
            background: var(--teal-light);
            transform: scale(1.05);
        }
        .action-icon-btn.primary {
            background: var(--teal);
            color: white;
            border-color: var(--teal);
        }
        .action-icon-btn.primary:hover {
            background: #0c5e60;
            box-shadow: 0 4px 12px rgba(15, 113, 115, 0.2);
        }
      `}</style>

            {/* - Top Bar -----------------------------â”€ */}
            <header className="db-topbar">
                <div className="db-topbar-brand">
                    <div className="db-topbar-logo">
                        <Icons.Shield size={16} />
                    </div>
                    <h2 className="db-topbar-title">Assessment Hub</h2>
                </div>

                <div className="db-topbar-right">
                    {profile.role === "admin" ? (
                        <span className="db-role-badge">Admin</span>
                    ) : profile.permissions.length > 0 ? (
                        profile.permissions.slice(0, 2).map(p => (
                            <span key={p} className="db-role-badge">{p}</span>
                        ))
                    ) : (
                        <span className="db-role-badge muted">Standard Access</span>
                    )}

                    <div className="db-user-card">
                        <div className="db-avatar">{profile.full_name.charAt(0).toUpperCase()}</div>
                        <div>
                            <div className="db-user-name">{profile.full_name}</div>
                            <div className="db-user-role">{profile.role}</div>
                        </div>
                    </div>
                </div>
            </header>

            {/* - Content -----------------------------â”€ */}
            <div className="db-content">

                {/* Welcome Banner */}
                <div className="db-banner">
                    <div>
                        <h3 className="db-banner-greeting">
                            {getGreeting()}, {(profile.full_name.toLowerCase() === "google" || profile.full_name.toLowerCase() === "admin") ? "Administrator" : profile.full_name.split(" ")[0]}!
                        </h3>
                        <p className="db-banner-subtitle">
                            You have <strong>{stats.live} active</strong> candidate{stats.live !== 1 ? "s" : ""} across{" "}
                            <strong>{examStats.length} assessment{examStats.length !== 1 ? "s" : ""}</strong>.
                        </p>
                        <div className="db-banner-status" style={{ marginTop: '12px', border: 'none', background: 'transparent', padding: 0 }}>
                            <div className="db-status-dot"></div>
                            <span className="db-status-text" style={{ textTransform: 'none', fontSize: '12px', color: 'var(--success)' }}>All systems operational</span>
                        </div>
                        {hasPermission("generate exam") && (
                            <button className="btn-primary" onClick={() => navigate("/create-exam")}>
                                <Icons.Plus size={14} />
                                New Assessment
                            </button>
                        )}
                    </div>


                </div>

                {/* Stat Cards */}
                <div className="db-stats">
                    <div className="stat-card">
                        <div className="stat-card-accent" style={{ background: "var(--teal)" }} />
                        <div className="stat-icon" style={{ background: "var(--teal-light)", color: "var(--teal)" }}>
                            <Icons.Users size={18} />
                        </div>
                        <div className="stat-label">Total Candidates</div>
                        <div className="stat-value">{stats.total}</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-card-accent" style={{ background: "var(--success)" }} />
                        <div className="stat-icon" style={{ background: "#ecfdf5", color: "var(--success)" }}>
                            <Icons.Activity size={18} />
                        </div>
                        <div className="stat-label">Active Now</div>
                        <div className="stat-value" style={{ color: "var(--success)" }}>{stats.live}</div>
                    </div>

                    <div
                        className={`stat-card ${!hasPermission("manage exam") ? "locked" : ""}`}
                        style={{ cursor: hasPermission("manage exam") ? "pointer" : "default" }}
                        onClick={() => {
                            if (hasPermission("manage exam")) {
                                setShowExamPopup(true);
                            }
                        }}
                    >
                        <div className="stat-card-accent" style={{ background: "#6366f1" }} />
                        <div className="stat-icon" style={{ background: "#ede9fe", color: "#6366f1" }}>
                            <Icons.FileText size={18} />
                        </div>
                        <div className="stat-label">
                            Assessments
                            {!hasPermission("manage exam") && (
                                <Icons.Lock size={11} />
                            )}
                        </div>
                        <div className="stat-value" style={{ opacity: hasPermission("manage exam") ? 1 : 0.3 }}>
                            {examStats.length}
                        </div>
                        <div className="stat-hint" style={{ opacity: hasPermission("manage exam") ? 1 : 0.3 }}>
                            <Icons.Users size={12} />
                            {examStats.reduce((sum, exam) => sum + exam.completed + exam.live, 0)} candidates attempted
                        </div>
                    </div>

                    {profile?.role === "admin" && (
                        <div className="stat-card">
                            <div className="stat-card-accent" style={{ background: "var(--amber)" }} />
                            <div className="stat-icon" style={{ background: "var(--amber-light)", color: "var(--amber)" }}>
                                <Icons.Key size={18} />
                            </div>
                            <div className="stat-label">HR / Master OTP</div>
                            <div className="stat-value" style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "0.05em" }}>
                                {adminOtp ? adminOtp.slice(0, 3) + "" + adminOtp.slice(3) : "--- ---"}
                            </div>
                            <div className="stat-hint">
                                <Icons.Clock size={12} />
                                Rotates in {otpExpiresIn} sec
                            </div>
                        </div>
                    )}
                </div>

                <div className="section-header">
                    <div>
                        <h3 className="section-title">Assessment Control</h3>
                        <p className="section-subtitle">Manage evaluation links, expiry, and lifecycle policies.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', background: 'var(--slate-50)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-200)' }}>
                            <button
                                onClick={() => setViewMode('card')}
                                style={{ padding: '6px 12px', background: viewMode === 'card' ? 'var(--white)' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', boxShadow: viewMode === 'card' ? 'var(--shadow-xs)' : 'none', fontWeight: 600, fontSize: '12px', color: viewMode === 'card' ? 'var(--slate-900)' : 'var(--slate-500)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Icons.Grid size={14} /> Cards
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                style={{ padding: '6px 12px', background: viewMode === 'grid' ? 'var(--white)' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', boxShadow: viewMode === 'grid' ? 'var(--shadow-xs)' : 'none', fontWeight: 600, fontSize: '12px', color: viewMode === 'grid' ? 'var(--slate-900)' : 'var(--slate-500)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Icons.List size={14} /> Grid Layout
                            </button>
                        </div>
                        <button
                            className={`btn btn-refresh ${refreshing ? 'refreshing' : ''}`}
                            onClick={handleManualRefresh}
                            disabled={refreshing}
                            title="Force sync with database"
                        >
                            <Icons.Refresh size={14} className={refreshing ? 'spin' : ''} />
                            {refreshing ? 'Syncing...' : 'Refresh'}
                        </button>
                    </div>
                </div>

                {/* Exam Cards */}
                <div className="exam-grid" style={{ display: viewMode === 'grid' ? 'block' : 'grid' }}>
                    {examStats.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📋</div>
                            <h4 className="empty-title">No assessments deployed</h4>
                            <p className="empty-subtitle">Create your first assessment to begin evaluating candidates.</p>
                        </div>
                    ) : (
                        viewMode === 'grid' ? (
                            <div className="exam-table-container">
                                <table className="exam-table">
                                    <thead>
                                        <tr>
                                            <th>Assessment Name</th>
                                            <th>Audience</th>
                                            <th>Performance</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {examStats.map(exam => {
                                            const countdown = formatCountdown(exam.link_expiry);
                                            const isExpired = countdown === "Expired";
                                            const isActive = !!countdown && !isExpired;
                                            const publicLink = `${window.location.origin}/#/enroll/${exam.id}`;
                                            const completionRate = exam.total_assigned > 0
                                                ? Math.round((exam.completed / exam.total_assigned) * 100)
                                                : 0;

                                            return (
                                                <tr key={exam.id}>
                                                    <td>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                            <div style={{ fontWeight: 800, color: 'var(--slate-900)', fontSize: '15px', letterSpacing: '-0.01em' }}>{exam.title}</div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span style={{ fontSize: '11px', color: 'var(--slate-500)', fontWeight: 600 }}>•</span>
                                                                <span style={{ fontSize: '11px', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'capitalize', letterSpacing: '0.02em' }}>{exam.difficulty}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'var(--slate-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <Icons.Users size={14} />
                                                                </div>
                                                                <span style={{ fontSize: '13px', fontWeight: 700 }}>{exam.total_assigned} <span style={{ color: 'var(--slate-400)', fontWeight: 500, fontSize: '11px' }}>Enrolled</span></span>
                                                            </div>
                                                            {(exam.total_invited ?? 0) > 0 && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <div style={{ width: 28, height: 28, borderRadius: '8px', background: '#fdf4ff', color: '#a21caf', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <Icons.Mail size={14} />
                                                                    </div>
                                                                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{exam.total_invited} <span style={{ color: 'var(--slate-400)', fontWeight: 500, fontSize: '11px' }}>Sent</span></span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '6px', marginBottom: 10 }}>
                                                            <div className="perf-chip p" title="Passed">P: {exam.passed}</div>
                                                            <div className="perf-chip f" title="Failed">F: {exam.failed}</div>
                                                            <div className="perf-chip e" title="Exempt / Eliminated">E: {exam.eliminated}</div>
                                                        </div>
                                                        <div style={{ width: '100%', maxWidth: '160px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--slate-400)' }}>Completion</span>
                                                                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--teal)' }}>{completionRate}%</span>
                                                            </div>
                                                            <div style={{ height: 4, background: 'var(--slate-100)', borderRadius: 2, overflow: 'hidden' }}>
                                                                <div style={{ width: `${completionRate}%`, height: '100%', background: 'var(--teal)', borderRadius: 2 }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {isActive ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--slate-400)' }}>Time left</span>
                                                                <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--slate-500)' }}>{countdown}</span>
                                                            </div>
                                                        ) : isExpired ? (
                                                            <span className="badge" style={{ background: 'var(--slate-100)', color: 'var(--slate-500)', borderRadius: '8px', padding: '6px 12px' }}>
                                                                Expired
                                                            </span>
                                                        ) : (
                                                            <span className="badge" style={{ background: 'var(--slate-50)', color: 'var(--slate-400)', border: '1px solid var(--slate-100)', borderRadius: '8px', padding: '6px 12px' }}>
                                                                Inactive
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {isActive ? (
                                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                                <button
                                                                    className={`action-icon-btn ${copyingId === exam.id ? "primary" : ""}`}
                                                                    onClick={() => copyLink(publicLink, exam.id)}
                                                                    title="Copy Enrollment Link"
                                                                >
                                                                    {copyingId === exam.id ? <Icons.Check size={16} /> : <Icons.Copy size={16} />}
                                                                </button>
                                                                {hasPermission("send invitation") && (
                                                                    <button
                                                                        className="action-icon-btn primary"
                                                                        onClick={() => setSendLinkModal({ isOpen: true, examId: exam.id, publicLink, emails: "", message: "", loading: false })}
                                                                        title="Email Pro Links"
                                                                    >
                                                                        <Icons.Mail size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="activate-row" style={{ background: 'var(--slate-50)', padding: '6px', borderRadius: '12px', border: '1px solid var(--slate-100)' }}>
                                                                <input
                                                                    id={`time-${exam.id}`}
                                                                    type="text"
                                                                    className="field-input"
                                                                    defaultValue={24}
                                                                    onInput={(e: any) => e.target.value = e.target.value.replace(/\D/g, '')}
                                                                    style={{ width: "38px", height: '32px', border: 'none', background: 'transparent' }}
                                                                />
                                                                <select id={`mode-${exam.id}`} className="field-select" defaultValue="hrs" style={{ border: 'none', background: 'transparent', fontSize: '11px', fontWeight: 700 }}>
                                                                    <option value="hrs">hrs</option>
                                                                    <option value="mins">mins</option>
                                                                </select>
                                                                <button
                                                                    className="action-icon-btn primary"
                                                                    onClick={() => runIfPermitted("manage exam", "Manage Exams", () => handleActivateLink(exam.id))}
                                                                    style={{ width: 32, height: 32, borderRadius: '8px' }}
                                                                >
                                                                    <Icons.Check size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            examStats.map(exam => {
                                const countdown = formatCountdown(exam.link_expiry);
                                const isExpired = countdown === "Expired";
                                const isActive = !!countdown && !isExpired;
                                const publicLink = `${window.location.origin}/#/enroll/${exam.id}`;
                                const completionRate = exam.total_assigned > 0
                                    ? Math.round((exam.completed / exam.total_assigned) * 100)
                                    : 0;

                                return (
                                    <div key={exam.id} className="exam-card">

                                        {/* Card Header */}
                                        <div>
                                            <h4 className="exam-card-title">{exam.title}</h4>
                                            <div className="exam-card-meta" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                <span className="badge" style={{ background: "var(--slate-50)", color: "var(--slate-600)", padding: "4px 10px", fontSize: "12px", border: "1px solid var(--slate-200)", display: "flex", alignItems: "center", gap: "6px" }}>
                                                    <Icons.Users size={14} /> {exam.total_assigned} Enrolled
                                                </span>
                                                {(exam.total_invited ?? 0) > 0 && (
                                                    <span className="badge" style={{ background: "#fdf4ff", color: "#a21caf", padding: "4px 10px", fontSize: "12px", border: "1px solid #f5d0fe", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
                                                        <Icons.Mail size={14} /> {exam.total_invited} Sent Link
                                                    </span>
                                                )}
                                                {(exam.total_invited ?? 0) > 0 && (
                                                    <span className="badge" style={{ background: "#eff6ff", color: "#1d4ed8", padding: "4px 10px", fontSize: "12px", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
                                                        <Icons.Activity size={14} /> {Math.max(0, (exam.total_invited || 0) - exam.total_assigned)} Did Not Attempt
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <hr className="divider" />

                                        {/* Counters */}
                                        <div>
                                            <div className="exam-counters">
                                                <div className="exam-counter">
                                                    <div className="exam-counter-value" style={{ color: "var(--success)" }}>{exam.passed}</div>
                                                    <div className="exam-counter-label">Pass</div>
                                                </div>
                                                <div className="exam-counter">
                                                    <div className="exam-counter-value" style={{ color: "var(--danger)" }}>{exam.failed}</div>
                                                    <div className="exam-counter-label">Fail</div>
                                                </div>
                                                <div className="exam-counter">
                                                    <div className="exam-counter-value" style={{ color: "var(--amber)" }}>{exam.eliminated}</div>
                                                    <div className="exam-counter-label">Eliminated</div>
                                                </div>
                                            </div>

                                            <div style={{ marginTop: 12 }}>
                                                <div className="progress-wrap">
                                                    <span className="progress-label">Completion</span>
                                                    <span className="progress-pct">{completionRate}%</span>
                                                </div>
                                                <div className="progress-track">
                                                    <div className="progress-fill" style={{ width: `${completionRate}%` }} />
                                                </div>
                                            </div>
                                        </div>

                                        <hr className="divider" />

                                        {/* Link Controls */}
                                        {isActive ? (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                                <div className="active-link-row">
                                                    <button
                                                        className={`btn btn-copy ${copyingId === exam.id ? "copied" : ""}`}
                                                        onClick={() => copyLink(publicLink, exam.id)}
                                                        style={{ flex: 1 }}
                                                    >
                                                        {copyingId === exam.id
                                                            ? <><Icons.Check size={13} /> Copied</>
                                                            : <><Icons.Copy size={13} /> Copy Link</>
                                                        }
                                                    </button>
                                                    {hasPermission("send invitation") && (
                                                        <button
                                                            className="btn btn-copy"
                                                            onClick={() => setSendLinkModal({ isOpen: true, examId: exam.id, publicLink, emails: "", message: "", loading: false })}
                                                            style={{ flex: 1, background: "var(--teal)" }}
                                                        >
                                                            <Icons.Mail size={13} /> Send Link
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="expiry-banner">
                                                    <Icons.Clock size={13} />
                                                    Link expires in
                                                    <span className="expiry-timer">{countdown}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="activate-row">
                                                <input
                                                    id={`time-${exam.id}`}
                                                    type="text"
                                                    className="field-input"
                                                    defaultValue={24}
                                                    onInput={(e: any) => e.target.value = e.target.value.replace(/\D/g, '')}
                                                />
                                                <select id={`mode-${exam.id}`} className="field-select" defaultValue="hrs">
                                                    <option value="hrs">hrs</option>
                                                    <option value="mins">mins</option>
                                                </select>
                                                <button
                                                    className="btn btn-activate"
                                                    onClick={() => runIfPermitted("manage exam", "Manage Exams", () => handleActivateLink(exam.id))}
                                                >
                                                    Activate Link
                                                </button>
                                            </div>
                                        )}



                                    </div>
                                );
                            })
                        ))}
                </div>
            </div>

            {sendLinkModal.isOpen && (
                <div className="candidates-modal-overlay" onClick={() => !sendLinkModal.loading && setSendLinkModal(prev => ({ ...prev, isOpen: false }))}>
                    <div className="candidates-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
                        <div className="candidates-modal-header">
                            <h3 className="candidates-modal-title">Send Exam Link</h3>
                            <button className="candidates-modal-close" onClick={() => setSendLinkModal(prev => ({ ...prev, isOpen: false }))} disabled={sendLinkModal.loading}>
                                <Icons.X size={18} />
                            </button>
                        </div>
                        <div className="candidates-modal-body">
                            <div style={{ marginBottom: 15 }}>
                                <label style={{ display: 'block', marginBottom: 5, fontSize: 14, fontWeight: 600 }}>Recipient Emails (comma separated)</label>
                                <textarea
                                    className="field-input"
                                    style={{ width: '100%', minHeight: 80, textAlign: 'left', borderRadius: 6 }}
                                    placeholder="email1@example.com, email2@example.com"
                                    value={sendLinkModal.emails}
                                    onChange={e => setSendLinkModal(prev => ({ ...prev, emails: e.target.value }))}
                                    disabled={sendLinkModal.loading}
                                />
                            </div>
                            <div style={{ marginBottom: 15 }}>
                                <label style={{ display: 'block', marginBottom: 5, fontSize: 14, fontWeight: 600 }}>Custom Message (Optional)</label>
                                <textarea
                                    className="field-input"
                                    style={{ width: '100%', minHeight: 80, textAlign: 'left', borderRadius: 6 }}
                                    placeholder={`You have been invited to take the exam: ${examStats.find(e => e.id === sendLinkModal.examId)?.title || ''}`}
                                    value={sendLinkModal.message}
                                    onChange={e => setSendLinkModal(prev => ({ ...prev, message: e.target.value }))}
                                    disabled={sendLinkModal.loading}
                                />
                            </div>
                            <button
                                className="btn confirm-btn"
                                style={{ width: '100%', padding: '10px', background: 'var(--teal)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}
                                onClick={handleSendLinkSubmit}
                                disabled={sendLinkModal.loading || !sendLinkModal.emails.trim()}
                            >
                                {sendLinkModal.loading ? 'Sending...' : 'Send Link'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showExamPopup && (
                <div className="candidates-modal-overlay" onClick={() => setShowExamPopup(false)}>
                    <div className="candidates-modal" onClick={e => e.stopPropagation()}>
                        <div className="candidates-modal-header">
                            <h3 className="candidates-modal-title">Assessments & Participants</h3>
                            <button className="candidates-modal-close" onClick={() => setShowExamPopup(false)}>
                                <Icons.X size={18} />
                            </button>
                        </div>
                        <div className="candidates-modal-body">
                            {examStats.length === 0 ? (
                                <p style={{ color: "var(--slate-500)", textAlign: "center", margin: 0 }}>No assessments found.</p>
                            ) : (
                                examStats.map(exam => {
                                    const participants = candidatesList.filter(c => c.assigned_exam_id === exam.id);
                                    return (
                                        <div key={exam.id} className="exam-candidate-group">
                                            <h5>
                                                {exam.title}
                                                <span style={{ color: "var(--slate-500)", fontWeight: 500 }}>{participants.length} candidates</span>
                                            </h5>
                                            {participants.length === 0 ? (
                                                <div style={{ fontSize: "13px", color: "var(--slate-500)", padding: "10px", background: "var(--slate-50)", borderRadius: "var(--radius-md)", textAlign: "center", border: "1px dashed var(--slate-200)" }}>
                                                    No candidates assigned.
                                                </div>
                                            ) : (() => {
                                                const passed: Candidate[] = [];
                                                const failed: Candidate[] = [];
                                                const eliminated: Candidate[] = [];
                                                const other: Candidate[] = [];

                                                participants.forEach(p => {
                                                    const status = p.status.toLowerCase();
                                                    const vios = parseInt(p.violations || "0");
                                                    if (vios >= 3) {
                                                        eliminated.push(p);
                                                    } else if (status === "completed") {
                                                        const score = parseFloat(p.score || "0");
                                                        const total = parseFloat(p.total_questions || "1");
                                                        if ((score / total * 100) >= (exam.passing_score || 50)) {
                                                            passed.push(p);
                                                        } else {
                                                            failed.push(p);
                                                        }
                                                    } else {
                                                        other.push(p);
                                                    }
                                                });

                                                const renderGroup = (label: string, list: Candidate[], type: "pass" | "fail" | "eliminated" | "other") => {
                                                    if (list.length === 0) return null;
                                                    return (
                                                        <div className="result-group">
                                                            <div className={`result-group-header ${type}`}>
                                                                {type === 'pass' && <Icons.CheckCircle size={12} />}
                                                                {type === 'fail' && <Icons.AlertCircle size={12} />}
                                                                {type === 'eliminated' && <Icons.Zap size={12} />}
                                                                {label} ({list.length})
                                                            </div>
                                                            <ul className="result-list">
                                                                {list.map(p => (
                                                                    <li key={p.id} className="result-item">
                                                                        <div className="result-info">
                                                                            <h6>{p.name}</h6>
                                                                            <p>{p.email}</p>
                                                                        </div>
                                                                        <div className="result-stats">
                                                                            {p.status.toLowerCase() === 'completed' ? (
                                                                                <span className="result-score">{p.score}/{p.total_questions}</span>
                                                                            ) : (
                                                                                <span className={`candidate-status status-${p.status.toLowerCase().replace(" ", "_")}`}>
                                                                                    {p.status}
                                                                                </span>
                                                                            )}
                                                                            {parseInt(p.violations || "0") > 0 && (
                                                                                <span className="result-meta" style={{ color: "var(--danger)" }}>
                                                                                    {p.violations} violations
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    );
                                                };

                                                return (
                                                    <div>
                                                        {renderGroup("Passed", passed, "pass")}
                                                        {renderGroup("Failed", failed, "fail")}
                                                        {renderGroup("Eliminated (3+ Violations)", eliminated, "eliminated")}
                                                        {renderGroup("Other / Live", other, "other")}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {popup && (
                <CustomPopup
                    isOpen={popup.isOpen}
                    type={popup.type}
                    title={popup.title}
                    message={popup.message}
                    onConfirm={popup.onConfirm}
                    onCancel={popup.onCancel ?? (() => setPopup(null))}
                    confirmText={popup.confirmText}
                    cancelText={popup.cancelText}
                />
            )}
        </AdminLayout>
    );
}