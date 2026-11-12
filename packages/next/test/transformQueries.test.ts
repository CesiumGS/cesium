// Picks, measurements, accuracy, bounds, clips and tessellation through the
// transform graph's routes (plan 2026-11-12, task 5): float64 queries, and
// the adapters that bridge today's frame-based picks and clip sets to nodes.
import { describe, expect, it } from "vitest";
import {
  NonRigidRouteError,
  resolveRoute,
  routeForward,
  type Route as CameraRoute,
} from "../src/camera/route.ts";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import { frameTransform } from "../src/frames/Frame.ts";
import { verticalExaggeration as frameExaggeration } from "../src/georeference/heightWarps.ts";
import { graphOfFrames } from "../src/frames/graphOfFrames.ts";
import { eastNorthUpFrame, framePoint } from "../src/frames/local.ts";
import { pickIn, graphOfCameraRoute } from "../src/frames/pickIn.ts";
import { pointAccuracy } from "../src/frames/pointAccuracy.ts";
import { locatePick, truePick } from "../src/frames/pickTruth.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import { smoothFrame } from "../src/frames/smoothFrame.ts";
import {
  geocentricToGeographic,
  utm,
  verticalExaggerationEdge,
} from "../src/georeference/index.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import type { CorePick } from "../src/scene/pick.ts";
import {
  drawnBounds,
  volumeSamples,
  type DrawnMap,
} from "../src/scene/warpBounds.ts";
import {
  clipSetDistance,
  planClip,
  type ClipSet,
} from "../src/scene/world/clips.ts";
import { nodeResolver } from "../src/scene/world/nodeResolver.ts";
import {
  accuracyAlong,
  affine,
  chordError,
  curvatureAt,
  curvatureOver,
  measureIn,
  pointIn,
  routeBetween,
  smooth,
  subdivisionFor,
  taylorBounds,
  TransformGraph,
  type Route,
} from "../src/transform/index.ts";
import { radialDistortion, twist } from "../src/transforms/index.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

const RAD = Math.PI / 180;

const near = (
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  tolerance = 1e-6,
): void => {
  expect(a.length).toBe(b.length);
  for (let i = 0; i < a.length; i++) {
    expect(Math.abs(a[i]! - b[i]!)).toBeLessThanOrEqual(tolerance);
  }
};

const apart = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

/** Column-major local-to-ECEF on the sphere-ish ENU frame at a point. */
function enu(lon: number, lat: number, h: number): Float64Array {
  const l = lon * RAD;
  const p = lat * RAD;
  const r = 6371000 + h;
  // prettier-ignore
  return Float64Array.from([
    -Math.sin(l), Math.cos(l), 0, 0,
    -Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p), 0,
    Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p), 0,
    r * Math.cos(p) * Math.cos(l), r * Math.cos(p) * Math.sin(l), r * Math.sin(p), 1,
  ]);
}

function rigid(angle: number, t: ArrayLike<number>): Float64Array {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  // prettier-ignore
  return Float64Array.from([
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    t[0]!, t[1]!, t[2]!, 1,
  ]);
}

const translate = (x: number, y: number, z: number) =>
  Float64Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1);

function exaggerationRoute(factor = 10) {
  const graph = new TransformGraph();
  const world = graph.root("world");
  const view = graph.add(
    "view",
    world,
    affine({ matrix: rigid(0.5, [1000, -2000, 500]) }),
  );
  const ex = graph.add(
    "ex",
    view,
    verticalExaggerationEdge({ factor, ceiling: 9000 }),
  );
  const content = graph.add(
    "content",
    ex,
    affine({ matrix: enu(8.5, 46.5, 0) }),
  );
  return { graph, world, ex, content, route: routeBetween(content, world) };
}

function utmRoute() {
  const graph = new TransformGraph();
  const world = graph.root("utm");
  const geo = graph.add("geo", world, utm({ zone: 31 }));
  const earth = graph.add("earth", geo, geocentricToGeographic());
  const ex = graph.add(
    "ex",
    earth,
    verticalExaggerationEdge({ factor: 3, ceiling: 9000 }),
  );
  const content = graph.add("content", ex, affine({ matrix: enu(5, 46, 0) }));
  return { graph, world, content, route: routeBetween(content, world) };
}

/** A route with a twist (rate per metre) under a large rigid offset. */
function twistRoute(rate = 1e-5) {
  const graph = new TransformGraph();
  const world = graph.root("world");
  const view = graph.add(
    "view",
    world,
    affine({ matrix: rigid(0.3, [6378137.25, 12345.678, -9876.5]) }),
  );
  const tw = graph.add("tw", view, twist({ rate }));
  const content = graph.add(
    "content",
    tw,
    affine({ matrix: rigid(0, [1, 2, 3]) }),
  );
  return { graph, tw, route: routeBetween(content, world) };
}

