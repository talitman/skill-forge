import type { CostEstimate, CostSummary, CostTier, ModelPricing, ModelTier, SkillCandidate } from "./types";
import { findTemplate } from "./template-registry";

const TOKEN_ESTIMATES: Record<CostTier, number> = {
  template: 500,     // Just variable substitution, near-zero
  light: 15000,      // Generate SKILL.md, no evals
  full: 50000,       // Generate + eval loop + iteration
};

// Claude API pricing (USD per 1M tokens) — assumes ~30% input / 70% output blend
// Update these when pricing changes
const MODEL_PRICING: Record<ModelTier, ModelPricing> = {
  haiku: { inputPer1M: 0.80, outputPer1M: 4.00, blendedPer1K: 0.00304 },
  sonnet: { inputPer1M: 3.00, outputPer1M: 15.00, blendedPer1K: 0.01140 },
  opus: { inputPer1M: 15.00, outputPer1M: 75.00, blendedPer1K: 0.05700 },
};

const FULL_PIPELINE_TOKENS = 50000;
const FULL_PIPELINE_MODEL: ModelTier = "sonnet"; // Default model if no optimization

export function getModelPricing(): Record<ModelTier, ModelPricing> {
  return { ...MODEL_PRICING };
}

export function estimateCostUSD(tokens: number, model: ModelTier): number {
  return Math.round((tokens / 1000) * MODEL_PRICING[model].blendedPer1K * 10000) / 10000;
}

export function classifyCostTier(
  candidate: SkillCandidate,
  scopeResult: { scope: string; action: string },
): CostEstimate {
  // Tier 1: Check for template match
  const template = findTemplate(candidate.name, candidate.description);
  if (template) {
    const tokens = TOKEN_ESTIMATES.template;
    return {
      tier: "template",
      model: "haiku" as ModelTier,
      reason: `Pre-built template "${template.name}" matches — customize variables only, no generation needed`,
      estimatedTokens: tokens,
      estimatedCostUSD: estimateCostUSD(tokens, "haiku"),
      skipEvals: true,
      templateName: template.name,
    };
  }

  // Tier 2: Global scope + generic pattern → light generation (Haiku, no evals)
  if (scopeResult.scope === "global" && scopeResult.action === "create") {
    const tokens = TOKEN_ESTIMATES.light;
    return {
      tier: "light",
      model: "haiku" as ModelTier,
      reason: "Generic dev pattern (global scope) — generate with fast model, skip evals",
      estimatedTokens: tokens,
      estimatedCostUSD: estimateCostUSD(tokens, "haiku"),
      skipEvals: true,
      templateName: null,
    };
  }

  // Tier 3: Project scope but simple (few requirements, no complex deps)
  if (scopeResult.scope === "project" && candidate.requirements.length <= 3) {
    const tokens = TOKEN_ESTIMATES.light;
    return {
      tier: "light",
      model: "sonnet" as ModelTier,
      reason: "Project-specific but simple (≤3 requirements) — generate with standard model, skip evals",
      estimatedTokens: tokens,
      estimatedCostUSD: estimateCostUSD(tokens, "sonnet"),
      skipEvals: true,
      templateName: null,
    };
  }

  // Tier 4: Complex project skill → full pipeline (Opus/Sonnet + evals)
  const isComplex = candidate.requirements.length > 5;
  const model: ModelTier = isComplex ? "opus" : "sonnet";
  const tokens = TOKEN_ESTIMATES.full;
  return {
    tier: "full",
    model,
    reason: isComplex
      ? `Complex project skill (${candidate.requirements.length} requirements) — full pipeline with most capable model + evals`
      : `Project-specific skill (${candidate.requirements.length} requirements) — full pipeline with standard model + evals`,
    estimatedTokens: tokens,
    estimatedCostUSD: estimateCostUSD(tokens, model),
    skipEvals: false,
    templateName: null,
  };
}

export function calculateCostSummary(estimates: CostEstimate[]): CostSummary {
  const byTier = { template: 0, light: 0, full: 0 };
  const byModel = { haiku: 0, sonnet: 0, opus: 0 };
  let totalEstimatedTokens = 0;
  let totalEstimatedCostUSD = 0;

  for (const est of estimates) {
    byTier[est.tier]++;
    byModel[est.model]++;
    totalEstimatedTokens += est.estimatedTokens;
    totalEstimatedCostUSD += est.estimatedCostUSD;
  }

  const fullPipelineTotal = estimates.length * FULL_PIPELINE_TOKENS;
  const fullPipelineCostUSD = estimates.length * estimateCostUSD(FULL_PIPELINE_TOKENS, FULL_PIPELINE_MODEL);
  const savedVsFullPipeline = fullPipelineTotal - totalEstimatedTokens;
  const savedCostUSD = Math.round((fullPipelineCostUSD - totalEstimatedCostUSD) * 100) / 100;
  const savingsPercent = fullPipelineTotal > 0
    ? Math.round((savedVsFullPipeline / fullPipelineTotal) * 100)
    : 0;

  return {
    totalEstimatedTokens,
    totalEstimatedCostUSD: Math.round(totalEstimatedCostUSD * 100) / 100,
    fullPipelineCostUSD: Math.round(fullPipelineCostUSD * 100) / 100,
    savedCostUSD,
    byTier,
    byModel,
    savedVsFullPipeline,
    savingsPercent,
  };
}
