// Placement increment 6 (CESIUM2_WEBGPU_PLAN.md §13.26): measurements and
// snaps in true frames, with their graphics drawn through the route. True
// distances and heights don't move with the exaggeration; the drawn
// distance, named as one, scales with it; a measurement's lines are
// sampled until the drawn polyline is within half a pixel of the routed
// curve; a snap works in drawn space and answers with true points; a
// pixel's tolerance goes to true metres by σ_min; a bound and a 1σ stay
// apart. CPU only: fake views and picks, no engine.
import { describe, expect, it, vi } from "vitest";
import {
  PresentationRouteError,
  routeForward,
  type Route,
  type Warp,
} from "../src/camera/route.ts";
import {
  ClientSnapService,
  refiningSnap,
  type ServiceSnapRequest,
  type SnapResult,
} from "../src/engineering/snap.ts";
import type { PickView } from "../src/engineering/pick.ts";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import { createFrames } from "../src/frames/frames.ts";
import { framePoint } from "../src/frames/local.ts";
import { verticalExaggeration } from "../src/frames/heightWarps.ts";
import { createFramesPickInterpreter } from "../src/frames/pickInterpreter.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import { warpFrame } from "../src/frames/warpFrame.ts";
import { warpFromFunction } from "../src/frames/warps.ts";
import { Ellipsoid, fromDegrees } from "../src/math/ellipsoid.ts";
import { accuracyOf } from "../src/measure/accuracy.ts";
import { DrawnCurve, sampleSegment } from "../src/measure/curve.ts";
import { drawnDistance } from "../src/measure/drawn.ts";
import {
  drawnThrough,
  isPresentationFrame,
  UNWARPED,
} from "../src/frames/drawn.ts";
import { routeStretch } from "../src/frames/routeStretch.ts";
import { measure } from "../src/measure/measure.ts";
import { truePick } from "../src/frames/pickTruth.ts";
import { routeSingularRange } from "../src/scene/warpBounds.ts";
import { EARTH } from "../src/scene/Body.ts";
import { Camera, projectToPixel } from "../src/scene/Camera.ts";
import type { CorePick } from "../src/scene/pick.ts";
import type { DrawHandle } from "../src/scene/world/types.ts";
import type { TileGeometry } from "../src/streaming/Tile.ts";
import type { Tileset3D } from "../src/streaming/Tileset3D.ts";
import { Instant } from "../src/time/Instant.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

const SECONDS = Date.UTC(2000, 0, 1, 12) / 1000;
const WGS84 = Ellipsoid.WGS84;

const at = (lon: number, lat: number, h: number) =>
  WGS84.cartographicToCartesian(fromDegrees(lon, lat, h), new Float64Array(3));
const dist = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

/** An ITRF content frame, a frame drawn ×k from it, and routes between. */
function exaggerated(factor = 1, scale?: { value: number }) {
  const catalog = createFrameCatalog({ data: syntheticFrameData() });
  const itrf = catalog.get("ITRF");
  const spec = verticalExaggeration({
    factor,
    ...(scale && { scale }),
  });
  const drawn = warpFrame("drawn", itrf, spec);
  catalog.add(drawn);
  const resolver = createFramesResolver(catalog);
  return {
    catalog,
    itrf,
    drawn,
    spec,
    resolver,
    route: (): Route => resolver.route(itrf, drawn, SECONDS),
  };
}