function lensRoute() {
  const graph = new TransformGraph();
  const world = graph.root("world");
  const camera = graph.add(
    "camera",
    world,
    affine({ matrix: enu(2.35, 48.85, 35) }),
  );
  const lens = graph.add(
    "lens",
    camera,
    radialDistortion({
      k1: -0.18,
      k2: 0.04,
      k3: -0.005,
      p1: 0.001,
      p2: -0.0008,
    }),
  );
  const content = graph.add(
    "content",
    lens,
    affine({ matrix: rigid(0.2, [3, -2, 60]) }),
  );
  return { graph, route: routeBetween(content, world) };
}

/** A z-stretch by `k` with its IR source: the simplest smooth edge with a closed form. */
function stretch(k: number, accuracy?: number) {
  return smooth({
    id: "stretch",
    params: { k },
    forward: (p, params, out) => {
      out[0] = p[0]!;
      out[1] = p[1]!;
      out[2] = p[2]! * params.k!;
    },
    inverse: (q, params, out) => {
      out[0] = q[0]!;
      out[1] = q[1]!;
      out[2] = q[2]! / params.k!;
    },
    source: "(p, params) => [p[0], p[1], p[2] * params.k]",
    ...(accuracy !== undefined && { accuracy }),
  });
}

describe("Route.walk", () => {
  it("visits each edge, uncollapsed, ending where forward does", () => {
    const { route } = exaggerationRoute();
    const p = [1200, -800, 1500];
    const seen: string[] = [];
    const end = route.walk(p, (edge) => {
      seen.push(`${edge.node.name}:${edge.kind}`);
    });
    expect(seen).toEqual(["content:affine", "ex:smooth", "view:affine"]);
    near(end, route.forward(p), 1e-9);
  });

  it("carries the Jacobian of each edge: their product is the route's", () => {
    const { route } = twistRoute(2e-4);
    const p = [30, -20, 400];
    let chain = Float64Array.of(1, 0, 0, 0, 1, 0, 0, 0, 1);
    route.walk(p, (edge) => {
      const next = new Float64Array(9);
      for (let c = 0; c < 3; c++) {
        for (let r = 0; r < 3; r++) {
          next[3 * c + r] =
            edge.jacobian[r]! * chain[3 * c]! +
            edge.jacobian[3 + r]! * chain[3 * c + 1]! +
            edge.jacobian[6 + r]! * chain[3 * c + 2]!;
        }
      }
      chain = next;
    });
    near(chain, route.jacobian(p), 1e-9);
  });
});

