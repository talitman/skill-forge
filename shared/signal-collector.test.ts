import { describe, test, expect } from "bun:test";
import {
  createEmptyStore,
  recordSignal,
  recordUserFeedback,
  detectGitSignals,
  detectRepromptSignal,
  detectRejectionSignal,
  getSkillsNeedingReview,
  getHealthSummary,
} from "./signal-collector";

describe("recordSignal", () => {
  test("initializes skill health on first signal", () => {
    const store = createEmptyStore();
    recordSignal(store, "my-skill", "skill_used", "First use", "session-1");
    expect(store.skills["my-skill"]).toBeDefined();
    expect(store.skills["my-skill"].totalUses).toBe(1);
    expect(store.skills["my-skill"].score).toBe(70); // Default
  });

  test("positive signal increases score", () => {
    const store = createEmptyStore();
    recordSignal(store, "my-skill", "skill_used", "Used", "s1");
    recordSignal(store, "my-skill", "completed_cleanly", "No issues", "s1");
    expect(store.skills["my-skill"].score).toBe(73); // 70 + 3
  });

  test("negative signal decreases score", () => {
    const store = createEmptyStore();
    recordSignal(store, "my-skill", "skill_used", "Used", "s1");
    recordSignal(store, "my-skill", "output_reverted", "User reverted", "s1");
    expect(store.skills["my-skill"].score).toBe(58); // 70 - 12
  });

  test("score clamps to 0-100", () => {
    const store = createEmptyStore();
    recordSignal(store, "my-skill", "skill_used", "Used", "s1");
    // Hammer it with negative signals
    for (let i = 0; i < 10; i++) {
      recordSignal(store, "my-skill", "output_reverted", "Reverted again", "s1");
    }
    expect(store.skills["my-skill"].score).toBe(0);
  });

  test("marks needsReview when score drops below 50", () => {
    const store = createEmptyStore();
    recordSignal(store, "my-skill", "skill_used", "Used", "s1");
    recordSignal(store, "my-skill", "output_reverted", "Reverted", "s1"); // 70 - 12 = 58
    expect(store.skills["my-skill"].needsReview).toBe(false);
    recordSignal(store, "my-skill", "user_rating_negative", "Bad", "s1"); // 58 - 10 = 48
    expect(store.skills["my-skill"].needsReview).toBe(true);
  });
});

describe("recordUserFeedback", () => {
  test("maps positive rating to signal", () => {
    const store = createEmptyStore();
    recordSignal(store, "my-skill", "skill_used", "Used", "s1");
    recordUserFeedback(store, {
      skillName: "my-skill",
      rating: "positive",
      comment: "Works great!",
      timestamp: new Date().toISOString(),
    }, "s1");
    expect(store.skills["my-skill"].score).toBe(75); // 70 + 5
  });

  test("maps negative rating to signal with comment", () => {
    const store = createEmptyStore();
    recordSignal(store, "my-skill", "skill_used", "Used", "s1");
    recordUserFeedback(store, {
      skillName: "my-skill",
      rating: "negative",
      comment: "Totally wrong output",
      timestamp: new Date().toISOString(),
    }, "s1");
    expect(store.skills["my-skill"].score).toBe(60); // 70 - 10
    const lastSignal = store.skills["my-skill"].signals.at(-1);
    expect(lastSignal!.details).toContain("Totally wrong output");
  });
});

describe("detectGitSignals", () => {
  test("detects revert within 5 minutes", () => {
    const result = detectGitSignals("my-skill", ["src/api.ts"], {
      filesChanged: ["src/api.ts"],
      linesChanged: 50,
      isRevert: true,
      timeSinceSkillUse: 120,
    });
    expect(result).not.toBeNull();
    expect(result!.type).toBe("output_reverted");
  });

  test("detects heavy edits to skill output", () => {
    const result = detectGitSignals("my-skill", ["src/api.ts", "src/routes.ts"], {
      filesChanged: ["src/api.ts", "src/routes.ts"],
      linesChanged: 45,
      isRevert: false,
      timeSinceSkillUse: 180,
    });
    expect(result).not.toBeNull();
    expect(result!.type).toBe("output_heavily_edited");
  });

  test("ignores activity after 5 minutes", () => {
    const result = detectGitSignals("my-skill", ["src/api.ts"], {
      filesChanged: ["src/api.ts"],
      linesChanged: 100,
      isRevert: true,
      timeSinceSkillUse: 600,
    });
    expect(result).toBeNull();
  });

  test("ignores small edits", () => {
    const result = detectGitSignals("my-skill", ["src/api.ts"], {
      filesChanged: ["src/api.ts"],
      linesChanged: 5,
      isRevert: false,
      timeSinceSkillUse: 60,
    });
    expect(result).toBeNull();
  });
});

describe("detectRepromptSignal", () => {
  test("detects similar re-prompt", () => {
    const result = detectRepromptSignal(
      "create a REST API endpoint for users with validation",
      "create-rest-api",
      "build REST API endpoint for user management",
      120,
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe("reprompt_same_topic");
  });

  test("ignores unrelated prompt", () => {
    const result = detectRepromptSignal(
      "fix the CSS styling on the header",
      "create-rest-api",
      "build REST API endpoint for user management",
      120,
    );
    expect(result).toBeNull();
  });

  test("ignores re-prompt after 10 minutes", () => {
    const result = detectRepromptSignal(
      "create a REST API endpoint for users",
      "create-rest-api",
      "build REST API endpoint for users",
      700,
    );
    expect(result).toBeNull();
  });
});

describe("detectRejectionSignal", () => {
  test("detects stop", () => {
    const result = detectRejectionSignal("stop, that's wrong", "my-skill");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("user_rejected");
  });

  test("detects not what I wanted", () => {
    const result = detectRejectionSignal("that's not what I wanted", "my-skill");
    expect(result).not.toBeNull();
  });

  test("ignores normal conversation", () => {
    const result = detectRejectionSignal("looks good, now add tests", "my-skill");
    expect(result).toBeNull();
  });
});

describe("getSkillsNeedingReview", () => {
  test("returns skills with score below 50", () => {
    const store = createEmptyStore();
    recordSignal(store, "good-skill", "completed_cleanly", "OK", "s1");
    recordSignal(store, "bad-skill", "skill_used", "Used", "s1");
    // Drop bad-skill below 50
    recordSignal(store, "bad-skill", "output_reverted", "Reverted", "s1");
    recordSignal(store, "bad-skill", "user_rating_negative", "Bad", "s1");

    const needsReview = getSkillsNeedingReview(store);
    expect(needsReview).toHaveLength(1);
    expect(needsReview[0].skillName).toBe("bad-skill");
  });
});

describe("getHealthSummary", () => {
  test("categorizes skills correctly", () => {
    const store = createEmptyStore();
    // Healthy skill (score 73)
    recordSignal(store, "healthy", "completed_cleanly", "OK", "s1");
    // Warning skill (score 58)
    recordSignal(store, "warning", "output_reverted", "Reverted", "s1");
    // Critical skill (score 48)
    recordSignal(store, "critical", "output_reverted", "Reverted", "s1");
    recordSignal(store, "critical", "user_rating_negative", "Bad", "s1");

    const summary = getHealthSummary(store);
    expect(summary.total).toBe(3);
    expect(summary.healthy).toBe(1);
    expect(summary.warning).toBe(1);
    expect(summary.critical).toBe(1);
  });
});
