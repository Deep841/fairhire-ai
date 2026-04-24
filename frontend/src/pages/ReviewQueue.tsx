import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2, XCircle, ChevronLeft, ChevronRight,
  UserCircle, Mail,
  Zap, BookOpen, Award, Clock, ExternalLink, ClipboardList,
} from "lucide-react";
import { usePipeline, getWorkflowStatus } from "../context/PipelineContext";
import type { LeaderboardCandidate } from "../services/api";
import type { PipelineWorkflowStatus } from "../types/workflow";

// ── helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return "text-green-700 bg-green-50 border-green-200";
  if (score >= 60) return "text-blue-700 bg-blue-50 border-blue-200";
  if (score >= 40) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function tierLabel(rec: string) {
  const map: Record<string, string> = {
    interview: "Interview Ready",
    shortlisted: "Shortlisted",
    consider: "Consider",
    reject: "Reject",
  };
  return map[rec] ?? rec;
}

function tierColor(rec: string) {
  if (rec === "interview") return "bg-green-100 text-green-800 border-green-200";
  if (rec === "shortlisted") return "bg-amber-50 text-amber-800 border-amber-200";
  if (rec === "consider") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}

// platform icon helper reserved for verified_links integration
// function platformIcon(url: string) { ... }

function statusBadge(status: PipelineWorkflowStatus) {
  const map: Record<PipelineWorkflowStatus, { label: string; cls: string }> = {
    matched: { label: "Matched", cls: "bg-slate-100 text-slate-700 border-slate-200" },
    shortlisted: { label: "Shortlisted", cls: "bg-amber-50 text-amber-800 border-amber-200" },
    interview_scheduled: { label: "Interview Scheduled", cls: "bg-green-100 text-green-800 border-green-200" },
  };
  const { label, cls } = map[status] ?? map.matched;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {label}
    </span>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function ReviewQueue() {
  const { session, updateWorkflowStatus, scheduleInterview } = usePipeline();
  const [index, setIndex] = useState(0);
  const [actionDone, setActionDone] = useState<Record<string, "advanced" | "rejected">>({});

  const sorted: LeaderboardCandidate[] = session
    ? [...session.leaderboard].sort((a, b) => b.fitScore - a.fitScore)
    : [];

  // skip already-actioned candidates
  const queue = sorted.filter((c) => !actionDone[c.id]);

  useEffect(() => {
    if (index >= queue.length && queue.length > 0) setIndex(queue.length - 1);
  }, [queue.length, index]);

  if (!session || sorted.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="inline-flex bg-blue-50 rounded-xl p-4 mb-6">
            <ClipboardList className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
          <p className="mt-3 text-gray-600">
            No candidates to review. Run{" "}
            <strong className="text-gray-800">Process Resumes</strong> first.
          </p>
          <Link
            to="/process-resumes"
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            Process Resumes
          </Link>
        </div>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-10 max-w-md w-full text-center">
          <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">All done!</h1>
          <p className="mt-3 text-gray-600">
            You have reviewed all {sorted.length} candidates.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link to="/" className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
              Dashboard
            </Link>
            <Link to="/interviews" className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Interviews
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const candidate = queue[index];
  const profile = session.candidates.find((c) => c.candidate_id === candidate.id);
  const wfStatus = getWorkflowStatus(session, candidate.id);

  const handleAdvance = () => {
    // Move to interview_scheduled
    scheduleInterview(candidate.id, {
      scheduledDate: "",
      scheduledTime: "",
      format: "video",
      notes: "Advanced from review queue",
    });
    updateWorkflowStatus(candidate.id, "interview_scheduled");
    setActionDone((prev) => ({ ...prev, [candidate.id]: "advanced" }));
    if (index >= queue.length - 1) setIndex(Math.max(0, queue.length - 2));
  };

  const handleReject = () => {
    updateWorkflowStatus(candidate.id, "matched"); // stays at matched = not progressed
    setActionDone((prev) => ({ ...prev, [candidate.id]: "rejected" }));
    if (index >= queue.length - 1) setIndex(Math.max(0, queue.length - 2));
  };

  const reviewed = Object.keys(actionDone).length;
  const total = sorted.length;
  const progress = Math.round((reviewed / total) * 100);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-gray-400 hover:text-gray-600">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <span className="text-sm font-semibold text-gray-900">Review Queue</span>
            <span className="text-xs text-gray-500">
              {reviewed}/{total} reviewed
            </span>
          </div>
          {/* Progress bar */}
          <div className="flex-1 max-w-xs">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-semibold text-gray-500">{progress}%</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span className="text-sm text-gray-500">
            {index + 1} of {queue.length} remaining
          </span>
          <button
            onClick={() => setIndex((i) => Math.min(queue.length - 1, i + 1))}
            disabled={index >= queue.length - 1}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Candidate card */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">

          {/* Header */}
          <div className="p-6 sm:p-8 border-b border-gray-100">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="bg-blue-50 rounded-xl p-3">
                  <UserCircle className="h-10 w-10 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{candidate.name}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {statusBadge(wfStatus)}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tierColor(candidate.recommendation)}`}>
                      {tierLabel(candidate.recommendation)}
                    </span>
                  </div>
                </div>
              </div>
              <div className={`text-3xl font-bold px-5 py-3 rounded-xl border ${scoreColor(candidate.fitScore)}`}>
                {candidate.fitScore}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">

            {/* Left column */}
            <div className="p-6 sm:p-8 space-y-6">

              {/* Contact */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="font-mono text-xs">{candidate.id}</span>
                  </div>
                  {profile?.experience_years != null && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      {profile.experience_years} years experience
                    </div>
                  )}
                </div>
              </div>

              {/* Skills */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> Matched Skills
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.matchedSkills.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-800 border border-green-200">
                      {s}
                    </span>
                  ))}
                  {candidate.matchedSkills.length === 0 && (
                    <span className="text-xs text-gray-400">No matched skills</span>
                  )}
                </div>
              </div>

              {/* Education */}
              {profile?.education && profile.education.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" /> Education
                  </h3>
                  <ul className="space-y-1">
                    {profile.education.map((e) => (
                      <li key={e} className="text-sm text-gray-700">{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Certifications */}
              {profile?.certifications && profile.certifications.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5" /> Certifications
                  </h3>
                  <ul className="space-y-1">
                    {profile.certifications.map((c) => (
                      <li key={c} className="text-sm text-gray-700">{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="p-6 sm:p-8 space-y-6">

              {/* Score breakdown */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Score Breakdown</h3>
                <div className="space-y-2">
                  {[
                    { label: "Fit Score", value: candidate.fitScore, max: 100 },
                  ].map(({ label, value, max }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>{label}</span>
                        <span className="font-semibold">{value}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${value >= 80 ? "bg-green-500" : value >= 60 ? "bg-blue-500" : value >= 40 ? "bg-amber-400" : "bg-red-400"}`}
                          style={{ width: `${(value / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* All skills */}
              {profile?.skills && profile.skills.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">All Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Links placeholder — will show verified_links from upload when wired */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" /> Links
                </h3>
                <p className="text-xs text-gray-400">
                  Verified links appear here after resume upload via the pipeline.
                </p>
              </div>
            </div>
          </div>

          {/* Action bar */}
          <div className="p-6 sm:p-8 bg-slate-50 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-gray-600 text-center sm:text-left">
                <span className="font-semibold text-gray-800">HR Decision:</span>{" "}
                Advance to interview or reject this candidate.
                {wfStatus === "interview_scheduled" && (
                  <span className="ml-2 text-green-700 font-medium">Already scheduled.</span>
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-red-200 bg-white text-red-700 text-sm font-semibold hover:bg-red-50 transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                  Reject
                </button>
                <button
                  onClick={handleAdvance}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 shadow-sm transition-colors"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Advance
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Queue overview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Queue Overview</h3>
          <div className="flex flex-wrap gap-2">
            {sorted.map((c, i) => {
              const action = actionDone[c.id];
              const isActive = queue[index]?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    const qi = queue.findIndex((q) => q.id === c.id);
                    if (qi !== -1) setIndex(qi);
                  }}
                  disabled={!!action}
                  title={c.name}
                  className={`w-9 h-9 rounded-lg text-xs font-bold border transition-all ${
                    action === "advanced"
                      ? "bg-green-100 border-green-300 text-green-700"
                      : action === "rejected"
                      ? "bg-red-100 border-red-300 text-red-400 line-through"
                      : isActive
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