describe("accuracy along a route", () => {
  it("is the input's σ through J: a z-stretch makes an isotropic σ anisotropic", () => {
    const g = new TransformGraph();
    const root = g.root("root");
    const node = g.add("node", root, stretch(4));
    const route = routeBetween(node, root);
    // σ = √3 m isotropic is 1 m per axis; the stretch carries z to 4 m.
    const a = accuracyAlong(route, [1, 2, 3], Math.sqrt(3));
    near(a.covariance, [1, 0, 0, 0, 1, 0, 0, 0, 16], 1e-12);
    expect(a.meters).toBeCloseTo(Math.sqrt(18), 12);
    near(a.jacobian, [1, 0, 0, 0, 1, 0, 0, 0, 4], 1e-12);
    // A σ per axis and a covariance say the same.
    near(accuracyAlong(route, [1, 2, 3], [1, 1, 1]).covariance, a.covariance);
    near(
      accuracyAlong(route, [1, 2, 3], [1, 0, 0, 0, 1, 0, 0, 0, 1]).covariance,
      a.covariance,
    );
  });

  it("adds a smooth node's declared σ at its output and carries it through the edges after", () => {
    const g = new TransformGraph();
    const root = g.root("root");
    const outer = g.add("outer", root, stretch(2));
    const inner = g.add("inner", outer, stretch(3, 1.5));
    const route = routeBetween(inner, root);
    const a = accuracyAlong(route, [0, 0, 0], 0);
    // inner's 1.5 m (0.75 m² per axis) is at inner's output, then outer's ×2 in z.
    near(a.covariance, [0.75, 0, 0, 0, 0.75, 0, 0, 0, 3], 1e-12);
    expect(a.parts.map((p) => [p.node, p.kind])).toEqual([
      ["input", "input"],
      ["inner", "smooth"],
    ]);
    expect(a.parts[1]!.meters).toBeCloseTo(Math.sqrt(0.75 * 2 + 3), 12);
  });

  it("uses the IR's autodiff Jacobian where the spec has IR, agreeing with the route's own", () => {
    const { route } = exaggerationRoute();
    const p = [2500, -1800, 1500];
    const a = accuracyAlong(route, p, 1);
    near(a.jacobian, route.jacobian(p), 1e-6);
    // Σ_out = J Σ Jᵀ with Σ = I/3.
    const j = route.jacobian(p);
    const sigma = new Float64Array(9);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        let s = 0;
        for (let k = 0; k < 3; k++) {
          s += (j[3 * k + r]! * j[3 * k + c]!) / 3;
        }
        sigma[3 * r + c] = s;
      }
    }
    near(a.covariance, sigma, 1e-6);
  });

  it("carries a covariance through a route with a step down: J is the inverse's", () => {
    const g = new TransformGraph();
    const root = g.root("root");
    const node = g.add("node", root, stretch(4));
    const route = routeBetween(root, node);
    const a = accuracyAlong(route, [1, 2, 12], Math.sqrt(3));
    near(a.covariance, [1, 0, 0, 0, 1, 0, 0, 0, 1 / 16], 1e-12);
  });

  it("takes an affine edge's accuracy from the callback, and an unstated one as unbounded", () => {
    const g = new TransformGraph();
    const root = g.root("root");
    const a = g.add("a", root, affine({ matrix: translate(1, 0, 0) }));
    const b = g.add("b", a, affine({ matrix: translate(0, 1, 0) }));
    const route = routeBetween(b, root);
    const sized = accuracyAlong(route, [0, 0, 0], 0, {
      affine: (e) => (e.node === a ? 0.3 : e.node === b ? 0.4 : undefined),
    });
    expect(sized.meters).toBeCloseTo(0.5, 12);
    const unbounded = accuracyAlong(route, [0, 0, 0], 0, {
      affine: (e) => (e.node === a ? Number.POSITIVE_INFINITY : 0.1),
    });
    expect(unbounded.meters).toBe(Number.POSITIVE_INFINITY);
    expect(unbounded.unboundedBy).toBe("a");
  });

  describe("against the frames composer", () => {
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const resolver = createFramesResolver(catalog);
    const itrf = catalog.get("ITRF", { user: "application" });
    const gcrf = catalog.get("GCRF", { user: "application" });
    const pad = eastNorthUpFrame(
      "Pad",
      itrf,
      Ellipsoid.WGS84,
      Ellipsoid.WGS84.cartographicToCartesian(
        { longitude: 0.3, latitude: 0.8, height: 120 },
        new Float64Array(3),
      ),
      { accuracy: { meters: 0.02, radians: 3e-9, note: "survey" } },
    );
    catalog.add(pad);
    const frames = graphOfFrames(catalog, resolver);
    const seconds = Date.UTC(2026, 2, 20, 14, 3, 7) / 1000;
    const instant = resolver.instant(seconds);

    it("agrees with pointAccuracy for a point carried from a pad to ITRF", () => {
      const p = [30, -40, 12];
      const want = pointAccuracy(framePoint(pad, p, instant), itrf, instant);
      const got = accuracyAlong(
        routeBetween(frames.node(pad)!, frames.node(itrf)!, { seconds }),
        p,
        0,
        { affine: frames.accuracy(seconds) },
      );
      expect(want.meters).toBeGreaterThan(0.02);
      expect(got.meters).toBeCloseTo(want.meters!, 9);
      near(got.covariance, want.covariance!, 1e-12);
    });

    it("agrees across the catalogue's own edges (ITRF to GCRF)", () => {
      const p = [6378137 + 30, -40, 12];
      const want = pointAccuracy(framePoint(itrf, p, instant), gcrf, instant);
      const got = accuracyAlong(
        routeBetween(frames.node(itrf)!, frames.node(gcrf)!, { seconds }),
        p,
        0,
        { affine: frames.accuracy(seconds) },
      );
      expect(got.meters).toBeCloseTo(want.meters!, 6);
    });

    it("an unstated edge makes it unbounded, as pointAccuracy's `meters` is undefined", () => {
      const bare = eastNorthUpFrame(
        "Bare",
        itrf,
        Ellipsoid.WGS84,
        [6378137, 0, 0],
        {},
      );
      catalog.add(bare);
      frames.sync();
      const want = pointAccuracy(
        framePoint(bare, [0, 0, 0], instant),
        itrf,
        instant,
      );
      expect(want.meters).toBeUndefined();
      const got = accuracyAlong(
        routeBetween(frames.node(bare)!, frames.node(itrf)!, { seconds }),
        [0, 0, 0],
        0,
        { affine: frames.accuracy(seconds) },
      );
      expect(got.meters).toBe(Number.POSITIVE_INFINITY);
      expect(got.unboundedBy).toBe("Bare");
    });
  });
});

