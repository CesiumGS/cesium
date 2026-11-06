// The walk's composed accuracies (examples/frames-explorer/composed.ts, R8,
// C2): the library's own statement for a frame's origin against a reference,
// its terms tied to the path's edges (Task 2's deferred note: the Moon's
// relativistic term comes from accuracyOf and sits on no edge).
import { describe, expect, it } from "vitest";
import {
  composedAccuracy,
  composedView,
} from "../examples/frames-explorer/composed.ts";
import { buildTree } from "../examples/frames-explorer/tree.ts";
import { Frame } from "../src/frames/Frame.ts";
import { createFrames } from "../src/frames/frames.ts";
import { framePoint } from "../src/frames/local.ts";
import { measure } from "../src/measure/measure.ts";
import { Instant } from "../src/time/Instant.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

const frames = createFrames(syntheticFrameData());
const instant = Instant.fromTdb(0);
const tree = buildTree(frames, {}, instant);

describe("composedView", () => {
  it("is measure's statement for the frame's origin against the reference's", () => {
    const v = composedView(tree, frames, instant, "ITRF", "MOON_PA")!;
    const direct = measure(
      framePoint(frames.moonPa, [0, 0, 0], instant),
      framePoint(frames.itrf, [0, 0, 0], instant),
      instant,
      frames,
    ).accuracy;
    expect(v.statement).toEqual(direct);
  });

  it("includes the Moon's relativity term, from no edge", () => {
    const v = composedView(tree, frames, instant, "ITRF", "MOON_PA")!;
    const i = v.statement.terms.findIndex((t) => t.source === "relativity");
    expect(i).toBeGreaterThanOrEqual(0);
    expect(v.termEdges[i]).toEqual([]);
  });

  it("ties DE440's term to the path's translation edges, once", () => {
    const v = composedView(tree, frames, instant, "ITRF", "MOON_PA")!;
    const i = v.statement.terms.findIndex((t) => t.source === "ephemeris");
    expect(v.termEdges[i]).toEqual(["GCRF", "MOON_ICRF"]);
  });

  it("names every path edge that adds nothing, with a reason", () => {
    const v = composedView(tree, frames, instant, "ITRF", "MOON_PA")!;
    const used = new Set(v.termEdges.flat());
    const nothing = v.zeroAtOrigin.map((z) => z.edge);
    for (const edge of ["ITRF", "GCRF", "MOON_ICRF", "MOON_ME", "MOON_PA"]) {
      expect(used.has(edge) || nothing.includes(edge), edge).toBe(true);
    }
    for (const z of v.zeroAtOrigin) {
      expect(z.why.length).toBeGreaterThan(0);
    }
  });

  it("is exact for a frame against itself", () => {
    const v = composedView(tree, frames, instant, "ITRF", "ITRF")!;
    expect(v.statement.meters).toBe(0);
  });
});

describe("composedAccuracy", () => {
  it("states every frame against every reference", () => {
    const all = composedAccuracy(tree, frames, instant);
    for (const ref of ["ITRF", "GCRF", "ICRF"] as const) {
      for (const id of ["ICRF", "GCRF", "ITRF", "MOON_ME", "MOON_PA"]) {
        expect(all[ref][id], `${id} against ${ref}`).toBeDefined();
      }
    }
  });
});

describe("a statement that can't be composed (R8, F35)", () => {
  // A frame whose placement throws, as one outside its data would.
  const broken = new Frame("BROKEN", frames.icrf, () => {
    throw new Error("boom: no data here");
  });
  const withBroken = buildTree(frames, { local: [broken] }, instant);

  it("reads not bounded with the error, never exact", () => {
    const v = composedView(withBroken, frames, instant, "ITRF", "BROKEN")!;
    expect(v.statement.meters).toBeUndefined();
    expect(v.statement.warnings.join(" ")).toMatch(/boom: no data here/);
    expect(v.note).toMatch(/boom: no data here/);
  });
});
