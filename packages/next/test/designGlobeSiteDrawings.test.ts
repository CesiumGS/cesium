// The design globe's morph is the core's placement on scene items (plan 5a
// Task 20): the solid item at the morph's parameter, the ghost at the other
// end, the ground's opacity following.
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  morphParameter,
  rigidEndParameter,
} from "../examples/design-globe/morphDriver.ts";
import {
  GHOST_OPACITY,
  SiteDrawings,
  dualPositionOf,
  ghostPresence,
  type PlacementLook,
} from "../examples/design-globe/siteDrawings.ts";
import {
  setTerrainClipOpacity,
  syncTerrainClip,
} from "../examples/design-globe/terrainClips.ts";
import { fakeEngine } from "./fakeGpu.ts";

const LOOK: PlacementLook = {
  rigidTint: [1, 0.8, 0.6, 1],
  reprojectedTint: [0.6, 0.9, 1, 1],
  rigidGhost: [1, 0.5, 0.2, 1],
  reprojectedGhost: [0.2, 0.8, 0.9, 1],
};

describe("the design globe's placements", () => {
  it("the parameter is 1 − k(1 − t)", () => {
    expect(morphParameter(0.25, 1)).toBe(0.25);
    expect(morphParameter(0, 10)).toBe(-9);
    expect(morphParameter(1, 10)).toBe(1);
    expect(rigidEndParameter(1)).toBe(0);
    expect(rigidEndParameter(10)).toBe(-9);
  });

  it("no shader of the page has a vertex stage", () => {
    for (const file of ["siteDrawings", "overlays", "measureOverlay"]) {
      const source = readFileSync(
        new URL(`../examples/design-globe/${file}.ts`, import.meta.url),
        "utf8",
      );
      expect(source, file).not.toMatch(/fn vertexMain/);
    }
  });

  it("the ghost is drawn fully when settled, not at all halfway", () => {
    expect(ghostPresence(0)).toBe(1);
    expect(ghostPresence(1)).toBe(1);
    expect(ghostPresence(0.5)).toBe(0);
  });

  it("reads a tileset's declared second position", () => {
    const of = (extensions: Record<string, unknown>) =>
      dualPositionOf({ extensions } as never);
    expect(of({})).toBeUndefined();
    expect(
      of({
        DESIGN_GLOBE_dual_position: { semantic: "_A", maxDistance: 3 },
      }),
    ).toEqual({ semantic: "_A", maxDistance: 3 });
  });

  it("moves the items with the morph: one tileset, the solid at the parameter, the ghost at the other end", async () => {
    const engine = await fakeEngine();
    const world = engine.createWorld({ maxDraws: 16 });
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(
          JSON.stringify({
            asset: { version: "1.1" },
            geometricError: 1,
            root: {
              geometricError: 0,
              refine: "REPLACE",
              boundingVolume: { sphere: [6_378_137, 0, 0, 10] },
            },
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
    );
    const tileset = await engine.addTileset(
      world,
      "https://t.test/tileset.json",
    );
    vi.unstubAllGlobals();
    const site = new SiteDrawings(
      world,
      tileset,
      { semantic: "_DG_REPROJECTED", maxDistance: 100 },
      LOOK,
    );
    expect(tileset.items).toEqual([site.solid, site.ghost]);
    expect(site.ghost.opacity).toBe(GHOST_OPACITY.reprojected);
    expect(site.ghost.placement).toBe(1);
    const at = (t: number, exaggeration = 1, ghost = true) =>
      site.setState({ t, exaggeration, ghost, morphing: t > 0 && t < 1 });
    at(0.25);
    expect(site.solid.placement).toBe(0.25);
    expect(site.ghost.placement).toBe(1);
    at(1);
    expect(site.solid.placement).toBe(1);
    expect(site.ghost.placement).toBe(0);
    expect(site.ghost.opacity).toBe(GHOST_OPACITY.rigid);
    expect(site.ghost.tint).toEqual([1, 0.5, 0.2]);
    at(1, 10);
    expect(site.ghost.placement).toBe(-9);
    at(0, 10);
    expect(site.solid.placement).toBe(-9);
    expect(site.ghost.placement).toBe(1);
    at(0, 1, false);
    expect(site.ghost.show).toBe(false);
    site.dispose();
    expect(tileset.items).toEqual([site.solid]);
    expect(site.solid.placement).toBe(0);
    engine.removeTileset(tileset);
  });

  it("the corridor's ground is one set of regions whose opacity follows the morph", () => {
    const made: { opacity: number; removed: boolean }[] = [];
    const addRegion = vi.fn(
      (_shape: unknown, options: { opacity: number; ground: boolean }) => {
        expect(options.ground).toBe(false);
        const region = {
          opacity: options.opacity,
          removed: false,
          remove() {
            this.removed = true;
          },
        };
        made.push(region);
        return region;
      },
    );
    const globe = { terrain: { addRegion } } as never;
    const polygon = [
      { longitude: 0, latitude: 0 },
      { longitude: 1, latitude: 0 },
      { longitude: 0, latitude: 1 },
    ];
    syncTerrainClip(globe, "corridor#0", polygon, 1);
    syncTerrainClip(globe, "other", polygon);
    setTerrainClipOpacity(globe, "corridor#", 0.25);
    setTerrainClipOpacity(globe, "corridor#", 0);
    expect(addRegion).toHaveBeenCalledTimes(2);
    expect(made[0]!.opacity).toBe(0);
    expect(made[0]!.removed).toBe(false);
    expect(made[1]!.opacity).toBe(0);
    setTerrainClipOpacity(globe, "corridor#", 1);
    expect(made[0]!.opacity).toBe(1);
    expect(made[1]!.opacity).toBe(0);
  });
});