describe("measurements are true whatever the exaggeration", () => {
  const frames = createFrames(syntheticFrameData());
  const instant = Instant.fromTdb(0);
  const a = at(10, 40, 100);
  const b = at(10, 40, 2100);
  const c = at(10.05, 40, 2100);
  const rig = exaggerated(1);

  it("gives the same distances and heights for k = 1…10, and says what was drawn", () => {
    const first = measure(
      framePoint(frames.itrf, a),
      framePoint(frames.itrf, c),
      instant,
      frames,
      { signal: false },
    );
    for (let k = 1; k <= 10; k++) {
      rig.spec.factor = k;
      const route = rig.route();
      const m = measure(
        framePoint(frames.itrf, a),
        framePoint(frames.itrf, c),
        instant,
        frames,
        { signal: false, drawn: drawnThrough(route, a) },
      );
      expect(m.distance).toBe(first.distance);
      expect(m.overBody!.heightDifference).toBe(
        first.overBody!.heightDifference,
      );
      expect(m.overBody!.heightDifference).toBeCloseTo(2000, 3);
      expect(m.frame).toBe(frames.itrf);
      expect(m.drawn!.warped).toBe(true);
      expect(m.drawn!.presentation).toBe(true);
      expect(m.drawn!.statement).toContain(`×${k} vertically`);
      expect(m.drawn!.statement).toMatch(/values are true$/);
    }
    expect(first.drawn).toBeUndefined();
  });

  it("refuses a point in a presentation frame: its coordinates are where content is drawn", () => {
    const drawnFrame = warpFrame(
      "drawn",
      frames.itrf,
      verticalExaggeration({ factor: 4 }),
    );
    expect(isPresentationFrame(drawnFrame)).toBe(true);
    expect(isPresentationFrame(frames.itrf)).toBe(false);
    expect(() =>
      measure(
        framePoint(drawnFrame, a),
        framePoint(drawnFrame, b),
        instant,
        frames,
        { signal: false },
      ),
    ).toThrow(PresentationRouteError);
  });

  it("says nothing was drawn through a rigid route, or none", () => {
    expect(drawnThrough(undefined)).toBe(UNWARPED);
    expect(UNWARPED.statement).toMatch(/values are true/);
  });

  it("states [σ_min, σ_max] as the scene layer's estimate does, without the frames layer importing it", () => {
    for (const k of [1, 2, 10]) {
      rig.spec.factor = k;
      const route = rig.route();
      const [low, high] = routeStretch(route, a);
      const [lowScene, highScene] = routeSingularRange(route, {
        center: a,
        radius: 1,
      });
      expect(low).toBeCloseTo(lowScene, 6);
      expect(high).toBeCloseTo(highScene, 6);
      expect(high).toBeCloseTo(k, 3);
      expect(low).toBeGreaterThan(0.99);
      expect(drawnThrough(route, a).stretch).toEqual([low, high]);
    }
    // A route with an inverse step: its stretch is the inverse's, 1/k.
    const down = exaggerated(10);
    const up = down.resolver.route(down.drawn, down.itrf, SECONDS);
    const [lowUp, highUp] = routeStretch(up, routeForward(down.route(), a));
    expect(highUp).toBeCloseTo(1, 3);
    expect(lowUp).toBeCloseTo(0.1, 3);
  });
});

describe("the drawn distance, named as one", () => {
  const a = at(10, 40, 100);
  const b = at(10, 40, 1100);
  const c = at(10.05, 40, 2100);

  it("scales with k where the true distance does not", () => {
    const rig = exaggerated(1);
    let before = 0;
    for (let k = 1; k <= 10; k++) {
      rig.spec.factor = k;
      const d = drawnDistance(a, b, rig.route());
      expect(d.space).toBe("drawn");
      expect(d.label).toMatch(/^drawn distance/);
      expect(d.label).toMatch(/not a true distance/);
      expect(d.trueDistance).toBeCloseTo(1000, 6);
      expect(d.distance).toBeCloseTo(1000 * k, 4);
      // A straight true segment along the normal draws straight.
      expect(d.pathLength).toBeCloseTo(d.distance, 4);
      expect(d.distance).toBeGreaterThan(before);
      before = d.distance;
      expect(d.through.presentation).toBe(true);
      expect(d.frame).toBe(rig.drawn);
    }
  });

  it("a slanted segment draws as a curve, longer than its chord", () => {
    const rig = exaggerated(10);
    const d = drawnDistance(a, c, rig.route());
    expect(d.pathLength).toBeGreaterThan(d.distance);
    expect(d.distance).toBeGreaterThan(d.trueDistance);
    expect(d.distance).toBeCloseTo(
      dist(routeForward(rig.route(), a), routeForward(rig.route(), c)),
      6,
    );
  });

  it("takes a view, or no route at all (drawn as it is)", () => {
    const rig = exaggerated(10);
    const route = rig.route();
    const view = { anchorRoute: vi.fn(() => route) };
    expect(drawnDistance(a, b, view).distance).toBeCloseTo(10_000, 4);
    expect(view.anchorRoute).toHaveBeenCalledWith(undefined);
    const plain = drawnDistance(a, b, undefined);
    expect(plain.distance).toBeCloseTo(plain.trueDistance, 9);
    expect(plain.through).toBe(UNWARPED);
    expect(plain.label).not.toMatch(/×/);
  });
});