describe("points and measurements in any node", () => {
  it("carries a point to any node in float64, true and drawn being two of them", () => {
    const { graph, world, ex, content, route } = exaggerationRoute(10);
    const p = [1200, -800, 1500];
    const drawn = pointIn({ node: content, position: p }, world);
    near(drawn.position, route.forward(p), 1e-9);
    const sameNode = pointIn({ node: content, position: p }, content);
    near(sameNode.position, p, 1e-12);
    // The node between the affine placement and the lift is the ITRF-like space.
    const between = pointIn({ node: content, position: p }, ex);
    const back = pointIn({ node: world, position: drawn.position }, content);
    near(back.position, p, 1e-4);
    near(
      pointIn({ node: ex, position: between.position }, world).position,
      drawn.position,
      1e-9,
    );
    // Heights are drawn ×10 and the stretch says so.
    expect(drawn.stretch[1]).toBeGreaterThan(9);
    expect(drawn.stretch[0]).toBeGreaterThan(0.99);
    expect(graph).toBeDefined();
  });

  it("follows the view's parameters and the node's switch", () => {
    const g = new TransformGraph();
    const root = g.root("root");
    const node = g.add("node", root, stretch(2));
    g.setParams(node, { k: 5 }, "tall");
    const p = { node, position: [1, 2, 3] };
    expect(pointIn(p, root).position[2]).toBe(6);
    expect(pointIn(p, root, { view: "tall" }).position[2]).toBe(15);
  });

  it("measures distance, polyline length, curve length and area in a node", () => {
    const g = new TransformGraph();
    const root = g.root("root");
    const node = g.add("node", root, stretch(10));
    const square = [
      [0, 0, 0],
      [4, 0, 0],
      [4, 4, 0],
      [0, 4, 0],
    ].map((position) => ({ node, position }));
    // True: in the content's node.
    const truth = measureIn(square, node);
    expect(truth.distance).toBeCloseTo(4, 12);
    expect(truth.length).toBeCloseTo(12, 12);
    expect(truth.area).toBeCloseTo(16, 12);
    expect(truth.pathLength).toBeCloseTo(12, 9);
    // Drawn: a vertical segment is ×10 and a horizontal one is as it was.
    const up = measureIn(
      [
        { node, position: [0, 0, 0] },
        { node, position: [0, 0, 3] },
      ],
      root,
    );
    expect(up.distance).toBeCloseTo(30, 12);
    expect(up.pathLength).toBeCloseTo(30, 9);
    expect(up.distanceSigma).toBe(0);
  });

  it("measures the length of a straight segment's curve where the route bends it", () => {
    const { route } = twistRoute(1e-3);
    const content = route.from;
    const world = route.to;
    const a = { node: content, position: [0, 0, 0] };
    const b = { node: content, position: [0, 0, 2000] };
    const m = measureIn([a, b], world, { pathTolerance: 1e-4 });
    // The twist turns points about the z axis (through the origin of its node); a
    // segment off the axis becomes a helix, longer than its chord.
    const c = { node: content, position: [500, 0, 0] };
    const d = { node: content, position: [500, 0, 2000] };
    const helix = measureIn([c, d], world, { pathTolerance: 1e-4 });
    expect(helix.pathLength).toBeGreaterThan(helix.distance + 1);
    // The content's origin is 2.2 m off the twist's axis: nearly straight.
    expect(m.pathLength - m.distance).toBeLessThan(0.01);
  });

  it("carries the points' accuracies to a distance's σ along the line", () => {
    const g = new TransformGraph();
    const root = g.root("root");
    const node = g.add("node", root, stretch(2));
    const m = measureIn(
      [
        { node, position: [0, 0, 0], sigma: Math.sqrt(3) },
        { node, position: [0, 0, 10], sigma: Math.sqrt(3) },
      ],
      root,
    );
    // 1 m per axis, ×2 in z: 2 m along z at each end, 2√2 m together.
    expect(m.distanceSigma).toBeCloseTo(Math.sqrt(8), 12);
  });
});

