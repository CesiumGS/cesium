// Curved clips (plan §13.26, increment 8c): a plane named in a design frame
// whose route to the content crosses a reprojection that bends it. Its signed
// distance is fitted per draw into the lattice rows' `w` channel; these check
// the fit against float64 on the route, what the table and the packed rows
// hold, and how the world follows its views' clips. The GPU side is
// spikes/curvedClips.html.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { FrameKey } from "../src/camera/frameResolver.ts";
import { routeForward } from "../src/camera/route.ts";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import type { Frame } from "../src/frames/Frame.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import { warpFrame } from "../src/frames/warpFrame.ts";
import {
  CLIP_SET_CURVED,
  CLIP_TABLE_ROWS,
  clipSetDistance,
  clipSetKeeps,
  packClipTable,
  planClip,
  shapeContains,
  shapeDistance,
  tableKeeps,
  type ClipSet,
  type ClipShape,
  type PlannedClip,
} from "../src/scene/world/clips.ts";
import { curvedClipSets } from "../src/render/view/clipTable.ts";
import { EARTH } from "../src/scene/Body.ts";
import { createBox } from "../src/scene/meshes.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import { PLACEMENT_MONOMIALS } from "../src/scene/placement.ts";
import { blockRows } from "../src/scene/placementTable.ts";
import { evaluateClipField, fitClipField } from "../src/scene/warpFit.ts";
import type { CubicLattice } from "../src/scene/warpTerms.ts";
import { drawTerms } from "../src/scene/world/placements.ts";
import type { Engine } from "../src/scene/Engine.ts";
import type { View } from "../src/scene/View.ts";
import type { World } from "../src/scene/World.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

const R = 6_378_137;
/** The reprojection's bend: z' = z + AMPLITUDE · sin(x / WAVELENGTH). */
const AMPLITUDE = 500;
const WAVELENGTH = 20_000;
/** The tile: a cube this wide, over the pole. */
const TILE = 20_000;

function bend(
  p: ArrayLike<number>,
  out: Float64Array,
  jacobian?: Float64Array,
): Float64Array {
  out[0] = p[0]!;
  out[1] = p[1]!;
  out[2] = p[2]! + AMPLITUDE * Math.sin(p[0]! / WAVELENGTH);
  jacobian?.set([
    1,
    0,
    (AMPLITUDE / WAVELENGTH) * Math.cos(p[0]! / WAVELENGTH),
    0,
    1,
    0,
    0,
    0,
    1,
  ]);
  return out;
}

function exaggerate(
  k: number,
  p: ArrayLike<number>,
  out: Float64Array,
  jacobian?: Float64Array,
): Float64Array {
  const x = p[0]!;
  const y = p[1]!;
  const z = p[2]!;
  const r = Math.hypot(x, y, z);
  const f = R + k * (r - R);
  out[0] = (f * x) / r;
  out[1] = (f * y) / r;
  out[2] = (f * z) / r;
  if (jacobian) {
    const u = [x / r, y / r, z / r];
    for (let c = 0; c < 3; c++) {
      for (let row = 0; row < 3; row++) {
        jacobian[c * 3 + row] =
          (row === c ? f / r : 0) + (k - f / r) * u[row]! * u[c]!;
      }
    }
  }
  return out;
}