/** A render-space camera above the drawn middle of a segment, looking straight down. */
function modelView(route: Route, a: Float64Array, b: Float64Array) {
  const mid = routeForward(
    route,
    Float64Array.from([
      (a[0]! + b[0]!) / 2,
      (a[1]! + b[1]!) / 2,
      (a[2]! + b[2]!) / 2,
    ]),
  );
  const n = Float64Array.from(mid);
  const length = Math.hypot(n[0]!, n[1]!, n[2]!);
  for (let i = 0; i < 3; i++) {
    n[i] = n[i]! / length;
  }
  // From the south and above: heights are vertical on the screen, the
  // direction ×k bends them in.
  const east = Float64Array.of(-n[1]!, n[0]!, 0);
  const eastLength = Math.hypot(east[0]!, east[1]!);
  const north = Float64Array.of(
    (n[1]! * east[2]! - n[2]! * east[1]!) / eastLength,
    (n[2]! * east[0]! - n[0]! * east[2]!) / eastLength,
    (n[0]! * east[1]! - n[1]! * east[0]!) / eastLength,
  );
  const camera = new Camera();
  const eye = Array.from(
    mid,
    (v, i) => v - 70_000 * north[i]! + 25_000 * n[i]!,
  );
  camera.position.set(eye);
  const toMid = Array.from(mid, (v, i) => v - eye[i]!);
  const toMidLength = Math.hypot(toMid[0]!, toMid[1]!, toMid[2]!);
  camera.direction.set(toMid.map((v) => v / toMidLength));
  camera.orient(Float64Array.from(n));
  camera.fov = 0.8;
  const height = 800;
  return {
    camera,
    height,
    screen: {
      position: camera.position,
      direction: camera.direction,
      fovy: camera.fovy(1),
      height,
    },
    /** CSS pixels of a render-space point. */
    pixel(p: ArrayLike<number>) {
      const out = new Float64Array(2);
      projectToPixel(camera, camera.fovy(1), height, height, p, out);
      return out;
    },
  };
}

/** The largest distance in pixels from the routed curve's points to a polyline's. */
function maxStray(
  view: { pixel(p: ArrayLike<number>): Float64Array },
  route: Route,
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  polyline: Float64Array,
): number {
  const px = Array.from({ length: polyline.length / 3 }, (_, i) =>
    view.pixel(polyline.subarray(3 * i, 3 * i + 3)),
  );
  let worst = 0;
  const N = 4000;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const q = view.pixel(
      routeForward(route, [
        a[0]! + t * (b[0]! - a[0]!),
        a[1]! + t * (b[1]! - a[1]!),
        a[2]! + t * (b[2]! - a[2]!),
      ]),
    );
    let best = Infinity;
    for (let s = 0; s + 1 < px.length; s++) {
      best = Math.min(best, segmentDistance2d(q, px[s]!, px[s + 1]!));
    }
    worst = Math.max(worst, best);
  }
  return worst;
}

function segmentDistance2d(
  q: Float64Array,
  a: Float64Array,
  b: Float64Array,
): number {
  const ex = b[0]! - a[0]!,
    ey = b[1]! - a[1]!;
  const l2 = ex * ex + ey * ey;
  const f =
    l2 > 0
      ? Math.min(
          1,
          Math.max(0, ((q[0]! - a[0]!) * ex + (q[1]! - a[1]!) * ey) / l2),
        )
      : 0;
  return Math.hypot(q[0]! - a[0]! - f * ex, q[1]! - a[1]! - f * ey);
}

