// The walk's composed accuracies (examples/frames-explorer/composed.ts, R8,
// C2): the library's own statement for a frame's origin against a reference,
// its terms tied to the path's edges (Task 2's deferred note: the Moon's
// relativistic term comes from accuracyOf and sits on no edge).
import { describe, expect, it } from "vitest";
import {
  composedAccuracy,
  composedView,
} from "../examples/frames-explorer/composed.ts";
import { buildTree, type TreeNode } from "../examples/frames-explorer/tree.ts";
import { cautionOf } from "../examples/frames-explorer/warnings.ts";
import { addsNothingText } from "../examples/frames-explorer/panel/walkWords.ts";
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
    // measure's statement, less its signal-only warnings (S-I4).
    expect(v.statement.meters).toBe(direct.meters);
    expect(v.statement.terms).toEqual(direct.terms);
  });

  it("drops measure's signal-only warnings: they say nothing of the separation (S-I4)", () => {
    const v = composedView(tree, frames, instant, "ITRF", "MOON_PA")!;
    // The two origins carry their own instant, so measure notes "no signal".
    expect(v.statement.warnings).toEqual([]);
    expect(v.statement.warningCodes ?? []).toEqual([]);
    expect(v.note ?? "").not.toMatch(/signal/);
    expect(v.statement.meters).toBeGreaterThan(0);
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

  it('says why MOON_PA and MOON_ME add nothing in whole words, never a note cut at "et al." (fix 2)', () => {
    const v = composedView(tree, frames, instant, "ITRF", "MOON_PA")!;
    const why = new Map(v.zeroAtOrigin.map((z) => [z.edge, z.why]));
    expect(why.get("MOON_PA")).toBe(
      "exact by definition for DE440 (its adopted constants)",
    );
    // MOON_PA's origin is the Moon's centre, MOON_ME's own: no lever.
    expect(why.get("MOON_ME")).toBe(
      "its rotation turns about this point: the lever arm is 0 m",
    );
    for (const w of why.values()) {
      expect(w).not.toMatch(/ et$|\(Park et$/);
    }
    const me = tree.children
      .flatMap(function all(n): (typeof tree)[] {
        return [n, ...n.children.flatMap(all)];
      })
      .find((n) => n.id === "MOON_ME")!;
    expect(me.edge.accuracy.short).toBe(
      "estimated, illustrative: 3 × 10⁻⁷ rad (about 0.5 m at the surface)",
    );
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

describe("the attention color (S-I4)", () => {
  it("is not raised by a signal-only warning, and is by an assumption or a separation warning", () => {
    const base = { meters: 0.032, terms: [], warnings: [] };
    expect(
      cautionOf({
        ...base,
        warnings: ["a carries its own instant … no signal"],
        warningCodes: ["own-instant-no-signal"],
      }),
    ).toBe(false);
    expect(
      cautionOf({
        ...base,
        warnings: ["The leap-second table has expired"],
        warningCodes: ["leap-seconds-expired"],
      }),
    ).toBe(true);
    expect(
      cautionOf({
        ...base,
        terms: [{ source: "coordinateScale", meters: 10, note: "TDB or TT" }],
      }),
    ).toBe(true);
    // Warnings without codes stay as they were: shown.
    expect(cautionOf({ ...base, warnings: ["something"] })).toBe(true);
  });
});

describe("a placed engineering-frame node (worker-held, S-I4)", () => {
  // An engineering node the main thread knows only from the worker: no
  // frame, its origin in ITRF and its PROJ operation's term.
  const node = {
    id: "engineering:Test zone",
    label: "Test zone",
    edge: {
      kind: "proj-operation" as const,
      detail: "PROJ operation",
      accuracy: { meters: 2, note: "PROJ's stated accuracy" },
    },
    children: [],
  };
  const withEngineering = buildTree(frames, {}, instant);
  const itrf = (function find(
    n: typeof withEngineering,
  ): typeof withEngineering | undefined {
    return n.id === "ITRF" ? n : n.children.map(find).find((x) => x);
  })(withEngineering)!;
  itrf.children.push(node);
  const placed = new Map([
    [
      node.id,
      {
        itrf: [6_378_137, 0, 0],
        projection: { source: "projection" as const, meters: 2, note: "PROJ" },
      },
    ],
  ]);

  it("keeps the warning codes, so signal-only warnings are dropped and don't raise the attention color", () => {
    const v = composedView(
      withEngineering,
      frames,
      instant,
      "ITRF",
      node.id,
      placed,
    )!;
    expect(v.statement.meters).toBeGreaterThan(1.9);
    expect(v.statement.warnings).toEqual([]);
    expect(v.statement.warningCodes).toEqual([]);
    expect(cautionOf(v.statement)).toBe(false);
  });
});

describe("the walk's words for an edge that adds nothing (the follow-up review, I1)", () => {
  const all = (n: TreeNode): TreeNode[] => [n, ...n.children.flatMap(all)];
  const node = (id: string) => all(tree).find((n) => n.id === id)!;
  it("says ITRF's 0 m Earth orientation turns about the reference's origin, never that a point 384,000 km off has a lever of 0 m", () => {
    for (const id of ["MOON_PA", "MOON_ICRF"]) {
      const v = composedView(tree, frames, instant, "ITRF", id)!;
      const itrf = node("ITRF");
      // ITRF's term is there, and 0 m: its end is the reference's origin.
      const on = v.termEdges.flatMap((edges, i) =>
        edges.includes("ITRF") ? [i] : [],
      );
      expect(on.length, id).toBeGreaterThan(0);
      expect(
        on.every((i) => v.statement.terms[i]!.meters === 0),
        id,
      ).toBe(true);
      const words = addsNothingText(itrf, v);
      expect(words, id).toBe(
        "Adds nothing here: its rotation turns about the reference's origin, so the separation from that origin doesn't change.",
      );
      expect(words).not.toMatch(/lever arm is 0 m/);
    }
  });

  it("says the lever arm is 0 m only where the point is at the rotation's origin (MOON_ME for MOON_PA, at the Moon's centre)", () => {
    const v = composedView(tree, frames, instant, "ITRF", "MOON_PA")!;
    expect(addsNothingText(node("MOON_ME"), v)).toBe(
      "Adds nothing at the origin: its rotation turns about this point: the lever arm is 0 m.",
    );
  });

  it("reads unbounded, never 0 m, where the rotation's lever can't be worked out", () => {
    // A tree whose MOON_ME node has lost its frame: no lever to work out.
    const copy = (n: TreeNode): TreeNode => ({
      ...n,
      ...(n.id === "MOON_ME" && { frame: undefined }),
      children: n.children.map(copy),
    });
    const broken = copy(tree);
    // MOON_PA's walk crosses MOON_ME; without its frame there is no lever.
    const v = composedView(broken, frames, instant, "ITRF", "MOON_PA")!;
    const z = v.zeroAtOrigin.find((x) => x.edge === "MOON_ME");
    expect(z).toBeUndefined();
    expect(v.statement.meters).toBeUndefined();
    expect(v.note).toMatch(/could not be composed at this point/);
  });
});
