import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar, ArrowRight, UserCircle, CheckCircle2,
  Loader2, RefreshCw, Star, GitBranch,
} from "lucide-react";
import { interviewService, candidateService, type InterviewRecord, type CandidateRecord } from "../services/api";
import { useJobs } from "../context/JobContext";
import { getApiErrorMessage } from "../utils/apiError";
import Layout from "../components/Layout";

function roundBadge(n: number) {
  const map: Record<number, string> = {
    1: "bg-amber-50 text-amber-800 border-amber-200",
    2: "bg-purple-50 text-purple-800 border-purple-200",
  };
  return map[n] ?? "bg-gray-100 text-gray-700 border-gray-200";
}

function statusBadge(s: string) {
  if (s === "completed") return "bg-green-100 text-green-800 border-green-200";
  if (s === "cancelled") return "bg-red-100 text-red-700 border-red-200";
  return "bg-blue-50 text-blue-800 border-blue-200";
}

function ScoreModal({
  interview,
  onClose,
  onSaved,
}: {
  interview: InterviewRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [score, setScore] = useState(interview.score?.toString() ?? "");
  const [feedback, setFeedback] = useState(interview.feedback ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const s = parseFloat(score);
    if (isNaN(s) || s < 0 || s > 100) { setError("Score must be 0–100"); return; }
    setSaving(true);
    setError(null);
    try {
      await interviewService.submitScore(interview.id, s, feedback || undefined);
      onSaved();
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to save score"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="glass rounded-2xl shadow-card w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Submit Interview Score</h2>
        <p className="text-sm text-slate-400">Round {interview.round_number} · {new Date(interview.scheduled_at ?? "").toLocaleDateString()}</p>
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1.5">Score (0–100)</label>
          <input type="number" min="0" max="100" value={score} onChange={(e) => setScore(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1.5">Feedback (optional)</label>
          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4}
            placeholder="Technical skills, communication, culture fit…"
            className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none placeholder:text-slate-500" />
        </div>
        {error && <p className="text-sm text-red-300 bg-red-500/20 border border-red-500/30 rounded-xl p-3">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
            {saving ? "Saving…" : "Save score"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/10">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function Interviews() {
  const { activeJob } = useJobs();
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [candidates, setCandidates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoreModal, setScoreModal] = useState<InterviewRecord | null>(null);

  const load = useCallback(async () => {
    if (!activeJob) return;
    setLoading(true);
    setError(null);
    try {
      const [{ data: ivs }, { data: cands }] = await Promise.all([
        interviewService.list(activeJob.id),
        candidateService.list(),
      ]);
      setInterviews(ivs);
      const nameMap: Record<string, string> = {};
      cands.forEach((c: CandidateRecord) => { nameMap[c.id] = c.full_name; });
      setCandidates(nameMap);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load interviews"));
    } finally {
      setLoading(false);
    }
  }, [activeJob]);

  useEffect(() => { load(); }, [load]);

  const scheduled = interviews.filter((i) => i.status === "scheduled");
  const completed = interviews.filter((i) => i.status === "completed");

  function groupByCandidateId(list: InterviewRecord[]) {
    const map = new Map<string, InterviewRecord[]>();
    list.forEach((iv) => {
      const arr = map.get(iv.candidate_id) ?? [];
      arr.push(iv);
      map.set(iv.candidate_id, arr);
    });
    return map;
  }

  if (!activeJob) {
    return (
      <Layout>
        <div className="px-4 sm:px-0 max-w-2xl mx-auto text-center py-16">
          <Calendar className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white">No active job</h1>
          <p className="mt-2 text-slate-400">Select a job from the navbar to view its interviews.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 sm:px-0 space-y-6">
        {/* Header */}
        <div className="glass rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-white">Interviews</h1>
              <p className="mt-1 text-sm text-slate-400">
                {activeJob.title} · {interviews.length} total · {scheduled.length} upcoming
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/pipeline"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/10">
                <GitBranch className="h-4 w-4" /> Pipeline
              </Link>
              <button onClick={load} disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
          </div>
        </div>

        {error && <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-sm text-red-300">{error}</div>}

        {loading && interviews.length === 0 ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 text-blue-600 animate-spin" /></div>
        ) : interviews.length === 0 ? (
          <div className="glass rounded-2xl shadow-card p-10 text-center">
            <Calendar className="h-10 w-10 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">No interviews scheduled yet for this job.</p>
            <Link to="/pipeline"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
              Go to Pipeline <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Upcoming */}
            {scheduled.length > 0 && (
              <div className="glass rounded-2xl shadow-card overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2" style={{background:"rgba(16,185,129,0.12)"}}>
                  <Calendar className="h-5 w-5 text-emerald-400" />
                  <h2 className="text-base font-semibold text-white">Upcoming</h2>
                  <span className="ml-auto text-xs font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full">{scheduled.length}</span>
                </div>
                <ul className="divide-y divide-white/5">
                  {Array.from(groupByCandidateId(scheduled)).map(([candidateId, ivs]) => (
                    <CandidateInterviewGroup key={candidateId} candidateName={candidates[candidateId] ?? ""} candidateId={candidateId} interviews={ivs} onScore={setScoreModal} />
                  ))}
                </ul>
              </div>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <div className="glass rounded-2xl shadow-card overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2" style={{background:"rgba(255,255,255,0.04)"}}>
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <h2 className="text-base font-semibold text-white">Completed</h2>
                  <span className="ml-auto text-xs font-bold bg-white/10 text-slate-300 px-2.5 py-0.5 rounded-full">{completed.length}</span>
                </div>
                <ul className="divide-y divide-white/5">
                  {Array.from(groupByCandidateId(completed)).map(([candidateId, ivs]) => (
                    <CandidateInterviewGroup key={candidateId} candidateName={candidates[candidateId] ?? ""} candidateId={candidateId} interviews={ivs} onScore={setScoreModal} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {scoreModal && (
        <ScoreModal
          interview={scoreModal}
          onClose={() => setScoreModal(null)}
          onSaved={() => { load(); setScoreModal(null); }}
        />
      )}
    </Layout>
  );
}

function CandidateInterviewGroup({
  candidateName, candidateId, interviews, onScore,
}: {
  candidateName: string;
  candidateId: string;
  interviews: InterviewRecord[];
  onScore: (iv: InterviewRecord) => void;
}) {
  return (
    <li className="px-6 py-4 hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <UserCircle className="h-9 w-9 text-slate-600 flex-shrink-0" />
        <Link to={`/candidates/${candidateId}`} className="text-sm font-semibold text-emerald-400 hover:underline">
          {candidateName || "Unknown Candidate"}
        </Link>
        <span className="text-xs text-slate-500">{interviews.length} session{interviews.length > 1 ? "s" : ""}</span>
      </div>
      <div className="ml-12 space-y-2">
        {interviews.map((iv) => {
          const date = iv.scheduled_at ? new Date(iv.scheduled_at).toLocaleString() : "—";
          return (
            <div key={iv.id} className="flex items-center justify-between gap-4 flex-wrap bg-white/5 rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${roundBadge(iv.round_number)}`}>Round {iv.round_number}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusBadge(iv.status)}`}>{iv.status}</span>
                <span className="text-xs text-slate-500">{date}</span>
                {iv.meet_link && (
                  <a href={iv.meet_link} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:underline truncate max-w-xs">{iv.meet_link}</a>
                )}
                {iv.score !== null && <span className="text-xs font-semibold text-emerald-400">Score: {iv.score}/100</span>}
                {iv.feedback && <span className="text-xs text-slate-500 italic truncate max-w-sm">"{iv.feedback}"</span>}
              </div>
              <button onClick={() => onScore(iv)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 flex-shrink-0">
                <Star className="h-3.5 w-3.5" />{iv.score !== null ? "Update score" : "Submit score"}
              </button>
            </div>
          );
        })}
      </div>
    </li>
  );
}
