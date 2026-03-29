import type { Phase, SkillCandidate } from "./types";

export function buildDependencyGraph(
  candidates: SkillCandidate[],
  dependencies: Record<string, string[]>,
): Record<string, string[]> {
  const graph: Record<string, string[]> = {};
  for (const c of candidates) {
    graph[c.name] = dependencies[c.name] ?? [];
  }
  return graph;
}

export function resolvePhases(deps: Record<string, string[]>): Phase[] {
  const phases: Phase[] = [];
  const resolved = new Set<string>();
  const remaining = new Set(Object.keys(deps));

  let phaseId = 1;
  while (remaining.size > 0) {
    const ready: string[] = [];

    for (const skill of remaining) {
      const skillDeps = deps[skill] ?? [];
      const allDepsResolved = skillDeps.every((d) => resolved.has(d));
      if (allDepsResolved) {
        ready.push(skill);
      }
    }

    if (ready.length === 0) {
      throw new Error(
        `Circular dependency detected among: ${[...remaining].join(", ")}`
      );
    }

    phases.push({
      id: phaseId,
      name: `Phase ${phaseId}`,
      skills: ready.sort(),
    });

    for (const skill of ready) {
      resolved.add(skill);
      remaining.delete(skill);
    }

    phaseId++;
  }

  return phases;
}
