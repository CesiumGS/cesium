// Clip effects (scene/world/clips.ts `ClipEffect`; surface.slang `clipsKeep`,
// `clipsReport`): what a set does with what it doesn't keep. The GPU's test is
// checked in the spike (spikes/clipEffects.ts); here the table's layout, its
// float32 twin (`tableVerdict`), and the CPU's agreement with it.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RecordFlags } from "../src/render/layout.ts";
import {
  CLIP_ANY_GHOST,
  CLIP_ANY_REPORT,
  CLIP_EFFECT_ROWS,
  CLIP_FLAG_GHOST,
  CLIP_FLAG_REMOVED,
  CLIP_GHOST_ALPHA,
  CLIP_GHOST_FAR,
  CLIP_NO_DISTANCE,
  CLIP_NO_ID,
  CLIP_SET_EFFECT_SHIFT,
  CLIP_SET_GHOST,
  CLIP_SET_REPORT,
  CLIP_SET_SHADE,
  CLIP_SET_STIPPLE,
  CLIP_TABLE_ROWS,
  WorldClips,
  clipSetDistance,
  clipSetKeeps,
  ghostRange,
  isBlendedGhost,
  packClipTable,
  tableKeeps,
  tableVerdict,
  validateClipSet,
  type ClipEffect,
  type ClipSet,
  type ClipShape,
  type PlannedClip,
} from "../src/scene/world/clips.ts";

const FRAME = { name: "test frame" };
const IDENTITY = Float64Array.of(
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
);

const BOX: ClipShape = {
  kind: "box",
  center: [10, 0, 0],
  halfExtents: [2, 3, 4],
};
const PLANE: ClipShape = { kind: "plane", point: [0, 0, 1], normal: [0, 0, 2] };
const RING: ClipShape = {
  kind: "polygon",
  ring: [
    [0, 0],
    [4, 0],
    [4, 2],
    [2, 2],
    [2, 4],
    [0, 4],
  ],
  zRange: [-1, 1],
};

const set = (
  shapes: ClipShape[],
  effect?: ClipEffect,
  rest: Partial<ClipSet> = {},
): ClipSet => ({
  frame: FRAME,
  shapes,
  ...(effect === undefined ? {} : { effect }),
  ...rest,
});

const plan = (s: ClipSet, matrix = IDENTITY): PlannedClip => ({
  set: s,
  space: "true",
  matrix,
});

const pack = (
  sets: ClipSet[],
  camera: [number, number, number] = [0, 0, 0],
): Float32Array => {
  const table = new Float32Array(CLIP_TABLE_ROWS * 4);
  packClipTable(
    sets.map((s) => plan(s)),
    camera,
    table,
  );
  return table;
};

const at = (p: number[]) => ({ true: p, drawn: p });