function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("a curved clip's distance", () => {
  it("is each shape's signed distance, negative inside, with the set's rule folded in", () => {
    const plane: ClipShape = {
      kind: "plane",
      point: [0, 0, 1],
      normal: [0, 0, 2],
    };
    expect(shapeDistance(plane, [5, 5, 4])).toBeCloseTo(3, 12);
    expect(shapeDistance(plane, [5, 5, -1])).toBeCloseTo(-2, 12);
    const box: ClipShape = {
      kind: "box",
      center: [10, 0, 0],
      halfExtents: [1, 2, 3],
    };
    expect(shapeDistance(box, [10, 0, 0])).toBeCloseTo(-1, 12);
    expect(shapeDistance(box, [13, 0, 0])).toBeCloseTo(2, 12);
    const square: ClipShape = {
      kind: "polygon",
      ring: [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
      ],
      zRange: [0, 1],
    };
    expect(shapeDistance(square, [2, 2, 0.5])).toBeCloseTo(-0.5, 12);
    expect(shapeDistance(square, [6, 2, 0.5])).toBeCloseTo(2, 12);
    expect(shapeDistance(square, [2, 2, 3])).toBeCloseTo(2, 12);
    // The sign is `shapeContains` (≤ 0 inside) for every shape, at random points.
    const next = random(11);
    for (const shape of [plane, box, square]) {
      for (let n = 0; n < 400; n++) {
        const p = [next() * 16 - 3, next() * 8 - 2, next() * 8 - 3];
        const d = shapeDistance(shape, p);
        if (Math.abs(d) > 1e-9) {
          expect(d <= 0).toBe(shapeContains(shape, p));
        }
      }
    }
    // Union is the least, intersection the greatest; keeping the outside negates.
    const both = { frame: { name: "f" }, shapes: [plane, box] };
    const p = [5, 5, 4];
    expect(clipSetDistance(both, p)).toBe(
      Math.min(shapeDistance(plane, p), shapeDistance(box, p)),
    );
    expect(clipSetDistance({ ...both, combine: "intersection" }, p)).toBe(
      Math.max(shapeDistance(plane, p), shapeDistance(box, p)),
    );
    expect(clipSetDistance({ ...both, keep: "outside" }, p)).toBe(
      -clipSetDistance(both, p),
    );
    for (let n = 0; n < 400; n++) {
      const q = [next() * 16 - 3, next() * 8 - 2, next() * 8 - 3];
      for (const set of [
        both,
        { ...both, combine: "intersection" as const },
        { ...both, keep: "outside" as const },
      ]) {
        const d = clipSetDistance(set, q);
        if (Math.abs(d) > 1e-9) {
          expect(d <= 0).toBe(clipSetKeeps(set, q));
        }
      }
    }
  });

  it("is fitted over a tile to its stated error, which refines with cells", () => {
    const f = (p: Float64Array) => Math.sin(p[0]! / 3) * 40 + p[1]! - p[2]!;
    const tile = { center: [0, 0, 0], scale: 10 };
    const one = fitClipField(f, tile, { tolerance: 0, maxCells: 1 });
    const two = fitClipField(f, tile, { tolerance: 0, maxCells: 2 });
    expect(one.cells).toBe(1);
    expect(two.cells).toBe(2);
    expect(two.field.errorBound).toBeLessThan(one.field.errorBound / 4);
    // Stops at the first that meets the tolerance.
    const met = fitClipField(f, tile, { tolerance: 0.5 });
    expect(met.field.errorBound).toBeLessThanOrEqual(0.5);
    expect(met.cells).toBeLessThan(8);
    // The stated error is what a random point sees, within a little.
    const lattice = {
      center: tile.center,
      scale: tile.scale,
      cells: two.cells,
    };
    const next = random(5);
    let worst = 0;
    for (let n = 0; n < 2000; n++) {
      const p = Float64Array.of(
        (next() * 2 - 1) * 10,
        (next() * 2 - 1) * 10,
        (next() * 2 - 1) * 10,
      );
      worst = Math.max(
        worst,
        Math.abs(evaluateClipField(lattice, two.field, p) - f(p)),
      );
    }
    expect(worst).toBeLessThanOrEqual(two.field.errorBound * 1.5 + 1e-9);
    // A fixed `cells` is kept, as a lattice that shares its rows needs.
    expect(fitClipField(f, tile, { tolerance: 0, cells: 4 }).cells).toBe(4);
  });
});

