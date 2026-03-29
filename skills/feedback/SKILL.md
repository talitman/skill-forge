---
name: skill-forge:feedback
description: View and manage skill health, feedback signals, and improvement suggestions. Use when the user asks about skill performance, wants to see which skills are working well or poorly, says "how are my skills doing", "skill health", "skill feedback", "which skills need fixing", or when the system detects a skill with low health score.
---

# Skill Forge — Feedback & Health

Monitor skill health and drive improvements based on real usage data.

## How Health Scoring Works

Every skill starts with a health score of 70/100. The score changes based on signals:

| Signal | Score Change | How Detected |
|---|---|---|
| Completed without issues | +3 | No negative signals after skill use |
| User rates "worked great" | +5 | Explicit feedback in dashboard |
| User rates "needed tweaks" | -3 | Explicit feedback in dashboard |
| User rates "didn't help" | -10 | Explicit feedback in dashboard |
| User says "stop", "wrong" etc. | -8 | Keyword detection after skill runs |
| User re-prompts same topic | -5 | Similar prompt detected within 10 min |
| User heavily edits output | -4 | >20 lines changed on skill output files within 5 min |
| User reverts output | -12 | Git revert detected within 5 min |

**Score thresholds:**
- 70-100: Healthy (green) — skill is working well
- 50-69: Warning (yellow) — skill has some issues
- 0-49: Critical (red) — needs review, improvement triggered

## Workflow

### 1. Show Health Overview

Read the feedback store (`skill-forge-feedback.json` in project root).

Present a summary:

**Skill Health Overview**
- Total skills: [N]
- Healthy (70+): [N] skills
- Warning (50-69): [N] skills
- Critical (<50): [N] skills

Then list each skill with its health bar:

```
setup-pnpm-monorepo    ████████████████████  95/100  ✓ healthy
create-rest-api        ██████████████░░░░░░  68/100  ⚠ warning
build-policy-engine    ████████░░░░░░░░░░░░  42/100  ✗ critical
```

### 2. Diagnose Low-Scoring Skills

For any skill scoring below 50:

1. Show the signal history — what events caused the score to drop
2. Analyze patterns:
   - Are outputs being reverted? → fundamental quality issue
   - Are users re-prompting? → skill doesn't solve the problem
   - Are outputs being heavily edited? → skill is close but not right
   - Is the skill being rejected? → triggering in wrong contexts
3. Show the last score change with reason

### 3. Search for External Improvements

For critical skills, search for similar skills externally:
1. Use WebSearch with queries built from the skill name and description
2. Look for Claude Code skills, prompt templates, and best practices
3. Compare external approaches with our skill
4. Present findings: "Found similar skill X on GitHub — it handles Y that ours doesn't"

### 4. Suggest and Apply Improvements

Based on signals and external research, suggest specific improvements:

| Problem Pattern | Suggested Fix |
|---|---|
| Output reverted | Regenerate skill with stricter requirements and more test cases |
| Re-prompted same topic | Expand skill's scope and success criteria |
| Heavily edited output | Fine-tune instructions, add more specific examples |
| Rejected/wrong trigger | Rewrite skill description for better trigger accuracy |
| External skill is better | Merge external approach into our skill |

Ask user which suggestions to apply. For approved suggestions:
- Regenerate the affected skill via `/skill-creator` with improvement context
- Run evals on the regenerated version
- Compare before/after scores

### 5. Collect Active Feedback

After any skill runs, optionally prompt:

> Skill "create-rest-api" just ran. Quick rating?
> [worked great] [needed tweaks] [didn't help] [skip]

If "needed tweaks" or "didn't help" → ask: "What was off?" (optional free text)

Save ratings to the feedback store.

## Dashboard Integration

The dashboard shows:
- **Health bar** on each skill card (green/yellow/red)
- **Health score** number
- **Signal count** badges (how many positive/negative signals)
- **"Needs Review"** flag on critical skills
- **Feedback history** panel — timeline of all signals per skill

## Transparency Principle

Every health score change is explained. The user can always see:
- The exact score (0-100)
- What signals affected it and when
- Why the system recommends an improvement
- What external skills were found and how they compare

No black-box decisions. Every recommendation comes with evidence.