describe("an effect's validation", () => {
  it("takes discard, translucent and shade, and says what is wrong with the rest", () => {
    expect(() => validateClipSet(set([PLANE], "discard"))).not.toThrow();
    expect(() =>
      validateClipSet(set([PLANE], { kind: "translucent", alpha: 0.3 })),
    ).not.toThrow();
    expect(() =>
      validateClipSet(set([PLANE], { kind: "shade", params: [1, 2, 3, 4] })),
    ).not.toThrow();
    expect(() =>
      validateClipSet(set([PLANE], { kind: "translucent", alpha: 1 })),
    ).toThrow(/alpha is from 0 up to/);
    expect(() =>
      validateClipSet(set([PLANE], { kind: "translucent", alpha: -0.1 })),
    ).toThrow(RangeError);
    expect(() =>
      validateClipSet(set([PLANE], { kind: "translucent", tintStrength: 2 })),
    ).toThrow(/tintStrength/);
    expect(() =>
      validateClipSet(
        set([PLANE], { kind: "translucent", tint: [1, Number.NaN, 0] }),
      ),
    ).toThrow(/tint/);
    expect(() =>
      validateClipSet(
        set([PLANE], { kind: "translucent", method: "dots" as "blend" }),
      ),
    ).toThrow(/method/);
    expect(() =>
      validateClipSet(
        set([PLANE], { kind: "shade", params: [1, 2, 3] as never }),
      ),
    ).toThrow(/four finite/);
    expect(() =>
      validateClipSet(set([PLANE], { kind: "paint" } as never)),
    ).toThrow(/unknown clip effect kind/);
  });

  it("a world keeps the effect with its defaults filled in, frozen", () => {
    const clips = new WorldClips({});
    const handle = clips.add(set([BOX], { kind: "translucent" }));
    const effect = clips.get(handle)!.effect as Extract<
      ClipEffect,
      { kind: "translucent" }
    >;
    expect(effect).toMatchObject({
      kind: "translucent",
      alpha: CLIP_GHOST_ALPHA,
      tint: [1, 1, 1],
      tintStrength: 0,
      method: "blend",
    });
    expect(Object.isFrozen(effect)).toBe(true);
    // The default is no effect: the set is as it was.
    expect(clips.get(clips.add(set([BOX])))!.effect).toBeUndefined();
    expect(clips.get(clips.add(set([BOX], "discard")))!.effect).toBeUndefined();
  });

  it("only a blended ghost wants the translucent passes", () => {
    expect(isBlendedGhost(set([BOX]))).toBe(false);
    expect(isBlendedGhost(set([BOX], { kind: "shade" }))).toBe(false);
    expect(isBlendedGhost(set([BOX], { kind: "translucent" }))).toBe(true);
    expect(
      isBlendedGhost(set([BOX], { kind: "translucent", method: "stipple" })),
    ).toBe(false);
  });
});

describe("the table's effect rows", () => {
  it("lay out as the shader reads them", () => {
    const ghost = set(
      [PLANE, BOX],
      {
        kind: "translucent",
        alpha: 0.35,
        tint: [0.2, 0.4, 0.6],
        tintStrength: 0.5,
        params: [1, 2, 3, 4],
      },
      { keep: "outside" },
    );
    const shade = set([BOX], { kind: "shade", params: [5, 6, 7, 8] });
    const plain = set([PLANE]);
    const table = pack([plain, ghost, shade]);
    const u32 = new Uint32Array(table.buffer);
    expect(u32[1]! & CLIP_ANY_REPORT).toBe(CLIP_ANY_REPORT);
    expect(u32[1]! & CLIP_ANY_GHOST).toBe(CLIP_ANY_GHOST);
    const flags = (s: number) => u32[(1 + s) * 4 + 2]!;
    expect(flags(0) & CLIP_SET_REPORT).toBe(0);
    expect(flags(0) >>> CLIP_SET_EFFECT_SHIFT).toBe(0);
    expect(flags(1) & (CLIP_SET_REPORT | CLIP_SET_GHOST)).toBe(
      CLIP_SET_REPORT | CLIP_SET_GHOST,
    );
    expect(flags(1) & CLIP_SET_STIPPLE).toBe(0);
    expect(flags(2) & CLIP_SET_SHADE).toBe(CLIP_SET_SHADE);
    // The effect's rows follow the set's shapes: (tint, strength), (alpha), params.
    const row = flags(1) >>> CLIP_SET_EFFECT_SHIFT;
    const firstShape = u32[(1 + 1) * 4]!;
    expect(row).toBe(firstShape + 2 + 4);
    expect([...table.subarray(row * 4, row * 4 + 4)]).toEqual([
      expect.closeTo(0.2, 6),
      expect.closeTo(0.4, 6),
      expect.closeTo(0.6, 6),
      0.5,
    ]);
    expect(table[(row + 1) * 4]).toBeCloseTo(0.35, 6);
    expect([...table.subarray((row + 2) * 4, (row + 3) * 4)]).toEqual([
      1, 2, 3, 4,
    ]);
    // The shade set's params, three rows after its shapes.
    const shadeRow = flags(2) >>> CLIP_SET_EFFECT_SHIFT;
    expect(shadeRow).toBe(u32[(1 + 2) * 4]! + 4);
    expect([...table.subarray((shadeRow + 2) * 4, (shadeRow + 3) * 4)]).toEqual(
      [5, 6, 7, 8],
    );
    expect(CLIP_EFFECT_ROWS).toBe(3);
  });

  it("are absent from a table with no effect: it is as before", () => {
    const table = pack([set([PLANE]), set([BOX], "discard")]);
    const u32 = new Uint32Array(table.buffer);
    expect(u32[1]).toBe(0);
    expect(u32[(1 + 0) * 4 + 2]).toBe(0);
    expect(u32[(1 + 1) * 4 + 2]).toBe(0);
  });

  it("make a stipple set a ghost the translucent passes don't want", () => {
    const table = pack([
      set([BOX], { kind: "translucent", alpha: 0.5, method: "stipple" }),
    ]);
    const u32 = new Uint32Array(table.buffer);
    expect(u32[(1 + 0) * 4 + 2]! & (CLIP_SET_GHOST | CLIP_SET_STIPPLE)).toBe(
      CLIP_SET_GHOST | CLIP_SET_STIPPLE,
    );
    expect(u32[1]! & CLIP_ANY_GHOST).toBe(0);
    expect(u32[1]! & CLIP_ANY_REPORT).toBe(CLIP_ANY_REPORT);
  });

  it("a curved set takes no effect: it discards", () => {
    const table = new Float32Array(CLIP_TABLE_ROWS * 4);
    packClipTable(
      [
        {
          set: set([PLANE], { kind: "translucent" }),
          space: "curved",
          matrix: IDENTITY,
        },
      ],
      [0, 0, 0],
      table,
    );
    const u32 = new Uint32Array(table.buffer);
    expect(u32[1]! & (CLIP_ANY_REPORT | CLIP_ANY_GHOST)).toBe(0);
    expect(u32[(1 + 0) * 4 + 2]! & CLIP_SET_GHOST).toBe(0);
  });
});

