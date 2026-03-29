# Skill Forge Hooks

## Signal Collection Hook

The `signal-hook.ts` script runs as a Claude Code `PostToolUse` hook to passively collect feedback about skill usage.

### What it detects

- **Skill used**: When any skill is invoked via the Skill tool
- **Clean completion**: When a skill finishes without error signals

### Setup

Add to your Claude Code settings (`.claude/settings.json`) or the plugin will configure it automatically:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "type": "command",
        "command": "bun run /path/to/skill-forge/hooks/signal-hook.ts"
      }
    ]
  }
}
```

### How it works

1. Claude Code calls the hook after every tool use
2. The hook checks if a Skill tool was used
3. If yes, it records a `skill_used` signal in `skill-forge-feedback.json`
4. If the skill completed cleanly, it records a `completed_cleanly` signal
5. The feedback store is updated with health score adjustments

### Other signals

Some signals are collected by the MCP server tools directly (not this hook):
- `user_rating_positive/tweaks/negative` — via `forge_feedback` MCP tool "rate" action
- `output_reverted` — via `forge_feedback` MCP tool "record_signal" action
- `output_heavily_edited` — via `forge_feedback` MCP tool "record_signal" action
- `reprompt_same_topic` — detected by the orchestrator SKILL.md
- `user_rejected` — detected by the orchestrator SKILL.md
