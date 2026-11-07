// Deep links (examples/frames-explorer/deepLinks.ts, R15, Review Focus 4):
// a scenario not on the page falls back to the strip's first, and the tab
// a link opens.
import { describe, expect, it } from "vitest";
import {
  createLinkWriter,
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

describe("the link while the clock plays (Task 4d)", () => {
  function page() {
    const p = { setup: "one-path:MOON_ME", playing: false, writes: 0 };
    const link = createLinkWriter({
      setup: () => p.setup,
      playing: () => p.playing,
      write: () => void p.writes++,
    });
    return { p, link };
  }

  it("writes each asked-for setup, but not a re-evaluation that only followed the playing clock", () => {
    const { p, link } = page();
    link.asked();
    expect(p.writes).toBe(1);
    p.playing = true;
    for (let i = 0; i < 10; i++) {
      // The clock moved: the host re-evaluates every 0.7 s.
      link.asked();
      link.clockChanged();
    }
    expect(p.writes).toBe(1);
  });

  it("takes the time when the clock stops", () => {
    const { p, link } = page();
    link.asked();
    p.playing = true;
    link.asked();
    p.playing = false;
    link.clockChanged();
    expect(p.writes).toBe(2);
    // Nothing behind any more: a later change of the clock writes nothing.
    link.clockChanged();
    expect(p.writes).toBe(2);
  });

  it("writes a knob or a scenario at once, playing or not", () => {
    const { p, link } = page();
    link.asked();
    p.playing = true;
    p.setup = "one-path:ITRF";
    link.asked();
    expect(p.writes).toBe(2);
  });
});