describe("the verdict, as the opaque and the translucent passes see it", () => {
  // The excavation: a box that keeps what is outside it, ghosting what is in.
  const pit = (effect: ClipEffect, extra: Partial<ClipSet> = {}) =>
    set([{ kind: "box", center: [0, 0, 0], halfExtents: [5, 5, 5] }], effect, {
      keep: "outside",
      ...extra,
    });
  const inside = [1, 1, 1];
  const outside = [9, 1, 1];

  it("a discard set removes what it doesn't keep, in every pass", () => {
    const table = pack([pit("discard")]);
    for (const pass of ["opaque", "translucent"] as const) {
      expect(tableVerdict(table, at(inside), { pass }).keeps).toBe(false);
      expect(tableVerdict(table, at(outside), { pass }).keeps).toBe(true);
    }
  });

  it("a blended ghost is cut out of the opaque passes and kept, ghosted, by the translucent ones", () => {
    const table = pack([pit({ kind: "translucent", alpha: 0.3 })]);
    expect(tableKeeps(table, at(inside))).toBe(false);
    const opaque = tableVerdict(table, at(inside));
    expect(opaque.keeps).toBe(false);
    const blended = tableVerdict(table, at(inside), { pass: "translucent" });
    expect(blended.keeps).toBe(true);
    expect(blended.ghosted).toBe(true);
    expect(blended.alpha).toBeCloseTo(0.3, 6);
    // What the set keeps isn't a ghost.
    const kept = tableVerdict(table, at(outside), { pass: "translucent" });
    expect(kept.keeps).toBe(true);
    expect(kept.ghosted).toBe(false);
    expect(kept.alpha).toBe(1);
  });

  it("ghosts multiply their alphas, and a discard set beats a ghost", () => {
    const table = pack([
      pit({ kind: "translucent", alpha: 0.5 }),
      set(
        [{ kind: "box", center: [0, 0, 0], halfExtents: [6, 6, 6] }],
        {
          kind: "translucent",
          alpha: 0.4,
        },
        { keep: "outside" },
      ),
    ]);
    const v = tableVerdict(table, at(inside), { pass: "translucent" });
    expect(v.alpha).toBeCloseTo(0.2, 6);
    const gone = pack([
      pit({ kind: "translucent", alpha: 0.5 }),
      set(
        [{ kind: "box", center: [0, 0, 0], halfExtents: [6, 6, 6] }],
        "discard",
        {
          keep: "outside",
        },
      ),
    ]);
    expect(tableVerdict(gone, at(inside), { pass: "translucent" }).keeps).toBe(
      false,
    );
  });

  it("a stipple keeps the pixels its dither is below the alpha at", () => {
    const table = pack([
      pit({ kind: "translucent", alpha: 0.4, method: "stipple" }),
    ]);
    const below = tableVerdict(table, at(inside), { stipple: 0.3 });
    expect(below.keeps).toBe(true);
    expect(below.ghosted).toBe(true);
    expect(tableVerdict(table, at(inside), { stipple: 0.5 }).keeps).toBe(false);
    // The translucent passes leave a stipple set alone.
    const blended = tableVerdict(table, at(inside), {
      pass: "translucent",
      stipple: 0.9,
    });
    expect(blended.keeps).toBe(true);
    expect(blended.ghosted).toBe(false);
  });

  it("a shade set removes nothing", () => {
    const table = pack([pit({ kind: "shade" })]);
    expect(tableKeeps(table, at(inside))).toBe(true);
    expect(tableKeeps(table, at(outside))).toBe(true);
    expect(clipSetKeeps(pit({ kind: "shade" }), inside)).toBe(true);
  });

  it("the CPU's keeps follows the opaque passes: a ghost removes", () => {
    const s = pit({ kind: "translucent" });
    expect(clipSetKeeps(s, inside)).toBe(false);
    expect(clipSetKeeps(s, outside)).toBe(true);
  });
});

