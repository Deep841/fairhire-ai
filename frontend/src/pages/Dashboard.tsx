import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, Briefcase, Calendar, TrendingUp, ArrowRight,
  RefreshCw, Loader2, UserCircle, CheckCircle2, Clock,
  FileStack, Award,
} from "lucide-react";
import Layout from "../components/Layout";
import WelcomeBanner from "../components/WelcomeBanner";
import { applicationService, interviewService, type ApplicationRecord, type InterviewRecord } from "../services/api";
import { useJobs } from "../context/JobContext";
import { getApiErrorMessage } from "../utils/apiError";

function scoreColor(s: number) {
  if (s >= 80) return "text-green-700 bg-green-50 border-green-200";
  if (s >= 60) return "text-blue-700 bg-blue-50 border-blue-200";
  if (s >= 40) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function stageBadge(stage: string) {
  const map: Record<string, string> = {
    applied: "bg-slate-100 text-slate-700",
    shortlisted: "bg-cyan-100 text-cyan-800",
    test_sent: "bg-sky-100 text-sky-800",
    tested: "bg-blue-100 text-blue-800",
    interview_1: "bg-amber-100 text-amber-800",
    interview_2: "bg-purple-100 text-purple-800",
    offered: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-700",
  };
  return map[stage] ?? "bg-gray-100 text-gray-700";
}

function stageLabel(stage: string) {
  const map: Record<string, string> = {
    applied: "Applied", shortlisted: "Shortlisted", test_sent: "Test Sent", tested: "Assessment",
    interview_1: "Round 1", interview_2: "Round 2", offered: "Offered", rejected: "Rejected",
  };
  return map[stage] ?? stage;
}

interface MetricCardProps { label: string; value: number | string; icon: React.ReactNode; color: string; }
function MetricCard({ label, value, icon, color }: MetricCardProps) {
  return (
    <div className="glass glass-hover rounded-2xl shadow-card p-5 flex items-center gap-4 transition-all">
      <div className={`rounded-xl p-3 flex-shrink-0 ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs font-medium text-slate-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { activeJob, jobs } = useJobs();
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeJob) return;
    setLoading(true);
    setError(null);
    try {
      const [{ data: apps }, { data: ivs }] = await Promise.all([
        applicationService.list(activeJob.id),
        interviewService.list(activeJob.id),
      ]);
      setApplications(apps);
      setInterviews(ivs);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load dashboard"));
    } finally {
      setLoading(false);
    }
  }, [activeJob]);

  useEffect(() => { load(); }, [load]);

  // No job created yet
  if (jobs.length === 0) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto mt-16 text-center">
          <div className="glass glass-hover rounded-2xl shadow-card p-10 text-center">
            <div className="bg-indigo-500/20 rounded-2xl p-4 inline-flex mb-5">
              <Briefcase className="h-10 w-10 text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Welcome to FairHire AI</h1>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Start by creating a job requisition. Then upload resumes and let AI rank your candidates automatically.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link to="/jobs" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
                Create your first job <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Job exists but none active
  if (!activeJob) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto mt-16 text-center">
          <div className="glass glass-hover rounded-2xl shadow-card p-10 text-center">
            <Briefcase className="h-10 w-10 text-slate-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white">Select a job</h1>
            <p className="mt-2 text-sm text-slate-400">Use the job switcher in the sidebar to select an active job.</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Metrics
  const active = applications.filter((a) => a.status !== "rejected");
  const avgScore = active.length > 0
    ? Math.round(active.reduce((s, a) => s + (a.final_score ?? a.resume_score ?? 0), 0) / active.length)
    : 0;
  const topScore = active.length > 0
    ? Math.round(Math.max(...active.map((a) => a.final_score ?? a.resume_score ?? 0)))
    : 0;
  const interviewReady = applications.filter((a) => (a.final_score ?? a.resume_score ?? 0) >= 70 && a.status !== "rejected").length;
  const upcomingInterviews = interviews.filter((i) => i.status === "scheduled").length;

  // Top 5 candidates by score
  const topCandidates = [...applications]
    .filter((a) => a.status !== "rejected")
    .sort((a, b) => (b.final_score ?? b.resume_score ?? 0) - (a.final_score ?? a.resume_score ?? 0))
    .slice(0, 5);

  // Stage funnel counts
  const stageCounts = ["applied", "shortlisted", "test_sent", "tested", "interview_1", "interview_2", "offered"].map((s) => ({
    stage: s,
    count: applications.filter((a) => a.stage === s).length,
  }));

  // Upcoming interviews
  const upcoming = interviews.filter((i) => i.status === "scheduled").slice(0, 3);

  return (
    <Layout>
      <div className="space-y-6">
        <WelcomeBanner />

        {/* Page header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                <Briefcase className="h-3 w-3" />{activeJob.title}
              </span>
              <span className="text-xs text-gray-400">{applications.length} total applicants</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/process-resumes"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50">
              <FileStack className="h-4 w-4" /> Upload Resumes
            </Link>
            <button onClick={load} disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>}

        {loading && applications.length === 0 ? (
          <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 text-blue-600 animate-spin" /></div>
        ) : applications.length === 0 ? (
          <div className="glass glass-hover rounded-2xl shadow-card p-12 text-center">
            <FileStack className="h-10 w-10 text-slate-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-white">No applications yet</h2>
            <p className="mt-2 text-sm text-slate-400">Upload resumes to start scoring and ranking candidates.</p>
            <Link to="/process-resumes"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
              Upload Resumes <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Total Applicants" value={applications.length} color="bg-blue-50" icon={<Users className="h-6 w-6 text-blue-600" />} />
              <MetricCard label="Avg Resume Score" value={`${avgScore}%`} color="bg-indigo-50" icon={<TrendingUp className="h-6 w-6 text-indigo-600" />} />
              <MetricCard label="Interview Ready (≥70%)" value={interviewReady} color="bg-green-50" icon={<Award className="h-6 w-6 text-green-600" />} />
              <MetricCard label="Upcoming Interviews" value={upcomingInterviews} color="bg-amber-50" icon={<Calendar className="h-6 w-6 text-amber-600" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Top Candidates */}
              <div className="lg:col-span-2 glass rounded-2xl shadow-card overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white">Top Candidates</h2>
                  <Link to="/pipeline" className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1">
                    View all <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <ul className="divide-y divide-white/5">
                  {topCandidates.map((app, i) => {
                    const score = app.final_score ?? app.resume_score ?? 0;
                    return (
                      <li key={app.id} className="px-6 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                        <span className="text-xs font-bold text-slate-500 w-4 flex-shrink-0">#{i + 1}</span>
                        <UserCircle className="h-8 w-8 text-slate-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <Link to={`/candidates/${app.candidate_id}`}
                            className="text-sm font-semibold text-emerald-400 hover:underline truncate block">
                            {app.candidate_name}
                          </Link>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageBadge(app.stage)}`}>
                              {stageLabel(app.stage)}
                            </span>
                            {app.matched_skills.slice(0, 2).map((s) => (
                              <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">{s}</span>
                            ))}
                          </div>
                        </div>
                        <span className={`text-sm font-bold px-3 py-1.5 rounded-xl border flex-shrink-0 ${scoreColor(score)}`}>
                          {score.toFixed(0)}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Right column */}
              <div className="space-y-6">

                {/* Pipeline Funnel */}
                <div className="glass rounded-2xl shadow-card overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white">Pipeline Funnel</h2>
                    <Link to="/pipeline" className="text-xs font-semibold text-emerald-400 hover:underline">Open →</Link>
                  </div>
                  <div className="p-4 space-y-2">
                    {stageCounts.map(({ stage, count }) => (
                      <div key={stage} className="flex items-center gap-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-24 text-center flex-shrink-0 ${stageBadge(stage)}`}>
                          {stageLabel(stage)}
                        </span>
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: applications.length > 0 ? `${(count / applications.length) * 100}%` : "0%" }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-400 w-4 text-right flex-shrink-0">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upcoming Interviews */}
                <div className="glass rounded-2xl shadow-card overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white">Upcoming Interviews</h2>
                    <Link to="/interviews" className="text-xs font-semibold text-emerald-400 hover:underline">View all →</Link>
                  </div>
                  {upcoming.length === 0 ? (
                    <div className="p-6 text-center">
                      <Clock className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">No upcoming interviews</p>
                      <Link to="/pipeline" className="mt-2 text-xs font-semibold text-emerald-400 hover:underline block">
                        Schedule from Pipeline →
                      </Link>
                    </div>
                  ) : (
                    <ul className="divide-y divide-white/5">
                      {upcoming.map((iv) => (
                        <li key={iv.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors">
                          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${iv.round_number === 1 ? "bg-amber-400" : "bg-purple-400"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-200">Round {iv.round_number}</p>
                            <p className="text-xs text-slate-500">
                              {iv.scheduled_at ? new Date(iv.scheduled_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—"}
                            </p>
                          </div>
                          <CheckCircle2 className="h-4 w-4 text-blue-400 flex-shrink-0" />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

              </div>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { to: "/process-resumes", icon: <FileStack className="h-5 w-5 text-blue-600" />, label: "Upload More Resumes", desc: "Add candidates to this job", bg: "bg-blue-50" },
                { to: "/pipeline", icon: <Users className="h-5 w-5 text-purple-600" />, label: "Manage Pipeline", desc: "Shortlist, test, interview", bg: "bg-purple-50" },
                { to: "/interviews", icon: <Calendar className="h-5 w-5 text-amber-600" />, label: "View Interviews", desc: "Scheduled & completed", bg: "bg-amber-50" },
              ].map(({ to, icon, label, desc, bg }) => (
                <Link key={to} to={to}
                  className="glass glass-hover rounded-2xl shadow-card p-5 flex items-center gap-4 transition-all group">
                  <div className={`rounded-xl p-3 flex-shrink-0 ${bg}`}>{icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-slate-300 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