describe("a core pick in any node", () => {
  const catalog = createFrameCatalog({ data: syntheticFrameData() });
  const itrf = catalog.get("ITRF", { user: "application" });
  const warp = frameExaggeration({ factor: 10 });
  const content = smoothFrame("Earth content (exaggerated)", itrf, warp);
  catalog.add(content);
  const drawnFrame = itrf;
  const pad = eastNorthUpFrame(
    "Pad",
    content,
    Ellipsoid.WGS84,
    Ellipsoid.WGS84.cartographicToCartesian(
      { longitude: 0.2, latitude: 0.7, height: 0 },
      new Float64Array(3),
    ),
  );
  catalog.add(pad);
  const resolver = createFramesResolver(catalog);
  const route: CameraRoute = resolver.route!(pad, drawnFrame, 0);

  /** The pick of a point of the pad, as the pick pass reads it (the drawn position). */
  function pick(local: number[], domain: boolean, anchor = pad): CorePick {
    const drawn = routeForward(route, local);
    const base = {
      view: { anchorRoute: () => route },
      route,
      position: drawn,
      root: drawnFrame,
      anchor,
      anchorPosition: Float64Array.from(local),
      seconds: 0,
      camera: {
        position: Float64Array.of(local[0]!, local[1]!, local[2]! + 500),
        fovy: 1,
        height: 600,
      },
    };
    return (domain
      ? {
          ...base,
          truePosition: { position: Float64Array.from(local), frame: anchor },
          accuracy: { exact: true, meters: 0 },
        }
      : base) as unknown as CorePick;
  }

  const local = [120, -80, 900];

  it("represents the route as a graph whose nodes are its steps", () => {
    const pg = graphOfCameraRoute(route);
    expect(route.steps.map((s) => s.kind)).toEqual(["rigid", "warp"]);
    expect(pg.nodes).toHaveLength(3);
    expect(pg.true.name).toBe("Pad");
    expect(pg.drawn.name).toBe("ITRF");
    near(
      routeBetween(pg.true, pg.drawn).forward(local),
      routeForward(route, local),
      1e-6,
    );
  });

  it("answers in true, drawn and in the space between the steps, from the domain point", () => {
    const p = pick(local, true);
    const pg = graphOfCameraRoute(route);
    const truth = pickIn(p, "true");
    near(truth.position, local, 1e-12);
    expect(truth.how).toBe("domain");
    expect(truth.provisional).toBe(false);
    const drawn = pickIn(p, "drawn");
    near(drawn.position, routeForward(route, local), 1e-6);
    expect(drawn.stretch[1]).toBeGreaterThan(9);
    const middle = pickIn(p, pg.nodes[1]!, { route: pg });
    near(
      middle.position,
      routeForward({ ...route, steps: [route.steps[0]!] }, local),
      1e-6,
    );
  });

  it("without a domain point goes back through the inverse: provisional, and the same as truePick", () => {
    const p = pick(local, false);
    const here = pickIn(p, "true");
    expect(here.how).toBe("inverse");
    expect(here.provisional).toBe(true);
    near(here.position, local, 1e-4);
    near(here.position, truePick(p).position, 0);
    expect(here.bound).toBe(locatePick(p).bound);
    // And forward again: the drawn answer is where the pick read it.
    near(pickIn(p, "drawn").position, p.position, 1e-3);
  });

  it("keeps truePick's answers", () => {
    const p = pick(local, true);
    const t = truePick(p);
    expect(t.how).toBe("domain");
    near(t.position, local, 0);
    expect(t.drawn?.warped).toBe(true);
    expect(t.footprint).toBeGreaterThan(0);
  });

  it("carries a pick to a catalogue frame through the frames' graph", () => {
    const plain = createFrameCatalog({ data: syntheticFrameData() });
    const plainItrf = plain.get("ITRF", { user: "application" });
    const plainPad = eastNorthUpFrame(
      "Pad",
      plainItrf,
      Ellipsoid.WGS84,
      Ellipsoid.WGS84.cartographicToCartesian(
        { longitude: 0.2, latitude: 0.7, height: 0 },
        new Float64Array(3),
      ),
      { accuracy: { meters: 0.05, note: "survey" } },
    );
    plain.add(plainPad);
    const plainResolver = createFramesResolver(plain);
    const frames = graphOfFrames(plain, plainResolver);
    const carried = pickIn(pick(local, true, plainPad as never), plainItrf, {
      frames: { graph: frames, frameOf: (key) => key as typeof plainPad },
    });
    const want = new Float64Array(3);
    const m = frameTransform(plainPad, plainItrf, plainResolver.instant(0));
    for (let r = 0; r < 3; r++) {
      want[r] =
        m[r]! * local[0]! +
        m[4 + r]! * local[1]! +
        m[8 + r]! * local[2]! +
        m[12 + r]!;
    }
    near(carried.position, want, 1e-6);
    // Its accuracy is the frames composer's for the pad's edge.
    expect(carried.accuracy.meters).toBeCloseTo(0.05, 9);
  });

  it("takes a graph-native point to a node, and refuses a foreign node", () => {
    const { content, world, route: r } = exaggerationRoute();
    const answered = pickIn({ node: content, position: local }, world);
    near(answered.position, r.forward(local), 1e-9);
    expect(() => pickIn({ node: content, position: local }, "true")).toThrow(
      /graph node/,
    );
    const foreign = exaggerationRoute().world;
    expect(() => pickIn(pick(local, true), foreign)).toThrow(/not a node/);
  });
});

