import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  DEBUG_ERROR_RAMP,
  DEBUG_LEVEL_COLORS,
  DEBUG_STATE_COLORS,
  DEBUG_STRETCH_RAMP,
  DEBUG_VIEWS,
  TileDebugState,
  debugLegend,
  debugModeId,
  packTileDebug,
  unpackTileDebug,
} from "../src/streaming/debugViews.ts";
import { ViewLayout } from "../src/render/generated/layouts.ts";
import {
  DEBUG_WORD,
  RECORD_SIZE,
  RECORD_WORDS,
  VIEW_STRIDE,
} from "../src/render/layout.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { createBox } from "../src/scene/meshes.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { View } from "../src/scene/View.ts";
import type { SelectionView } from "../src/streaming/Stepwise.ts";
import type { Tile } from "../src/streaming/Tile.ts";
import {
  tileDebugWord,
  writeTileDebug,
} from "../src/streaming/tilesetDebug.ts";
import { fakeEngine } from "./fakeGpu.ts";

describe("debug view words", () => {
  it("round-trips a tile's numbers to the precision of their bytes", () => {
    const word = packTileDebug({
      level: 13,
      state: TileDebugState.standIn,
      hash: 27,
      error: 2.5,
      stretch: 9.7,
    });
    const back = unpackTileDebug(word)!;
    expect(back.level).toBe(13);
    expect(back.state).toBe(TileDebugState.standIn);
    expect(back.hash).toBe(27);
    // 6 octaves over 254 steps: within 1.7 % of the value.
    expect(back.error / 2.5).toBeCloseTo(1, 1);
    expect(back.stretch / 9.7).toBeCloseTo(1, 1);
  });

  it("clamps what the scales don't reach, and never writes a zero word", () => {
    const low = unpackTileDebug(
      packTileDebug({ level: 300, state: 0, hash: 0, error: 0, stretch: 1e-9 }),
    )!;
    expect(low.level).toBe(255);
    expect(low.error).toBeCloseTo(1 / 16, 5);
    expect(low.stretch).toBeCloseTo(1 / 4, 5);
    const high = unpackTileDebug(
      packTileDebug({ level: 0, state: 0, hash: 0, error: 1e9, stretch: 1e9 }),
    )!;
    expect(high.error).toBeCloseTo(4, 5);
    expect(high.stretch).toBeCloseTo(16, 5);
    expect(unpackTileDebug(0)).toBeUndefined();
  });

  it("numbers the modes from 1, with off as 0", () => {
    expect(DEBUG_VIEWS.map(debugModeId)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe("legends", () => {
  it("has entries whose colours are hex, and none for off and tiles", () => {
    for (const mode of DEBUG_VIEWS) {
      const legend = debugLegend(mode);
      expect(legend.mode).toBe(mode);
      expect(legend.title.length).toBeGreaterThan(0);
      for (const entry of legend.entries) {
        expect(entry.color).toMatch(/^#[0-9a-f]{6}$/);
        expect(entry.label.length).toBeGreaterThan(0);
      }
    }
    expect(debugLegend("off").entries).toEqual([]);
    expect(debugLegend("tiles").kind).toBe("none");
    expect(debugLegend("level").entries).toHaveLength(8);
    expect(debugLegend("state").entries).toHaveLength(4);
    expect(debugLegend("error").kind).toBe("ramp");
    expect(debugLegend("stretch").kind).toBe("ramp");
  });

  it("samples the ramps at their stops", () => {
    // The threshold (log2 0) is two thirds up the scale from 1/16 to 4.
    const error = debugLegend("error").entries;
    expect(error[0]!.color).toBe("#440154");
    expect(error[4]!.color).toBe("#fde725");
    expect(error[2]!.label).toBe("At the threshold");
  });
});

describe("the shader's colours", () => {
  const source = readFileSync(
    fileURLToPath(new URL("../src/shaders/surface.slang", import.meta.url)),
    "utf8",
  );
  /** The bytes of `static const float3 NAME[n] = { ... };`. */
  function slangColors(name: string): number[][] {
    const match = new RegExp(`${name}\\[\\d+\\] = \\{([^;]*)\\};`).exec(source);
    expect(match, name).not.toBeNull();
    return [...match![1]!.matchAll(/float3\(([^)]*)\)/g)].map((m) =>
      m[1]!.split(",").map(Number),
    );
  }

  it("holds each table to debugViews.ts's", () => {
    expect(slangColors("DEBUG_LEVEL_COLORS")).toEqual(DEBUG_LEVEL_COLORS);
    expect(slangColors("DEBUG_ERROR_RAMP")).toEqual(DEBUG_ERROR_RAMP);
    expect(slangColors("DEBUG_STRETCH_RAMP")).toEqual(DEBUG_STRETCH_RAMP);
    expect(slangColors("DEBUG_STATE_COLORS")).toEqual(DEBUG_STATE_COLORS);
  });
});

describe("a tile's debug word", () => {
  const view = (extra: Partial<SelectionView> = {}): SelectionView =>
    ({ id: 1, debug: "error", position: [0, 0, 0], ...extra }) as SelectionView;
  const tileset = (threshold: number) =>
    ({
      state: { policy: { memoryAdjustedScreenSpaceError: threshold } },
    }) as never;
  function tile(over: Record<string, unknown> = {}): Tile {
    const states = [{}, { sse: 0, occludedTicks: 0 }];
    return {
      depth: 3,
      placeholderMask: 0,
      standInMask: 0,
      viewState: (id: number) => states[id],
      ...over,
      states,
    } as unknown as Tile;
  }

  it("reads the level, the error against the threshold and no stretch", () => {
    const t = tile();
    (t as unknown as { states: { sse: number }[] }).states[1]!.sse = 32;
    const back = unpackTileDebug(tileDebugWord(tileset(16), t, view()))!;
    expect(back.level).toBe(3);
    expect(back.state).toBe(TileDebugState.drawn);
    expect(back.error / 2).toBeCloseTo(1, 1);
    expect(back.stretch).toBeCloseTo(1, 1);
  });

  it("takes a terrain tile's level from its quadtree address", () => {
    const t = tile({ globe: { level: 11 } });
    expect(unpackTileDebug(tileDebugWord(tileset(16), t, view()))!.level).toBe(
      11,
    );
  });

  it("says placeholder, stand-in or held, for this view's bit only", () => {
    const state = (t: Tile) =>
      unpackTileDebug(tileDebugWord(tileset(16), t, view()))!.state;
    expect(state(tile({ placeholderMask: 2 }))).toBe(
      TileDebugState.placeholder,
    );
    expect(state(tile({ placeholderMask: 1 }))).toBe(TileDebugState.drawn);
    expect(state(tile({ standInMask: 2 }))).toBe(TileDebugState.standIn);
    const held = tile();
    Object.assign((held as unknown as { states: object[] }).states[1]!, {
      sse: 40,
      occludedTicks: 2,
    });
    expect(state(held)).toBe(TileDebugState.held);
  });

  it("writes each drawn tile's draws once, and only for a view with debug on", () => {
    const written: Array<[number, number]> = [];
    const set = {
      state: { policy: { memoryAdjustedScreenSpaceError: 16 } },
      world: { setDrawDebug: (h: number, w: number) => written.push([h, w]) },
    };
    const t = tile({ placement: { draws: [7, 8] } });
    const off = view();
    delete off.debug;
    writeTileDebug(set as never, [off], [t]);
    expect(written).toEqual([]);
    writeTileDebug(set as never, [off, view()], [t]);
    expect(written.map(([h]) => h)).toEqual([7, 8]);
    writeTileDebug(set as never, [view()], [t]);
    expect(written).toHaveLength(2);
  });
});

describe("the engine side", () => {
  let engine: Engine;
  const created: View[] = [];
  beforeAll(async () => {
    engine = await fakeEngine();
  });
  afterEach(() => {
    for (const view of created.splice(0)) {
      engine.removeView(view);
    }
  });
  function scene() {
    const world = engine.createWorld({
      maxDraws: 16,
      vertexBytes: 1 << 16,
      indexBytes: 1 << 16,
    });
    const view = engine.addView({ target: new OffscreenTarget(64, 48), world });
    created.push(view);
    return { world, view };
  }

  it("keeps the record at 160 bytes with the debug word in its last four", () => {
    expect(RECORD_SIZE).toBe(160);
    expect(DEBUG_WORD).toBe(RECORD_WORDS - 1);
  });

  it("is off by default, and its legend follows the mode", () => {
    const { view } = scene();
    expect(view.debug).toBe("off");
    expect(view.debugLegend().entries).toEqual([]);
    view.debug = "state";
    expect(view.debugLegend().title).toBe("Tile state");
  });

  it("writes the mode to the view block's time.w", () => {
    const { view } = scene();
    const read = () => {
      engine.renderFrame();
      const slot = engine.raster.viewFrames.get(view)!.slot;
      const stride = VIEW_STRIDE / 4;
      return engine.raster.viewData[slot * stride + ViewLayout.time / 4 + 3]!;
    };
    expect(read()).toBe(0);
    view.debug = "stretch";
    expect(read()).toBe(debugModeId("stretch"));
  });

  it("writes a draw's debug word through the constants seam", () => {
    const { world } = scene();
    const draw = world.addDraw({ mesh: world.addMesh(createBox()) });
    expect(
      world.raster.recordsU32[draw.index * RECORD_WORDS + DEBUG_WORD],
    ).toBe(0);
    const word = packTileDebug({
      level: 5,
      state: 1,
      hash: 3,
      error: 1,
      stretch: 1,
    });
    world.setDrawDebug(draw, word);
    expect(
      world.raster.recordsU32[draw.index * RECORD_WORDS + DEBUG_WORD],
    ).toBe(word);
  });
});
