import { useNavigate } from "react-router-dom";
import { Trophy, Medal, Award, LayoutList, CalendarPlus } from "lucide-react";
import { usePipeline, getWorkflowStatus } from "../context/PipelineContext";
import type { LeaderboardCandidate } from "../services/api";

interface Candidate {
  id: string;
  name: string;
  fitScore: number;
  matchedSkills: string[];
  recommendation: string;
}

interface TopCandidatesProps {
  candidates: Candidate[];
}

export default function TopCandidates({ candidates }: TopCandidatesProps) {
  const navigate = useNavigate();
  const { session, updateWorkflowStatus } = usePipeline();

  const handleProceedInterview = (candidate: Candidate) => {
    const row: LeaderboardCandidate = {
      id: candidate.id,
      name: candidate.name,
      fitScore: candidate.fitScore,
      matchedSkills: candidate.matchedSkills,
      recommendation: candidate.recommendation,
    };
    const wf = session ? getWorkflowStatus(session, candidate.id) : "matched";
    if (wf === "matched") {
      updateWorkflowStatus(candidate.id, "shortlisted");
    }
    navigate("/interviews", { state: { candidate: row } });
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-amber-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-semibold text-gray-500">#{index + 1}</span>;
    }
  };

  const getRecommendationBadge = (recommendation: string) => {
    const styles = {
      interview: "bg-green-100 text-green-800 border border-green-200",
      shortlisted: "bg-amber-50 text-amber-800 border border-amber-200",
      consider: "bg-amber-50 text-amber-700 border border-amber-200",
      reject: "bg-red-100 text-red-800 border border-red-200",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          styles[recommendation as keyof typeof styles] || "bg-gray-100 text-gray-800 border border-gray-200"
        }`}
      >
        {recommendation.charAt(0).toUpperCase() + recommendation.slice(1)}
      </span>
    );
  };

  const getScoreBadgeClass = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 border border-green-200";
    if (score >= 60) return "bg-blue-100 text-blue-800 border border-blue-200";
    if (score >= 40) return "bg-amber-50 text-amber-800 border border-amber-200";
    return "bg-red-100 text-red-800 border border-red-200";
  };

  const workflowButtonLabel = (candidateId: string) => {
    const wf = session ? getWorkflowStatus(session, candidateId) : "matched";
    if (wf === "interview_scheduled") return "View schedule";
    if (wf === "shortlisted") return "Continue scheduling";
    return "Proceed to Interview";
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex items-start gap-3">
        <div className="bg-blue-50 rounded-xl p-2.5 flex-shrink-0">
          <LayoutList className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Top Candidates Leaderboard</h3>
          <p className="mt-1 text-sm text-gray-500">Ranked by AI fit score and role alignment</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Candidate
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Fit Score
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Top Skills
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Recommendation
              </th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Next step
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {candidates.map((candidate, index) => (
              <tr key={candidate.id} className={index % 2 === 1 ? "bg-slate-50/80" : "bg-white"}>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">{getRankIcon(index)}</div>
                </td>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-gray-900">{candidate.name}</div>
                  <div className="text-sm text-gray-500">{candidate.id}</div>
                </td>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getScoreBadgeClass(
                      candidate.fitScore
                    )}`}
                  >
                    {candidate.fitScore}%
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {candidate.matchedSkills.slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {skill}
                      </span>
                    ))}
                    {candidate.matchedSkills.length > 3 && (
                      <span className="text-xs text-gray-500 self-center">
                        +{candidate.matchedSkills.length - 3} more
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                  {getRecommendationBadge(candidate.recommendation)}
                </td>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                  <button
                    type="button"
                    onClick={() => handleProceedInterview(candidate)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100"
                  >
                    <CalendarPlus className="h-4 w-4 flex-shrink-0" />
                    {workflowButtonLabel(candidate.id)}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
