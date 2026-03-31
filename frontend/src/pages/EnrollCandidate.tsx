import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import API_BASE_URL from "../config";
import logo from "../assets/logo.png";

// ─── Device ID ─────────────────────────────────────────────────────────────────
function getOrCreateDeviceId(): string {
    const key = "kiwi_device_mac_address";
    let id = localStorage.getItem(key);
    if (!id) {
        id = crypto?.randomUUID?.() ?? Math.random().toString(36).substring(2, 15);
        localStorage.setItem(key, id);
    }
    return id;
}

// ─── Country Data ─────────────────────────────────────────────────────────────
const COUNTRIES = [
    { name: "India", code: "+91", flag: "🇮🇳" },
    { name: "United States", code: "+1", flag: "🇺🇸" },
    { name: "United Kingdom", code: "+44", flag: "🇬🇧" },
    { name: "Australia", code: "+61", flag: "🇦🇺" },
    { name: "Canada", code: "+1", flag: "🇨🇦" },
    { name: "Germany", code: "+49", flag: "🇩🇪" },
    { name: "France", code: "+33", flag: "🇫🇷" },
    { name: "United Arab Emirates", code: "+971", flag: "🇦🇪" },
    { name: "Singapore", code: "+65", flag: "🇸🇬" },
    { name: "Japan", code: "+81", flag: "🇯🇵" },
    { name: "South Korea", code: "+82", flag: "🇰🇷" },
    { name: "Brazil", code: "+55", flag: "🇧🇷" },
    { name: "Mexico", code: "+52", flag: "🇲🇽" },
    { name: "Italy", code: "+39", flag: "🇮🇹" },
    { name: "Spain", code: "+34", flag: "🇪🇸" },
    { name: "Netherlands", code: "+31", flag: "🇳🇱" },
    { name: "Switzerland", code: "+41", flag: "🇨🇭" },
    { name: "Sweden", code: "+46", flag: "🇸🇪" },
    { name: "Norway", code: "+47", flag: "🇳🇴" },
    { name: "Denmark", code: "+45", flag: "🇩🇰" },
    { name: "Ireland", code: "+353", flag: "🇮🇪" },
    { name: "Russia", code: "+7", flag: "🇷🇺" },
    { name: "South Africa", code: "+27", flag: "🇿🇦" },
    { name: "New Zealand", code: "+64", flag: "🇳🇿" },
    { name: "Saudi Arabia", code: "+966", flag: "🇸🇦" },
    { name: "Israel", code: "+972", flag: "🇮🇱" },
    { name: "Turkey", code: "+90", flag: "🇹🇷" },
    { name: "Egypt", code: "+20", flag: "🇪🇬" },
    { name: "Malaysia", code: "+60", flag: "🇲🇾" },
    { name: "Thailand", code: "+66", flag: "🇹🇭" },
    { name: "Indonesia", code: "+62", flag: "🇮🇩" },
    { name: "Vietnam", code: "+84", flag: "🇻🇳" },
    { name: "Philippines", code: "+63", flag: "🇵🇭" },
];

