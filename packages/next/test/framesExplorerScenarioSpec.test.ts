// The frames explorer's scenario model (examples/frames-explorer/scenarios/):
// each scenario's knobs and its checked setup, the knob values and epoch
// where its published references apply. `checkedState` says whether a setup
// is the checked one and what moved; `clampKnobs` turns untrusted values (a
// deep link's) into a valid setup, never throwing (Review Focus 4).
import { describe, expect, it } from "vitest";
import {
  checkedState,
  clampKnobs,
  type ScenarioSpec,
} from "../examples/frames-explorer/scenarios/spec.ts";
import { SCENARIOS } from "../examples/frames-explorer/scenarios/specs.ts";
import { STRESS_CASES } from "../examples/frames-explorer/tests.ts";

const spec = (id: string): ScenarioSpec => {
  const found = SCENARIOS.find((s) => s.id === id);
  if (found === undefined) {
    throw new Error(`no scenario ${id}`);
  }
  return found;
};

const epochOf = (s: ScenarioSpec): number => Date.parse(s.checked.epochUtc);

describe("the ten scenarios", () => {
  it("are the spec's ten, each once, opening on a striking one and ending on the capstone", () => {
    const ids = SCENARIOS.map((s) => s.id);
    expect([...ids].sort()).toEqual([
      "bim-site",
      "corridor",
      "dish-tracks",
      "drone",
      "earth-turns",
      "everything",
      "moon-from-here",
      "one-path",
      "ship",
      "stand-on-moon",
    ]);
    expect(["earth-turns", "one-path"]).toContain(ids[0]);
    expect(ids.at(-1)).toBe("everything");
  });

  it("each has a title, a question, and at most four knobs with unique, URL-safe ids", () => {
    for (const s of SCENARIOS) {
      expect(s.title.trim(), s.id).not.toBe("");
      expect(s.question.trim(), s.id).not.toBe("");
      expect(s.knobs.length, s.id).toBeLessThanOrEqual(4);
      const knobIds = s.knobs.map((k) => k.id);
      expect(new Set(knobIds).size, s.id).toBe(knobIds.length);
      for (const k of s.knobs) {
        // `k.<id>` in the URL; "time" is checkedState's own name.
        expect(k.id, s.id).toMatch(/^[a-z][A-Za-z0-9]*$/);
        expect(k.id, s.id).not.toBe("time");
        expect(k.label.trim(), `${s.id} ${k.id}`).not.toBe("");
        if (k.kind === "range") {
          expect(k.min, `${s.id} ${k.id}`).toBeTypeOf("number");
          expect(k.max, `${s.id} ${k.id}`).toBeTypeOf("number");
          expect(k.min!, `${s.id} ${k.id}`).toBeLessThan(k.max!);
        } else {
          expect(k.options?.length, `${s.id} ${k.id}`).toBeGreaterThan(1);
          const values = k.options!.map((o) => o.value);
          expect(new Set(values).size, `${s.id} ${k.id}`).toBe(values.length);
        }
      }
    }
  });

  it("pins each checked setup to a UTC epoch", () => {
    for (const s of SCENARIOS) {
      expect(s.checked.epochUtc, s.id).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/,
      );
      expect(Number.isFinite(epochOf(s)), s.id).toBe(true);
    }
  });

  it("gives every checked setup valid knobs: clampKnobs leaves them unchanged", () => {
    for (const s of SCENARIOS) {
      expect(clampKnobs(s, s.checked.knobs), s.id).toEqual(s.checked.knobs);
      expect(Object.keys(s.checked.knobs).sort(), s.id).toEqual(
        s.knobs.map((k) => k.id).sort(),
      );
    }
  });

  it("backs its checks with catalog results that exist (ruling S1: non-empty lists only)", () => {
    // Result ids are the case's id or start with it (`<case>.<part>`). The
    // data test (test/data/framesExplorer.test.ts) checks each against a
    // full run's results.
    const cases = STRESS_CASES.map((c) => c.id);
    let checked = 0;
    for (const s of SCENARIOS) {
      if (s.checks.length === 0) {
        continue;
      }
      expect(new Set(s.checks).size, s.id).toBe(s.checks.length);
      for (const id of s.checks) {
        expect(
          cases.some((c) => id === c || id.startsWith(`${c}.`)),
          `${s.id}: ${id}`,
        ).toBe(true);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("states what data and globe each needs", () => {
    expect(spec("dish-tracks").needs).toContain("orion");
    expect(spec("one-path").needs).toContain("orion");
    // GEOID18 is its compound-CRS checks' need, not its own (fix 1).
    expect(spec("bim-site").needs).toEqual(["proj"]);
    // Task 7: the ship's track is synthetic (no AIS extract to load);
    // GEOID18 puts its sea at NAVD88 0, as it reads the drone's height.
    expect(spec("ship").needs).toEqual(["proj", "geoid", "terrain"]);
    expect(spec("drone").needs).toEqual(["proj", "geoid", "terrain"]);
    expect(spec("ship").globe).toBe("terrain");
    expect(spec("drone").globe).toBe("terrain");
    expect(spec("earth-turns").needs).toEqual([]);
  });

  it("checks DSS-43 at a signal-fixture time, and the BIM site on California zone 3 at the measurement site", () => {
    const dish = spec("dish-tracks");
    expect(dish.checked.knobs.station).toBe("DSS-43");
    expect(dish.checks).toContain("space.dss43-orion.light-time");
    const bim = spec("bim-site");
    expect(bim.checked.knobs).toEqual({
      site: "san-francisco",
      crs: "ca-zone-3",
      rotation: 12.5,
      scale: 1.0000375,
    });
    expect(bim.checks).toContain("measurement.grid-to-ground");
  });
});

describe("checkedState", () => {
  it("is at the checked setup at the checked knobs and epoch, for every scenario", () => {
    for (const s of SCENARIOS) {
      expect(checkedState(s, s.checked.knobs, epochOf(s)), s.id).toEqual({
        atChecked: true,
        changed: [],
      });
    }
  });

  it("names the one knob that moved", () => {
    const s = spec("bim-site");
    expect(
      checkedState(s, { ...s.checked.knobs, rotation: 30 }, epochOf(s)),
    ).toEqual({ atChecked: false, changed: ["rotation"] });
    const dish = spec("dish-tracks");
    expect(
      checkedState(
        dish,
        { ...dish.checked.knobs, station: "DSS-14" },
        epochOf(dish),
      ),
    ).toEqual({ atChecked: false, changed: ["station"] });
  });

  it("says time when only the time moved, even by a millisecond", () => {
    const s = spec("stand-on-moon");
    expect(checkedState(s, s.checked.knobs, epochOf(s) + 1)).toEqual({
      atChecked: false,
      changed: ["time"],
    });
  });

  it("lists every knob that moved, in the spec's order, then time", () => {
    const s = spec("bim-site");
    expect(
      checkedState(
        s,
        { site: "san-francisco", crs: "utm-10n", rotation: 12.5, scale: 1 },
        epochOf(s) - 60_000,
      ),
    ).toEqual({ atChecked: false, changed: ["crs", "scale", "time"] });
  });
});

describe("clampKnobs (Review Focus 4)", () => {
  it("clamps a range knob above its maximum, and below its minimum", () => {
    const s = spec("drone");
    const tilt = s.knobs.find((k) => k.id === "tilt")!;
    expect(clampKnobs(s, { ...s.checked.knobs, tilt: 1e9 }).tilt).toBe(
      tilt.max,
    );
    expect(clampKnobs(s, { ...s.checked.knobs, tilt: -1e9 }).tilt).toBe(
      tilt.min,
    );
  });

  it("replaces an unknown choice with the checked value", () => {
    const s = spec("dish-tracks");
    expect(clampKnobs(s, { station: "Mars" })).toEqual(s.checked.knobs);
  });

  it("keeps valid values, and reads a range knob's value from the URL's text", () => {
    const s = spec("bim-site");
    expect(
      clampKnobs(s, { crs: "utm-10n", rotation: "-30.5", scale: 0.99996 }),
    ).toEqual({
      // A link without the site knob takes the checked site.
      site: "san-francisco",
      crs: "utm-10n",
      rotation: -30.5,
      scale: 0.99996,
    });
    // An unknown site falls back to the checked one; a valid one is kept.
    expect(clampKnobs(s, { site: "Atlantis" }).site).toBe("san-francisco");
    expect(clampKnobs(s, { site: "portland" }).site).toBe("portland");
  });

  it("falls back to the checked value for anything else, and drops knobs the scenario hasn't", () => {
    const s = spec("bim-site");
    for (const bad of [
      undefined,
      null,
      "",
      " ",
      "abc",
      "12abc",
      "NaN",
      "Infinity",
      Number.NaN,
      Number.POSITIVE_INFINITY,
      {},
      [12],
      true,
    ]) {
      expect(
        clampKnobs(s, { crs: bad, rotation: bad, scale: bad, tilt: 5 }),
        String(bad),
      ).toEqual(s.checked.knobs);
    }
    // Too long to be a knob's number: no regex runs on it (ReDoS).
    for (const long of [`${"1".repeat(100_000)}x`, "1".repeat(33)]) {
      const start = performance.now();
      expect(clampKnobs(s, { rotation: long }).rotation).toBe(12.5);
      // 1 s, not 50 ms: a loaded machine mustn't make it flake (P1); a
      // backtracking regex would take minutes.
      expect(performance.now() - start).toBeLessThan(1000);
    }
    expect(clampKnobs(s, { rotation: `-${"0".repeat(28)}1.5` }).rotation).toBe(
      -1.5,
    );
    // A choice is matched exactly, not coerced.
    expect(clampKnobs(s, { crs: "CA-ZONE-3" }).crs).toBe("ca-zone-3");
  });
});
