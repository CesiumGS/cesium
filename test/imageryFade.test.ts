// Globe imagery cross-fades (`View.lodTransitions` "morph"): a drawn tile whose
// imagery changes eases from the old to the new over MORPH_SECONDS. These test
// the bookkeeping (when a fade starts, what it pins, when it ends) and that
// the record and the shader agree with it.
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import type { GlobeImagery } from "../packages/core/src/globe/GlobeImagery.ts";
import {
  IMAGERY_FADE_WORD,
  IMAGERY_FROM_WORD,
  RECORD_SIZE,
  RECORD_WORDS,
} from "../packages/core/src/render/layout.ts";
import {
  DrawRecordLayout,
  ViewLayout,
} from "../packages/core/src/render/generated/layouts.ts";
import { packImagery } from "../packages/core/src/scene/contentLimits.ts";
import type { World } from "../packages/core/src/scene/World.ts";
import { MORPH_SECONDS } from "../packages/core/src/streaming/tileMorph.ts";
import type { Tile } from "../packages/core/src/streaming/Tile.ts";
import { installGpuGlobals } from "./fakeGpu.ts";
import { layer, tile } from "./sliceFakes.ts";

type Fade = [draw: number, from: number, seconds: number];

interface Internals {
  slices: Map<Tile, { slice: number; used: number }>;
  recycle(frame: number): number | undefined;
}

/** Tile with one draw, so the layer has a placement to point. */
function drawn(level: number, x: number, y: number, parent?: Tile): Tile {
  const t = tile(level, x, y, parent);
  (t as { placement?: unknown }).placement = { draws: [{ index: 1 }] };
  return t;
}

function setup(fadeStart?: (nowMs: number) => number) {
  const fades: Fade[] = [];
  const imagery: Array<[number, number]> = [];
  const world = {
    setImageryArray: () => {},
    setImagery: (draw: { index: number }, packed: number) =>
      imagery.push([draw.index, packed]),
    setLights: () => {},
    setImageryFade: (draw: { index: number }, from: number, s: number) =>
      fades.push([draw.index, from, s]),
  } as unknown as World;
  const layerUnderTest: GlobeImagery = layer(world);
  layerUnderTest.fadeStart = fadeStart;
  return {
    imagery: layerUnderTest,
    internals: layerUnderTest as unknown as Internals,
    fades,
    written: imagery,
  };
}

/** The views' clock: seconds since an engine start at 1000 ms. */
const clock = (nowMs: number) => (nowMs - 1000) / 1000;

