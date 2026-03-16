import { useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load pages for faster initial load
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const ManageExams = lazy(() => import('./pages/ManageExams'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CreateExam = lazy(() => import('./pages/CreateExam'));
const TakeTest = lazy(() => import('./pages/TakeTest'));
const EnrollCandidate = lazy(() => import('./pages/EnrollCandidate'));
const ManageCandidates = lazy(() => import('./pages/ManageCandidates'));
const CandidateResults = lazy(() => import('./pages/CandidateResults'));
const Settings = lazy(() => import('./pages/Settings'));

// Loading fallback
const PageLoading = () => (
  <div style={{ 
    display: 'flex', justifyContent: 'center', alignItems: 'center', 
    height: '100vh', background: 'var(--bg-neutral)', color: 'var(--primary)',
    fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '20px'
  }}>
    <div className="loader">KiwiQA...</div>
  </div>
);

function App() {
  useEffect(() => {
    const saved = localStorage.getItem("kiwi-theme") || "default";
    if (saved === "default") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  return (
    <HashRouter>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<AdminLogin />} />

          {/* Candidate Testing Flow (Publicly Accessible via URL) */}
          <Route path="/test/:token" element={<TakeTest />} />
          <Route path="/enroll/:examId" element={<EnrollCandidate />} />

          {/* Protected Administrative Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<AdminDashboard />} />
            <Route path="/create-exam" element={<CreateExam />} />
            <Route path="/manage-exams" element={<ManageExams />} />
            <Route path="/manage-candidates" element={<ManageCandidates />} />
            <Route path="/candidate-results" element={<CandidateResults />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Redirect any unknown route back to login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}

export default App;
