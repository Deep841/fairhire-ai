import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, ArrowRight, UserCircle, Briefcase, Loader2, RefreshCw, FileStack } from "lucide-react";
import { applicationService, type ApplicationRecord } from "../services/api";
import { useJobs } from "../context/JobContext";
import { getApiErrorMessage } from "../utils/apiError";
import Layout from "../components/Layout";

function scoreColor(s: number) {
  if (s >= 80) return "text-green-700 bg-green-50 border-green-200";
  if (s >= 60) return "text-blue-700 bg-blue-50 border-blue-200";
  if (s >= 40) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function stageBadge(stage: string) {
  const map: Record<string, string> = {
    applied:     "bg-slate-100 text-slate-700",
    shortlisted: "bg-cyan-100 text-cyan-800",
    test_sent:   "bg-sky-100 text-sky-800",
    tested:      "bg-blue-100 text-blue-800",
    interview_1: "bg-amber-100 text-amber-800",
    interview_2: "bg-purple-100 text-purple-800",
    offered:     "bg-green-100 text-green-800",
    rejected:    "bg-red-100 text-red-700",
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

export default function Candidates() {
  const { activeJob } = useJobs();
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeJob) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await applicationService.list(activeJob.id);
      setApplications(data);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load candidates"));
    } finally {
      setLoading(false);
    }
  }, [activeJob]);

  useEffect(() => { load(); }, [load]);

  if (!activeJob) {
    return (
      <Layout>
        <div className="max-w-md mx-auto mt-16">
          <div className="glass rounded-2xl p-10 text-center">
            <Briefcase className="h-10 w-10 text-slate-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white">No active job</h1>
            <p className="mt-2 text-sm text-slate-400">Select a job from the sidebar to view its candidates.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const sorted = [...applications].sort((a, b) =>
    (b.final_score ?? b.resume_score ?? 0) - (a.final_score ?? a.resume_score ?? 0)
  );

  return (
    <Layout>
      <div className="space-y-6">

        {/* Page header */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500/20 rounded-xl p-3 flex-shrink-0">
                <Users className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Candidates</h1>
                <p className="mt-1 text-sm text-slate-400">
                  {activeJob.title} · {sorted.length} applicants · sorted by AI score
                </p>
              </div>
            </div>
            <button onClick={load} disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {error && <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-sm text-red-300">{error}</div>}

        {loading && applications.length === 0 ? (
          <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 text-emerald-400 animate-spin" /></div>
        ) : applications.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Users className="h-10 w-10 text-slate-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-white">No candidates yet</h2>
            <p className="mt-2 text-sm text-slate-400">Upload resumes to start scoring candidates for <strong className="text-white">{activeJob.title}</strong>.</p>
            <Link to="/process-resumes"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
              <FileStack className="h-4 w-4" /> Upload Resumes <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10">
                <thead style={{ background: "rgba(255,255,255,0.05)" }}>
                  <tr>
                    {["Candidate", "Stage", "Resume", "Test", "Interview", "Final Score", "Matched Skills"].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sorted.map((app, i) => {
                    const finalScore = app.final_score ?? app.resume_score;
                    return (
                      <tr key={app.id} className={`hover:bg-white/5 transition-colors ${i % 2 === 1 ? "bg-white/[0.02]" : ""}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <UserCircle className="h-8 w-8 text-slate-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <Link to={`/candidates/${app.candidate_id}`}
                                className="text-sm font-semibold text-emerald-400 hover:underline truncate block">
                                {app.candidate_name}
                              </Link>
                              <p className="text-xs text-slate-500 truncate">{app.candidate_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stageBadge(app.stage)}`}>
                            {stageLabel(app.stage)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {app.resume_score !== null
                            ? <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${scoreColor(app.resume_score)}`}>{app.resume_score.toFixed(0)}%</span>
                            : <span className="text-xs text-slate-500">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {app.test_score !== null
                            ? <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${scoreColor(app.test_score)}`}>{app.test_score.toFixed(0)}%</span>
                            : <span className="text-xs text-slate-500">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(app.interview_score !== null || app.hr_interview_score !== null) ? (
                            <div className="flex gap-1">
                              {app.interview_score !== null && (
                                <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${scoreColor(app.interview_score)}`}>R1: {app.interview_score.toFixed(0)}%</span>
                              )}
                              {app.hr_interview_score !== null && (
                                <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${scoreColor(app.hr_interview_score)}`}>R2: {app.hr_interview_score.toFixed(0)}%</span>
                              )}
                            </div>
                          ) : <span className="text-xs text-slate-500">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {finalScore !== null
                            ? <span className={`text-sm font-bold px-3 py-1.5 rounded-xl border ${scoreColor(finalScore)}`}>{finalScore.toFixed(0)}%</span>
                            : <span className="text-xs text-slate-500">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {app.matched_skills.slice(0, 4).map((s) => (
                              <span key={s} className="px-1.5 py-0.5 rounded text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">{s}</span>
                            ))}
                            {app.matched_skills.length > 4 && (
                              <span className="text-xs text-slate-500">+{app.matched_skills.length - 4}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
