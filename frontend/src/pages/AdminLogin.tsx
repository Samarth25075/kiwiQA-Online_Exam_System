import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import API_BASE_URL from "../config";
import logo from "../assets/logo.png";

// -------------------------------------------- Types -----------------------------------------------
interface FormErrors {
  email?: string;
  password?: string;
  auth?: string;
}

// ─── API ─────────────────────────────────────────────────────────────
async function loginRequest(email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Invalid credentials");
  return data as { access_token: string; token_type: string };
}


// â”€â”€â”€ Icons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const Icons = {
  Mail: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  Lock: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Eye: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  EyeOff: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  ),
  Alert: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Shield: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Help: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Check: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  ChevronLeft: ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
};

// â”€â”€â”€ Loader Dots â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LoaderDots({ color = "white" }: { color?: string }) {
  return (
    <span className="login-dots">
      <span className="login-dot" style={{ background: color }} />
      <span className="login-dot" style={{ background: color, animationDelay: "0.2s" }} />
      <span className="login-dot" style={{ background: color, animationDelay: "0.4s" }} />
    </span>
  );
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [shake, setShake] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Forgot Password State
  const [isForgotPass, setIsForgotPass] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP + New Pass
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
   const [forgotMsg, setForgotMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
   const [resendCooldown, setResendCooldown] = useState(0);

   useEffect(() => {
     let timer: NodeJS.Timeout;
     if (resendCooldown > 0) {
       timer = setInterval(() => setResendCooldown(c => c - 1), 1000);
     }
     return () => clearInterval(timer);
   }, [resendCooldown]);

  useEffect(() => {
    document.title = "Login | KiwiQA";
    if (sessionStorage.getItem("access_token")) navigate("/dashboard", { replace: true });
  }, [navigate]);

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email address";
    if (!password) e.password = "Password is required";
    else if (password.length < 4) e.password = "Minimum 4 characters";
    return e;
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const clearFieldErr = (field: keyof FormErrors) =>
    setErrors(prev => ({ ...prev, [field]: undefined }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); triggerShake(); return; }

    setLoading(true);
    try {
      const data = await loginRequest(email, password);
      sessionStorage.setItem("access_token", data.access_token);
      navigate("/dashboard");
    } catch (err) {
      setErrors({ auth: err instanceof Error ? err.message : "Something went wrong" });
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setErrors({});
    try {
      const res = await fetch(`${API_BASE_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: credentialResponse.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Google authentication failed");

      sessionStorage.setItem("access_token", data.access_token);
      navigate("/dashboard");
    } catch (err) {
      setErrors({ auth: err instanceof Error ? err.message : "Google login failed" });
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg(null);
    if (!forgotEmail) { setForgotMsg({ type: "error", text: "Please enter your email." }); return; }

    setForgotLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      if (res.ok) {
        setForgotMsg({ type: "success", text: "OTP sent! Please check your email." });
        setForgotStep(2);
        setResendCooldown(30);
      } else {
        const data = await res.json();
        setForgotMsg({ type: "error", text: data.detail || "Failed to send OTP." });
      }
    } catch {
      setForgotMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg(null);
    if (!forgotOtp || !newPassword) {
      setForgotMsg({ type: "error", text: "Please fill all fields." });
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, otp: forgotOtp, new_password: newPassword }),
      });
      if (res.ok) {
        setForgotMsg({ type: "success", text: "Password reset successful! You can now log in." });
        setTimeout(() => {
          setIsForgotPass(false);
          setForgotMsg(null);
          setForgotStep(1);
          setForgotEmail("");
          setForgotOtp("");
          setNewPassword("");
        }, 2500);
      } else {
        const data = await res.json();
        setForgotMsg({ type: "error", text: data.detail || "Failed to reset password." });
      }
    } catch {
      setForgotMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setForgotLoading(false);
    }
  };

  const isBusy = loading;

  return (
    <div className="login-page">
      <style>{`
        :root {
          --ink:         #0f1923;
          --ink-2:       #334155;
          --ink-3:       #64748b;
          --line:        #e2e8f0;
          --bg:          #f8fafc;
          --white:       #ffffff;
          --teal:        #0f7173;
          --teal-light:  #e6f4f4;
          --teal-mid:    #9dd4d5;
          --danger:      #dc2626;
          --danger-bg:   #fef2f2;
          --danger-line: #fecaca;
          --font-serif:  'Inter', sans-serif;
          --font-sans:   'Inter', sans-serif;
          --radius:      10px;
          --transition:  0.2s cubic-bezier(0.4,0,0.2,1);
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .login-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 480px;
          font-family: var(--font-sans);
          background: var(--bg);
        }

        @media (max-width: 900px) {
          .login-page { grid-template-columns: 1fr; }
          .login-panel-left { display: none; }
        }

        /* Left decorative panel */
        .login-panel-left {
          background: var(--ink);
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px;
          overflow: hidden;
        }

        .login-panel-pattern {
          position: absolute; inset: 0;
          background-image:
            radial-gradient(circle at 20% 20%, rgba(15,113,115,0.25) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(15,113,115,0.12) 0%, transparent 45%);
          pointer-events: none;
        }

        .login-panel-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }

        .login-panel-brand {
          position: relative; z-index: 1;
          display: flex; align-items: center; gap: 10px;
        }

        .login-panel-brand-icon {
          width: 34px; height: 34px; border-radius: 8px;
          background: var(--teal);
          display: flex; align-items: center; justify-content: center; color: white;
        }

        .login-panel-brand-name {
          font-family: var(--font-serif);
          font-size: 17px; color: white; letter-spacing: -0.01em;
        }

        .login-panel-body { position: relative; z-index: 1; }

        .login-panel-heading {
          font-family: var(--font-serif);
          font-size: 36px; color: white;
          line-height: 1.2; letter-spacing: -0.02em; margin-bottom: 16px;
        }

        .login-panel-heading em { font-style: italic; color: var(--teal-mid); }

        .login-panel-desc {
          font-size: 14px; color: rgba(255,255,255,0.45);
          line-height: 1.7; max-width: 340px;
        }

        .login-panel-features {
          list-style: none; margin-top: 28px;
          display: flex; flex-direction: column; gap: 12px;
        }

        .login-panel-feature {
          display: flex; align-items: center; gap: 10px;
          font-size: 13px; color: rgba(255,255,255,0.6); font-weight: 500;
        }

        .login-panel-feature-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--teal-mid); flex-shrink: 0;
        }

        .login-panel-footer {
          position: relative; z-index: 1;
          font-size: 12px; color: rgba(255,255,255,0.2);
        }

        /* Right form panel */
        .login-panel-right {
          background: var(--white);
          border-left: 1px solid var(--line);
          display: flex; flex-direction: column;
          justify-content: center;
          padding: 48px 44px;
        }

        .login-form-wrap {
          animation: formIn 0.4s cubic-bezier(0.4,0,0.2,1);
          max-width: 380px; width: 100%; margin: 0 auto;
        }

        @keyframes formIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .login-shake { animation: shake 0.45s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes shake {
          10%, 90% { transform: translateX(-2px); }
          20%, 80% { transform: translateX(3px); }
          30%, 50%, 70% { transform: translateX(-5px); }
          40%, 60% { transform: translateX(5px); }
        }

        .login-logo-wrap { margin-bottom: 32px; }
        .login-logo { height: 54px; object-fit: contain; }

        .login-heading {
          font-family: var(--font-serif);
          font-size: 26px; color: var(--ink);
          letter-spacing: -0.02em; margin-bottom: 6px;
        }

        .login-subheading {
          font-size: 13.5px; color: var(--ink-3);
          line-height: 1.5; margin-bottom: 28px;
        }

        /* Error */
        .login-auth-error {
          display: flex; align-items: center; gap: 8px;
          padding: 11px 14px;
          background: var(--danger-bg); border: 1px solid var(--danger-line);
          border-radius: var(--radius);
          color: var(--danger); font-size: 13px; font-weight: 500;
          margin-bottom: 20px;
          animation: formIn 0.25s ease;
        }

        /* Fields */
        .login-field { margin-bottom: 18px; }

        .login-label {
          display: block; font-size: 12px; font-weight: 600;
          color: var(--ink-2); letter-spacing: 0.02em; margin-bottom: 7px;
        }

        .login-input-wrap { position: relative; display: flex; align-items: center; }

        .login-input-icon {
          position: absolute; left: 16px;
          color: var(--ink-3); pointer-events: none;
          display: flex; align-items: center;
          z-index: 10;
        }

        .login-input {
          width: 100%; height: 44px; 
          padding-left: 48px !important;
          padding-right: 48px !important;
          background: var(--bg); border: 1px solid var(--line);
          border-radius: var(--radius);
          color: var(--ink); font-family: var(--font-sans);
          font-size: 14px; font-weight: 500; outline: none;
          transition: border-color var(--transition), background var(--transition), box-shadow var(--transition);
        }

        .login-input:-webkit-autofill,
        .login-input:-webkit-autofill:hover,
        .login-input:-webkit-autofill:focus {
          -webkit-text-fill-color: var(--ink);
          -webkit-box-shadow: 0 0 0px 1000px var(--bg) inset;
          transition: background-color 5000s ease-in-out 0s;
        }

        .login-input::placeholder { color: #b0bec5; font-size: 13px; }

        .login-input:focus {
          background: var(--white); border-color: var(--teal);
          box-shadow: 0 0 0 3px rgba(15,113,115,0.12);
        }

        .login-input.has-error { border-color: var(--danger); background: var(--white); }
        .login-input.has-error:focus { box-shadow: 0 0 0 3px rgba(220,38,38,0.1); }

        .login-eye-btn {
          position: absolute; right: 12px;
          background: none; border: none; color: var(--ink-3);
          cursor: pointer; padding: 4px;
          display: flex; align-items: center;
          border-radius: 4px; outline: none;
          transition: color var(--transition);
        }
        .login-eye-btn:hover { color: var(--ink); }

        .login-field-error {
          display: flex; align-items: center; gap: 5px;
          font-size: 12px; color: var(--danger);
          margin-top: 6px; font-weight: 500;
        }

        /* Buttons */
        .login-btn-primary {
          width: 100%; height: 42px; margin-top: 6px;
          background: var(--teal); color: white;
          border: none; border-radius: var(--radius);
          font-family: var(--font-sans); font-size: 14px; font-weight: 600;
          cursor: pointer; outline: none;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background var(--transition), box-shadow var(--transition), transform var(--transition);
          box-shadow: 0 2px 8px rgba(15,113,115,0.25);
        }

        .login-btn-primary:hover:not(:disabled) {
          background: #0c5e60;
          box-shadow: 0 4px 16px rgba(15,113,115,0.35);
          transform: translateY(-1px);
        }

        .login-btn-primary:active:not(:disabled) { transform: translateY(0); }
        .login-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

        /* Loader dots */
        .login-dots { display: flex; align-items: center; gap: 4px; }

        .login-dot {
          width: 5px; height: 5px; border-radius: 50%;
          animation: dotBounce 1.2s infinite ease-in-out;
        }

        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }

        /* Footer */
        .login-form-footer {
          margin-top: 28px; font-size: 12px;
          color: var(--ink-3); text-align: center;
          border-top: 1px solid var(--line); padding-top: 20px;
        }

        .login-divider {
          display: flex; align-items: center; gap: 12px;
          margin: 24px 0;
        }
        .login-divider-line { flex: 1; height: 1px; background: var(--line); }
        .login-divider-text { font-size: 11px; font-weight: 700; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.05em; }

        .login-forgot-btn {
          background: none; border: none; color: var(--teal); font-size: 12px; font-weight: 600;
          cursor: pointer; transition: opacity 0.2s;
        }
        .login-forgot-btn:hover { text-decoration: underline; opacity: 0.8; }
        
        .login-google-wrap {
          display: flex; justify-content: center;
        }

        .login-notice {
          display: flex; gap: 12px; padding: 12px 14px; border-radius: var(--radius);
          font-size: 13px; line-height: 1.4; margin-bottom: 24px; animation: formIn 0.3s ease;
        }
        .login-notice.is-error { background: var(--danger-bg); border: 1px solid var(--danger-line); color: var(--danger); }
        .login-notice.is-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; }
        .login-notice-icon { flex-shrink: 0; display: flex; align-items: center; }
        .login-notice-text { font-weight: 500; }

        .login-form-tip { font-size: 13px; color: var(--ink-3); line-height: 1.5; margin-bottom: 20px; }
        .login-back-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;
          background: none; border: none; color: var(--ink-3); font-size: 13px; font-weight: 600;
          cursor: pointer; margin-top: 16px; transition: color 0.2s;
        }
        .login-back-btn:hover { color: var(--teal); }
        .login-form-tip-btn {
          background: none; border: none; color: var(--teal); font-size: 12px; font-weight: 600;
          cursor: pointer; transition: opacity 0.2s;
        }
        .login-form-tip-btn:hover:not(:disabled) { text-decoration: underline; opacity: 0.8; }
        .login-form-tip-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      {/* Left Panel */}
      <aside className="login-panel-left">
        <div className="login-panel-pattern" />
        <div className="login-panel-grid" />

        <div className="login-panel-brand">
          <div className="login-panel-brand-icon">
            <Icons.Shield />
          </div>
          <span className="login-panel-brand-name">KiwiQA</span>
        </div>

        <div className="login-panel-body">
          <h2 className="login-panel-heading">
            Intelligent<br />
            <em>Assessment</em><br />
            Infrastructure.
          </h2>
          <p className="login-panel-desc">
            A unified command centre for deploying, monitoring, and managing
            candidate assessments at scale.
          </p>
          <ul className="login-panel-features">
            {[
              "AI-generated exam deployment",
              "Real-time candidate monitoring",
              "Proctoring & security controls",
              "Automated lifecycle management",
            ].map(f => (
              <li key={f} className="login-panel-feature">
                <span className="login-panel-feature-dot" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="login-panel-footer">
          &copy; {new Date().getFullYear()} KiwiQA. All rights reserved.
        </div>
      </aside>

      {/* Right Panel â€” Form */}
      <main className="login-panel-right">
        <div ref={cardRef} className={`login-form-wrap${shake ? " login-shake" : ""}`}>

          <div className="login-logo-wrap">
            <img src={logo} alt="KiwiQA" className="login-logo" />
          </div>

          <h1 className="login-heading">{isForgotPass ? "Reset Password" : "Sign in"}</h1>
          <p className="login-subheading">
            {isForgotPass
              ? "Follow the steps to recover your account access."
              : "Access the KiwiQA assessment dashboard with your email or username."}
          </p>

          {isForgotPass ? (
            <div className="login-forgot-flow" style={{ animation: 'formIn 0.35s ease-out' }}>
              {forgotMsg && (
                <div className={`login-notice ${forgotMsg.type === 'success' ? 'is-success' : 'is-error'}`}>
                  <div className="login-notice-icon">
                    {forgotMsg.type === 'success' ? <Icons.Check /> : <Icons.Alert />}
                  </div>
                  <div className="login-notice-text">{forgotMsg.text}</div>
                </div>
              )}

              {forgotStep === 1 ? (
                <form onSubmit={handleForgotRequest} noValidate>
                  <p className="login-form-tip">We'll send a 6-digit verification code to your registered admin email.</p>
                  <div className="login-field">
                    <label className="login-label">Admin Email</label>
                    <div className="login-input-wrap">
                      <span className="login-input-icon"><Icons.Mail /></span>
                      <input
                        type="email"
                        className="login-input"
                        placeholder="Enter your registered email"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <button className="login-btn-primary" type="submit" disabled={forgotLoading}>
                    {forgotLoading ? <LoaderDots color="white" /> : "Send Verification Code"}
                  </button>
                  <button
                    type="button"
                    className="login-back-btn"
                    onClick={() => { setIsForgotPass(false); setForgotMsg(null); }}
                  >
                    <Icons.ChevronLeft size={14} /> Back to login
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetSubmit} noValidate>
                  <div className="login-field">
                    <label className="login-label">Verification Code (OTP)</label>
                    <div className="login-input-wrap">
                      <span className="login-input-icon"><Icons.Shield /></span>
                      <input
                        type="text"
                        className="login-input"
                        placeholder="6-digit code"
                        value={forgotOtp}
                        onChange={e => setForgotOtp(e.target.value)}
                        maxLength={6}
                        required
                      />
                    </div>
                  </div>
                  <div className="login-field">
                    <label className="login-label">New Secure Password</label>
                    <div className="login-input-wrap">
                      <span className="login-input-icon"><Icons.Lock /></span>
                      <input
                        type="password"
                        className="login-input"
                        placeholder="Min 6 characters"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <button className="login-btn-primary" type="submit" disabled={forgotLoading}>
                    {forgotLoading ? <LoaderDots color="white" /> : "Verify & Update Password"}
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                     <button
                       type="button"
                       className="login-form-tip-btn"
                       onClick={handleForgotRequest}
                       disabled={forgotLoading || resendCooldown > 0}
                     >
                       {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : "Resend Code"}
                     </button>
                    <button
                      type="button"
                      className="login-form-tip-btn"
                      onClick={() => { setForgotStep(1); setForgotMsg(null); }}
                    >
                      Try different email
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} noValidate>
                {/* Email */}
                <div className="login-field">
                  <label className="login-label" htmlFor="login-email">Email or Username</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon"><Icons.Mail /></span>
                    <input
                      id="login-email"
                      type="email"
                      className={`login-input${errors.email ? " has-error" : ""}`}
                      placeholder="admin@kiwiqa.com or 'admin'"
                      value={email}
                      autoComplete="email"
                      onChange={e => { setEmail(e.target.value); clearFieldErr("email"); }}
                    />
                  </div>
                  {errors.email && (
                    <div className="login-field-error"><Icons.Alert /> {errors.email}</div>
                  )}
                </div>

                {/* Password */}
                <div className="login-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                    <label className="login-label" htmlFor="login-password" style={{ marginBottom: 0 }}>Password</label>
                    <button
                      type="button"
                      className="login-forgot-btn"
                      onClick={() => { setIsForgotPass(true); setForgotStep(1); setForgotMsg(null); }}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="login-input-wrap">
                    <span className="login-input-icon"><Icons.Lock /></span>
                    <input
                      id="login-password"
                      type={showPass ? "text" : "password"}
                      className={`login-input${errors.password ? " has-error" : ""}`}
                      placeholder="••••••••"
                      value={password}
                      autoComplete="current-password"
                      onChange={e => { setPassword(e.target.value); clearFieldErr("password"); }}
                    />
                    <button
                      type="button"
                      className="login-eye-btn"
                      onClick={() => setShowPass(v => !v)}
                      aria-label={showPass ? "Hide password" : "Show password"}
                    >
                      {showPass ? <Icons.EyeOff /> : <Icons.Eye />}
                    </button>
                  </div>
                  {errors.password && (
                    <div className="login-field-error"><Icons.Alert /> {errors.password}</div>
                  )}
                </div>

                <button className="login-btn-primary" type="submit" disabled={isBusy}>
                  {loading ? <LoaderDots color="white" /> : "Sign in to Dashboard"}
                </button>
              </form>

              <div className="login-divider">
                <div className="login-divider-line"></div>
                <div className="login-divider-text">or continue with</div>
                <div className="login-divider-line"></div>
              </div>

              <div className="login-google-wrap">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setErrors({ auth: "Google Login failed. Please try again." })}
                  useOneTap
                  theme="outline"
                  shape="rectangular"
                  width="380"
                />
              </div>
            </>
          )}

          <div className="login-form-footer">
            <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--teal)', display: 'flex', alignItems: 'center' }}><Icons.Help /></span>
              <a
                href="/Userguide.html"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 600, fontSize: '13px' }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
              >
                View User Guide
              </a>
            </div>
            Secure access · Enterprise grade · Powered by KiwiQA
          </div>
        </div>
      </main>
    </div>
  );
}