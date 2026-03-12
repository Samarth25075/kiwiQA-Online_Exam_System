// Central API base URL
// In development: http://localhost:8000
// In production: your Render backend URL (set VITE_API_URL in env)
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default API_BASE_URL;