describe("measurement graphics drawn through the route", () => {
  // 40 km across at 3 km up: ×10 bends the straight true segment by hundreds
  // of metres against a pixel of tens.
  const a = at(0, 0, 0);
  const b = at(0.36, 0, 3000);

  it("stays within half a pixel of the routed curve, sampled adaptively", () => {
    const rig = exaggerated(10);
    const route = rig.route();
    const view = modelView(route, a, b);
    const samples = sampleSegment(route, a, b, { screen: view.screen });
    const count = samples.length / 3;
    expect(count).toBeGreaterThan(3);
    expect(count).toBeLessThan(200);
    // The ends are the route's images, exactly.
    expect(Array.from(samples.subarray(0, 3))).toEqual(
      Array.from(routeForward(route, a)),
    );
    expect(Array.from(samples.subarray(samples.length - 3))).toEqual(
      Array.from(routeForward(route, b)),
    );
    // The straight chord of the same ends is not within a pixel: sampling matters.
    const chord = Float64Array.of(
      ...samples.subarray(0, 3),
      ...samples.subarray(samples.length - 3),
    );
    expect(maxStray(view, route, a, b, chord)).toBeGreaterThan(2);
    expect(maxStray(view, route, a, b, samples)).toBeLessThanOrEqual(0.5);
  });

  it("holds across k = 1…10, a nearer camera needing more samples", () => {
    const rig = exaggerated(1);
    for (const k of [1, 2, 5, 10]) {
      rig.spec.factor = k;
      const route = rig.route();
      const view = modelView(route, a, b);
      const samples = sampleSegment(route, a, b, { screen: view.screen });
      expect(maxStray(view, route, a, b, samples)).toBeLessThanOrEqual(0.5);
    }
    rig.spec.factor = 10;
    const route = rig.route();
    const far = modelView(route, a, b);
    const near = {
      ...far.screen,
      position: far.screen.position.map(
        (v, i) => v + far.screen.direction[i]! * 50_000,
      ),
    };
    const farCount = sampleSegment(route, a, b, { screen: far.screen }).length;
    const nearCount = sampleSegment(route, a, b, { screen: near }).length;
    expect(nearCount).toBeGreaterThan(farCount);
  });

  it("holds for a bent warp that moves content (not a presentation)", () => {
    const bend = warpFromFunction(
      (p, out) => {
        out[0] = p[0]!;
        out[1] = p[1]! + (p[0]! * p[0]!) / 40_000;
        out[2] = p[2]!;
      },
      { presentation: false, description: "a parabola" },
    );
    const route: Route = {
      frame: { name: "content" },
      base: { name: "render" },
      seconds: 0,
      steps: [{ kind: "warp", warp: asWarp(bend), inverse: false }],
      presentation: false,
      revision: 1,
    };
    const from = Float64Array.of(-3000, 0, 0);
    const to = Float64Array.of(3000, 200, 100);
    const screen = {
      position: [0, -50, 8000],
      direction: [0, 0, -1],
      fovy: 0.8,
      height: 800,
    };
    const view = {
      camera: new Camera(),
      height: 800,
      screen,
      pixel(p: ArrayLike<number>) {
        const out = new Float64Array(2);
        const pose = {
          position: Float64Array.from(screen.position),
          direction: Float64Array.of(0, 0, -1),
          up: Float64Array.of(0, 1, 0),
          right: Float64Array.of(1, 0, 0),
        };
        projectToPixel(pose, screen.fovy, 800, 800, p, out);
        return out;
      },
    };
    const samples = sampleSegment(route, from, to, { screen });
    expect(samples.length / 3).toBeGreaterThan(5);
    expect(maxStray(view, route, from, to, samples)).toBeLessThanOrEqual(0.5);
  });

  it("is sampled again when the route, a scale or the camera changes, and not otherwise", () => {
    const slider = { value: 1 };
    const rig = exaggerated(10, slider);
    const route = rig.route();
    const view = modelView(route, a, b);
    const curve = new DrawnCurve([...a, ...b, ...at(0.36, 0.2, 3000)], false);
    const first = curve.samples(route, view.screen);
    expect(curve.samples(rig.route(), view.screen)).toBe(first);
    slider.value = 0.5;
    const half = curve.samples(route, view.screen);
    expect(half).not.toBe(first);
    expect(half.revision).toBe(first.revision);
    // The scaled curve is the routed one at ×5.5.
    expect(
      WGS84.cartesianToCartographic(
        half.positions.subarray(0, 3),
        fromDegrees(0, 0),
      )!.height,
    ).toBeCloseTo(0, 3);
    const last = half.positions.length;
    expect(
      WGS84.cartesianToCartographic(
        half.positions.subarray(last - 3),
        fromDegrees(0, 0),
      )!.height,
    ).toBeCloseTo(3000 * 5.5, 3);
    rig.spec.factor = 3;
    const factor = curve.samples(rig.route(), view.screen);
    expect(factor).not.toBe(half);
    expect(factor.revision).not.toBe(half.revision);
    const moved = {
      ...view.screen,
      position: view.screen.position.map(
        (v, i) => v + view.screen.direction[i]! * 50_000,
      ),
    };
    expect(curve.samples(rig.route(), moved)).not.toBe(factor);
    // Each segment's vertices are in the samples, in order.
    expect(factor.vertices.length).toBe(3);
    expect(factor.length).toBeGreaterThan(0);
  });

  it("closes an area's outline, and takes a rigid route as its corners", () => {
    const rig = exaggerated(10);
    const route = rig.route();
    const view = modelView(route, a, b);
    const outline = new DrawnCurve(
      [...at(0, 0, 0), ...at(0.1, 0, 500), ...at(0.1, 0.1, 500)],
      true,
    );
    const s = outline.samples(route, view.screen);
    expect(Array.from(s.positions.subarray(0, 3))).toEqual(
      Array.from(s.positions.subarray(s.positions.length - 3)),
    );
    const rigid: Route = {
      frame: rig.itrf,
      base: rig.itrf,
      seconds: SECONDS,
      steps: [
        {
          kind: "rigid",
          matrix: Float64Array.of(
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
            5,
            0,
            0,
            1,
          ),
        },
      ],
      presentation: false,
      revision: 0,
    };
    expect(sampleSegment(rigid, a, b).length).toBe(6);
  });

  it("anchors a label at the routed point, not the chord's middle", () => {
    const rig = exaggerated(10);
    const route = rig.route();
    const curve = new DrawnCurve([...a, ...b]);
    const label = curve.anchorAt(route, 0.5);
    const middle = Float64Array.from(a, (v, i) => (v + b[i]!) / 2);
    expect(Array.from(label.position)).toEqual(
      Array.from(routeForward(route, middle)),
    );
    expect(Array.from(label.truePosition)).toEqual(Array.from(middle));
    const chordMiddle = Float64Array.from(
      routeForward(route, a),
      (v, i) => (v + routeForward(route, b)[i]!) / 2,
    );
    expect(dist(label.position, chordMiddle)).toBeGreaterThan(100);
    expect(Math.hypot(...label.tangent)).toBeCloseTo(1, 9);
  });
});