// ─── Icons ─────────────────────────────────────────────────────────────────────
const Icons = {
    Mail: () => (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
    ),
    User: () => (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    ),
    Alert: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    ),
    ChevronDown: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    ),
    Search: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    ),
    Send: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
    ),
    Clock: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    ),
    Moon: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
    ),
    Sun: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
    ),
    Phone: () => (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.27-2.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
    ),
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function EnrollCandidate() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preFilledEmail = searchParams.get("email");

    const [name, setName] = useState("");
    const [email, setEmail] = useState(preFilledEmail || "");
    const [countryCode, setCountryCode] = useState("+91");
    const [phone, setPhone] = useState("");
    const [agreedToConsent, setAgreedToConsent] = useState(false);
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState<"details" | "otp">("details");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [resendTimer, setResendTimer] = useState(0);
    const [theme, setTheme] = useState(localStorage.getItem("kiwi-theme") || "default");

    // Searchable dropdown state
    const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);
    const [countrySearch, setCountrySearch] = useState("");
    const countryMenuRef = useRef<HTMLDivElement>(null);

    const selectedCountry = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];
    const filteredCountries = COUNTRIES.filter(c => 
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
        c.code.includes(countrySearch)
    );

    useEffect(() => {
        document.title = "Enroll | KiwiQA";
        
        // Handle clicks outside dropdown to close it
        const handleClickOutside = (e: MouseEvent) => {
            if (countryMenuRef.current && !countryMenuRef.current.contains(e.target as Node)) {
                setIsCountryMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (theme === "default") {
            document.documentElement.removeAttribute("data-theme");
        } else {
            document.documentElement.setAttribute("data-theme", theme);
        }
        localStorage.setItem("kiwi-theme", theme);
    }, [theme]);

    // Resend countdown
    useEffect(() => {
        if (resendTimer <= 0) return;
        const id = setInterval(() => setResendTimer(t => t - 1), 1000);
        return () => clearInterval(id);
    }, [resendTimer]);

    const handleRequestOtp = async (e?: React.FormEvent) => {
        e?.preventDefault();

        if (!name.trim()) {
            setError("Please enter your full name.");
            return;
        }
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError("Please enter a valid email address.");
            return;
        }
        const phoneDigits = phone.replace(/\D/g, "");
        if (!phone.trim()) {
            setError("Please enter your mobile number.");
            return;
        }
        if (phoneDigits.length !== 10) {
            setError("Mobile number must be exactly 10 digits.");
            return;
        }

        setLoading(true);
        setError("");
        try {
            const deviceId = getOrCreateDeviceId();
            const res = await fetch(
                `${API_BASE_URL}/candidates/enroll/${examId}/request-otp?device_id=${deviceId}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name,
                        email,
                        country_code: countryCode,
                        phone_number: phone
                    })
                }
            );
            const data = await res.json();
            if (res.ok) {
                setStep("otp");
                setResendTimer(20);
            } else {
                setError(data.detail || "Failed to send OTP. Please try again.");
            }
        } catch {
            setError("Network error. Please check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const deviceId = getOrCreateDeviceId();
            const res = await fetch(
                `${API_BASE_URL}/candidates/enroll/${examId}/verify-otp`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name,
                        email,
                        otp,
                        country_code: countryCode,
                        phone_number: phone,
                        device_id: deviceId
                    })
                }
            );
            const data = await res.json();
            if (res.ok) {
                navigate(`/test/${data.token}`);
            } else {
                setError(data.detail || "Invalid code. Please try again.");
            }
        } catch {
            setError("Network error. Please check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="enroll-page">
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@600;700&display=swap');

        :root {
          --ink:        var(--text);
          --ink-2:      color-mix(in srgb, var(--text) 80%, var(--bg));
          --ink-3:      var(--text-muted);
          --line:       var(--border);
          --bg:         var(--bg-neutral);
          --white:      var(--bg);
          --teal:       var(--primary);
          --teal-hover: var(--primary-hover);
          --teal-light: color-mix(in srgb, var(--primary) 10%, var(--bg));
          --teal-mid:   color-mix(in srgb, var(--primary) 30%, var(--bg));
          --danger:     #dc2626;
          --danger-bg:  color-mix(in srgb, #dc2626 10%, var(--bg));
          --danger-ln:  color-mix(in srgb, #dc2626 30%, var(--bg));
          --font-serif: 'Inter', sans-serif;
          --font-sans:  'Inter', sans-serif;
          --font-mono:  'JetBrains Mono', monospace;
          --radius:     10px;
          --radius-sm:  6px;
          --shadow-sm:  var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.05));
          --shadow-md:  var(--shadow, 0 8px 24px rgba(0,0,0,0.11));
          --transition: 0.2s cubic-bezier(0.4,0,0.2,1);
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .enroll-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          font-family: var(--font-sans);
          padding: 24px;
        }

        .enroll-theme-btn {
          position: absolute;
          top: 24px;
          right: 24px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--white);
          border: 1px solid var(--line);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink-2);
          cursor: pointer;
          transition: all var(--transition);
          box-shadow: var(--shadow-sm);
        }
        .enroll-theme-btn:hover {
          color: var(--teal);
          border-color: var(--teal);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        /* ── Card ─────────────────────────────────────── */
        .enroll-card {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: 16px;
          box-shadow: var(--shadow-md);
          width: 100%;
          max-width: 500px;
          padding: 36px 32px 32px;
          animation: cardIn 0.35s cubic-bezier(0.4,0,0.2,1);
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Header ───────────────────────────────────── */
        .enroll-logo { height: 52px; object-fit: contain; display: block; margin: 0 auto 28px; }

        .enroll-heading {
          font-family: var(--font-serif);
          font-size: 22px;
          color: var(--ink);
          text-align: center;
          letter-spacing: -0.01em;
          margin-bottom: 6px;
        }

        .enroll-subheading {
          font-size: 13.5px;
          color: var(--ink-3);
          text-align: center;
          line-height: 1.5;
          margin-bottom: 24px;
        }

        /* ── Divider ──────────────────────────────────── */
        .enroll-divider {
          height: 1px;
          background: var(--line);
          margin: 0 -32px 24px;
        }

        /* ── Error Banner ─────────────────────────────── */
        .enroll-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 14px;
          background: var(--danger-bg);
          border: 1px solid var(--danger-ln);
          border-radius: var(--radius-sm);
          color: var(--danger);
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 20px;
          animation: cardIn 0.25s ease;
        }

        /* ── Form ─────────────────────────────────────── */
        .enroll-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--ink-2);
          letter-spacing: 0.02em;
        }

        .form-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .form-input-icon {
          position: absolute;
          left: 14px;
          color: var(--ink-3);
          pointer-events: none;
          display: flex;
          align-items: center;
          z-index: 10;
        }

        .form-input {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          border: 1.5px solid var(--line);
          border-radius: var(--radius-sm);
          background: var(--bg);
          color: var(--ink);
          font-family: var(--font-sans);
          font-size: 14px;
          font-weight: 500;
          outline: none;
          display: block;
          vertical-align: middle;
          transition: border-color var(--transition), background var(--transition), box-shadow var(--transition);
        }

        .form-input.form-input--iconic {
          padding-left: 48px !important;
        }

        .form-input::placeholder { color: #b0bec5; font-weight: 400; opacity: 0.8; }

        .form-input:focus {
          background: var(--white);
          border-color: var(--teal);
          box-shadow: 0 0 0 3px rgba(15,113,115,0.1);
        }

        /* Searchable Country Selector */
        .country-selector {
          position: relative;
          cursor: pointer;
          user-select: none;
          background: var(--bg);
          border: 1.5px solid var(--line);
          border-radius: var(--radius-sm);
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          gap: 6px;
          transition: all var(--transition);
        }
        .country-selector:hover {
          border-color: var(--ink-3);
        }
        .country-selector.is-active {
          border-color: var(--teal);
          background: var(--white);
          box-shadow: 0 0 0 3px rgba(15,113,115,0.1);
        }
        .country-selected-flag { font-size: 18px; line-height: 1; display: flex; align-items: center; }
        .country-selected-code { font-weight: 700; color: var(--ink); font-size: 14px; line-height: 1; display: flex; align-items: center; flex: 1; justify-content: center; }
        .country-chevron { color: var(--ink-3); transition: transform 0.2s; display: flex; align-items: center; }
        .country-selector.is-active .country-chevron { transform: rotate(180deg); }

        .country-menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          width: 280px;
          min-height: 320px;
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: 12px;
          box-shadow: var(--shadow-md);
          z-index: 1000;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: menuIn 0.2s cubic-bezier(0,0,0.2,1);
        }
        @keyframes menuIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .country-search-wrap {
          padding: 10px;
          background: var(--bg);
          border-bottom: 1px solid var(--line);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .country-search-input {
          background: transparent;
          border: none;
          outline: none;
          width: 100%;
          font-family: var(--font-sans);
          font-size: 13px;
          color: var(--ink);
          font-weight: 500;
        }
        .country-search-input::placeholder { color: var(--ink-3); }

        .country-list {
          flex: 1;
          max-height: 260px;
          overflow-y: auto;
          padding: 6px;
          background: var(--white);
        }
        .country-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 9px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.1s;
        }
        .country-item:hover { background: var(--bg); }
        .country-item.is-selected { background: var(--teal-light); }
        .country-item-flag { font-size: 18px; }
        .country-item-info { flex: 1; min-width: 0; }
        .country-item-name { 
          display: block; 
          font-size: 13px; 
          font-weight: 600; 
          color: var(--ink); 
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis; 
        }
        .country-item-code { font-size: 11px; color: var(--ink-3); font-weight: 500; }

        /* ── Round Checkbox ───────────────────────────── */
        .enroll-checkbox {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          width: 20px;
          height: 20px;
          border: 1.5px solid var(--line);
          border-radius: 50%;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition);
          position: relative;
          flex-shrink: 0;
          background: var(--bg);
          margin-top: 2px;
          outline: none;
        }
        .enroll-checkbox:checked {
          border-color: var(--teal);
          background-color: var(--teal);
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");
          background-size: 12px;
          background-position: center;
          background-repeat: no-repeat;
        }
        .enroll-checkbox:focus {
          box-shadow: 0 0 0 3px rgba(15,113,115,0.1);
        }

        /* ── Footer ───────────────────────────────────── */
        .enroll-footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 12px 24px;
          text-align: center;
          font-size: 11px;
          color: var(--ink-3);
          border-top: 1px solid var(--line);
          background: rgba(var(--bg-rgb), 0.8);
          backdrop-filter: blur(8px);
          z-index: 100;
        }
      `}</style>

            <button
                className="enroll-theme-btn"
                onClick={() => setTheme(t => t === 'dark' ? 'default' : 'dark')}
                title="Toggle Theme"
            >
                {theme === 'dark' ? <Icons.Sun /> : <Icons.Moon />}
            </button>

            <div className="enroll-card">
                <img src={logo} alt="KiwiQA" className="enroll-logo" />

                {step === "details" ? (
                    <>
                        <h1 className="enroll-heading">Register for Assessment</h1>
                        <p className="enroll-subheading">Enter your details to receive a verification code.</p>
                        <div className="enroll-divider" />

                        {error && (
                            <div className="enroll-error">
                                <Icons.Alert /> {error}
                            </div>
                        )}

                        <form className="enroll-form" onSubmit={handleRequestOtp}>
                            <div className="form-field">
                                <label className="form-label">Full Name</label>
                                <div className="form-input-wrap">
                                    <span className="form-input-icon"><Icons.User /></span>
                                    <input
                                        className="form-input form-input--iconic"
                                        type="text"
                                        placeholder="Jane Smith"
                                        value={name}
                                        required
                                        onChange={e => setName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-field">
                                <label className="form-label">Email Address</label>
                                <div className="form-input-wrap">
                                    <span className="form-input-icon"><Icons.Mail /></span>
                                    <input
                                        className="form-input form-input--iconic"
                                        type="email"
                                        placeholder="jane@example.com"
                                        value={email}
                                        required
                                        readOnly={!!preFilledEmail}
                                        onChange={e => !preFilledEmail && setEmail(e.target.value)}
                                        style={preFilledEmail ? { background: 'var(--slate-50)', cursor: 'not-allowed', color: 'var(--ink-3)' } : {}}
                                    />
                                </div>
                            </div>

                            <div className="form-field">
                                <label className="form-label">Mobile Number</label>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    
                                    {/* Custom Searchable Country Selector */}
                                    <div className="form-input-wrap" style={{ width: 135 }} ref={countryMenuRef}>
                                        <div 
                                            className={`country-selector ${isCountryMenuOpen ? 'is-active' : ''}`}
                                            onClick={() => setIsCountryMenuOpen(!isCountryMenuOpen)}
                                        >
                                            <span className="country-selected-flag">{selectedCountry.flag}</span>
                                            <span className="country-selected-code">{selectedCountry.code}</span>
                                            <span className="country-chevron"><Icons.ChevronDown /></span>
                                        </div>

                                        {isCountryMenuOpen && (
                                            <div className="country-menu">
                                                <div className="country-search-wrap">
                                                    <span style={{ color: 'var(--ink-3)' }}><Icons.Search /></span>
                                                    <input 
                                                        className="country-search-input"
                                                        placeholder="Search country or code..."
                                                        autoFocus
                                                        value={countrySearch}
                                                        onChange={e => setCountrySearch(e.target.value)}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                </div>
                                                <div className="country-list">
                                                    {filteredCountries.length > 0 ? (
                                                        filteredCountries.map((c, idx) => (
                                                            <div 
                                                                key={`${c.code}-${idx}`}
                                                                className={`country-item ${countryCode === c.code ? 'is-selected' : ''}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setCountryCode(c.code);
                                                                    setIsCountryMenuOpen(false);
                                                                    setCountrySearch("");
                                                                }}
                                                            >
                                                                <span className="country-item-flag">{c.flag}</span>
                                                                <div className="country-item-info">
                                                                    <span className="country-item-name">{c.name}</span>
                                                                    <span className="country-item-code">{c.code}</span>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--ink-3)' }}>
                                                            No countries found
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="form-input-wrap" style={{ flex: 1 }}>
                                        <span className="form-input-icon"><Icons.Phone /></span>
                                        <input
                                            className="form-input form-input--iconic"
                                            style={{ height: 44 }}
                                            type="tel"
                                            placeholder="9876543210"
                                            value={phone}
                                            required
                                            maxLength={10}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                                setPhone(val);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-field" style={{ marginTop: 8 }}>
                                <label className="decl-check-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        className="enroll-checkbox"
                                        checked={agreedToConsent}
                                        onChange={e => setAgreedToConsent(e.target.checked)}
                                    />
                                    <span style={{ fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.55, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                        I consent to securely store my data for assessment purposes. We ensure your data privacy and security.
                                    </span>
                                </label>
                            </div>

                            <button className="btn btn-primary" type="submit" disabled={loading || !agreedToConsent} style={{ marginTop: 12 }}>
                                {loading ? "Sending code…" : <><Icons.Send /> Register & Continue</>}
                            </button>
                        </form>
                    </>
                ) : (
                    <>
                        <h1 className="enroll-heading">Verify your email</h1>
                        <p className="enroll-subheading">Enter the 6-digit code we sent to <strong style={{ color: "var(--ink-2)" }}>{email}</strong>.</p>
                        <div className="enroll-divider" />

                        {error && (
                            <div className="enroll-error">
                                <Icons.Alert /> {error}
                            </div>
                        )}

                        <form className="enroll-form" onSubmit={handleVerifyOtp} noValidate>

                            <div className="enroll-notice">
                                Check your inbox — the code may take a minute to arrive. Also check your spam folder.
                                <div className="enroll-notice-hint">
                                    If you don't receive it, contact HR for a manual verification code.
                                </div>
                            </div>

                            <div className="form-field">
                                <label className="form-label">Verification Code</label>
                                <input
                                    className="form-input form-input--otp"
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    placeholder="— — — — — —"
                                    value={otp}
                                    required
                                    autoComplete="one-time-code"
                                    onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                />
                            </div>

                            <div className="resend-row">
                                {resendTimer > 0 ? (
                                    <span className="resend-timer">
                                        <Icons.Clock /> Resend available in {resendTimer}s
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        className="resend-btn"
                                        disabled={loading}
                                        onClick={() => handleRequestOtp()}
                                    >
                                        <Icons.Mail /> Resend code
                                    </button>
                                )}
                            </div>

                            <button className="btn btn-primary" type="submit" disabled={loading || otp.length < 6}
                                style={{ marginTop: 4 }}>
                                {loading ? "Verifying…" : "Start Exam"}
                            </button>


                        </form>
                    </>
                )}

            </div>
            <footer className="enroll-footer">
                &copy; 2026 KiwiQA. All rights reserved.
            </footer>
        </div>
    );
}