import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import ManageExams from './pages/ManageExams';
import AdminDashboard from './pages/AdminDashboard';
import CreateExam from './pages/CreateExam';
import TakeTest from './pages/TakeTest';
import EnrollCandidate from './pages/EnrollCandidate';
import ManageCandidates from './pages/ManageCandidates';
import CandidateResults from './pages/CandidateResults';
import Settings from './pages/Settings';
import ProtectedRoute from './components/ProtectedRoute';

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
    </HashRouter>
  );
}

export default App;
