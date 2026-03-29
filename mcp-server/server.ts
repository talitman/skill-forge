import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { PipelineStateManager } from "./state";
import { handleForgeAnalyze } from "./tools/forge-analyze";
import { handleForgeGenerate } from "./tools/forge-generate";
import { handleForgeStatus } from "./tools/forge-status";
import { handleForgeControl } from "./tools/forge-control";
import { handleForgeManifest } from "./tools/forge-manifest";
import { handleForgeFeedback } from "./tools/forge-feedback";
import type { DashboardEvent } from "../shared/types";

const PORT = Number(process.env.FORGE_PORT ?? 4077);
const state = new PipelineStateManager();
const wsClients = new Set<any>();

// --- MCP Server ---

const mcp = new Server(
  { name: "skill-forge", version: "0.1.0" },
  {
    capabilities: { tools: {} },
    instructions: "Skill Forge MCP server. Use forge_* tools to analyze projects, generate skills, and manage the pipeline.",
  },
);

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "forge_analyze",
      description: "Analyze PRD/docs and codebase to produce a skill manifest. Pass document paths and project directory.",
      inputSchema: {
        type: "object" as const,
        properties: {
          documents: { type: "array", items: { type: "string" }, description: "Paths to PRD/doc files" },
          projectDir: { type: "string", description: "Project root directory" },
        },
        required: ["documents", "projectDir"],
      },
    },
    {
      name: "forge_generate",
      description: "Start generating skills from the manifest. Optionally specify a phase number to generate only that phase.",
      inputSchema: {
        type: "object" as const,
        properties: {
          manifestPath: { type: "string", description: "Path to skill-forge-manifest.json" },
          phase: { type: "number", description: "Specific phase to generate (omit for all)" },
        },
        required: ["manifestPath"],
      },
    },
    {
      name: "forge_status",
      description: "Get current pipeline state: status, progress, active generations, errors, and any pending user overrides.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
    },
    {
      name: "forge_control",
      description: "Control the pipeline: pause, resume, skip a skill, or retry a failed skill.",
      inputSchema: {
        type: "object" as const,
        properties: {
          action: { type: "string", enum: ["pause", "resume", "skip", "retry"], description: "Control action" },
          skill: { type: "string", description: "Skill name (required for skip/retry)" },
        },
        required: ["action"],
      },
    },
    {
      name: "forge_manifest",
      description: "Read or update the skill manifest. Use action 'read' to get current state, 'update_scope' to change a skill's scope.",
      inputSchema: {
        type: "object" as const,
        properties: {
          action: { type: "string", enum: ["read", "update_scope"], description: "Manifest action" },
          manifestPath: { type: "string", description: "Path to manifest file" },
          skill: { type: "string", description: "Skill name (for updates)" },
          scope: { type: "string", enum: ["project", "global"], description: "New scope (for update_scope)" },
        },
        required: ["action", "manifestPath"],
      },
    },
    {
      name: "forge_feedback",
      description: "Manage skill health and feedback. Actions: 'health' (overview), 'record_signal' (log a signal), 'rate' (user rating), 'diagnose' (improvement suggestions for a skill).",
      inputSchema: {
        type: "object" as const,
        properties: {
          action: { type: "string", enum: ["health", "record_signal", "rate", "diagnose"], description: "Feedback action" },
          projectDir: { type: "string", description: "Project root directory" },
          skill: { type: "string", description: "Skill name (for record_signal, rate, diagnose)" },
          signalType: { type: "string", description: "Signal type (for record_signal)" },
          rating: { type: "string", enum: ["positive", "tweaks", "negative"], description: "User rating (for rate)" },
          comment: { type: "string", description: "Optional comment (for rate)" },
          details: { type: "string", description: "Signal details (for record_signal)" },
          sessionId: { type: "string", description: "Session ID (for record_signal)" },
        },
        required: ["action"],
      },
    },
  ],
}));

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = (req.params.arguments ?? {}) as Record<string, unknown>;
  try {
    switch (req.params.name) {
      case "forge_analyze":
        return await handleForgeAnalyze(args, state);
      case "forge_generate":
        return await handleForgeGenerate(args, state);
      case "forge_status":
        return await handleForgeStatus(args, state);
      case "forge_control":
        return await handleForgeControl(args, state);
      case "forge_manifest":
        return await handleForgeManifest(args, state);
      case "forge_feedback":
        return await handleForgeFeedback(args, state);
      default:
        return { content: [{ type: "text" as const, text: `Unknown tool: ${req.params.name}` }], isError: true };
    }
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: `${req.params.name} error: ${err instanceof Error ? err.message : String(err)}` }],
      isError: true,
    };
  }
});

// --- HTTP + WebSocket for Dashboard ---

function broadcastToClients(event: DashboardEvent): void {
  const msg = JSON.stringify(event);
  for (const ws of wsClients) {
    try {
      ws.send(msg);
    } catch {
      wsClients.delete(ws);
    }
  }
}

for (const eventType of [
  "state_update", "skill_update", "log", "phase_start", "phase_complete",
  "generation_start", "generation_complete", "eval_result", "error", "override_applied",
]) {
  state.on(eventType, broadcastToClients);
}

const dashboardDir = new URL("./dashboard/", import.meta.url).pathname;

Bun.serve({
  port: PORT,
  hostname: "127.0.0.1",
  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/ws") {
      if (server.upgrade(req)) return;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    if (url.pathname === "/api/override" && req.method === "POST") {
      return (async () => {
        const body = await req.json();
        state.addOverride({
          id: `ov-${Date.now()}`,
          skill: body.skill,
          action: body.action,
          payload: body.payload ?? null,
          timestamp: new Date().toISOString(),
        });
        return Response.json({ ok: true });
      })();
    }

    if (url.pathname === "/api/state") {
      return Response.json(state.getState());
    }

    const filePath = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    try {
      return new Response(Bun.file(`${dashboardDir}${filePath}`));
    } catch {
      return new Response("Not found", { status: 404 });
    }
  },
  websocket: {
    open(ws) { wsClients.add(ws); },
    close(ws) { wsClients.delete(ws); },
    message(_ws, raw) {
      try {
        const msg = JSON.parse(String(raw));
        if (msg.type === "override") {
          state.addOverride({
            id: `ov-${Date.now()}`,
            skill: msg.skill,
            action: msg.action,
            payload: msg.payload ?? null,
            timestamp: new Date().toISOString(),
          });
        }
      } catch {
        // ignore malformed messages
      }
    },
  },
});

process.stderr.write(`skill-forge dashboard: http://localhost:${PORT}\n`);

// --- Connect MCP ---

await mcp.connect(new StdioServerTransport());