describe("the report a custom shader reads", () => {
  const near = (p: number[], q: number[]) =>
    Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);

  it("is the set's signed distance, positive where it removes, in float32 about the camera", () => {
    const sets: ClipSet[] = [
      set([PLANE], { kind: "shade", params: [1, 0, 0, 0] }),
      set([BOX], { kind: "shade" }),
      set([RING], { kind: "shade" }, { keep: "outside" }),
      set([PLANE, BOX], { kind: "shade" }, { combine: "intersection" }),
    ];
    // Camera-relative at a far-off site, in float32.
    const camera: [number, number, number] = [6.37e6, 100, 3e5];
    const probes = [
      [0, 0, 0.2],
      [11, 1, 2],
      [9, -2, -1],
      [1, 3, 0.5],
      [3, 1, -0.5],
      [30, 30, 30],
      [-4, 2, 1.5],
    ];
    for (const s of sets) {
      const m = Float64Array.of(
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        camera[0],
        camera[1],
        camera[2],
        1,
      );
      const table = new Float32Array(CLIP_TABLE_ROWS * 4);
      packClipTable([{ set: s, space: "true", matrix: m }], camera, table);
      for (const p of probes) {
        const verdict = tableVerdict(table, at(p));
        const expected = clipSetDistance(s, p);
        // A box's is a lower bound near an edge: the table's and float64's agree on it.
        expect(Math.abs(verdict.distance - expected)).toBeLessThan(5e-3);
        expect(verdict.id).toBe(0);
        // The sign says which side removes.
        if (Math.abs(expected) > 1e-2) {
          expect((verdict.flags & CLIP_FLAG_REMOVED) !== 0).toBe(expected > 0);
        }
        expect(verdict.flags & CLIP_FLAG_GHOST).toBe(0);
      }
    }
    expect(near([0, 0, 0], [0, 0, 0])).toBe(0);
  });

  it("names the set, carries its params, and reports the one the fragment is farthest on the removed side of", () => {
    const table = pack([
      set([{ kind: "plane", point: [0, 0, 0], normal: [1, 0, 0] }], {
        kind: "shade",
        params: [1, 1, 1, 1],
      }),
      set([{ kind: "plane", point: [0, 0, 0], normal: [0, 1, 0] }], {
        kind: "translucent",
        params: [2, 2, 2, 2],
      }),
      set([PLANE]),
    ]);
    // x = 3 is 3 m on the first plane's removed side, y = 8 is 8 m on the second's.
    const v = tableVerdict(table, at([3, 8, -10]));
    expect(v.id).toBe(1);
    expect(v.distance).toBeCloseTo(8, 4);
    expect(v.params).toEqual([2, 2, 2, 2]);
    expect(v.flags).toBe(CLIP_FLAG_REMOVED | CLIP_FLAG_GHOST);
    // Closer to the first than the second: it is the one reported.
    const w = tableVerdict(table, at([3, -8, -10]));
    expect(w.id).toBe(0);
    expect(w.params).toEqual([1, 1, 1, 1]);
    expect(w.flags).toBe(CLIP_FLAG_REMOVED);
  });

  it("is empty where no set reports", () => {
    const v = tableVerdict(pack([set([PLANE])]), at([0, 0, 0]));
    expect(v.id).toBe(CLIP_NO_ID);
    expect(v.distance).toBe(CLIP_NO_DISTANCE);
    expect(v.flags).toBe(0);
  });

  it("a discard that reports names the kept side as well", () => {
    const table = pack([
      set([{ kind: "plane", point: [0, 0, 0], normal: [1, 0, 0] }], {
        kind: "discard",
        params: [9, 0, 0, 0],
      }),
    ]);
    const kept = tableVerdict(table, at([-4, 0, 0]));
    expect(kept.keeps).toBe(true);
    expect(kept.distance).toBeCloseTo(-4, 5);
    expect(kept.params[0]).toBe(9);
    expect(kept.flags).toBe(0);
    expect(tableVerdict(table, at([4, 0, 0])).keeps).toBe(false);
  });
});

