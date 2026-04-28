import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import ProcessResumes from "./pages/ProcessResumes";
import Candidates from "./pages/Candidates";
import Jobs from "./pages/Jobs";
import Interviews from "./pages/Interviews";
import Pipeline from "./pages/Pipeline";
import CandidateProfile from "./pages/CandidateProfile";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import Layout from "./components/Layout";
import { PipelineProvider } from "./context/PipelineContext";
import { JobProvider } from "./context/JobContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import RecruiterChat from "./components/RecruiterChat";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function RedirectIfAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  return (
    <>
      <Routes>
        {/* Public */}
        <Route path="/" element={<RedirectIfAuth><Landing /></RedirectIfAuth>} />
        <Route path="/login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />

        {/* Protected */}
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/process-resumes" element={<RequireAuth><ProcessResumes /></RequireAuth>} />
        <Route path="/pipeline" element={<RequireAuth><Pipeline /></RequireAuth>} />
        <Route path="/candidates" element={<RequireAuth><Candidates /></RequireAuth>} />
        <Route path="/candidates/:candidateId" element={<RequireAuth><CandidateProfile /></RequireAuth>} />
        <Route path="/jobs" element={<RequireAuth><Layout><Jobs /></Layout></RequireAuth>} />
        <Route path="/interviews" element={<RequireAuth><Interviews /></RequireAuth>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {isAuthenticated && <RecruiterChat />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <JobProvider>
          <PipelineProvider>
            <AppRoutes />
          </PipelineProvider>
        </JobProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