describe("Taylor-model bounds against sampling", () => {
  /** Sampling as selection does it today: 27 samples and the spacing's bulge. */
  function sampled(route: Route, c: number[], r: number[]) {
    const map: DrawnMap = (p, out, jacobian) => {
      out.set(route.forward(p));
      jacobian?.set(route.jacobian(p));
      return out;
    };
    return drawnBounds(
      [map],
      volumeSamples({
        center: c,
        halfAxes: [r[0]!, 0, 0, 0, r[1]!, 0, 0, 0, r[2]!],
      }),
      Math.hypot(r[0]!, r[1]!, r[2]!),
    );
  }

  /** The image of a dense grid of the box, farthest from `about`. */
  function farthest(
    route: Route,
    c: number[],
    r: number[],
    about: ArrayLike<number>,
  ): number {
    const n = 9;
    let worst = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        for (let k = 0; k < n; k++) {
          const q = route.forward([
            c[0]! + r[0]! * (2 * (i / (n - 1)) - 1),
            c[1]! + r[1]! * (2 * (j / (n - 1)) - 1),
            c[2]! + r[2]! * (2 * (k / (n - 1)) - 1),
          ]);
          worst = Math.max(worst, apart(q, about));
        }
      }
    }
    return worst;
  }

  const earth = [1200, -800, 1500];

  /** Where the Taylor model is as tight as sampling: smooth maps whose interval derivatives don't swell. */
  const tight: Array<[string, Route, number[], number[]]> = [
    ["twist", twistRoute().route, earth, [50, 500, 5000]],
    ["lens", lensRoute().route, [0, 0, 0], [1, 5]],
  ];

  for (const [name, route, c, halves] of tight) {
    it(`${name}: holds every sample, within 1.1× of sampling's sphere`, () => {
      for (const half of halves) {
        const r = [half, half, half];
        const bounds = taylorBounds(route, { center: c, halfExtent: r });
        if (!bounds.ok) {
          throw new Error(bounds.reason);
        }
        // Conservative: the dense image is inside, and so is sampling's own.
        expect(farthest(route, c, r, bounds.center)).toBeLessThanOrEqual(
          bounds.radius,
        );
        const s = sampled(route, c, r);
        expect(bounds.radius / s.radius).toBeLessThan(1.1);
        expect(bounds.radius).toBeGreaterThanOrEqual(0.99 * s.radius);
      }
    });
  }

  it("is exact for an affine route (no remainder) and bounds an oriented box", () => {
    const g = new TransformGraph();
    const root = g.root("root");
    const node = g.add("node", root, affine({ matrix: rigid(0.7, [5, 6, 7]) }));
    const route = routeBetween(node, root);
    const b = taylorBounds(route, { center: [1, 2, 3], halfExtent: [4, 5, 6] });
    if (!b.ok) {
      throw new Error(b.reason);
    }
    expect(Array.from(b.remainder)).toEqual([0, 0, 0]);
    expect(b.radius).toBeCloseTo(Math.hypot(4, 5, 6), 12);
    // An oriented box: half axes along (1, 1, 0) and (−1, 1, 0) and z.
    const o = taylorBounds(route, {
      center: [1, 2, 3],
      halfAxes: [3, 3, 0, -2, 2, 0, 0, 0, 1],
    });
    if (!o.ok) {
      throw new Error(o.reason);
    }
    expect(o.radius).toBeCloseTo(Math.hypot(1, 5, 1), 12);
  });

  it("holds the image for every value of a parameter's range", () => {
    const { graph, tw, route } = twistRoute(1e-5);
    const c = earth;
    const r = [500, 500, 500];
    const range: [number, number] = [2e-6, 4e-5];
    const b = taylorBounds(
      route,
      { center: c, halfExtent: r },
      {
        params: (node) => (node === tw ? { rate: range } : undefined),
      },
    );
    if (!b.ok) {
      throw new Error(b.reason);
    }
    for (const rate of [range[0], 1e-5, 2.5e-5, range[1]]) {
      graph.setParams(tw, { rate });
      expect(farthest(route, c, r, b.center)).toBeLessThanOrEqual(b.radius);
    }
    // And it is wider than for the value alone.
    graph.setParams(tw, { rate: 1e-5 });
    const alone = taylorBounds(route, { center: c, halfExtent: r });
    expect(alone.ok && alone.radius < b.radius).toBe(true);
  });

  it("holds a function with a kink by the mean-value form, and refuses a step", () => {
    const g = new TransformGraph();
    const root = g.root("root");
    const folded = g.add(
      "folded",
      root,
      smooth({
        id: "fold",
        params: {},
        forward: (p, _params, out) => {
          out[0] = p[0]!;
          out[1] = Math.abs(p[1]!);
          out[2] = p[2]!;
        },
        source: "(p) => [p[0], Math.abs(p[1]), p[2]]",
      }),
    );
    const route = routeBetween(folded, root);
    const c = [5, 0.1, 0];
    const r = [2, 2, 2];
    const b = taylorBounds(route, { center: c, halfExtent: r });
    if (!b.ok) {
      throw new Error(b.reason);
    }
    expect(b.continuous).toBe(false);
    expect(farthest(route, c, r, b.center)).toBeLessThanOrEqual(b.radius);
    const stepped = g.add(
      "stepped",
      root,
      smooth({
        id: "floor",
        params: {},
        forward: (p, _params, out) => {
          out[0] = Math.floor(p[0]!);
          out[1] = p[1]!;
          out[2] = p[2]!;
        },
        source: "(p) => [Math.floor(p[0]), p[1], p[2]]",
      }),
    );
    const refused = taylorBounds(routeBetween(stepped, root), {
      center: c,
      halfExtent: r,
    });
    expect(refused.ok).toBe(false);
    // A route through a step down is refused as well.
    expect(
      taylorBounds(routeBetween(root, folded), { center: c, halfExtent: r }).ok,
    ).toBe(false);
  });

  it("is not within 1.2× of sampling for the exaggeration and UTM routes: selection keeps sampling", () => {
    // The geodetic height's unrolled Newton iteration has intervals that swell
    // even over a 100 m box (J over it: [-3, 9] for a true 5.1), so the
    // remainder, though second order, is far larger than the image.
    for (const route of [exaggerationRoute().route, utmRoute().route]) {
      for (const half of [50, 500, 5000]) {
        const r = [half, half, half];
        const b = taylorBounds(route, { center: earth, halfExtent: r });
        if (!b.ok) {
          continue;
        }
        // Still conservative.
        expect(farthest(route, earth, r, b.center)).toBeLessThanOrEqual(
          b.radius,
        );
        expect(b.radius / sampled(route, earth, r).radius).toBeGreaterThan(1.2);
      }
    }
  });
});