/** A `Warp` for a test route, from a frames-layer warp's fields. */
function asWarp(w: ReturnType<typeof warpFromFunction>): Warp {
  return {
    from: { name: "content" },
    to: { name: "render" },
    presentation: w.presentation,
    get revision() {
      return w.revision;
    },
    description: w.description,
    forward: (p, out, j) => w.forward(p, out, j),
  };
}

// ----------------------------------------------------------- picks and snaps

const R = 6_378_137;
const DRAW = { index: 3, generation: 1, name: undefined } as DrawHandle;
const GEOMETRIC_ERROR = 0.25;

/** Heights times `k` above the plane z = 0: a warp with σ in [1, k]. */
function stretchZ(k: number): Warp {
  return {
    from: { name: "anchor" },
    to: { name: "render" },
    presentation: true,
    revision: 1,
    description: `vertical exaggeration × ${k}`,
    forward(p, out, jacobian) {
      out[0] = p[0]!;
      out[1] = p[1]!;
      out[2] = p[2]! * k;
      jacobian?.set([1, 0, 0, 0, 1, 0, 0, 0, k]);
      return out;
    },
    inverse(q, out) {
      out[0] = q[0]!;
      out[1] = q[1]!;
      out[2] = q[2]! / k;
      return out;
    },
  };
}

const routeOf = (warp: Warp): Route => ({
  frame: { name: "anchor" },
  base: { name: "render" },
  seconds: 0,
  steps: [{ kind: "warp", warp, inverse: false }],
  presentation: warp.presentation,
  revision: 1,
});

// The camera is 1000 m above (R, 0, 0) looking down -x, +y right and +z up on
// the screen, 1000 × 500 CSS px, 90° across: a point drawn at (R, y, z) shows
// at (500 + y / 2, 250 - z / 2).
const toScreen = (y: number, z: number) => [500 + y / 2, 250 - z / 2] as const;

/** A 40 m square of two triangles in the plane x = R: A (0, 0), B (40, 0), C (0, 40), D (40, 40) in (y, z). */
function geometry(): TileGeometry {
  const matrix = new Float64Array(16);
  matrix[0] = matrix[5] = matrix[10] = matrix[15] = 1;
  matrix[12] = R;
  return {
    draw: DRAW,
    positions: new Float32Array([0, 0, 0, 0, 40, 0, 0, 0, 40, 0, 40, 40]),
    indices: new Uint32Array([0, 1, 3, 0, 3, 2]),
    matrix,
  };
}

function tileset(): Tileset3D {
  const tile = {
    geometricError: GEOMETRIC_ERROR,
    volume: {
      kind: "sphere",
      sphere: { center: Float64Array.from([R, 20, 20]), radius: 5000 },
    },
    contentVolume: undefined,
    geometry: [geometry()],
  };
  return {
    placement: undefined,
    retainGeometry: true,
    warnings: new Set<string>(),
    itemOfDraw: () => undefined,
    sourceOfDraw: () => undefined,
    tileOfDraw: (d: DrawHandle) =>
      d.index === DRAW.index && d.generation === DRAW.generation
        ? tile
        : undefined,
    isDestroyed: () => false,
  } as unknown as Tileset3D;
}

/**
 * A view whose pickPoint reads the drawn plane under the cursor, and the
 * true point behind it (`truePosition`, as the pick variant gives): the
 * content is drawn through `warp`.
 */
