import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../utils/apiError";

const FEATURES = [
  { text: "AI resume scoring in seconds"        },
  { text: "Bias-free, structured shortlisting"  },
  { text: "Smart interview scheduling & scoring" },
];

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? "/";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchMode = (next: "login" | "register") => {
    setMode(next);
    setError(null);
    setEmail("");
    setPassword("");
    setFullName("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        if (!fullName.trim()) { setError("Full name is required"); setLoading(false); return; }
        if (password.length < 8) { setError("Password must be at least 8 characters"); setLoading(false); return; }
        await register(email, password, fullName);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, mode === "login" ? "Invalid email or password" : "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12" style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(24px)' }}>
        <div>
          <div className="flex items-center gap-3 mb-16">
            <span className="text-2xl font-bold tracking-tight text-slate-800">QuantumLogic Labs</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4 text-slate-800">
            Hire smarter,<br />not harder.
          </h1>
          <p className="text-slate-500 text-lg leading-relaxed">
            From job posting to offer letter, all in one place.
          </p>
          <div className="mt-10 space-y-4">
            {FEATURES.map(({ text }) => (
              <div key={text} className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <span className="text-slate-600 text-base">{text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-slate-400 text-xs">© {new Date().getFullYear()} QuantumLogic Labs. Built for modern HR teams.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <span className="text-xl font-bold text-slate-800">QuantumLogic Labs</span>
          </div>

          {/* Mode toggle */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {mode === "login" ? (
                  <>No account?{" "}
                    <button type="button" onClick={() => switchMode("register")} className="text-slate-700 font-semibold hover:underline">Sign up</button>
                  </>
                ) : (
                  <>Already have one?{" "}
                    <button type="button" onClick={() => switchMode("login")} className="text-slate-700 font-semibold hover:underline">Sign in</button>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="glass rounded-2xl shadow-card p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">Full name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Smith"
                    autoComplete="name"
                    className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] text-sm text-slate-800 bg-white/70 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400"
                    disabled={loading}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Work email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] text-sm text-slate-800 bg-white/70 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400"
                  disabled={loading}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-slate-600">Password</label>
                  {mode === "register" && (
                    <span className="text-xs text-slate-400">Min. 8 characters</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="w-full px-4 py-2.5 pr-11 rounded-xl border border-black/[0.08] text-sm text-slate-800 bg-white/70 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">⚠</span>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-glass-dark w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />{mode === "login" ? "Signing in…" : "Creating account…"}</>
                ) : (
                  mode === "login" ? "Sign in to workspace" : "Create my account"
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            By continuing, you agree to QuantumLogic Labs' terms of service.
          </p>
        </div>
      </div>
    </div>
  );
}
