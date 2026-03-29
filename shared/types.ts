// --- Manifest Types ---

export type SkillScope = "project" | "global";

export type SkillStatus =
  | "planned"
  | "analyzing"
  | "generating"
  | "reviewing"
  | "complete"
  | "skipped"
  | "failed";

export interface SkillBrief {
  name: string;
  scope: SkillScope;
  purpose: string;
  requirements: string[];
  techStack: Record<string, string>;
  codebaseContext: {
    existingPatterns: string[];
    conventions: string[];
  };
  dependsOn: string[];
  successCriteria: string[];
}

export interface SkillEntry {
  name: string;
  scope: SkillScope;
  status: SkillStatus;
  phase: number;
  dependsOn: string[];
  description: string;
  brief: SkillBrief | null;
  costEstimate: CostEstimate | null;
  evalResults: EvalResults | null;
  userOverride: UserOverride | null;
}

// --- Cost Optimization Types ---

export type CostTier = "template" | "light" | "full";

export type ModelTier = "haiku" | "sonnet" | "opus";

export interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
  blendedPer1K: number;
}

export interface CostEstimate {
  tier: CostTier;
  model: ModelTier;
  reason: string;
  estimatedTokens: number;
  estimatedCostUSD: number;
  skipEvals: boolean;
  templateName: string | null;
}

export interface SkillTemplate {
  name: string;
  description: string;
  category: string;
  keywords: string[];
  skillContent: string;
  variables: Record<string, string>;
}

export interface CostSummary {
  totalEstimatedTokens: number;
  totalEstimatedCostUSD: number;
  fullPipelineCostUSD: number;
  savedCostUSD: number;
  byTier: { template: number; light: number; full: number };
  byModel: { haiku: number; sonnet: number; opus: number };
  savedVsFullPipeline: number;
  savingsPercent: number;
}

export interface EvalResults {
  passRate: number;
  totalTests: number;
  passed: number;
  failed: number;
  lastRun: string;
}

export interface UserOverride {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: string;
}

export interface Phase {
  id: number;
  name: string;
  skills: string[];
}

export interface DocSnapshot {
  docHashes: Record<string, string>;
  codebaseFingerprint: string;
}

export interface HistoryEntry {
  timestamp: string;
  action: string;
  details: string;
}

export interface Manifest {
  source: string[];
  analyzedAt: string;
  skills: SkillEntry[];
  phases: Phase[];
  history: HistoryEntry[];
  snapshot: DocSnapshot;
}

// --- Analysis Types ---

export type SkillDomain =
  | "infra"
  | "backend"
  | "frontend"
  | "testing"
  | "devops"
  | "optimization";

export interface ParsedSection {
  title: string;
  level: number;
  content: string;
  children: ParsedSection[];
}

export interface ParsedDocument {
  filePath: string;
  sections: ParsedSection[];
}

export interface CodebaseInfo {
  packageManager: string | null;
  language: string | null;
  framework: string | null;
  existingPatterns: string[];
  fileStructure: string[];
}

export interface SkillCandidate {
  name: string;
  domain: SkillDomain;
  description: string;
  requirements: string[];
  sourceSection: string;
  suggestedScope: SkillScope;
}

// --- Pipeline State Types ---

export type PipelineStatus = "idle" | "analyzing" | "generating" | "paused" | "complete" | "error";

export interface PipelineState {
  status: PipelineStatus;
  currentPhase: number | null;
  totalPhases: number;
  skillsComplete: number;
  skillsTotal: number;
  activeGenerations: string[];
  errors: PipelineError[];
  pendingOverrides: PendingOverride[];
}

export interface PipelineError {
  skill: string;
  message: string;
  timestamp: string;
}

export interface PendingOverride {
  id: string;
  skill: string;
  action: "changeScope" | "skip" | "pause" | "editBrief" | "retry";
  payload: unknown;
  timestamp: string;
}

// --- Evolution Types ---

export type ChangeSize = "small" | "medium" | "large";

export interface DocChange {
  file: string;
  section: string;
  change: string;
}

export interface SkillImpact {
  skill: string;
  action: "create" | "update" | "remove";
  reason: string;
}

export interface EvolutionReport {
  changeType: ChangeSize;
  docChanges: DocChange[];
  skillImpact: SkillImpact[];
  removals: SkillImpact[];
}

// --- Feedback & Health Types ---

export type SignalType =
  | "skill_used"           // Skill was activated
  | "output_reverted"      // User reverted skill output (git revert within 5 min)
  | "output_heavily_edited"// User made large edits to skill output
  | "reprompt_same_topic"  // User re-prompted same task after skill ran
  | "user_rejected"        // User said "no", "stop", "not that" after skill
  | "user_rating_positive" // Explicit thumbs up
  | "user_rating_tweaks"   // "Needed tweaks"
  | "user_rating_negative" // "Didn't help"
  | "completed_cleanly";   // Skill finished without negative signals

export interface FeedbackSignal {
  id: string;
  skillName: string;
  type: SignalType;
  timestamp: string;
  details: string;
  sessionId: string;
}

export interface SkillHealth {
  skillName: string;
  score: number;           // 0-100, starts at 70
  totalUses: number;
  signals: FeedbackSignal[];
  lastUsed: string | null;
  lastScoreChange: { delta: number; reason: string; timestamp: string } | null;
  needsReview: boolean;    // true when score < 50
}

export interface FeedbackStore {
  skills: Record<string, SkillHealth>;
  lastUpdated: string;
}

export interface UserFeedback {
  skillName: string;
  rating: "positive" | "tweaks" | "negative";
  comment: string | null;
  timestamp: string;
}

export interface ExternalSkillMatch {
  source: string;          // "github" | "npm" | "community"
  name: string;
  url: string;
  description: string;
  similarity: number;      // 0-1
  advantages: string[];    // What this external skill does better
}

export interface ImprovementSuggestion {
  skillName: string;
  trigger: string;         // Why improvement was triggered
  currentScore: number;
  suggestions: string[];
  externalMatches: ExternalSkillMatch[];
}

// --- Dashboard Event Types ---

export type DashboardEventType =
  | "state_update"
  | "skill_update"
  | "log"
  | "phase_start"
  | "phase_complete"
  | "generation_start"
  | "generation_complete"
  | "eval_result"
  | "error"
  | "override_applied";

export interface DashboardEvent {
  type: DashboardEventType;
  timestamp: string;
  data: unknown;
}