function warpedView(warp: Warp | undefined, domain = true): PickView {
  const route = warp ? routeOf(warp) : undefined;
  const identity = new Float64Array(16);
  identity[0] = identity[5] = identity[10] = identity[15] = 1;
  const k = warp ? warp.forward([0, 0, 1], new Float64Array(3))[2]! : 1;
  const camera = new Camera();
  camera.position.set([R + 1000, 0, 0]);
  camera.direction.set([-1, 0, 0]);
  camera.orient(Float64Array.from([0, 0, 1]));
  camera.fov = Math.PI / 2;
  const view = {
    anchorRoute: () => route,
    anchorPlacement: () => identity,
  };
  return {
    pick: async () => ({ featureId: 7, name: undefined }),
    pickPosition: async () => undefined,
    pickPoint: async (x: number, y: number) => {
      // The drawn plane x = R under the pixel; its true point has z / k.
      const drawn = Float64Array.of(R, (x - 500) * 2, (250 - y) * 2);
      const truePoint = Float64Array.of(R, drawn[1]!, drawn[2]! / k);
      return {
        view,
        position: drawn,
        root: { name: "render" },
        anchor: undefined,
        anchorPosition: drawn,
        draw: DRAW,
        feature: { featureId: 7, name: undefined },
        seconds: 0,
        camera: {
          position: Float64Array.of(R + 1000, 0, 0),
          direction: Float64Array.of(-1, 0, 0),
          up: Float64Array.of(0, 0, 1),
          right: Float64Array.of(0, 1, 0),
          fovy: 2 * Math.atan(0.5),
          near: 0.1,
          width: 1000,
          height: 500,
        },
        ...(domain && {
          domain: { draw: DRAW, kind: "triangle" as const },
          truePosition: { position: truePoint, frame: { name: "render" } },
          accuracy: { meters: 0.002, exact: false, note: "on the triangle" },
        }),
      } as unknown as CorePick;
    },
    body: EARTH,
    camera,
    target: { kind: "canvas", width: 1000, pixelRatio: 1 },
    pixelRect: () => ({ width: 1000, height: 500 }),
    world: { feature: () => ({ draw: DRAW }) },
  } as unknown as PickView;
}

