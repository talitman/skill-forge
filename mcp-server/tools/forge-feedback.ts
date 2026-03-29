import { loadFeedbackStore, saveFeedbackStore, recordSignal, recordUserFeedback, getSkillsNeedingReview, getHealthSummary } from "../../shared/signal-collector";
import { buildSearchQueries, buildImprovementSuggestions } from "../../shared/skill-searcher";
import type { PipelineStateManager } from "../state";
import type { SignalType, UserFeedback } from "../../shared/types";
import { join } from "path";

function getFeedbackPath(projectDir: string): string {
  return join(projectDir, "skill-forge-feedback.json");
}

export async function handleForgeFeedback(
  args: Record<string, unknown>,
  state: PipelineStateManager,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const action = args.action as string;
  const projectDir = (args.projectDir as string) || process.cwd();
  const feedbackPath = getFeedbackPath(projectDir);

  switch (action) {
    case "health": {
      const store = await loadFeedbackStore(feedbackPath);
      const summary = getHealthSummary(store);
      const needsReview = getSkillsNeedingReview(store);

      const skillDetails = Object.values(store.skills).map((h) => ({
        name: h.skillName,
        score: h.score,
        totalUses: h.totalUses,
        needsReview: h.needsReview,
        lastChange: h.lastScoreChange,
        recentSignals: h.signals.slice(-5).map((s) => ({
          type: s.type,
          details: s.details,
          timestamp: s.timestamp,
        })),
      }));

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            summary,
            needsReview: needsReview.map((s) => s.skillName),
            skills: skillDetails,
            message: summary.critical > 0
              ? `${summary.critical} skill(s) need review. Use action "diagnose" with the skill name to see improvement suggestions.`
              : `All ${summary.total} skills are healthy.`,
          }, null, 2),
        }],
      };
    }

    case "record_signal": {
      const skillName = args.skill as string;
      const signalType = args.signalType as SignalType;
      const details = (args.details as string) || "";
      const sessionId = (args.sessionId as string) || `session-${Date.now()}`;

      if (!skillName || !signalType) {
        return { content: [{ type: "text", text: "Error: 'skill' and 'signalType' are required." }] };
      }

      const store = await loadFeedbackStore(feedbackPath);
      const signal = recordSignal(store, skillName, signalType, details, sessionId);
      await saveFeedbackStore(feedbackPath, store);

      const health = store.skills[skillName];
      // TODO: broadcast to dashboard when event system is wired

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            recorded: signal,
            currentScore: health.score,
            needsReview: health.needsReview,
          }, null, 2),
        }],
      };
    }

    case "rate": {
      const skillName = args.skill as string;
      const rating = args.rating as "positive" | "tweaks" | "negative";
      const comment = (args.comment as string) || null;

      if (!skillName || !rating) {
        return { content: [{ type: "text", text: "Error: 'skill' and 'rating' are required." }] };
      }

      const store = await loadFeedbackStore(feedbackPath);
      const feedback: UserFeedback = {
        skillName,
        rating,
        comment,
        timestamp: new Date().toISOString(),
      };
      const signal = recordUserFeedback(store, feedback, `session-${Date.now()}`);
      await saveFeedbackStore(feedbackPath, store);

      const health = store.skills[skillName];
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            recorded: signal,
            currentScore: health.score,
            message: `Rating recorded for "${skillName}". Score: ${health.score}/100.`,
          }, null, 2),
        }],
      };
    }

    case "diagnose": {
      const skillName = args.skill as string;
      if (!skillName) {
        return { content: [{ type: "text", text: "Error: 'skill' is required for diagnose." }] };
      }

      const store = await loadFeedbackStore(feedbackPath);
      const health = store.skills[skillName];
      if (!health) {
        return { content: [{ type: "text", text: `No feedback data for skill "${skillName}".` }] };
      }

      const searchQueries = buildSearchQueries(skillName, health.skillName);
      const suggestions = buildImprovementSuggestions(health, []);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            skill: skillName,
            score: health.score,
            totalUses: health.totalUses,
            signalBreakdown: {
              positive: health.signals.filter((s) => ["completed_cleanly", "user_rating_positive"].includes(s.type)).length,
              negative: health.signals.filter((s) => ["output_reverted", "user_rejected", "user_rating_negative", "reprompt_same_topic", "output_heavily_edited"].includes(s.type)).length,
              neutral: health.signals.filter((s) => s.type === "skill_used").length,
            },
            recentSignals: health.signals.slice(-10),
            suggestions,
            searchQueries,
            message: `Diagnosis for "${skillName}" (score: ${health.score}/100). ${suggestions.length} suggestion(s). Use the search queries above with WebSearch to find external improvements.`,
          }, null, 2),
        }],
      };
    }

    default:
      return { content: [{ type: "text", text: `Unknown feedback action: ${action}. Use: health, record_signal, rate, diagnose.` }] };
  }
}
