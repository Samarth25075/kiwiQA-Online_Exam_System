import React, { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CustomPopup from "./CustomPopup";
import API_BASE_URL from "../config";
import logo from "../assets/logo.png";
import KiwiAssistantPopup from "./KiwiAssistantPopup";
import "./KiwiAssistantPopup.css";

// â”€â”€â”€ Icons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const Icons = {
    Dashboard: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>
    ),
    Generate: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 6v6l4 2" /><path d="M18 2v4" /><path d="M20 4h-4" /></svg>
    ),
    Exams: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
    ),
    Users: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    ),
    Results: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>
    ),
    Settings: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
    ),
    Logout: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
    ),
    Lock: () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
    ),
    Menu: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
    ),
    Help: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
    ),
    Chat: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 9h8" /><path d="M8 13h6" /></svg>
    )
};

interface AdminLayoutProps {
    children: React.ReactNode;
    plain?: boolean;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, plain = false }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [profile, setProfile] = React.useState<{ email: string; role: string; permissions: string[] } | null>(null);
    const [popup, setPopup] = React.useState<{ isOpen: boolean; title: string; message: string } | null>(null);
    const [sidebarOpen, setSidebarOpen] = React.useState(false);
    const [kiwiAssistantOpen, setKiwiAssistantOpen] = React.useState(false);
    // â”€â”€ Apply saved theme (Global then User-Specific) â”€â”€
    useEffect(() => {
        // First application of global/last-used theme
        const globalSaved = localStorage.getItem("kiwi-theme") || "default";
        if (globalSaved === "default") {
            document.documentElement.removeAttribute("data-theme");
        } else {
            document.documentElement.setAttribute("data-theme", globalSaved);
        }
    }, []);

    // When profile is available, apply user-specific theme
    useEffect(() => {
        if (profile?.email) {
            // Get user theme or default specifically for this user
            const userTheme = localStorage.getItem(`kiwi-theme-${profile.email}`) || "default";

            // Apply the user's theme
            if (userTheme === "default") {
                document.documentElement.removeAttribute("data-theme");
            } else {
                document.documentElement.setAttribute("data-theme", userTheme);
            }

            // Sync the global key so it persists for this session
            localStorage.setItem("kiwi-theme", userTheme);
        }
    }, [profile]);

    const handleLogout = async () => {
        const token = sessionStorage.getItem("access_token");
        if (token) {
            try {
                await fetch(`${API_BASE_URL}/logout`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}` }
                });
            } catch (err) {
                console.error("Logout request failed:", err);
            }
        }
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("admin-profile");

        // Reset theme to default on logout to prevent theme bleeding between users
        localStorage.removeItem("kiwi-theme");
        document.documentElement.removeAttribute("data-theme");

        navigate("/");
    };

    const isActive = (path: string) => location.pathname === path;

    useEffect(() => {
        const token = sessionStorage.getItem("access_token");
        if (!token) return;

        // Try local cache first for performance
        const cached = sessionStorage.getItem("admin-profile");
        if (cached) {
            try {
                setProfile(JSON.parse(cached));
                return;
            } catch { sessionStorage.removeItem("admin-profile"); }
        }

        let cancelled = false;
        fetch(`${API_BASE_URL}/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        })
            .then(res => {
                if (cancelled) return;
                if (res.status === 401) {
                    sessionStorage.removeItem("access_token");
                    sessionStorage.removeItem("admin-profile");
                    navigate("/", { replace: true });
                    throw new Error("Unauthorized");
                }
                return res.json();
            })
            .then(data => {
                if (!cancelled && data) {
                    setProfile(data);
                    sessionStorage.setItem("admin-profile", JSON.stringify(data));
                }
            })
            .catch(err => {
                if (err.message !== "Unauthorized") console.error(err);
            });

        return () => { cancelled = true; };
    }, [navigate]);

    const hasPermission = (perm: string) => {
        if (!profile) return true;
        if (profile.role === 'admin') return true;

        // Members always have dashboard, settings, and guide
        if (perm === null) return true;

        return profile.permissions.includes(perm);
    };

    const showDenied = (task: string) => {
        setPopup({
            isOpen: true,
            title: 'Authority Required',
            message: `You do not have the "${task}" authority. Please contact your administrator.`
        });
    };

    const navTo = (path: string, perm: string, task: string) => {
        if (hasPermission(perm)) {
            navigate(path);
        } else {
            showDenied(task);
        }
        setSidebarOpen(false);
    };

    const navItems = [
        { path: "/dashboard", label: "Dashboard", icon: Icons.Dashboard, perm: null },
        { path: "/create-exam", label: "Create Exam", icon: Icons.Generate, perm: "generate exam", task: "Create Exam" },
        { path: "/manage-exams", label: "Manage Exams", icon: Icons.Exams, perm: "manage exam", task: "Manage Exams" },
        { path: "/question-bank", label: "Question Bank", icon: Icons.Exams, perm: "manage bank", task: "Question Bank" },
        { path: "/manage-candidates", label: "Candidates", icon: Icons.Users, perm: "manage candidates", task: "Candidates" },
        { path: "/invitation-tracking", label: "Invites Tracking", icon: Icons.Results, perm: "send invitation", task: "Invites" },
        { path: "/candidate-results", label: "Results", icon: Icons.Results, perm: "view results", task: "Results" },
        { path: "/settings", label: "Settings", icon: Icons.Settings, perm: null },
        { path: "/ai-assistant", label: "AI Assistant", icon: Icons.Chat, perm: null, isAction: true, onAction: () => setKiwiAssistantOpen(true) },
        { path: "/user-guide", label: "User Guide", icon: Icons.Help, perm: null, isExternal: true, externalPath: "/Userguide.html" },
    ];

    useEffect(() => {
        const currentItem = navItems.find(item => isActive(item.path));
        if (currentItem) {
            document.title = `${currentItem.label} | KiwiQA`;
        } else {
            document.title = "KiwiQA Assessment Hub";
        }
    }, [location.pathname]);

    // â”€â”€ Restore accessibility preferences on every page load â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    useEffect(() => {
        // Font size
        const savedFont = localStorage.getItem("kiwi-font-size") || "normal";
        document.documentElement.setAttribute("data-font-size", savedFont);

        // High contrast (overrides theme)
        const savedHC = localStorage.getItem("kiwi-high-contrast") === "true";
        if (savedHC) {
            document.documentElement.setAttribute("data-theme", "high-contrast");
        }

        // Reduced motion
        const savedRM = localStorage.getItem("kiwi-reduced-motion") === "true";
        document.documentElement.setAttribute("data-reduced-motion", String(savedRM));
    }, []);

    const focusMain = () => {
        const main = document.getElementById("main-content");
        if (main) main.focus();
    };

    // â”€â”€ Focus main content after every route change â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const isFirstNav = useRef(true);
    useEffect(() => {
        if (isFirstNav.current) {
            isFirstNav.current = false;
            return;
        }
        focusMain();
    }, [location.pathname]);

    return (
        <div className={`al-layout-wrap ${plain ? 'plain' : ''}`}>
            <style>{`
                .al-layout-wrap {
                    display: flex;
                    min-height: 100vh;
                    background: var(--bg-neutral);
                    color: var(--text);
                    font-family: var(--font-body);
                }

                /* â”€â”€ Sidebar â”€â”€ */
                .al-sidebar {
                    width: 240px;
                    flex-shrink: 0;
                    background: var(--sidebar-bg, #0f172a);
                    display: flex;
                    flex-direction: column;
                    position: sticky;
                    top: 0;
                    height: 100vh;
                    z-index: 1000;
                    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                    overflow: hidden;
                }

                .al-sidebar::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: 180px;
                    background: radial-gradient(ellipse at top left, rgba(28, 132, 143, 0.25) 0%, transparent 70%);
                    pointer-events: none;
                }

                .al-sidebar-overlay {
                    display: none;
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.6);
                    z-index: 900;
                    backdrop-filter: blur(4px);
                    animation: fadeOverlay 0.2s ease;
                }
                @keyframes fadeOverlay { from { opacity: 0; } to { opacity: 1; } }

                @media (max-width: 1024px) {
                    .al-sidebar {
                        position: fixed;
                        transform: translateX(-100%);
                    }
                    .al-sidebar.open {
                        transform: translateX(0);
                    }
                    .al-sidebar-overlay.open { display: block; }
                    .al-main-content { width: 100% !important; }
                }

                /* â”€â”€ Logo â”€â”€ */
                .al-logo-area {
                    padding: var(--space-24) var(--space-16);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    margin-bottom: var(--space-8);
                }
                .al-logo-area img {
                    height: 48px;
                    width: auto;
                    max-width: 160px;
                    object-fit: contain;
                }

                /* â”€â”€ Nav â”€â”€ */
                .al-nav {
                    flex: 1;
                    padding: 4px 10px;
                    overflow-y: auto;
                    -ms-overflow-style: none; /* IE/Edge */
                    scrollbar-width: none;    /* Firefox */
                }
                .al-nav::-webkit-scrollbar { display: none; } /* Chrome/Safari */

                .al-nav-label {
                    font-size: 8px;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.12em;
                    color: var(--sidebar-text);
                    opacity: 0.5;
                    padding: 12px 10px 4px;
                    display: block;
                }

                .al-nav-item {
                    display: flex;
                    align-items: center;
                    gap: var(--space-8);
                    padding: var(--space-8) var(--space-16);
                    margin-bottom: var(--space-4);
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    font-size: var(--font-size-body);
                    font-weight: 600;
                    color: var(--sidebar-text);
                    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                    position: relative;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    user-select: none;
                }

                .al-nav-item:focus-visible {
                    outline: 2px solid var(--primary);
                    outline-offset: -2px;
                    background: rgba(255,255,255,0.07);
                    color: var(--text-on-primary);
                }

                .al-nav-item:hover {
                    background: rgba(255,255,255,0.07);
                    color: var(--text-on-primary);
                }

                .al-nav-item.active {
                    background: var(--primary);
                    color: var(--text-on-primary);
                    font-weight: 700;
                }

                .al-nav-item.active::before {
                    content: '';
                    position: absolute;
                    left: 0; top: 50%;
                    transform: translateY(-50%);
                    width: 3px;
                    height: 60%;
                    background: var(--primary);
                    border-radius: 0 3px 3px 0;
                }

                .al-nav-item.locked {
                    opacity: 0.35;
                    cursor: not-allowed;
                }

                .al-nav-icon {
                    flex-shrink: 0;
                    opacity: 0.7;
                    transition: opacity 0.2s;
                }
                .al-nav-item:hover .al-nav-icon,
                .al-nav-item.active .al-nav-icon { opacity: 1; }

                .al-lock-badge {
                    margin-left: auto;
                    flex-shrink: 0;
                    opacity: 0.5;
                }

                /* â”€â”€ Logout â”€â”€ */
                .al-logout-area {
                    padding: 12px 10px;
                    border-top: 1px solid rgba(255,255,255,0.06);
                }

                .al-logout-btn {
                    width: 100%;
                    padding: var(--space-8) var(--space-16);
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.08);
                    color: var(--sidebar-text);
                    font-size: var(--font-size-body);
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: var(--space-8);
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    transition: all 0.25s;
                }

                .al-logout-btn:hover {
                    background: rgba(225, 29, 72, 0.15);
                    border-color: rgba(225, 29, 72, 0.3);
                    color: #fb7185;
                }

                /* â”€â”€ Main Content â”€â”€ */
                .al-main-content {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    background: var(--bg-neutral);
                }

                /* â”€â”€ Mobile Header â”€â”€ */
                .al-mobile-header {
                    display: none;
                    background: var(--bg);
                    padding: var(--space-16) var(--space-24);
                    border-bottom: 1px solid var(--border);
                    align-items: center;
                    justify-content: space-between;
                    position: sticky;
                    top: 0;
                    z-index: 800;
                    height: 64px;
                }

                @media (max-width: 1024px) {
                    .al-mobile-header { display: flex; }
                }

                .al-menu-toggle {
                    background: var(--bg-neutral);
                    border: 1px solid var(--border);
                    color: var(--text);
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: var(--radius-sm);
                    cursor: pointer;
                }

                .al-content-inner {
                    flex: 1;
                    padding: 16px 24px 32px;
                    max-width: 1440px;
                    margin: 0 auto;
                    width: 100%;
                }

                .al-layout-wrap.plain .al-main-content {
                    width: 100%;
                }
                .al-layout-wrap.plain .al-content-inner {
                    padding: 0;
                    margin: 0;
                    max-width: none;
                }
                .al-footer {
                    position: fixed;
                    bottom: 0;
                    right: 0;
                    left: 240px;
                    padding: 10px 24px;
                    text-align: center;
                    font-size: 11px;
                    color: var(--ink-3);
                    border-top: 1px solid var(--border);
                    background: var(--bg);
                    backdrop-filter: blur(8px);
                    z-index: 100;
                    transition: left 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @media (max-width: 1024px) {
                    .al-footer { left: 0; }
                }
                .al-content-inner {
                    flex: 1;
                    padding: 16px 24px 64px; /* Bottom padding for footer */
                }
            `}</style>

            {/* â”€â”€ Skip to content (keyboard accessibility) â”€â”€ */}
            {!plain && <a href="#main-content" className="skip-to-content">Skip to main content</a>}

            <div className={`al-sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

            {!plain && (
                <aside className={`al-sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Main navigation">
                    <div
                        className="al-logo-area"
                        onClick={() => { navigate("/dashboard"); setSidebarOpen(false); }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { navigate("/dashboard"); setSidebarOpen(false); } }}
                        tabIndex={0}
                        role="button"
                        aria-label="Go to Dashboard"
                    >
                        <img src={logo} alt="KiwiQA Logo" />
                    </div>

                    <nav className="al-nav">
                        <span className="al-nav-label">Main</span>
                        {navItems.slice(0, 1).map(item => (
                            <div
                                key={item.path}
                                role="button"
                                tabIndex={0}
                                className={`al-nav-item ${isActive(item.path) ? "active" : ""}`}
                                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(item.path); setSidebarOpen(false); focusMain(); } }}
                                aria-current={isActive(item.path) ? 'page' : undefined}
                            >
                                <span className="al-nav-icon"><item.icon /></span>
                                {item.label}
                            </div>
                        ))}

                        <span className="al-nav-label">Assessments</span>
                        {navItems.slice(1, 4).map(item => (
                            <div
                                key={item.path}
                                role="button"
                                tabIndex={0}
                                className={`al-nav-item ${isActive(item.path) ? "active" : ""} ${item.perm && !hasPermission(item.perm) ? "locked" : ""}`}
                                onClick={() => item.perm ? navTo(item.path, item.perm, item.task!) : (navigate(item.path), setSidebarOpen(false))}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.perm ? navTo(item.path, item.perm, item.task!) : (navigate(item.path), setSidebarOpen(false)); } }}
                                aria-current={isActive(item.path) ? 'page' : undefined}
                                aria-disabled={item.perm && !hasPermission(item.perm) ? true : undefined}
                            >
                                <span className="al-nav-icon"><item.icon /></span>
                                {item.label}
                                {item.perm && !hasPermission(item.perm) && <span className="al-lock-badge"><Icons.Lock /></span>}
                            </div>
                        ))}

                        <span className="al-nav-label">People</span>
                        {navItems.slice(4, 7).map(item => (
                            <div
                                key={item.path}
                                role="button"
                                tabIndex={0}
                                className={`al-nav-item ${isActive(item.path) ? "active" : ""} ${item.perm && !hasPermission(item.perm) ? "locked" : ""}`}
                                onClick={() => item.perm ? navTo(item.path, item.perm, item.task!) : (navigate(item.path), setSidebarOpen(false))}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.perm ? navTo(item.path, item.perm, item.task!) : (navigate(item.path), setSidebarOpen(false)); } }}
                                aria-current={isActive(item.path) ? 'page' : undefined}
                                aria-disabled={item.perm && !hasPermission(item.perm) ? true : undefined}
                            >
                                <span className="al-nav-icon"><item.icon /></span>
                                {item.label}
                                {item.perm && !hasPermission(item.perm) && <span className="al-lock-badge"><Icons.Lock /></span>}
                            </div>
                        ))}

                        <span className="al-nav-label">System</span>
                        {navItems.slice(7).map(item => (
                            <div
                                key={item.path}
                                role="button"
                                tabIndex={0}
                                className={`al-nav-item ${isActive(item.path) ? "active" : ""}`}
                                onClick={() => {
                                    if ((item as any).isAction && (item as any).onAction) {
                                        (item as any).onAction();
                                    } else if (item.isExternal) {
                                        window.open(item.externalPath, "_blank");
                                    } else {
                                        navigate(item.path);
                                    }
                                    setSidebarOpen(false);
                                }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        if ((item as any).isAction && (item as any).onAction) {
                                            (item as any).onAction();
                                        } else if (item.isExternal) {
                                            window.open(item.externalPath, "_blank");
                                        } else {
                                            navigate(item.path);
                                        }
                                        setSidebarOpen(false);
                                    }
                                }}
                                aria-current={isActive(item.path) ? 'page' : undefined}
                            >
                                <span className="al-nav-icon"><item.icon /></span>
                                {item.label}
                            </div>
                        ))}
                    </nav>

                    <div className="al-logout-area">
                        <button className="al-logout-btn" onClick={handleLogout}>
                            <Icons.Logout /> Logout
                        </button>
                    </div>

                    <KiwiAssistantPopup isOpen={kiwiAssistantOpen} onClose={() => setKiwiAssistantOpen(false)} />
                </aside>
            )}

            <main className="al-main-content">
                {!plain && (
                    <header className="al-mobile-header">
                        <img src={logo} alt="Logo" style={{ height: 40 }} />
                        <button className="al-menu-toggle" onClick={() => setSidebarOpen(true)}>
                            <Icons.Menu />
                        </button>
                    </header>
                )}

                <div className="al-content-inner" id="main-content" tabIndex={-1}>
                    {children}
                </div>

                <footer className="al-footer">
                    &copy; 2026 KiwiQA. All rights reserved.
                </footer>

                {popup && (
                    <CustomPopup
                        isOpen={popup.isOpen}
                        type="alert"
                        title={popup.title}
                        message={popup.message}
                        onConfirm={() => setPopup(null)}
                    />
                )}
            </main>
        </div>
    );
};

export default AdminLayout;
