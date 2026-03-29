import { describe, test, expect } from "bun:test";
import { PipelineStateManager } from "./state";

describe("PipelineStateManager", () => {
  test("starts in idle state", () => {
    const mgr = new PipelineStateManager();
    const state = mgr.getState();
    expect(state.status).toBe("idle");
    expect(state.currentPhase).toBeNull();
    expect(state.pendingOverrides).toEqual([]);
  });

  test("transitions to analyzing", () => {
    const mgr = new PipelineStateManager();
    mgr.setStatus("analyzing");
    expect(mgr.getState().status).toBe("analyzing");
  });

  test("tracks active generations", () => {
    const mgr = new PipelineStateManager();
    mgr.startGeneration("setup-monorepo");
    expect(mgr.getState().activeGenerations).toContain("setup-monorepo");
    mgr.completeGeneration("setup-monorepo");
    expect(mgr.getState().activeGenerations).not.toContain("setup-monorepo");
  });

  test("queues and drains pending overrides", () => {
    const mgr = new PipelineStateManager();
    mgr.addOverride({
      id: "ov-1",
      skill: "setup-monorepo",
      action: "skip",
      payload: null,
      timestamp: new Date().toISOString(),
    });
    expect(mgr.getState().pendingOverrides).toHaveLength(1);
    const drained = mgr.drainOverrides();
    expect(drained).toHaveLength(1);
    expect(mgr.getState().pendingOverrides).toHaveLength(0);
  });

  test("emits events on state changes", () => {
    const mgr = new PipelineStateManager();
    const events: string[] = [];
    mgr.on("state_update", () => events.push("update"));
    mgr.setStatus("analyzing");
    expect(events).toEqual(["update"]);
  });

  test("records errors", () => {
    const mgr = new PipelineStateManager();
    mgr.addError("bad-skill", "Generation failed");
    expect(mgr.getState().errors).toHaveLength(1);
    expect(mgr.getState().errors[0].skill).toBe("bad-skill");
  });
});