describe("snaps in true coordinates", () => {
  it("snaps to what the screen shows, and returns the true vertex", async () => {
    const warp = stretchZ(3);
    const client = new ClientSnapService([tileset()]);
    // D is (R, 40, 40) and drawn at (R, 40, 120): pixel (520, 190). Its true
    // place on the screen, (520, 230), is 40 px away.
    const [x, y] = toScreen(40, 120);
    const result = await client.snap({
      view: warpedView(warp),
      x: x + 2,
      y,
      aperture: 5,
    });
    expect(result!.kind).toBe("point");
    expect(Array.from(result!.snapPoint)).toEqual([R, 40, 40]);
    expect(result!.distance).toBeCloseTo(2, 6);
    expect(Array.from(result!.drawnPosition!)).toEqual([R, 40, 120]);
    expect(result!.drawn!.presentation).toBe(true);
    expect(result!.drawn!.statement).toContain("vertical exaggeration × 3");
    expect(result!.drawn!.statement).toMatch(/values are true$/);
    expect(result!.drawn!.stretch![0]).toBeCloseTo(1, 6);
    expect(result!.drawn!.stretch![1]).toBeCloseTo(3, 6);
    expect(result!.tolerance).toBe(GEOMETRIC_ERROR);
  });

  it("snaps to the edge's true point at the parameter the screen shows", async () => {
    const warp = stretchZ(3);
    const client = new ClientSnapService([tileset()]);
    // A to C is drawn from (500, 250) to (500, 190): its middle, (500, 220), is the true (R, 0, 20).
    const result = await client.snap({
      view: warpedView(warp),
      x: 504,
      y: 220,
      aperture: 6,
    });
    expect(result!.kind).toBe("segment");
    expect(result!.snapPoint[1]).toBeCloseTo(0, 9);
    expect(result!.snapPoint[2]).toBeCloseTo(20, 9);
    // The curve's ends are the true vertices, and the normal the true plane's.
    expect(
      result!.curve!.map((p) => Array.from(p)).sort((p, q) => p[2]! - q[2]!),
    ).toEqual([
      [R, 0, 0],
      [R, 0, 40],
    ]);
    expect(Math.abs(result!.normal![0]!)).toBeCloseTo(1, 9);
    expect(result!.distance).toBeCloseTo(4, 6);
  });

  it("without a warp, snaps as before and says nothing was drawn", async () => {
    const client = new ClientSnapService([tileset()]);
    const [x, y] = toScreen(40, 40);
    const result = await client.snap({
      view: warpedView(undefined),
      x,
      y,
      aperture: 4,
    });
    expect(Array.from(result!.snapPoint)).toEqual([R, 40, 40]);
    expect(result!.drawn).toBeUndefined();
    expect(result!.drawnPosition).toBeUndefined();
  });

  it("converts a pixel to true metres by σ_min: a compression of 0.5 doubles the tolerance", async () => {
    const client = new ClientSnapService([tileset()]);
    // Nothing within the aperture: a surface snap, tolerance = a pixel + the geometric error.
    const request = (warp: Warp | undefined) => ({
      view: warpedView(warp),
      x: 516,
      y: 246,
      aperture: 1,
    });
    const plain = await client.snap(request(undefined));
    const squashed = await client.snap(request(stretchZ(0.5)));
    expect(plain!.kind).toBe("surface");
    expect(squashed!.kind).toBe("surface");
    const pixel = plain!.tolerance - GEOMETRIC_ERROR - 0.002;
    expect(pixel).toBeGreaterThan(1.9);
    expect(squashed!.drawn!.stretch![0]).toBeCloseTo(0.5, 6);
    expect(squashed!.tolerance - GEOMETRIC_ERROR - 0.002).toBeCloseTo(
      2 * pixel,
      6,
    );
    // Exaggeration leaves σ_min at 1: the pixel is as many metres.
    const exaggerated = await client.snap(request(stretchZ(10)));
    expect(exaggerated!.tolerance - GEOMETRIC_ERROR - 0.002).toBeCloseTo(
      pixel,
      6,
    );
  });

  it("checks a server's true point against the screen as drawn, and tells the server how to", async () => {
    const warp = stretchZ(3);
    const client = new ClientSnapService([tileset()]);
    const [x, y] = toScreen(40, 120);
    const seen: ServiceSnapRequest[] = [];
    const answer: SnapResult = {
      snapPoint: Float64Array.of(R, 40, 40),
      hitPoint: Float64Array.of(R, 40, 40),
      distance: 99,
      kind: "point",
      tolerance: 0,
      exact: true,
      source: "server",
      provisional: false,
    };
    const result = await refiningSnap(
      { view: warpedView(warp), x: x + 1, y, aperture: 4 },
      client,
      {
        snap: async (r) => {
          seen.push(r);
          return answer;
        },
      },
      () => undefined,
    );
    expect(result!.source).toBe("server");
    expect(result!.distance).toBeCloseTo(1, 6);
    expect(Array.from(result!.drawnPosition!)).toEqual([R, 40, 120]);
    expect(result!.drawn!.presentation).toBe(true);
    const request = seen[0]!;
    expect(Array.from(request.toDrawn!([R, 40, 40]))).toEqual([R, 40, 120]);
    expect(request.stretch![1]).toBeCloseTo(3, 6);
    expect(request.apertureMeters).toBeGreaterThan(7);
    // Without the drawn map it was 40 px away: a point as far on the screen is refused.
    const far: SnapResult = {
      ...answer,
      snapPoint: Float64Array.of(R, 40, 100),
    };
    const refused = await refiningSnap(
      { view: warpedView(warp), x: x + 1, y, aperture: 4 },
      client,
      { snap: async () => far },
      () => undefined,
    );
    expect(refused!.source).toBe("client");
  });
});

describe("a pick as a true point", () => {
  it("is the content's own point where the pick variant found one, with a pixel's true size", async () => {
    const warp = stretchZ(4);
    const core = (await warpedView(warp).pickPoint!(520, 190))!;
    const truth = truePick(core);
    expect(truth.how).toBe("domain");
    expect(truth.provisional).toBe(false);
    expect(Array.from(truth.position)).toEqual([R, 40, 30]);
    expect(Array.from(truth.drawnPosition!)).toEqual([R, 40, 120]);
    expect(truth.bound).toBe(0.002);
    expect(truth.trueFootprint).toBeCloseTo(truth.footprint / 1, 9);
    const squashed = truePick(
      (await warpedView(stretchZ(0.25)).pickPoint!(520, 190))!,
    );
    expect(squashed.trueFootprint).toBeCloseTo(squashed.footprint * 4, 6);
  });

  it("goes back through the route's inverse without one: provisional, with the residual", async () => {
    const core = (await warpedView(stretchZ(4), false).pickPoint!(520, 190))!;
    const truth = truePick(core);
    expect(truth.how).toBe("inverse");
    expect(truth.provisional).toBe(true);
    expect(truth.position[2]).toBeCloseTo(30, 9);
    expect(truth.bound).toBeLessThan(1e-6);
  });

  it("is the depth's position where nothing is drawn through a warp", async () => {
    const core = (await warpedView(undefined, false).pickPoint!(520, 190))!;
    const truth = truePick(core);
    expect(truth.how).toBe("depth");
    expect(truth.drawn).toBeUndefined();
    expect(truth.trueFootprint).toBe(truth.footprint);
  });
});

