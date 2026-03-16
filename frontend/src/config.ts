// Central API base URL
// In development: http://localhost:8000
// In production: your Render backend URL (set VITE_API_URL in env)
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const API_BASE_URL = (import.meta.env.VITE_API_URL || (isLocal ? "http://127.0.0.1:8000" : "https://kiwiqa-api.onrender.com")).trim();

export const GOOGLE_CLIENT_ID = "1073889546720-5mv1ceve4mffacc8eb94jtktg4rrtpsl.apps.googleusercontent.com";

export default API_BASE_URL;