describe("chord error and subdivision", () => {
  /** The largest distance from the curve F(x(t)) to the chord of its ends, over t. */
  function chord(route: Route, a: number[], b: number[]): number {
    const fa = route.forward(a);
    const fb = route.forward(b);
    let worst = 0;
    for (let i = 1; i < 64; i++) {
      const t = i / 64;
      const q = route.forward(a.map((x, k) => x + t * (b[k]! - x)));
      const e = fb.map((_, k) => fa[k]! + t * (fb[k]! - fa[k]!));
      worst = Math.max(worst, apart(q, e));
    }
    return worst;
  }

  it("is read from the route's Jacobian: M₂ bounds the second difference along any direction", () => {
    const { route } = twistRoute(2e-4);
    const p = [40, -30, 600];
    const m = curvatureAt(route, p, 0.5);
    const f0 = route.forward(p);
    let largest = 0;
    // Axes, face diagonals and the cube's diagonals.
    for (const d of [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [1, 1, 0],
      [1, -1, 0],
      [1, 0, 1],
      [1, 0, -1],
      [0, 1, 1],
      [0, 1, -1],
      [1, 1, 1],
      [1, 1, -1],
      [1, -1, 1],
      [-1, 1, 1],
    ]) {
      const l = Math.hypot(d[0]!, d[1]!, d[2]!);
      const u = d.map((x) => x / l);
      const fp = route.forward(p.map((x, k) => x + u[k]!));
      const fm = route.forward(p.map((x, k) => x - u[k]!));
      largest = Math.max(
        largest,
        Math.hypot(...[0, 1, 2].map((i) => fp[i]! - 2 * f0[i]! + fm[i]!)),
      );
    }
    expect(largest).toBeLessThanOrEqual(m * 1.001);
    expect(largest).toBeGreaterThan(0.4 * m);
  });

  it("bounds the chord error of straight edges under a twist and a lens", () => {
    for (const { route, a, b, over } of [
      {
        route: twistRoute(2e-4).route,
        a: [60, 0, 0],
        b: [60, 0, 1500],
        over: [60, 0, 750, 80, 0, 760],
      },
      {
        route: lensRoute().route,
        a: [-14, -9, 0],
        b: [14, 9, 0],
        over: [0, 0, 0, 14, 9, 0, -14, -9, 0, 14, -9, 0],
      },
    ]) {
      const m = curvatureOver(route, over)!;
      const length = apart(a, b);
      const actual = chord(route, a, b);
      expect(actual).toBeGreaterThan(0);
      expect(actual).toBeLessThanOrEqual(chordError(m, length) * 1.001);
      // The subdivision that brings it under a tolerance does.
      const tolerance = actual / 10;
      const n = subdivisionFor(m, length, tolerance, 1024);
      expect(n).toBeGreaterThan(1);
      let worst = 0;
      for (let i = 0; i < n; i++) {
        const lerp = (t: number) => a.map((x, k) => x + t * (b[k]! - x));
        worst = Math.max(worst, chord(route, lerp(i / n), lerp((i + 1) / n)));
      }
      expect(worst).toBeLessThanOrEqual(tolerance);
    }
  });

  it("subdivides in proportion to the square root of the edge length and the curvature", () => {
    expect(subdivisionFor(1e-3, 50, 1)).toBe(1);
    expect(subdivisionFor(1e-3, 1e4, 1, 1024)).toBe(
      Math.ceil(Math.sqrt(12500)),
    );
    expect(subdivisionFor(1, 1e6, 1e-3, 64)).toBe(64);
    expect(() => subdivisionFor(1, 1, 0)).toThrow(RangeError);
  });

  it("reads the exaggeration route's curvature: (k − 1)/R below the band, (k − 1)/band within it", () => {
    const { route } = exaggerationRoute(10);
    // ENU frame at 46.5° N: a point 1.5 km up is 4 km above the ellipsoid, and
    // one 7.4 km up (51 km out along the tangent plane) is in the blend band
    // (7.2 to 9 km), where the lift's slope changes by 9/1800 per metre.
    const below = curvatureOver(route, [1200, -800, 1500], 10);
    expect(below).toBeGreaterThan(1e-6);
    expect(below).toBeLessThan(1e-5);
    // A step much smaller or larger reads the same.
    expect(curvatureOver(route, [1200, -800, 1500], 100) / below).toBeCloseTo(
      1,
      3,
    );
    const band = curvatureOver(route, [51200, 49200, 3000], 10);
    expect(band / (9 / 1800)).toBeCloseTo(1, 2);
    // The chord error of a 50 km edge is then hundreds of metres: far past a pixel.
    expect(chordError(below, 5e4)).toBeGreaterThan(100);
  });
});

