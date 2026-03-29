import { readFile, writeFile } from "fs/promises";
import type { FeedbackSignal, FeedbackStore, SignalType, SkillHealth, UserFeedback } from "./types";

const DEFAULT_SCORE = 70;

export function createEmptyStore(): FeedbackStore {
  return { skills: {}, lastUpdated: new Date().toISOString() };
}

export async function loadFeedbackStore(filePath: string): Promise<FeedbackStore> {
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as FeedbackStore;
  } catch {
    return createEmptyStore();
  }
}

export async function saveFeedbackStore(filePath: string, store: FeedbackStore): Promise<void> {
  store.lastUpdated = new Date().toISOString();
  await writeFile(filePath, JSON.stringify(store, null, 2), "utf-8");
}

function ensureSkillHealth(store: FeedbackStore, skillName: string): SkillHealth {
  if (!store.skills[skillName]) {
    store.skills[skillName] = {
      skillName,
      score: DEFAULT_SCORE,
      totalUses: 0,
      signals: [],
      lastUsed: null,
      lastScoreChange: null,
      needsReview: false,
    };
  }
  return store.skills[skillName];
}

// Score adjustments per signal type
const SCORE_DELTAS: Record<SignalType, number> = {
  skill_used: 0,              // Neutral — just a usage counter
  completed_cleanly: +3,      // Positive — no issues detected
  user_rating_positive: +5,   // Strong positive
  user_rating_tweaks: -3,     // Mild negative — skill worked but needed help
  user_rating_negative: -10,  // Strong negative
  user_rejected: -8,          // User stopped the skill
  reprompt_same_topic: -5,    // Skill didn't solve the problem
  output_heavily_edited: -4,  // Skill was close but not right
  output_reverted: -12,       // Skill output was wrong enough to undo
};

export function recordSignal(
  store: FeedbackStore,
  skillName: string,
  type: SignalType,
  details: string,
  sessionId: string,
): FeedbackSignal {
  const health = ensureSkillHealth(store, skillName);
  const signal: FeedbackSignal = {
    id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    skillName,
    type,
    timestamp: new Date().toISOString(),
    details,
    sessionId,
  };

  health.signals.push(signal);

  if (type === "skill_used") {
    health.totalUses++;
    health.lastUsed = signal.timestamp;
  }

  const delta = SCORE_DELTAS[type];
  if (delta !== 0) {
    health.score = Math.max(0, Math.min(100, health.score + delta));
    health.lastScoreChange = {
      delta,
      reason: `${type}: ${details}`,
      timestamp: signal.timestamp,
    };
  }

  health.needsReview = health.score < 50;

  return signal;
}

export function recordUserFeedback(
  store: FeedbackStore,
  feedback: UserFeedback,
  sessionId: string,
): FeedbackSignal {
  const typeMap: Record<string, SignalType> = {
    positive: "user_rating_positive",
    tweaks: "user_rating_tweaks",
    negative: "user_rating_negative",
  };
  const signalType = typeMap[feedback.rating];
  const details = feedback.comment
    ? `User rated "${feedback.rating}": ${feedback.comment}`
    : `User rated "${feedback.rating}"`;
  return recordSignal(store, feedback.skillName, signalType, details, sessionId);
}

// Detect passive signals from git activity
export interface GitActivitySignal {
  filesChanged: string[];
  linesChanged: number;
  isRevert: boolean;
  timeSinceSkillUse: number; // seconds
}

export function detectGitSignals(
  skillName: string,
  skillOutputFiles: string[],
  activity: GitActivitySignal,
): { type: SignalType; details: string } | null {
  // Revert within 5 minutes
  if (activity.isRevert && activity.timeSinceSkillUse < 300) {
    return {
      type: "output_reverted",
      details: `Output reverted ${activity.timeSinceSkillUse}s after skill use (${activity.filesChanged.length} files)`,
    };
  }

  // Heavy edits to skill output files within 5 minutes
  const overlapping = activity.filesChanged.filter((f) => skillOutputFiles.includes(f));
  if (overlapping.length > 0 && activity.linesChanged > 20 && activity.timeSinceSkillUse < 300) {
    return {
      type: "output_heavily_edited",
      details: `${activity.linesChanged} lines changed across ${overlapping.length} skill output files within ${activity.timeSinceSkillUse}s`,
    };
  }

  return null;
}

// Detect re-prompt signals
export function detectRepromptSignal(
  currentPrompt: string,
  previousSkillName: string,
  previousPrompt: string,
  timeBetween: number, // seconds
): { type: SignalType; details: string } | null {
  if (timeBetween > 600) return null; // More than 10 min — probably unrelated

  // Simple keyword overlap check
  const stopWords = new Set(["a", "an", "the", "is", "in", "on", "at", "to", "for", "of", "with", "and", "or"]);
  const tokenize = (text: string) => new Set(
    text.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w))
  );
  const currentWords = tokenize(currentPrompt);
  const previousWords = tokenize(previousPrompt);
  const overlap = [...currentWords].filter((w) => previousWords.has(w));
  const similarity = overlap.length / Math.max(currentWords.size, previousWords.size);

  if (similarity > 0.4) {
    return {
      type: "reprompt_same_topic",
      details: `Re-prompted similar topic (${Math.round(similarity * 100)}% keyword overlap) ${timeBetween}s after "${previousSkillName}" ran`,
    };
  }

  return null;
}

// Detect rejection keywords
const REJECTION_PATTERNS = [
  /\bno\b.*\bnot that\b/i,
  /\bstop\b/i,
  /\bcancel\b/i,
  /\bundo\b/i,
  /\bwrong\b/i,
  /\bthat'?s not what i/i,
  /\bdon'?t use that skill\b/i,
  /\bnot what i (wanted|meant|asked)/i,
];

export function detectRejectionSignal(
  userMessage: string,
  previousSkillName: string,
): { type: SignalType; details: string } | null {
  for (const pattern of REJECTION_PATTERNS) {
    if (pattern.test(userMessage)) {
      return {
        type: "user_rejected",
        details: `User rejected after "${previousSkillName}": matched pattern "${pattern.source}"`,
      };
    }
  }
  return null;
}

// Get skills that need attention
export function getSkillsNeedingReview(store: FeedbackStore): SkillHealth[] {
  return Object.values(store.skills)
    .filter((h) => h.needsReview)
    .sort((a, b) => a.score - b.score);
}

// Get health summary for all skills
export function getHealthSummary(store: FeedbackStore): {
  total: number;
  healthy: number;
  warning: number;
  critical: number;
} {
  const skills = Object.values(store.skills);
  return {
    total: skills.length,
    healthy: skills.filter((s) => s.score >= 70).length,
    warning: skills.filter((s) => s.score >= 50 && s.score < 70).length,
    critical: skills.filter((s) => s.score < 50).length,
  };
}
