import type {
  PipelineState,
  PipelineStatus,
  PipelineError,
  PendingOverride,
  DashboardEvent,
  DashboardEventType,
} from "../shared/types";

type EventHandler = (event: DashboardEvent) => void;

export class PipelineStateManager {
  private state: PipelineState;
  private listeners: Map<string, EventHandler[]> = new Map();

  constructor() {
    this.state = {
      status: "idle",
      currentPhase: null,
      totalPhases: 0,
      skillsComplete: 0,
      skillsTotal: 0,
      activeGenerations: [],
      errors: [],
      pendingOverrides: [],
    };
  }

  getState(): PipelineState {
    return {
      ...this.state,
      activeGenerations: [...this.state.activeGenerations],
      errors: [...this.state.errors],
      pendingOverrides: [...this.state.pendingOverrides],
    };
  }

  setStatus(status: PipelineStatus): void {
    this.state.status = status;
    this.emit("state_update", { status });
  }

  setPhaseInfo(currentPhase: number, totalPhases: number, skillsTotal: number): void {
    this.state.currentPhase = currentPhase;
    this.state.totalPhases = totalPhases;
    this.state.skillsTotal = skillsTotal;
    this.emit("phase_start", { phase: currentPhase, totalPhases, skillsTotal });
  }

  startGeneration(skillName: string): void {
    this.state.activeGenerations.push(skillName);
    this.emit("generation_start", { skill: skillName });
  }

  completeGeneration(skillName: string): void {
    this.state.activeGenerations = this.state.activeGenerations.filter((s) => s !== skillName);
    this.state.skillsComplete++;
    this.emit("generation_complete", { skill: skillName, skillsComplete: this.state.skillsComplete });
  }

  addError(skill: string, message: string): void {
    const error: PipelineError = { skill, message, timestamp: new Date().toISOString() };
    this.state.errors.push(error);
    this.emit("error", error);
  }

  addOverride(override: PendingOverride): void {
    this.state.pendingOverrides.push(override);
  }

  drainOverrides(): PendingOverride[] {
    const overrides = [...this.state.pendingOverrides];
    this.state.pendingOverrides = [];
    return overrides;
  }

  on(eventType: DashboardEventType | string, handler: EventHandler): void {
    const handlers = this.listeners.get(eventType) ?? [];
    handlers.push(handler);
    this.listeners.set(eventType, handlers);
  }

  private emit(type: DashboardEventType, data: unknown): void {
    const event: DashboardEvent = {
      type,
      timestamp: new Date().toISOString(),
      data,
    };
    const handlers = this.listeners.get(type) ?? [];
    for (const handler of handlers) {
      handler(event);
    }
  }
}