describe("the translucent passes' depth range", () => {
  const camera = [0, 0, 100];
  it("is none without a blended ghost", () => {
    expect(ghostRange([plan(set([BOX], "discard"))], camera)).toBeUndefined();
    expect(
      ghostRange(
        [plan(set([BOX], { kind: "translucent", method: "stipple" }))],
        camera,
      ),
    ).toBeUndefined();
    expect(
      ghostRange([plan(set([BOX], { kind: "shade" }))], camera),
    ).toBeUndefined();
  });

  it("is bounded by the boxes a set removes the inside of", () => {
    const pit = set(
      [{ kind: "box", center: [0, 0, 0], halfExtents: [3, 4, 12] }],
      { kind: "translucent" },
      { keep: "outside" },
    );
    const range = ghostRange([plan(pit)], camera)!;
    // 100 m away, 13 m about the centre.
    expect(range.near).toBeCloseTo(87, 6);
    expect(range.far).toBeCloseTo(113, 6);
  });

  it("reaches as far as the view for a set whose removed side is unbounded", () => {
    const keepsInside = set(
      [{ kind: "box", center: [0, 0, 0], halfExtents: [3, 4, 12] }],
      { kind: "translucent" },
    );
    expect(ghostRange([plan(keepsInside)], camera)).toEqual({
      near: 0,
      far: CLIP_GHOST_FAR,
    });
    expect(
      ghostRange([plan(set([PLANE], { kind: "translucent" }))], camera),
    ).toEqual({ near: 0, far: CLIP_GHOST_FAR });
  });
});

describe("what the shader and the layout share", () => {
  const shader = readFileSync(
    new URL("../src/shaders/surface.slang", import.meta.url),
    "utf8",
  );
  const constant = (name: string) => {
    const m = new RegExp(`static const uint ${name} = (\\d+)u;`).exec(shader);
    expect(m, name).not.toBeNull();
    return Number(m![1]);
  };

  it("agree on the flags", () => {
    expect(constant("CLIP_SET_GHOST")).toBe(CLIP_SET_GHOST);
    expect(constant("CLIP_SET_STIPPLE")).toBe(CLIP_SET_STIPPLE);
    expect(constant("CLIP_SET_SHADE")).toBe(CLIP_SET_SHADE);
    expect(constant("CLIP_SET_REPORT")).toBe(CLIP_SET_REPORT);
    expect(constant("CLIP_SET_EFFECT_SHIFT")).toBe(CLIP_SET_EFFECT_SHIFT);
    expect(constant("CLIP_ANY_REPORT")).toBe(CLIP_ANY_REPORT);
    expect(constant("CLIP_EXEMPT_FLAG")).toBe(RecordFlags.clipExempt);
  });

  it("the exemption's flag is its own bit", () => {
    const others = Object.entries(RecordFlags).filter(
      ([name]) => name !== "clipExempt",
    );
    for (const [, bit] of others) {
      expect(bit & RecordFlags.clipExempt).toBe(0);
    }
  });
});
