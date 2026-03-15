import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
    ChevronLeft: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
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
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function EnrollCandidate() {
    const { examId } = useParams();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState<"details" | "otp">("details");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [resendTimer, setResendTimer] = useState(0);
    const [theme, setTheme] = useState(localStorage.getItem("kiwi-theme") || "default");

    useEffect(() => {
        document.title = "Enroll | KiwiQA";
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
        setLoading(true);
        setError("");
        try {
            const deviceId = getOrCreateDeviceId();
            const res = await fetch(
                `${API_BASE_URL}/candidates/enroll/${examId}/request-otp?device_id=${deviceId}`,
                { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email }) }
            );
            const data = await res.json();
            if (res.ok) {
                setStep("otp");
                setResendTimer(60);
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
                { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, otp, phone_number: "", cv_url: "", device_id: deviceId }) }
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
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@600;700&display=swap');

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
          --font-serif: 'DM Serif Display', serif;
          --font-sans:  'DM Sans', sans-serif;
          --font-mono:  'JetBrains Mono', monospace;
          --radius:     10px;
          --radius-sm:  6px;
          --shadow-sm:  var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.05));
          --shadow-md:  var(--shadow, 0 8px 24px rgba(0,0,0,0.1));
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
          max-width: 420px;
          padding: 36px 32px 32px;
          animation: cardIn 0.35s cubic-bezier(0.4,0,0.2,1);
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Header ───────────────────────────────────── */
        .enroll-logo { height: 34px; object-fit: contain; display: block; margin: 0 auto 28px; }

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
          left: 13px;
          color: var(--ink-3);
          pointer-events: none;
          display: flex;
          align-items: center;
        }

        .form-input {
          width: 100%;
          height: 42px;
          padding: 0 14px 0 40px;
          border: 1px solid var(--line);
          border-radius: var(--radius-sm);
          background: var(--bg);
          color: var(--ink);
          font-family: var(--font-sans);
          font-size: 14px;
          font-weight: 500;
          outline: none;
          transition: border-color var(--transition), background var(--transition), box-shadow var(--transition);
        }

        .form-input::placeholder { color: #b0bec5; }

        .form-input:focus {
          background: var(--white);
          border-color: var(--teal);
          box-shadow: 0 0 0 3px rgba(15,113,115,0.1);
        }

        /* OTP input — centered mono */
        .form-input--otp {
          font-family: var(--font-mono);
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.35em;
          text-align: center;
          padding: 0 14px;
          height: 56px;
        }

        /* ── Info Notice ──────────────────────────────── */
        .enroll-notice {
          padding: 12px 14px;
          background: var(--teal-light);
          border: 1px solid var(--teal-mid);
          border-radius: var(--radius-sm);
          font-size: 13px;
          color: var(--ink-2);
          line-height: 1.55;
        }

        .enroll-notice strong { font-weight: 600; color: var(--teal); }

        .enroll-notice-hint {
          margin-top: 8px;
          font-size: 12px;
          color: var(--ink-3);
        }

        /* ── Resend Row ───────────────────────────────── */
        .resend-row {
          text-align: center;
        }

        .resend-btn {
          background: none;
          border: none;
          font-family: var(--font-sans);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px;
          border-radius: 4px;
          transition: color var(--transition);
          outline: none;
          color: var(--teal);
        }

        .resend-btn:hover:not(:disabled) { color: var(--teal-hover); }
        .resend-btn:disabled { color: var(--ink-3); cursor: default; }

        .resend-timer {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--ink-3);
        }

        /* ── Buttons ──────────────────────────────────── */
        .btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          width: 100%;
          height: 44px;
          border-radius: var(--radius-sm);
          font-family: var(--font-sans);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          outline: none;
          transition: all var(--transition);
        }

        .btn-primary {
          background: var(--teal);
          color: var(--white);
          box-shadow: 0 2px 8px rgba(15,113,115,0.25);
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--teal-hover);
          box-shadow: 0 4px 16px rgba(15,113,115,0.35);
          transform: translateY(-1px);
        }

        .btn-primary:active:not(:disabled) { transform: translateY(0); }
        .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

        .btn-ghost {
          background: var(--white);
          color: var(--ink-3);
          border-color: var(--line);
        }

        .btn-ghost:hover:not(:disabled) {
          border-color: var(--ink-3);
          color: var(--ink);
        }

        .btn-ghost:disabled { opacity: 0.55; cursor: not-allowed; }

        /* ── Footer ───────────────────────────────────── */
        .enroll-footer {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid var(--line);
          text-align: center;
          font-size: 12px;
          color: var(--ink-3);
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

                        <form className="enroll-form" onSubmit={handleRequestOtp} noValidate>
                            <div className="form-field">
                                <label className="form-label">Full Name</label>
                                <div className="form-input-wrap">
                                    <span className="form-input-icon"><Icons.User /></span>
                                    <input
                                        className="form-input"
                                        type="text"
                                        placeholder="Jane Smith"
                                        value={name}
                                        required
                                        autoComplete="name"
                                        onChange={e => setName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-field">
                                <label className="form-label">Email Address</label>
                                <div className="form-input-wrap">
                                    <span className="form-input-icon"><Icons.Mail /></span>
                                    <input
                                        className="form-input"
                                        type="email"
                                        placeholder="jane@example.com"
                                        value={email}
                                        required
                                        autoComplete="email"
                                        onChange={e => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
                                {loading ? "Sending code…" : <><Icons.Send /> Continue</>}
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

                            <button className="btn btn-ghost" type="button" disabled={loading}
                                onClick={() => { setStep("details"); setError(""); setOtp(""); }}>
                                <Icons.ChevronLeft /> Back
                            </button>
                        </form>
                    </>
                )}

                <div className="enroll-footer">
                    Secure assessment platform · Powered by KiwiQA
                </div>
            </div>
        </div>
    );
}