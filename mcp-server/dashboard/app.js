const WS_URL = `ws://${location.host}/ws`;
const API_URL = `http://${location.host}/api`;

let ws;
let state = null;

function connect() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    const el = document.getElementById("connection-status");
    el.className = "status-badge connected";
    el.textContent = "Connected";
    fetchState();
  };

  ws.onclose = () => {
    const el = document.getElementById("connection-status");
    el.className = "status-badge disconnected";
    el.textContent = "Disconnected";
    setTimeout(connect, 2000);
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleEvent(data);
  };
}

async function fetchState() {
  try {
    const res = await fetch(`${API_URL}/state`);
    state = await res.json();
    renderState();
  } catch (e) {
    console.error("Failed to fetch state:", e);
  }
}

function handleEvent(event) {
  appendLog(event);

  switch (event.type) {
    case "state_update":
      if (state) Object.assign(state, event.data);
      renderState();
      break;
    case "generation_start":
      updateSkillCard(event.data.skill, "generating");
      break;
    case "generation_complete":
      updateSkillCard(event.data.skill, "complete");
      if (state) state.skillsComplete = event.data.skillsComplete;
      renderProgress();
      break;
    case "phase_start":
      if (state) {
        state.currentPhase = event.data.phase;
        state.totalPhases = event.data.totalPhases;
      }
      renderState();
      break;
    case "error":
      showError(event.data);
      break;
  }
}

function renderState() {
  if (!state) return;

  const statusEl = document.getElementById("pipeline-status");
  statusEl.textContent = state.status.charAt(0).toUpperCase() + state.status.slice(1);
  statusEl.className = `status-${state.status}`;

  const phaseInfo = document.getElementById("phase-info");
  if (state.currentPhase) {
    phaseInfo.textContent = `Phase ${state.currentPhase} of ${state.totalPhases}`;
  } else {
    phaseInfo.textContent = "";
  }

  renderProgress();
}

function renderProgress() {
  if (!state) return;
  const bar = document.getElementById("progress-bar");
  const text = document.getElementById("progress-text");
  const pct = state.skillsTotal > 0 ? (state.skillsComplete / state.skillsTotal) * 100 : 0;
  bar.style.width = `${pct}%`;
  text.textContent = `${state.skillsComplete} / ${state.skillsTotal} skills`;
}

function updateSkillCard(skillName, status) {
  const card = document.getElementById(`skill-${skillName}`);
  if (!card) return;
  const badge = card.querySelector(".skill-status");
  if (badge) {
    badge.textContent = status;
    badge.className = `skill-status status-${status}`;
  }
}

function createSkillCard(skill) {
  const card = document.createElement("div");
  card.className = "skill-card";
  card.id = `skill-${skill.name}`;

  const header = document.createElement("div");
  header.className = "skill-header";

  const nameSpan = document.createElement("span");
  nameSpan.className = "skill-name";
  nameSpan.textContent = skill.name;
  header.appendChild(nameSpan);

  const scopeSpan = document.createElement("span");
  scopeSpan.className = `skill-scope scope-${skill.scope}`;
  scopeSpan.textContent = skill.scope;
  header.appendChild(scopeSpan);

  card.appendChild(header);

  const statusSpan = document.createElement("span");
  statusSpan.className = `skill-status status-${skill.status}`;
  statusSpan.textContent = skill.status;
  card.appendChild(statusSpan);

  // Cost tier info
  if (skill.costEstimate) {
    const costRow = document.createElement("div");
    costRow.className = "skill-cost-row";

    const tierBadge = document.createElement("span");
    tierBadge.className = `cost-tier-badge tier-${skill.costEstimate.tier}`;
    tierBadge.textContent = skill.costEstimate.tier.toUpperCase();
    costRow.appendChild(tierBadge);

    const modelBadge = document.createElement("span");
    modelBadge.className = `cost-model-badge model-${skill.costEstimate.model}`;
    modelBadge.textContent = skill.costEstimate.model;
    costRow.appendChild(modelBadge);

    const tokenEst = document.createElement("span");
    tokenEst.className = "cost-tokens";
    const costStr = skill.costEstimate.estimatedCostUSD < 0.01
      ? "<$0.01"
      : `$${skill.costEstimate.estimatedCostUSD.toFixed(2)}`;
    tokenEst.textContent = `${costStr} (~${(skill.costEstimate.estimatedTokens / 1000).toFixed(0)}K tokens)`;
    costRow.appendChild(tokenEst);

    card.appendChild(costRow);

    const reasonText = document.createElement("div");
    reasonText.className = "cost-reason";
    reasonText.textContent = skill.costEstimate.reason;
    card.appendChild(reasonText);
  }

  const desc = document.createElement("p");
  desc.className = "skill-desc";
  desc.textContent = skill.description;
  card.appendChild(desc);

  const deps = document.createElement("div");
  deps.className = "skill-deps";
  deps.textContent = skill.dependsOn.length ? "Depends on: " + skill.dependsOn.join(", ") : "No dependencies";
  card.appendChild(deps);

  // Health score bar (if available)
  if (skill.health) {
    const healthRow = document.createElement("div");
    healthRow.className = "skill-health-row";

    const healthBarContainer = document.createElement("div");
    healthBarContainer.className = "skill-health-bar-container";

    const healthBar = document.createElement("div");
    const hColorClass = skill.health.score >= 70 ? "health-bar-good" : skill.health.score >= 50 ? "health-bar-warn" : "health-bar-bad";
    healthBar.className = `skill-health-bar ${hColorClass}`;
    healthBar.style.width = `${skill.health.score}%`;
    healthBarContainer.appendChild(healthBar);

    healthRow.appendChild(healthBarContainer);

    const healthScore = document.createElement("span");
    healthScore.className = "skill-health-score";
    healthScore.textContent = `${skill.health.score}/100`;
    healthRow.appendChild(healthScore);

    card.appendChild(healthRow);
  }

  const actions = document.createElement("div");
  actions.className = "skill-actions";

  const skipBtn = document.createElement("button");
  skipBtn.textContent = "Skip";
  skipBtn.addEventListener("click", () => sendOverride(skill.name, "skip"));
  actions.appendChild(skipBtn);

  const scopeBtn = document.createElement("button");
  scopeBtn.textContent = "Toggle Scope";
  scopeBtn.addEventListener("click", () => sendOverride(skill.name, "changeScope"));
  actions.appendChild(scopeBtn);

  card.appendChild(actions);

  return card;
}

