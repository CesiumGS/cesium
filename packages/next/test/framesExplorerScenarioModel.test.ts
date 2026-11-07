// The scenario's part of the panel model (examples/frames-explorer/
// scenarioModel.ts) and the panel model's pure parts (panelModel.ts):
// freshness, the published value against ours (Review Focus 1: nothing off
// the checked setup reads as checked), and the groups waiting for data.
import { describe, expect, it } from "vitest";
import {
  extrasOf,
  waitingGroups,
} from "../examples/frames-explorer/panelModel.ts";
import type { ScenarioHostState } from "../examples/frames-explorer/scenarioHost.ts";
import {
  publishedView,
  scenarioFreshness,
  scenarioView,
} from "../examples/frames-explorer/scenarioModel.ts";
import type { ScenarioAnswer } from "../examples/frames-explorer/scenarios/evaluate.ts";
import { READY } from "../examples/frames-explorer/scenarios/scenes.ts";
import { SCENARIOS } from "../examples/frames-explorer/scenarios/specs.ts";
import type { StressResult } from "../examples/frames-explorer/tests.ts";

const result = (r: Partial<StressResult>): StressResult =>
  ({ id: "x", group: "g", title: "x", pass: true, ...r }) as StressResult;

const PUB: NonNullable<ScenarioAnswer["published"]> = {
  value: 56.02,
  unit: "µs/day",
  printed: "56.02 µs/day",
  document: "A paper",
  checkId: "space.lunar-time",
  tolerance: "within 2%",
};

describe("scenarioFreshness", () => {
  it("is current when the evaluation is this setup's", () => {
    expect(scenarioFreshness({ stale: false, staleBy: [] }, true)).toBe(
      "current",
    );
  });

  it("follows the clock while it plays and only the time moved", () => {
    expect(scenarioFreshness({ stale: true, staleBy: ["time"] }, true)).toBe(
      "following",
    );
  });

  it("is updating when a knob moved, or the clock was scrubbed", () => {
    expect(
      scenarioFreshness({ stale: true, staleBy: ["latitude", "time"] }, true),
    ).toBe("updating");
    expect(scenarioFreshness({ stale: true, staleBy: ["time"] }, false)).toBe(
      "updating",
    );
  });
});

describe("publishedView", () => {
  const checked = new Map([
    [
      PUB.checkId,
      result({
        id: PUB.checkId,
        pass: true,
        value: 0.01,
        unit: "µs/day",
        effect: { value: 56.03 } as StressResult["effect"],
      }),
    ],
  ]);

  it("is nothing without a published counterpart", () => {
    expect(publishedView(undefined, checked, true, "current", [])).toEqual({});
  });

  it("is checked, with ours and the difference, at the checked setup", () => {
    const v = publishedView(PUB, checked, true, "current", []);
    expect(v.published).toMatchObject({
      state: "checked",
      ours: 56.03,
      difference: { value: 0.01, unit: "µs/day" },
      pass: true,
    });
  });

  it("is loading while the check isn't in or the answer is stale", () => {
    expect(
      publishedView(PUB, new Map(), true, "current", []).published?.state,
    ).toBe("loading");
    expect(
      publishedView(PUB, checked, true, "updating", []).published?.state,
    ).toBe("loading");
  });

  it("takes ours from the answer where the check has no effect of its own (the dish's light time, fix 1)", () => {
    const light = new Map([
      [
        PUB.checkId,
        result({ id: PUB.checkId, pass: true, value: 0.45, unit: "m" }),
      ],
    ]);
    const pub = { ...PUB, value: 1.3152565, unit: "s" };
    const v = publishedView(pub, light, true, "current", [], 1.315257);
    // The difference at this row's own instant, in time: not the check's
    // worst row (its 0.45 m).
    expect(v.published).toMatchObject({
      state: "checked",
      ours: 1.315257,
      unit: "s",
      pass: true,
    });
    expect(v.published?.difference?.unit).toBe("s");
    expect(v.published?.difference?.value).toBeCloseTo(5e-7, 12);
    // An effect, where there is one, is ours.
    expect(
      publishedView(PUB, checked, true, "current", [], 1).published,
    ).toMatchObject({ ours: 56.03 });
  });

  it("is off, never checked, away from the checked setup", () => {
    const v = publishedView(PUB, checked, false, "current", [
      {
        status: "reference-only",
        id: PUB.checkId,
        delta: "your setting moves the answer by 1%",
      } as never,
    ]);
    expect(v.published?.state).toBe("off");
    expect(v.published).not.toHaveProperty("pass");
    expect(v.published).toHaveProperty("delta");
  });
});