describe("imagery cross-fade bookkeeping", () => {
  beforeAll(() => installGpuGlobals());

  it("starts when a drawn tile's imagery changes, not on its first imagery", () => {
    const { imagery, internals, fades } = setup(clock);
    const parent = drawn(3, 4, 2);
    const child = drawn(4, 8, 4, parent);
    internals.slices.set(parent, { slice: 7, used: 0 });
    // First assignment: the parent's imagery stands in. It pops in.
    imagery.update(new Map([[child, 1]]), 2000);
    expect(fades).toEqual([]);
    expect(imagery.fading).toBe(false);
    // Its own slice arrives: ease from the parent's imagery.
    internals.slices.set(child, { slice: 9, used: 0 });
    imagery.update(new Map([[child, 1]]), 2500);
    const from = packImagery(7, 1, 0, 0);
    expect(fades).toEqual([[1, from, 1.5]]);
    expect(imagery.fading).toBe(true);
    imagery.destroy();
  });

  it("does not fade in from nothing", () => {
    const { imagery, internals, fades } = setup(clock);
    const lone = drawn(4, 8, 4);
    imagery.update(new Map([[lone, 1]]), 2000); // no imagery at all
    internals.slices.set(lone, { slice: 9, used: 0 });
    imagery.update(new Map([[lone, 1]]), 2100);
    expect(fades).toEqual([]);
    imagery.destroy();
  });

  it("a fade lasts the engine's transition duration", () => {
    const { imagery, internals, fades } = setup(clock);
    imagery.fadeSeconds = () => 0.8;
    const parent = drawn(3, 4, 2);
    const child = drawn(4, 8, 4, parent);
    internals.slices.set(parent, { slice: 7, used: 0 });
    imagery.update(new Map([[child, 1]]), 2000);
    internals.slices.set(child, { slice: 9, used: 0 });
    imagery.update(new Map([[child, 1]]), 2100);
    imagery.update(new Map([[child, 1]]), 2100 + 799);
    expect(imagery.fading).toBe(true);
    imagery.update(new Map([[child, 1]]), 2100 + 800);
    expect(imagery.fading).toBe(false);
    expect(fades.at(-1)).toEqual([1, 0, 0]);
    imagery.destroy();
  });

  it("pop: no fade where no view cross-fades", () => {
    for (const start of [undefined, () => 0]) {
      const { imagery, internals, fades } = setup(start);
      const parent = drawn(3, 4, 2);
      const child = drawn(4, 8, 4, parent);
      internals.slices.set(parent, { slice: 7, used: 0 });
      imagery.update(new Map([[child, 1]]), 2000);
      internals.slices.set(child, { slice: 9, used: 0 });
      imagery.update(new Map([[child, 1]]), 2100);
      expect(fades).toEqual([]);
      expect(imagery.fading).toBe(false);
      imagery.destroy();
    }
  });

  it("a second change mid-fade starts again from the old target", () => {
    const { imagery, internals, fades } = setup(clock);
    const parent = drawn(3, 4, 2);
    const child = drawn(4, 8, 4, parent);
    internals.slices.set(parent, { slice: 7, used: 0 });
    imagery.update(new Map([[child, 1]]), 2000);
    internals.slices.set(child, { slice: 9, used: 0 });
    imagery.update(new Map([[child, 1]]), 2100);
    // Its slice moves before the fade ends.
    internals.slices.set(child, { slice: 11, used: 0 });
    imagery.update(new Map([[child, 1]]), 2200);
    expect(fades).toEqual([
      [1, packImagery(7, 1, 0, 0), 1.1],
      [1, packImagery(9), 1.2],
    ]);
    imagery.destroy();
  });

  it("pins the slice a fade leaves until the fade ends", () => {
    const { imagery, internals, fades } = setup(clock);
    const parent = drawn(3, 4, 2);
    const child = drawn(4, 8, 4, parent);
    const old = drawn(1, 0, 0);
    internals.slices.set(old, { slice: 3, used: 1 });
    internals.slices.set(parent, { slice: 7, used: 0 });
    imagery.update(new Map([[child, 1]]), 2000);
    internals.slices.set(child, { slice: 9, used: 0 });
    imagery.update(new Map([[child, 1]]), 2100);
    // The parent's slice is the least recently used, and still pinned.
    expect(internals.recycle(1000)).toBe(3); // takes the old tile's
    internals.slices.get(child)!.used = 1000; // wanted now
    expect(internals.recycle(1000)).toBeUndefined();
    // After MORPH_SECONDS the fade ends and the slice is free again.
    imagery.update(new Map([[child, 1]]), 2100 + MORPH_SECONDS * 1000);
    expect(fades.at(-1)).toEqual([1, 0, 0]);
    expect(imagery.fading).toBe(false);
    expect(internals.recycle(1000)).toBe(7);
    imagery.destroy();
  });

  it("ends before then when its tile leaves", () => {
    const { imagery, internals, fades } = setup(clock);
    const parent = drawn(3, 4, 2);
    const child = drawn(4, 8, 4, parent);
    internals.slices.set(parent, { slice: 7, used: 0 });
    imagery.update(new Map([[child, 1]]), 2000);
    internals.slices.set(child, { slice: 9, used: 0 });
    imagery.update(new Map([[child, 1]]), 2100);
    (child as { placement?: unknown }).placement = undefined;
    imagery.update(new Map(), 2150);
    expect(imagery.fading).toBe(false);
    expect(fades).toHaveLength(1);
    imagery.destroy();
  });
});

describe("imagery cross-fade record and shader", () => {
  it("the two words fit the record's padding: it stayed 176 bytes", () => {
    expect(RECORD_SIZE).toBe(176);
    expect(RECORD_WORDS).toBe(44);
    expect(DrawRecordLayout.imageryFrom).toBe(164);
    expect(DrawRecordLayout.imageryFade).toBe(168);
    expect(IMAGERY_FROM_WORD).toBe(41);
    expect(IMAGERY_FADE_WORD).toBe(42);
  });

  it("the shader reads the view block's duration and the writer fills it", () => {
    const slang = readFileSync(
      new URL("../packages/core/src/shaders/surface.slang", import.meta.url),
      "utf8",
    );
    expect(slang).toContain("/ max(view.transition.x");
    expect(ViewLayout.transition % 16).toBe(0);
  });
});