function renderSkillCards(skills) {
  const container = document.getElementById("skill-cards");
  container.replaceChildren();
  for (const skill of skills) {
    container.appendChild(createSkillCard(skill));
  }
  renderCostSummary(skills);
}

function appendLog(event) {
  const log = document.getElementById("live-log");

  const entry = document.createElement("div");
  entry.className = `log-entry log-${event.type}`;

  const time = document.createElement("span");
  time.className = "log-time";
  time.textContent = new Date(event.timestamp).toLocaleTimeString();
  entry.appendChild(time);

  const typeLabel = document.createElement("span");
  typeLabel.className = "log-type";
  typeLabel.textContent = ` [${event.type}] `;
  entry.appendChild(typeLabel);

  const dataText = document.createTextNode(JSON.stringify(event.data));
  entry.appendChild(dataText);

  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

function showError(error) {
  const section = document.getElementById("errors-section");
  section.classList.remove("hidden");
  const list = document.getElementById("error-list");
  const entry = document.createElement("div");
  entry.className = "error-entry";
  entry.textContent = `${error.skill}: ${error.message}`;
  list.appendChild(entry);
}

async function sendOverride(skill, action) {
  try {
    await fetch(`${API_URL}/override`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skill, action }),
    });
    appendLog({
      type: "override_applied",
      timestamp: new Date().toISOString(),
      data: { skill, action, source: "dashboard" },
    });
  } catch (e) {
    console.error("Failed to send override:", e);
  }
}

function renderCostSummary(skills) {
  const section = document.getElementById("cost-summary-section");
  const panel = document.getElementById("cost-summary");

  // Count tiers, tokens, and dollars
  let totalTokens = 0;
  let totalCostUSD = 0;
  let fullPipelineTokens = 0;
  const fullPipelineCostPerSkill = 0.57; // 50K tokens * sonnet blended rate
  const tiers = { template: 0, light: 0, full: 0 };
  const models = { haiku: 0, sonnet: 0, opus: 0 };

  for (const skill of skills) {
    const est = skill.costEstimate;
    if (!est) continue;
    tiers[est.tier]++;
    models[est.model]++;
    totalTokens += est.estimatedTokens;
    totalCostUSD += est.estimatedCostUSD || 0;
    fullPipelineTokens += 50000;
  }

  if (fullPipelineTokens === 0) return;

  const skillCount = tiers.template + tiers.light + tiers.full;
  const fullPipelineCostUSD = skillCount * fullPipelineCostPerSkill;
  const savedUSD = fullPipelineCostUSD - totalCostUSD;

  section.classList.remove("hidden");
  panel.replaceChildren();

  const savings = fullPipelineTokens - totalTokens;
  const savingsPct = Math.round((savings / fullPipelineTokens) * 100);

  // Main cost headline with dollars
  const summaryLine = document.createElement("div");
  summaryLine.className = "cost-headline";
  summaryLine.textContent = `Estimated cost: $${totalCostUSD.toFixed(2)} (~${(totalTokens / 1000).toFixed(0)}K tokens)`;
  panel.appendChild(summaryLine);

  // Savings line
  const savingsLine = document.createElement("div");
  savingsLine.className = "cost-savings";
  savingsLine.textContent = `Saving $${savedUSD.toFixed(2)} (${savingsPct}%) vs full pipeline ($${fullPipelineCostUSD.toFixed(2)})`;
  panel.appendChild(savingsLine);

  // Tier breakdown
  const tierRow = document.createElement("div");
  tierRow.className = "cost-tier-row";

  const tierItems = [
    { label: "Template", count: tiers.template, cls: "tier-template" },
    { label: "Light", count: tiers.light, cls: "tier-light" },
    { label: "Full", count: tiers.full, cls: "tier-full" },
  ];

  for (const item of tierItems) {
    const badge = document.createElement("span");
    badge.className = `cost-tier-badge ${item.cls}`;
    badge.textContent = `${item.label}: ${item.count}`;
    tierRow.appendChild(badge);
  }
  panel.appendChild(tierRow);

  // Model breakdown
  const modelRow = document.createElement("div");
  modelRow.className = "cost-model-row";

  const modelItems = [
    { label: "Haiku", count: models.haiku, cls: "model-haiku" },
    { label: "Sonnet", count: models.sonnet, cls: "model-sonnet" },
    { label: "Opus", count: models.opus, cls: "model-opus" },
  ];

  for (const item of modelItems) {
    if (item.count === 0) continue;
    const badge = document.createElement("span");
    badge.className = `cost-model-badge ${item.cls}`;
    badge.textContent = `${item.label}: ${item.count}`;
    modelRow.appendChild(badge);
  }
  panel.appendChild(modelRow);
}

