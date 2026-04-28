import { type ReactNode, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sparkles, Users, Briefcase, Calendar, LayoutDashboard,
  FileStack, ChevronDown, Loader2, GitBranch, LogOut,
  ChevronRight, Menu, X,
} from "lucide-react";
import { useJobs } from "../context/JobContext";
import { usePipeline } from "../context/PipelineContext";
import { useAuth } from "../context/AuthContext";

interface LayoutProps { children: ReactNode; }

const NAV_ITEMS = [
  { path: "/dashboard",        icon: LayoutDashboard, label: "Dashboard",       desc: "Live hiring overview"   },
  { path: "/jobs",            icon: Briefcase,       label: "Jobs",            desc: "Manage requisitions"   },
  { path: "/process-resumes", icon: FileStack,       label: "Upload Resumes",  desc: "Parse & score CVs"     },
  { path: "/pipeline",        icon: GitBranch,       label: "Pipeline",        desc: "Kanban hiring board"   },
  { path: "/candidates",      icon: Users,           label: "Candidates",      desc: "All applicants"        },
  { path: "/interviews",      icon: Calendar,        label: "Interviews",      desc: "Scheduled sessions"    },
];

function JobSwitcher({ collapsed }: { collapsed: boolean }) {
  const { jobs, activeJob, setActiveJobId, loading } = useJobs();
  const { setActiveJobId: setPipelineJobId } = usePipeline();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleSelect = (id: string) => {
    setActiveJobId(id);
    setPipelineJobId(id);
    setOpen(false);
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="mx-3 px-3 py-2 rounded-xl bg-slate-100 flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
        {!collapsed && <span>Loading jobs…</span>}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <Link
        to="/jobs"
        className="mx-3 px-3 py-2.5 rounded-xl border-2 border-dashed border-blue-200 flex items-center gap-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
      >
        <Briefcase className="h-4 w-4 flex-shrink-0" />
        {!collapsed && <span>Create first job</span>}
      </Link>
    );
  }

  return (
    <div className="relative mx-3" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-2 text-sm font-medium text-blue-900 hover:bg-blue-100 transition-colors"
        title={activeJob?.title ?? "Select job"}
      >
        <div className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Briefcase className="h-3.5 w-3.5 text-white" />
        </div>
        {!collapsed && (
          <>
            <span className="truncate flex-1 text-left text-xs font-semibold">
              {activeJob?.title ?? "Select a job"}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-blue-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-50 py-1 max-h-64 overflow-y-auto">
          <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Active job</p>
          {jobs.map((job) => (
            <button
              key={job.id}
              type="button"
              onClick={() => handleSelect(job.id)}
              className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                job.id === activeJob?.id
                  ? "bg-blue-50 text-blue-900 font-semibold"
                  : "text-gray-700 hover:bg-slate-50"
              }`}
            >
              {job.id === activeJob?.id
                ? <div className="h-1.5 w-1.5 rounded-full bg-blue-600 flex-shrink-0 ml-0.5" />
                : <div className="h-1.5 w-1.5 rounded-full bg-gray-200 flex-shrink-0 ml-0.5" />
              }
              <span className="truncate">{job.title}</span>
            </button>
          ))}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <Link
              to="/jobs"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-blue-600 font-semibold hover:bg-blue-50 transition-colors"
            >
              <span className="text-lg leading-none">+</span> New requisition
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "HR";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 h-16 border-b border-white/10 flex-shrink-0 ${collapsed ? "justify-center" : ""}`}>
        <div className="bg-emerald-500 rounded-xl p-1.5 flex-shrink-0">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-base font-bold text-white tracking-tight">FairHire AI</span>
        )}
      </div>

      {/* Job switcher */}
      <div className="py-3 border-b border-white/10 flex-shrink-0">
        {!collapsed && (
          <p className="px-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Job</p>
        )}
        <JobSwitcher collapsed={collapsed} />
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
        {!collapsed && (
          <p className="px-2 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Navigation</p>
        )}
        {NAV_ITEMS.map(({ path, icon: Icon, label, desc }) => {
          const active = location.pathname === path || (path !== "/dashboard" && location.pathname.startsWith(path));
          return (
            <Link
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                active
                  ? "bg-emerald-500/80 text-white shadow-glow-sm"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className={`h-4.5 w-4.5 flex-shrink-0 ${active ? "text-white" : "text-slate-400 group-hover:text-white"}`} style={{ height: "1.125rem", width: "1.125rem" }} />
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm leading-tight ${active ? "text-white" : ""}`}>{label}</div>
                  <div className={`text-xs leading-tight mt-0.5 ${active ? "text-indigo-100" : "text-slate-500"}`}>{desc}</div>
                </div>
              )}
              {!collapsed && active && <ChevronRight className="h-3.5 w-3.5 text-emerald-200 flex-shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="border-t border-white/10 p-3 flex-shrink-0">
        <div className={`flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/10 transition-colors ${collapsed ? "justify-center" : ""}`}>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.full_name ?? "HR User"}</p>
              <p className="text-xs text-slate-400 truncate capitalize">{user?.role ?? "recruiter"}</p>
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/20 transition-colors flex-shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            className="w-full mt-1 p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/20 transition-colors flex justify-center"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col glass-panel flex-shrink-0 transition-all duration-200 ${
          collapsed ? "w-16" : "w-60"
        }`}
        style={{ position: "sticky", top: 0, height: "100vh" }}
      >
        <SidebarContent />
        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-20 bg-white border border-slate-200 rounded-full p-1 shadow-card text-slate-500 hover:text-emerald-600 transition-colors z-10"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${collapsed ? "" : "rotate-180"}`} />
        </button>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 glass border-b border-white/10 h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="p-2 rounded-lg text-slate-400 hover:bg-white/10 mr-1"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="bg-emerald-500 rounded-lg p-1">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-white">FairHire AI</span>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-30 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed top-0 left-0 bottom-0 z-40 w-72 glass-panel shadow-xl flex flex-col">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 mt-14 lg:mt-0">
          <div className="page-content">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
