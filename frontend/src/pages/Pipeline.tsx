import { useCallback, useEffect, useState } from "react";
import {
  Users, Loader2, UserCircle, Send, Calendar,
  XCircle, Award, RefreshCw, Edit3, CheckCircle2, ArrowRight,
} from "lucide-react";
import Layout from "../components/Layout";
import { Link } from "react-router-dom";
import { applicationService, interviewService, type ApplicationRecord } from "../services/api";
import { useJobs } from "../context/JobContext";
import { getApiErrorMessage } from "../utils/apiError";

// ── Offer draft modal ────────────────────────────────────────────────────────

function OfferDraftModal({
  app,
  onClose,
  onSent,
}: {
  app: ApplicationRecord;
  onClose: () => void;
  onSent: (updatedApp: ApplicationRecord) => void;
}) {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    applicationService.getOfferDraft(app.id)
      .then(({ data }) => setDraft(data.draft))
      .catch(() => setDraft(`Dear ${app.candidate_name},\n\nCongratulations! We are pleased to offer you this position.\n\nBest regards,\nFairHire AI Recruitment Team`))
      .finally(() => setLoading(false));
  }, [app.id]);

  const handleSend = async () => {
    setSending(true);
    setError(null);
    try {
      const { data: updatedApp } = await applicationService.offer(app.id, draft);
      onSent(updatedApp);
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to send offer"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="glass rounded-2xl shadow-card w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Edit3 className="h-5 w-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">Offer Letter Draft</h2>
        </div>
        <p className="text-sm text-slate-400">AI-generated for <strong className="text-white">{app.candidate_name}</strong>. Edit before sending.</p>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-emerald-400" /></div>
        ) : (
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={12}
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y" />
        )}
        {error && <p className="text-sm text-red-300 bg-red-500/20 border border-red-500/30 rounded-xl p-3">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button onClick={handleSend} disabled={sending || loading}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {sending ? "Sending offer…" : "Send offer email"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/10">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Stage config ─────────────────────────────────────────────────────────────

const STAGES = [
  { key: "applied",      label: "Applied",      color: "border-t-slate-400",  bg: "bg-slate-50"  },
  { key: "shortlisted",  label: "Shortlisted",  color: "border-t-cyan-400",   bg: "bg-cyan-50"   },
  { key: "test_sent",    label: "Test Sent",    color: "border-t-sky-400",    bg: "bg-sky-50"    },
  { key: "tested",       label: "Assessment",   color: "border-t-blue-400",   bg: "bg-blue-50"   },
  { key: "interview_1",  label: "Round 1",      color: "border-t-amber-400",  bg: "bg-amber-50"  },
  { key: "interview_2",  label: "Round 2",      color: "border-t-purple-400", bg: "bg-purple-50" },
  { key: "offered",      label: "Offered",      color: "border-t-green-400",  bg: "bg-green-50"  },
  { key: "rejected",     label: "Rejected",     color: "border-t-red-300",    bg: "bg-red-50"    },
] as const;

type Stage = typeof STAGES[number]["key"];

// ── Reject confirmation modal ─────────────────────────────────────────────────

function RejectConfirmModal({ name, onConfirm, onClose, loading }: {
  name: string;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="glass rounded-2xl shadow-card w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-red-500/20 rounded-full p-2"><XCircle className="h-5 w-5 text-red-400" /></div>
          <h2 className="text-lg font-bold text-white">Reject Candidate?</h2>
        </div>
        <p className="text-sm text-slate-400">A rejection email will be sent to <strong className="text-white">{name}</strong>. This cannot be undone.</p>
        <div className="flex gap-3 pt-2">
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            {loading ? "Rejecting…" : "Yes, reject & notify"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/10">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function scoreColor(s: number | null) {
  if (s === null) return "text-gray-400";
  if (s >= 80) return "text-green-700 bg-green-50 border-green-200";
  if (s >= 60) return "text-blue-700 bg-blue-50 border-blue-200";
  if (s >= 40) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

// ── Test score modal ────────────────────────────────────────────────────────

function TestScoreModal({
  app,
  onClose,
  onSaved,
}: {
  app: ApplicationRecord;
  onClose: () => void;
  onSaved: (updated: ApplicationRecord) => void;
}) {
  const [score, setScore] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const s = parseFloat(score);
    if (isNaN(s) || s < 0 || s > 100) { setError("Score must be 0–100"); return; }
    setSaving(true);
    setError(null);
    try {
      const { data } = await applicationService.recordTestScore(app.id, s);
      onSaved(data);
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to save score"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="glass rounded-2xl shadow-card w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Enter Test Score</h2>
        <p className="text-sm text-slate-400">Candidate: <strong className="text-white">{app.candidate_name}</strong></p>
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1.5">Score (0–100)</label>
          <input type="number" min="0" max="100" value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="e.g. 78"
            className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
            autoFocus />
        </div>
        {error && <p className="text-sm text-red-300 bg-red-500/20 border border-red-500/30 rounded-xl p-3">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={saving || !score}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
            {saving ? "Saving…" : "Save & re-rank"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/10">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Test link modal ───────────────────────────────────────────────────────────

function TestLinkModal({
  app,
  onClose,
  onSent,
}: {
  app: ApplicationRecord;
  onClose: () => void;
  onSent: (updated: ApplicationRecord) => void;
}) {
  const [link, setLink] = useState("");
  const [deadline, setDeadline] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!link.trim()) return;
    setSending(true);
    setError(null);
    try {
      const { data } = await applicationService.sendTestLink(app.id, link.trim(), deadline || undefined);
      onSent(data);
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to send test link"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="glass rounded-2xl shadow-card w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Send Assessment Link</h2>
        <p className="text-sm text-slate-400">Sending to <strong className="text-white">{app.candidate_name}</strong></p>
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1.5">Test / Assessment URL</label>
          <input type="url" value={link} onChange={(e) => setLink(e.target.value)}
            placeholder="https://hackerrank.com/test/..."
            className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1.5">Deadline (optional)</label>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        {error && <p className="text-sm text-red-300 bg-red-500/20 border border-red-500/30 rounded-xl p-3">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button onClick={handleSend} disabled={sending || !link.trim()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Sending…" : "Send link"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/10">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Schedule interview modal ──────────────────────────────────────────────────

function ScheduleModal({
  app,
  roundNumber,
  onClose,
  onScheduled,
}: {
  app: ApplicationRecord;
  roundNumber: number;
  onClose: () => void;
  onScheduled: (updatedApp: ApplicationRecord) => void;
}) {
  const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };
  const [date, setDate] = useState(tomorrow());
  const [time, setTime] = useState("10:00");
  const [meetLink, setMeetLink] = useState("");
  const [interviewerId, setInterviewerId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSchedule = async () => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (interviewerId && !UUID_RE.test(interviewerId.trim())) {
      setError("Interviewer ID must be a valid UUID (e.g. from the HR Users list).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await interviewService.schedule({
        candidate_id: app.candidate_id,
        job_id: app.job_id,
        application_id: app.id,
        round_number: roundNumber,
        scheduled_at: `${date}T${time}:00`,
        meet_link: meetLink || null,
        interviewer_id: interviewerId.trim() || null,
        notes: notes || null,
      });
      const targetStage = roundNumber === 1 ? "interview_1" : "interview_2";
      const { data: updatedApp } = await applicationService.advanceStage(app.id, targetStage);
      onScheduled(updatedApp);
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to schedule interview"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="glass rounded-2xl shadow-card w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Schedule Round {roundNumber} Interview</h2>
        <p className="text-sm text-slate-400">Candidate: <strong className="text-white">{app.candidate_name}</strong></p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1.5">Interviewer ID (optional)</label>
          <input type="text" value={interviewerId} onChange={(e) => setInterviewerId(e.target.value)}
            placeholder="Paste interviewer UUID"
            className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1.5">Meet link (optional)</label>
          <input type="url" value={meetLink} onChange={(e) => setMeetLink(e.target.value)}
            placeholder="https://meet.google.com/..."
            className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1.5">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none placeholder:text-slate-500" />
        </div>
        {error && <p className="text-sm text-red-300 bg-red-500/20 border border-red-500/30 rounded-xl p-3">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button onClick={handleSchedule} disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
            {saving ? "Scheduling…" : "Schedule & notify"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/10">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Candidate card ────────────────────────────────────────────────────────────

function CandidateCard({
  app,
  selected,
  onSelect,
  onAction,
}: {
  app: ApplicationRecord;
  selected: boolean;
  onSelect: (id: string) => void;
  onAction: (action: "shortlist" | "test" | "testscore" | "interview1" | "interview2" | "reject" | "offer", app: ApplicationRecord) => void;
}) {
  const score = app.final_score ?? app.resume_score;

  return (
    <div className={`glass rounded-xl p-3 space-y-2.5 transition-all ${
      selected ? "ring-1 ring-emerald-400/50 border-emerald-400/40" : ""
    }`}>
      {/* Header: checkbox + avatar + name + score */}
      <div className="flex items-start gap-2">
        <input type="checkbox" checked={selected} onChange={() => onSelect(app.id)}
          className="h-3.5 w-3.5 mt-0.5 rounded border-white/20 bg-white/10 text-emerald-500 flex-shrink-0 cursor-pointer"
          onClick={(e) => e.stopPropagation()} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <Link to={`/candidates/${app.candidate_id}`}
              className="text-sm font-bold text-emerald-400 hover:underline leading-tight block">
              {app.candidate_name}
            </Link>
            {score !== null && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${scoreColor(score)}`}>
                {score.toFixed(0)}%
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5 break-all leading-tight">{app.candidate_email}</p>
        </div>
      </div>

      {/* Score breakdown */}
      {(app.resume_score !== null || app.test_score !== null) && (
        <div className="flex flex-wrap gap-1 text-xs">
          {app.resume_score !== null && <span className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300">R:{app.resume_score.toFixed(0)}%</span>}
          {app.test_score !== null && <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">T:{app.test_score.toFixed(0)}%</span>}
          {app.interview_score !== null && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">I1:{app.interview_score.toFixed(0)}%</span>}
          {app.hr_interview_score !== null && <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">I2:{app.hr_interview_score.toFixed(0)}%</span>}
        </div>
      )}

      {/* Skills */}
      {app.matched_skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {app.matched_skills.slice(0, 4).map((s) => (
            <span key={s} className="px-1.5 py-0.5 rounded text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">{s}</span>
          ))}
          {app.matched_skills.length > 4 && <span className="text-xs text-slate-500">+{app.matched_skills.length - 4}</span>}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-1 pt-1 border-t border-white/10">
        {app.stage === "applied" && (
          <button onClick={() => onAction("shortlist", app)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/30">
            <CheckCircle2 className="h-3 w-3" /> Shortlist
          </button>
        )}
        {(app.stage === "applied" || app.stage === "shortlisted") && (
          <button onClick={() => onAction("test", app)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/15">
            <Send className="h-3 w-3" /> Test
          </button>
        )}
        {(app.stage === "test_sent" || app.stage === "tested") && (
          <button onClick={() => onAction("testscore", app)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/15">
            <Award className="h-3 w-3" /> Score
          </button>
        )}
        {(app.stage === "applied" || app.stage === "shortlisted" || app.stage === "tested") && (
          <button onClick={() => onAction("interview1", app)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-xs font-semibold text-amber-300 hover:bg-amber-500/30">
            <Calendar className="h-3 w-3" /> R1
          </button>
        )}
        {app.stage === "interview_1" && (
          <button onClick={() => onAction("interview2", app)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-xs font-semibold text-purple-300 hover:bg-purple-500/30">
            <Calendar className="h-3 w-3" /> R2
          </button>
        )}
        {(app.stage === "interview_1" || app.stage === "interview_2") && (
          <button onClick={() => onAction("offer", app)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30">
            <Award className="h-3 w-3" /> Offer
          </button>
        )}
        {app.stage !== "rejected" && app.stage !== "offered" && (
          <button onClick={() => onAction("reject", app)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20 border border-red-500/30 text-xs font-semibold text-red-400 hover:bg-red-500/30">
            <XCircle className="h-3 w-3" /> Reject
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Pipeline() {
  const { activeJob } = useJobs();
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const [testModal, setTestModal] = useState<ApplicationRecord | null>(null);
  const [testScoreModal, setTestScoreModal] = useState<ApplicationRecord | null>(null);
  const [scheduleModal, setScheduleModal] = useState<{ app: ApplicationRecord; round: number } | null>(null);
  const [offerModal, setOfferModal] = useState<ApplicationRecord | null>(null);
  const [rejectModal, setRejectModal] = useState<ApplicationRecord | null>(null);
  const [rejectLoading, setRejectLoading] = useState(false);

  const isRealDbRecord = (app: ApplicationRecord) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(app.id);

  const load = useCallback(async () => {
    if (!activeJob) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await applicationService.list(activeJob.id);
      setApplications(data);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load applications"));
    } finally {
      setLoading(false);
    }
  }, [activeJob]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (
    action: "shortlist" | "test" | "testscore" | "interview1" | "interview2" | "reject" | "offer",
    app: ApplicationRecord,
  ) => {
    if (action === "shortlist") {
      if (!isRealDbRecord(app)) { setError("Cannot shortlist — re-run pipeline to persist candidates."); return; }
      try {
        const { data } = await applicationService.shortlist(app.id);
        setApplications((prev) => prev.map((a) => a.id === data.id ? data : a));
      } catch (e) { setError(getApiErrorMessage(e, "Action failed")); }
      return;
    }
    if (action === "test") { setTestModal(app); return; }
    if (action === "testscore") { setTestScoreModal(app); return; }
    if (action === "interview1") { setScheduleModal({ app, round: 1 }); return; }
    if (action === "interview2") { setScheduleModal({ app, round: 2 }); return; }
    if (action === "offer") { setOfferModal(app); return; }
    if (action === "reject") { setRejectModal(app); return; }
  };

  const confirmReject = async () => {
    if (!rejectModal) return;
    if (!isRealDbRecord(rejectModal)) {
      setError("This candidate was not saved to the database. Re-run the pipeline to persist candidates.");
      setRejectModal(null);
      return;
    }
    setRejectLoading(true);
    setApplications((prev) => prev.map((a) => a.id === rejectModal.id ? { ...a, stage: "rejected" } : a));
    try {
      await applicationService.reject(rejectModal.id);
    } catch (e) {
      setError(getApiErrorMessage(e, "Action failed"));
      setApplications((prev) => prev.map((a) => a.id === rejectModal.id ? { ...a, stage: rejectModal.stage } : a));
    } finally {
      setRejectLoading(false);
      setRejectModal(null);
    }
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const selectedApps = applications.filter((a) => selected.has(a.id));

  const bulkShortlist = async () => {
    setBulkLoading(true);
    await Promise.allSettled(
      selectedApps.filter(isRealDbRecord).map((a) =>
        applicationService.shortlist(a.id).then(({ data }) =>
          setApplications((prev) => prev.map((x) => x.id === data.id ? data : x))
        )
      )
    );
    setSelected(new Set());
    setBulkLoading(false);
  };

  const bulkReject = async () => {
    if (!window.confirm(`Reject ${selectedApps.length} candidate(s)? Rejection emails will be sent.`)) return;
    setBulkLoading(true);
    await Promise.allSettled(
      selectedApps.filter(isRealDbRecord).map((a) =>
        applicationService.reject(a.id).then(({ data }) =>
          setApplications((prev) => prev.map((x) => x.id === data.id ? data : x))
        )
      )
    );
    setSelected(new Set());
    setBulkLoading(false);
  };

  const byStage = (stage: Stage) =>
    applications
      .filter((a) => a.stage === stage)
      .sort((a, b) => (b.final_score ?? b.resume_score ?? 0) - (a.final_score ?? a.resume_score ?? 0));

  if (!activeJob) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-16">
          <Users className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white">No active job</h1>
          <p className="mt-2 text-slate-400">Select a job from the sidebar to view its pipeline.</p>
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
              <h1 className="text-2xl font-bold text-white">Pipeline</h1>
              <p className="mt-1 text-sm text-slate-400">{activeJob.title} · {applications.length} applicants</p>
            </div>
            <button onClick={load} disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {error && <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-sm text-red-300">{error}</div>}

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="glass rounded-2xl shadow-card px-5 py-3 flex items-center gap-4 flex-wrap">
            <span className="text-sm font-semibold text-emerald-300">{selected.size} selected</span>
            <button onClick={bulkShortlist} disabled={bulkLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-700 disabled:opacity-50">
              {bulkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Shortlist all
            </button>
            <button onClick={bulkReject} disabled={bulkLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50">
              {bulkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Reject all
            </button>
            <button onClick={() => setSelected(new Set())}
              className="ml-auto text-xs text-emerald-400 hover:underline font-medium">Clear</button>
          </div>
        )}

        {loading && applications.length === 0 ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 text-emerald-400 animate-spin" /></div>
        ) : !loading && applications.length === 0 ? (
          <div className="glass rounded-2xl shadow-card p-10 text-center">
            <Users className="h-10 w-10 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">No applications yet for <strong className="text-white">{activeJob.title}</strong>.</p>
            <Link to="/process-resumes"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
              Process Resumes <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          /* Kanban board — horizontal scroll with fixed column widths */
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 items-start" style={{ minWidth: `${STAGES.length * 260}px` }}>
            {STAGES.map(({ key, label, color }) => {
              const cards = byStage(key);
              return (
                <div key={key} className={`rounded-2xl border-t-4 ${color} glass overflow-hidden flex-shrink-0 w-60`}>
                  <div className="px-4 py-3 flex items-center justify-between" style={{background:"rgba(255,255,255,0.04)"}}>
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">{label}</span>
                    <span className="text-xs font-bold text-slate-400 bg-white/10 border border-white/10 px-2 py-0.5 rounded-full">
                      {cards.length}
                    </span>
                  </div>
                  <div className="px-3 pb-3 space-y-3 min-h-[140px]">
                    {cards.length === 0 ? (
                      <p className="text-xs text-slate-600 text-center py-8">Empty</p>
                    ) : (
                      cards.map((app) => (
                        <CandidateCard key={app.id} app={app} selected={selected.has(app.id)} onSelect={toggleSelect} onAction={handleAction} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}
      </div>

      {testScoreModal && (
        <TestScoreModal
          app={testScoreModal}
          onClose={() => setTestScoreModal(null)}
          onSaved={(updated) => {
            setApplications((prev) => prev.map((a) => a.id === updated.id ? updated : a));
            setTestScoreModal(null);
          }}
        />
      )}

      {testModal && (
        <TestLinkModal
          app={testModal}
          onClose={() => setTestModal(null)}
          onSent={(updated) => {
            setApplications((prev) => prev.map((a) => a.id === updated.id ? updated : a));
            setTestModal(null);
          }}
        />
      )}

      {scheduleModal && (
        <ScheduleModal
          app={scheduleModal.app}
          roundNumber={scheduleModal.round}
          onClose={() => setScheduleModal(null)}
          onScheduled={(updatedApp) => {
            setApplications((prev) => prev.map((a) => a.id === updatedApp.id ? updatedApp : a));
            setScheduleModal(null);
          }}
        />
      )}

      {offerModal && (
        <OfferDraftModal
          app={offerModal}
          onClose={() => setOfferModal(null)}
          onSent={(updatedApp) => {
            setApplications((prev) => prev.map((a) => a.id === updatedApp.id ? updatedApp : a));
            setOfferModal(null);
          }}
        />
      )}

      {rejectModal && (
        <RejectConfirmModal
          name={rejectModal.candidate_name}
          loading={rejectLoading}
          onConfirm={confirmReject}
          onClose={() => setRejectModal(null)}
        />
      )}
    </Layout>
  );
}