describe("accuracy keeps a bound and a σ apart", () => {
  it("the frames interpreter reports the true point, a bound and a σ, and takes no bound as 1σ in them", async () => {
    const rig = exaggerated(10);
    const route = rig.route();
    const truePoint = at(10, 40, 1500);
    const drawnPoint = routeForward(route, truePoint);
    const up = Float64Array.from(drawnPoint);
    const n = Math.hypot(up[0]!, up[1]!, up[2]!);
    const eye = Float64Array.from(
      drawnPoint,
      (v, i) => v + (5000 * up[i]!) / n,
    );
    const direction = Float64Array.from(up, (v) => -v / n);
    const view = { anchorRoute: () => route, anchorPlacement: () => undefined };
    const core = {
      view,
      position: drawnPoint,
      root: rig.itrf,
      anchor: undefined,
      anchorPosition: drawnPoint,
      draw: undefined,
      feature: undefined,
      seconds: SECONDS,
      camera: {
        position: eye,
        direction,
        up: Float64Array.of(0, 0, 1),
        right: Float64Array.of(0, 1, 0),
        fovy: 0.8,
        near: 1,
        width: 800,
        height: 800,
      },
      truePosition: { position: truePoint, frame: rig.itrf },
      accuracy: { meters: 0.01, exact: false, note: "on the triangle" },
    } as unknown as CorePick;
    const interpreter = createFramesPickInterpreter(rig.resolver, rig.catalog);
    const point = interpreter.interpret(core)!;
    // The true point, not the drawn one.
    expect(dist(point.bodyFixed!, truePoint)).toBe(0);
    expect(point.drawn!.statement).toContain("×10 vertically");
    expect(dist(point.drawnPosition!, drawnPoint)).toBe(0);
    expect(point.provisional).toBeUndefined();
    const { accuracy } = point;
    const bounds = accuracy.terms.filter(
      (t) => "basis" in t && t.basis === "bound",
    );
    expect(bounds.map((t) => t.kind)).toEqual(["pick", "pick", "content"]);
    expect(accuracy.bound).toBeCloseTo(
      bounds.reduce((sum, t) => sum + t.meters!, 0),
      12,
    );
    // The catalog's stand-in ITRF states its own σ terms: none of them are bounds.
    expect(accuracy.sigma).toBeLessThan(accuracy.meters!);
    expect(accuracy.meters).toBeCloseTo(
      Math.hypot(...accuracy.terms.map((t) => t.meters ?? NaN)),
      12,
    );
    expect(accuracy.combination).toMatch(/never a 1σ|a bound is never a 1σ/);
    // The pixel's true metres: its drawn size over σ_min ≈ 1 at ×10.
    const footprint = accuracy.terms.find(
      (t) => t.kind === "pick" && t.part === "footprint",
    )!;
    const drawnSize = (5000 * 2 * Math.tan(0.4)) / 800;
    expect(footprint.meters).toBeGreaterThan(drawnSize / 1.1);
    expect(footprint.meters).toBeLessThanOrEqual(drawnSize / 0.9);
  });

  it("a measurement statement adds its pick terms as a bound and the rest as σ", () => {
    const frames = createFrames(syntheticFrameData());
    const instant = Instant.fromTdb(0);
    const p = framePoint(frames.itrf, at(10, 40, 0));
    const q = framePoint(frames.itrf, at(10, 40, 50));
    const without = accuracyOf(p, q, instant, frames, { signal: false });
    expect(without.bound).toBeUndefined();
    expect(without.sigma).toBeCloseTo(without.meters!, 12);
    const picked = accuracyOf(p, q, instant, frames, {
      signal: false,
      obtained: {
        a: { how: "pick", tolerance: 3 },
        b: { how: "snap", tolerance: 4, kind: "point" },
      },
    });
    expect(picked.bound).toBe(7);
    const pickTerms = picked.terms.filter((t) => t.source === "pick");
    expect(pickTerms.map((t) => t.basis)).toEqual(["bound", "bound"]);
    // The σ is what it was without the picks; `meters` still takes them as 1σ, conservatively.
    expect(picked.sigma).toBeCloseTo(without.sigma!, 12);
    expect(picked.meters).toBeGreaterThan(picked.sigma!);
  });
});