describe("scenarioView", () => {
  it("lists the ready scenarios and scrubs the problem's message", () => {
    const spec = SCENARIOS.find((s) => s.id === READY[0])!;
    const st: ScenarioHostState = {
      spec,
      knobs: spec.checked.knobs,
      epochUtcMs: Date.parse(spec.checked.epochUtc),
      atChecked: true,
      changed: [],
      status: "error",
      stale: false,
      staleBy: [],
      problem: { message: "token abc12345 refused", missing: false },
      generation: 1,
    };
    const v = scenarioView({
      st,
      results: [],
      tree: undefined,
      playing: false,
      rate: 1,
      scrub: (t) => t.replace("abc12345", "[redacted]"),
    });
    expect(v.strip.map((s) => s.id)).toEqual([...READY]);
    expect(v.freshness).toBe("current");
    expect(v.problem?.message).toBe("token [redacted] refused");
    expect(v.checks).toHaveLength(spec.checks.length);
    expect(v).not.toHaveProperty("published");
    expect(v).not.toHaveProperty("route");
  });

  it("gives the dish a measured-data row from its mask check, on and off the checked setup (fix 1)", () => {
    const spec = SCENARIOS.find((s) => s.id === "dish-tracks")!;
    const evaluation = {
      scenario: "dish-tracks",
      added: [],
      answer: {
        label: "one way",
        headline: "x",
        value: 1.3152,
        unit: "s",
        accuracy: { meters: 10, note: "n" },
      },
      overlays: [],
      live: [],
      maskCheck: {
        label: "DSS-14's published receive mask",
        source: { document: "DSN 810-005" },
        from: [0, 0, 0],
        samples: [0, 45, 90].map((azimuth) => ({
          azimuth,
          elevation: 6,
          to: [1, 0, 0],
        })),
      },
    } as const;
    for (const atChecked of [true, false]) {
      const knobs = atChecked
        ? spec.checked.knobs
        : { ...spec.checked.knobs, station: "DSS-14" };
      const at = Date.parse(spec.checked.epochUtc);
      const v = scenarioView({
        st: {
          spec,
          knobs,
          epochUtcMs: at,
          atChecked,
          changed: atChecked ? [] : ["station"],
          status: "ready",
          evaluation: evaluation as never,
          evaluatedAt: { knobs, epochUtcMs: at },
          stale: false,
          staleBy: [],
          generation: 2,
        },
        results: [],
        tree: undefined,
        playing: false,
        rate: 1,
        terrain: [
          {
            id: "mask-check",
            traced: "DSS-14's published receive mask",
            state: "may-block",
            text: "Our terrain against DSS-14's mask: can't tell",
            mask: { azimuths: 3, below: 1, above: 0, unsure: 2 },
          },
        ],
        scrub: (t) => t,
      });
      const row = v.checks.at(-1)!;
      expect(row).toMatchObject({
        status: "page",
        kind: "measured",
        check: { outcome: "unsure" },
      });
      // Never "reference applies at the checked setup": the mask is the station's.
      expect(v.checks.filter((r) => r.status === "page")).toHaveLength(1);
    }
  });
});

describe("the panel model's pure parts", () => {
  it("waits for an item still fetching, until its group has results", () => {
    const loading = {
      get: () => ({ state: "fetching" as const }),
    } as unknown as Parameters<typeof waitingGroups>[0];
    const waiting = waitingGroups(loading, false, []);
    expect(Object.keys(waiting).length).toBeGreaterThan(0);
    const group = Object.keys(waiting)[0]!;
    expect(
      waitingGroups(loading, false, [result({ group })])[group],
    ).toBeUndefined();
  });

  it("says an expected error is what a check was compared with", () => {
    expect(extrasOf(result({ expectedError: "bad" })).compared).toEqual({
      kind: "error",
      text: "An error matching /bad/.",
    });
  });
});