window.renderSkillCards = renderSkillCards;

function renderHealthData(feedbackStore) {
  if (!feedbackStore || !feedbackStore.skills) return;

  const section = document.getElementById("health-section");
  const summaryPanel = document.getElementById("health-summary");
  const skillsList = document.getElementById("health-skills");

  const skills = Object.values(feedbackStore.skills);
  if (skills.length === 0) return;

  section.classList.remove("hidden");
  summaryPanel.replaceChildren();
  skillsList.replaceChildren();

  // Count categories
  let healthy = 0, warning = 0, critical = 0;
  for (const s of skills) {
    if (s.score >= 70) healthy++;
    else if (s.score >= 50) warning++;
    else critical++;
  }

  // Summary badges
  const summaryRow = document.createElement("div");
  summaryRow.className = "health-summary-row";

  const totalBadge = document.createElement("span");
  totalBadge.className = "health-badge health-total";
  totalBadge.textContent = `Total: ${skills.length}`;
  summaryRow.appendChild(totalBadge);

  const healthyBadge = document.createElement("span");
  healthyBadge.className = "health-badge health-healthy";
  healthyBadge.textContent = `Healthy: ${healthy}`;
  summaryRow.appendChild(healthyBadge);

  if (warning > 0) {
    const warningBadge = document.createElement("span");
    warningBadge.className = "health-badge health-warning";
    warningBadge.textContent = `Warning: ${warning}`;
    summaryRow.appendChild(warningBadge);
  }

  if (critical > 0) {
    const criticalBadge = document.createElement("span");
    criticalBadge.className = "health-badge health-critical";
    criticalBadge.textContent = `Critical: ${critical}`;
    summaryRow.appendChild(criticalBadge);
  }

  summaryPanel.appendChild(summaryRow);

  // Per-skill health bars
  const sorted = skills.sort((a, b) => a.score - b.score);
  for (const skill of sorted) {
    const row = document.createElement("div");
    row.className = "health-skill-row";

    const name = document.createElement("span");
    name.className = "health-skill-name";
    name.textContent = skill.skillName;
    row.appendChild(name);

    const barContainer = document.createElement("div");
    barContainer.className = "health-bar-container";

    const bar = document.createElement("div");
    bar.className = "health-bar";
    const colorClass = skill.score >= 70 ? "health-bar-good" : skill.score >= 50 ? "health-bar-warn" : "health-bar-bad";
    bar.className = `health-bar ${colorClass}`;
    bar.style.width = `${skill.score}%`;
    barContainer.appendChild(bar);

    row.appendChild(barContainer);

    const scoreText = document.createElement("span");
    scoreText.className = "health-score-text";
    scoreText.textContent = `${skill.score}/100`;
    row.appendChild(scoreText);

    const usesText = document.createElement("span");
    usesText.className = "health-uses-text";
    usesText.textContent = `${skill.totalUses} uses`;
    row.appendChild(usesText);

    if (skill.needsReview) {
      const flag = document.createElement("span");
      flag.className = "health-review-flag";
      flag.textContent = "NEEDS REVIEW";
      row.appendChild(flag);
    }

    if (skill.lastScoreChange) {
      const reason = document.createElement("div");
      reason.className = "health-last-change";
      const delta = skill.lastScoreChange.delta > 0 ? `+${skill.lastScoreChange.delta}` : `${skill.lastScoreChange.delta}`;
      reason.textContent = `Last: ${delta} — ${skill.lastScoreChange.reason}`;
      row.appendChild(reason);
    }

    skillsList.appendChild(row);
  }
}

window.renderHealthData = renderHealthData;

connect();
