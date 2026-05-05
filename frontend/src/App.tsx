import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Dashboard from "./pages/Dashboard";
import ProcessResumes from "./pages/ProcessResumes";
import Candidates from "./pages/Candidates";
import Jobs from "./pages/Jobs";
import Interviews from "./pages/Interviews";
import Pipeline from "./pages/Pipeline";
import CandidateProfile from "./pages/CandidateProfile";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import { PipelineProvider } from "./context/PipelineContext";
import { JobProvider } from "./context/JobContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import RecruiterChat from "./components/RecruiterChat";
import FadeIn from "./components/FadeIn";

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
  const location = useLocation();
  return (
    <>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public */}
          <Route path="/" element={<RedirectIfAuth><FadeIn><Landing /></FadeIn></RedirectIfAuth>} />
          <Route path="/login" element={<RedirectIfAuth><FadeIn><Login /></FadeIn></RedirectIfAuth>} />

          {/* Protected */}
          <Route path="/dashboard" element={<RequireAuth><FadeIn><Dashboard /></FadeIn></RequireAuth>} />
          <Route path="/process-resumes" element={<RequireAuth><FadeIn><ProcessResumes /></FadeIn></RequireAuth>} />
          <Route path="/pipeline" element={<RequireAuth><FadeIn><Pipeline /></FadeIn></RequireAuth>} />
          <Route path="/candidates" element={<RequireAuth><FadeIn><Candidates /></FadeIn></RequireAuth>} />
          <Route path="/candidates/:candidateId" element={<RequireAuth><FadeIn><CandidateProfile /></FadeIn></RequireAuth>} />
          <Route path="/jobs" element={<RequireAuth><FadeIn><Jobs /></FadeIn></RequireAuth>} />
          <Route path="/interviews" element={<RequireAuth><FadeIn><Interviews /></FadeIn></RequireAuth>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
      {isAuthenticated && <RecruiterChat />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <JobProvider>
          <PipelineProvider>
            <div className="relative z-10">
              <AppRoutes />
            </div>
          </PipelineProvider>
        </JobProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