describe("a plane in a design frame under a reprojection", () => {
  let engine: Engine;
  const worlds: World[] = [];
  const views: View[] = [];
  beforeAll(async () => {
    engine = await fakeEngine();
  });
  afterEach(() => {
    for (const view of views.splice(0)) {
      engine.removeView(view);
    }
    for (const world of worlds.splice(0)) {
      engine.removeWorld(world);
    }
  });

  /**
   * A 20 km tile over the pole in the Earth's anchor (ITRF), a design frame
   * bent from ITRF by a non-presentation warp, and a view whose rig is on
   * ITRF or, when `exaggerated`, on a ×10 drawn frame.
   */
  function scene(exaggerated = false) {
    const world = engine.createWorld({ maxDraws: 8 });
    worlds.push(world);
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const itrf = catalog.get("ITRF");
    const design = warpFrame("design", itrf, {
      presentation: false,
      revision: 1,
      description: "a bending reprojection",
      forward: bend,
    });
    catalog.add(design);
    let rig: Frame = itrf;
    if (exaggerated) {
      rig = warpFrame("exaggerated", itrf, {
        presentation: true,
        revision: 1,
        forward: (p, out, j) => exaggerate(10, p, out, j),
      });
      catalog.add(rig);
    }
    const resolver = createFramesResolver(catalog);
    engine.cameras.setResolver(world, resolver);
    const earth = world.bodyAnchor(EARTH);
    const view = engine.addView({ target: new OffscreenTarget(64, 48), world });
    views.push(view);
    engine.cameras.setRig(view, {
      position: { frame: rig },
      orientation: { kind: "free" },
    });
    view.camera.position.set([0, 0, R + 30_000]);
    view.camera.version++;
    const mesh = world.addMesh(createBox());
    const matrix = Float64Array.of(
      TILE,
      0,
      0,
      0,
      0,
      TILE,
      0,
      0,
      0,
      0,
      TILE,
      0,
      0,
      0,
      R + 1000,
      1,
    );
    const transform = world.addTransform(matrix, earth);
    const draw = world.addDraw({ mesh, transform });
    const messages: string[] = [];
    const report = (m: string) => messages.push(m);
    const step = (v: View = view) => {
      engine.cameras.update();
      world.warps.frame(
        engine.cameras.root(v),
        v.anchorRoutes(),
        Infinity,
        report,
      );
      return world.warps.curved.frame(
        {
          resolver: engine.cameras.resolver(world),
          seconds: 0,
          demands: views
            .filter((w) => w.world === world)
            .map((w) => curvedClipSets(engine, w))
            .filter((sets) => sets.length > 0),
        },
        Infinity,
        report,
      );
    };
    const placement = (v: View = view) => ({
      resolver: engine.cameras.resolver(world),
      seconds: 0,
      root: engine.cameras.root(v),
      body: earth,
      bodyPlacement: v.anchorPlacement(earth),
      bodyRoute: v.anchorRoute(earth),
    });
    /** The draw's clip-carrying lattice and its packed rows' `w`, as the GPU reads them. */
    const lattice = (): CubicLattice | undefined =>
      drawTerms(world, draw)?.flatMap(({ term }) =>
        term.kind === "cubic" && term.clip ? [term] : [],
      )[0];
    return {
      world,
      view,
      earth,
      itrf,
      design,
      rig,
      resolver,
      mesh,
      matrix,
      transform,
      draw,
      step,
      placement,
      lattice,
      messages,
    };
  }

  /** A plane in the design frame that cuts the tile along the bent surface. */
  const planeIn = (frame: FrameKey): ClipSet => ({
    frame,
    shapes: [{ kind: "plane", point: [0, 0, R + 1050], normal: [0, 0, 1] }],
  });

  /** The float64 truth: the draw's model point routed anchor → design, in the set's distance. */
  function truth(s: ReturnType<typeof scene>, set: ClipSet) {
    const route = s.resolver.route!(s.itrf, set.frame, 0);
    const out = new Float64Array(3);
    return (p: ArrayLike<number>) => {
      const a = Float64Array.of(
        s.matrix[0]! * p[0]! + s.matrix[12]!,
        s.matrix[5]! * p[1]! + s.matrix[13]!,
        s.matrix[10]! * p[2]! + s.matrix[14]!,
      );
      return clipSetDistance(set, routeForward(route, a, out));
    };
  }

  it("is planned as curved", () => {
    const s = scene();
    expect(planClip(planeIn(s.design), s.placement()).space).toBe("curved");
    const exaggerated = scene(true);
    expect(
      planClip(planeIn(exaggerated.design), exaggerated.placement()).space,
    ).toBe("curved");
    // A plane in the content's own frame is not.
    expect(planClip(planeIn(s.itrf), s.placement()).space).toBe("true");
  });

  it("cuts a large tile along the bent surface: the fitted distance matches float64 within its error", () => {
    const s = scene();
    const set = planeIn(s.design);
    s.view.setClips([s.world.addClip(set)]);
    expect(curvedClipSets(engine, s.view)).toEqual(s.view.clipSets());
    expect(s.step()).toBe(false);
    const status = s.world.warps.curved.status(s.draw)!;
    expect(status).toMatchObject({ state: "fitted", carrier: true });
    const lattice = s.lattice()!;
    const field = lattice.clip!;
    // The unwarped draw's carrier has no displacement and no weight.
    expect(lattice.coefficients.every((c) => c === 0)).toBe(true);
    expect(drawTerms(s.world, s.draw)![0]!.weight.scale).toBe(0);
    expect(field.errorBound).toBeLessThan(0.05);
    expect(s.world.warps.fitError([s.draw])).toBe(field.errorBound);
    const f = truth(s, set);
    const next = random(7);
    let worst = 0;
    let cut = 0;
    for (let n = 0; n < 3000; n++) {
      const p = [next() - 0.5, next() - 0.5, next() - 0.5];
      const exact = f(p);
      const fitted = evaluateClipField(lattice, field, p);
      worst = Math.max(worst, Math.abs(fitted - exact));
      // Same side of the surface wherever the point is farther from it than the error.
      if (Math.abs(exact) > field.errorBound * 1.5) {
        expect(fitted <= 0).toBe(exact <= 0);
        cut++;
      }
    }
    expect(worst).toBeLessThanOrEqual(field.errorBound * 1.5);
    expect(cut).toBeGreaterThan(2900);
    // The surface is bent by hundreds of metres: a straight plane through the tile misses it.
    const straight = (p: number[]) => p[2]! * TILE + (R + 1000) - (R + 1050);
    let farther = 0;
    for (let n = 0; n < 200; n++) {
      const p = [next() - 0.5, next() - 0.5, next() - 0.5];
      farther = Math.max(farther, Math.abs(straight(p) - f(p)));
    }
    expect(farther).toBeGreaterThan(100);
  });

  it("rides the rows' w channel, in float32, as the vertex stage reads it", () => {
    const s = scene();
    const set = planeIn(s.design);
    s.view.setClips([s.world.addClip(set)]);
    s.step();
    const lattice = s.lattice()!;
    const placed = s.world.scene.drawPlacements[s.draw.index]!;
    const terms = drawTerms(s.world, s.draw)!;
    const { f32, u32 } = s.world.raster.placementTable.words(
      placed.at,
      blockRows(terms),
    );
    // The first lattice's term row: [kind, weight, body row, cells].
    const t = (1 + 3 * terms.findIndex(({ term }) => term === lattice)) * 4;
    expect(u32[t]! & 255).toBe(1);
    const body = u32[t + 2]!;
    const cells = u32[t + 3]!;
    expect(cells).toBe(lattice.cells);
    const f = truth(s, set);
    const next = random(9);
    let worst = 0;
    for (let n = 0; n < 500; n++) {
      const p = [next() - 0.5, next() - 0.5, next() - 0.5];
      // placement.slang `latticeDisplacement`'s scalar: the rows' w times the monomials.
      const o = body * 4;
      const v = [0, 1, 2].map((a) => (p[a]! - f32[o + a]!) * f32[o + 3]!);
      const n3 = cells;
      const cell = [0, 0, 0];
      const local = [0, 0, 0];
      for (let a = 0; a < 3; a++) {
        const s2 = (v[a]! + 1) * (0.5 * n3);
        cell[a] = Math.min(n3 - 1, Math.max(0, Math.floor(s2)));
        local[a] = 2 * (s2 - cell[a]!) - 1;
      }
      const index = (cell[2]! * n3 + cell[1]!) * n3 + cell[0]!;
      let value = 0;
      PLACEMENT_MONOMIALS.forEach(([a, b, c], k) => {
        value +=
          f32[(body + 1 + index * 20 + k) * 4 + 3]! *
          local[0]! ** a *
          local[1]! ** b *
          local[2]! ** c;
      });
      worst = Math.max(worst, Math.abs(value - f(p)));
    }
    expect(worst).toBeLessThan(lattice.clip!.errorBound * 1.5 + 0.01);
  });

  it("goes on a route's lattice when the draw has one, sharing its cells", () => {
    const s = scene(true);
    const set = planeIn(s.design);
    s.view.setClips([s.world.addClip(set)]);
    s.step();
    s.step();
    const terms = drawTerms(s.world, s.draw)!;
    expect(terms).toHaveLength(1);
    const lattice = s.lattice()!;
    expect(s.world.warps.curved.status(s.draw)).toMatchObject({
      state: "fitted",
      carrier: false,
      cells: lattice.cells,
    });
    // The route's lattice displaces by the exaggeration: not a carrier.
    expect(terms[0]!.weight.scale).toBe(1);
    expect(lattice.coefficients.some((c) => c !== 0)).toBe(true);
    // The field is the true surface's distance, whatever is drawn.
    const f = truth(s, set);
    const next = random(3);
    for (let n = 0; n < 500; n++) {
      const p = [next() - 0.5, next() - 0.5, next() - 0.5];
      const exact = f(p);
      if (Math.abs(exact) > lattice.clip!.errorBound * 1.5 + 1e-6) {
        expect(evaluateClipField(lattice, lattice.clip!, p) <= 0).toBe(
          exact <= 0,
        );
      }
    }
  });

  it("puts a curved set in the table as a row of its own, tested by the fitted distance", () => {
    const s = scene();
    const rigid: ClipSet = {
      frame: s.itrf,
      shapes: [{ kind: "plane", point: [0, 0, R + 1], normal: [0, 0, 1] }],
    };
    const curved = planeIn(s.design);
    const plans: PlannedClip[] = [
      planClip(rigid, s.placement()),
      planClip(curved, s.placement()),
    ];
    expect(plans.map((p) => p.space)).toEqual(["true", "curved"]);
    const table = new Float32Array(CLIP_TABLE_ROWS * 4);
    const camera = [0, 0, R];
    packClipTable(plans, camera, table);
    const u32 = new Uint32Array(table.buffer);
    expect(u32[0]).toBe(2);
    expect(u32[1]! & 2).toBe(2);
    expect(u32[(1 + 1) * 4 + 1]).toBe(0);
    expect(u32[(1 + 1) * 4 + 2]! & CLIP_SET_CURVED).toBe(CLIP_SET_CURVED);
    const rel = [0, 0, -0.5];
    expect(tableKeeps(table, { true: rel, drawn: rel, curved: -2 })).toBe(true);
    expect(tableKeeps(table, { true: rel, drawn: rel, curved: 2 })).toBe(false);
    expect(tableKeeps(table, { true: rel, drawn: rel })).toBe(true);
    // The rigid set still cuts.
    const above = [0, 0, 5];
    expect(tableKeeps(table, { true: above, drawn: above, curved: -2 })).toBe(
      false,
    );
  });

  it("follows the view's clips: a moved clip refits, a removed one takes the field off", () => {
    const s = scene();
    const clip = s.world.addClip(planeIn(s.design));
    s.view.setClips([clip]);
    s.step();
    const before = s.lattice()!.clip!;
    // Move the plane 100 m up: the surface moves with it.
    const moved: ClipSet = {
      frame: s.design,
      shapes: [{ kind: "plane", point: [0, 0, R + 1150], normal: [0, 0, 1] }],
    };
    s.world.setClip(clip, moved);
    expect(s.world.warps.curved.serves(s.view.clipSets())).toBe(false);
    s.step();
    const after = s.lattice()!.clip!;
    expect(after).not.toBe(before);
    expect(after.coefficients[0]! - before.coefficients[0]!).toBeCloseTo(
      -100,
      0,
    );
    expect(s.world.warps.curved.serves(s.view.clipSets())).toBe(true);
    // Moving the draw refits it.
    s.world.setTransform(
      s.transform,
      Float64Array.of(
        TILE,
        0,
        0,
        0,
        0,
        TILE,
        0,
        0,
        0,
        0,
        TILE,
        0,
        0,
        0,
        R + 1100,
        1,
      ),
    );
    s.step();
    expect(s.lattice()!.clip!.coefficients[0]!).toBeCloseTo(
      after.coefficients[0]! + 100,
      0,
    );
    // No curved clip left: the carrier goes, and the draw is unplaced again.
    s.view.setClips([]);
    s.step();
    expect(s.world.warps.curved.active).toBe(false);
    expect(drawTerms(s.world, s.draw)).toBeUndefined();
    expect(s.world.warps.curved.status(s.draw)).toBeUndefined();
  });

  it("says so when views of a world want different curved clips", () => {
    const s = scene();
    const a = planeIn(s.design);
    const b: ClipSet = {
      frame: s.design,
      shapes: [{ kind: "plane", point: [0, 0, R + 900], normal: [0, 0, -1] }],
    };
    const other = engine.addView({
      target: new OffscreenTarget(64, 48),
      world: s.world,
    });
    views.push(other);
    engine.cameras.setRig(other, {
      position: { frame: s.itrf },
      orientation: { kind: "free" },
    });
    s.view.setClips([s.world.addClip(a)]);
    other.setClips([s.world.addClip(b)]);
    s.step();
    expect(s.world.warps.curved.serves(s.view.clipSets())).toBe(true);
    expect(s.world.warps.curved.serves(other.clipSets())).toBe(false);
    expect(s.messages.join("\n")).toMatch(/different curved clips/);
  });

  it("combines a view's curved sets by max: kept where every one keeps", () => {
    const s = scene();
    const above: ClipSet = {
      frame: s.design,
      shapes: [{ kind: "plane", point: [0, 0, R + 1500], normal: [0, 0, 1] }],
    };
    const below: ClipSet = {
      frame: s.design,
      shapes: [{ kind: "plane", point: [0, 0, R + 500], normal: [0, 0, -1] }],
    };
    const clips = [s.world.addClip(above), s.world.addClip(below)];
    s.view.setClips(clips);
    s.step();
    const lattice = s.lattice()!;
    const route = s.resolver.route!(s.itrf, s.design, 0);
    const next = random(21);
    let kept = 0;
    for (let n = 0; n < 1000; n++) {
      const p = [next() - 0.5, next() - 0.5, next() - 0.5];
      const q = routeForward(
        route,
        Float64Array.of(p[0]! * TILE, p[1]! * TILE, R + 1000 + p[2]! * TILE),
      );
      const both = clipSetKeeps(above, q) && clipSetKeeps(below, q);
      const margin = Math.min(
        Math.abs(clipSetDistance(above, q)),
        Math.abs(clipSetDistance(below, q)),
      );
      if (margin > lattice.clip!.errorBound * 1.5) {
        expect(evaluateClipField(lattice, lattice.clip!, p) <= 0).toBe(both);
        kept += both ? 1 : 0;
      }
    }
    expect(kept).toBeGreaterThan(0);
    expect(kept).toBeLessThan(1000);
  });

  it("routes queries through the curved route exactly, in float64", () => {
    const s = scene();
    const set = planeIn(s.design);
    s.view.setClips([s.world.addClip(set)]);
    const filter = engine.clipFilter(s.view)!;
    const route = s.resolver.route!(s.itrf, s.design, 0);
    const next = random(13);
    let kept = 0;
    for (let n = 0; n < 1000; n++) {
      const p = [
        (next() - 0.5) * TILE,
        (next() - 0.5) * TILE,
        R + 1000 + (next() - 0.5) * TILE,
      ];
      const expected = clipSetKeeps(set, routeForward(route, p));
      expect(filter.keeps(p)).toBe(expected);
      kept += expected ? 1 : 0;
    }
    expect(kept).toBeGreaterThan(100);
    expect(kept).toBeLessThan(900);
  });
});