describe("clip sets placed at nodes", () => {
  const g = new TransformGraph();
  const world = g.root("world");
  // The content, exaggerated ×10 vertically into the world.
  const exaggerated = g.add("exaggerated", world, stretch(10));
  const content = g.add(
    "content",
    exaggerated,
    affine({ matrix: translate(0, 0, 5) }),
  );
  // A design frame, rigid under the world, and the view's render space, behind a lens.
  const design = g.add(
    "design",
    world,
    affine({ matrix: translate(100, 0, 0) }),
  );
  const lens = g.add("lens", world, stretch(3));
  const render = g.add("render", lens, affine({ matrix: translate(0, 0, 0) }));
  const inner = {
    resolve: () => {
      throw new Error("the wrapped resolver was asked about a node");
    },
    routeRevision: () => 0,
  };
  const resolver = nodeResolver(inner);
  const plane: ClipSet = {
    frame: design,
    shapes: [{ kind: "plane", point: [0, 0, 50], normal: [0, 0, 1] }],
  };

  it("answers a rigid route with the matrix, and a smooth one with NonRigidRouteError", () => {
    const out = new Float64Array(16);
    resolver.resolve(design, world, 0, out);
    near(out, translate(100, 0, 0), 1e-12);
    expect(() => resolver.resolve(design, content, 0, out)).toThrow(
      NonRigidRouteError,
    );
  });

  it("plans a set at a node as drawn where the view's root is rigid from it, and curved where it is not", () => {
    const placement = Float64Array.of(
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
    const drawn = planClip(plane, {
      resolver,
      seconds: 0,
      root: world,
      body: content,
      bodyPlacement: placement,
    });
    expect(drawn.space).toBe("drawn");
    const curved = planClip(plane, {
      resolver,
      seconds: 0,
      root: render,
      body: content,
      bodyPlacement: placement,
    });
    expect(curved.space).toBe("curved");
  });

  it("gives the camera layer's route, whose forward is the graph's", () => {
    const route = resolveRoute(resolver, content, design, 0);
    expect(route.steps.map((s) => s.kind)).toEqual(["rigid", "warp", "rigid"]);
    const a = [3, -4, 20];
    const graphRoute = routeBetween(content, design);
    near(routeForward(route, a), graphRoute.forward(a), 1e-9);
    // The signed distance of a content point is the plane's at where it is drawn.
    expect(clipSetDistance(plane, routeForward(route, a))).toBeCloseTo(
      (20 + 5) * 10 - 50,
      9,
    );
    // And through the inverse, the other way.
    const back = resolveRoute(resolver, design, content, 0);
    near(routeForward(back, graphRoute.forward(a)), a, 1e-9);
  });

  it("follows the graph: a changed parameter changes the route's revision and its answers", () => {
    const before = resolver.routeRevision(content, design);
    const route = resolveRoute(resolver, content, design, 0);
    g.setParams(exaggerated, { k: 20 });
    expect(resolver.routeRevision(content, design)).toBeGreaterThan(before);
    const after = resolveRoute(resolver, content, design, 0);
    expect(routeForward(after, [0, 0, 0])[2]).toBe(5 * 20);
    // The earlier route is a snapshot.
    expect(routeForward(route, [0, 0, 0])[2]).toBe(5 * 10);
    g.setParams(exaggerated, { k: 10 });
  });

  it("goes to the wrapped resolver for keys that are not nodes, and places an anchor at a node", () => {
    const anchor = { name: "anchor" };
    const wrapped = nodeResolver(
      {
        ...inner,
        resolve: (_a, _b, _s, out) => {
          out.set(translate(1, 2, 3));
          return out;
        },
      },
      { nodeOf: (key) => (key === anchor ? content : undefined) },
    );
    const out = new Float64Array(16);
    wrapped.resolve({ name: "other" }, { name: "else" }, 0, out);
    near(out, translate(1, 2, 3), 0);
    const route = resolveRoute(wrapped, anchor, design, 0);
    near(
      routeForward(route, [0, 0, 1]),
      routeBetween(content, design).forward([0, 0, 1]),
      1e-9,
    );
  });
});
