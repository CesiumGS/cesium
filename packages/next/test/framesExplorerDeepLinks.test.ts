// Deep links (examples/frames-explorer/deepLinks.ts, R15, Review Focus 4):
// a scenario not on the page falls back to the strip's first, and the tab
// a link opens.
import { describe, expect, it } from "vitest";
import {
  initialTab,
  readyScenario,
} from "../examples/frames-explorer/deepLinks.ts";
import { READY } from "../examples/frames-explorer/scenarios/scenes.ts";
import type { ScenarioId } from "../examples/frames-explorer/scenarios/spec.ts";

describe("readyScenario", () => {
  it("keeps a scenario on the page", () => {
    expect(readyScenario(READY.at(-1))).toBe(READY.at(-1));
  });

  it("falls back to the strip's first for none, or one not on the page", () => {
    expect(readyScenario(undefined)).toBe(READY[0]);
    expect(readyScenario("not-a-scenario" as ScenarioId)).toBe(READY[0]);
  });
});

describe("initialTab", () => {
  const none = { selection: { kind: "none" as const } };

  it("opens the tab the link names", () => {
    expect(initialTab({ tab: "report" }, none)).toBe("report");
    expect(initialTab({ tab: "explore" }, none)).toBe("explore");
  });

  it("opens Verification for a linked result", () => {
    expect(
      initialTab({}, { selection: { kind: "result", id: "space.lunar-time" } }),
    ).toBe("verify");
  });

  it("ignores an unknown tab", () => {
    expect(initialTab({ tab: "<script>" }, none)).toBeUndefined();
  });
});
