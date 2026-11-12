// A smooth edge of the frame tree (plan §13.37): a frame whose coordinates
// map up to its parent's. The frames resolver's `route()` carries it as a
// warp step, forward going up and inverse going down, `resolve()` refuses
// it, and a route that doesn't cross it is as it was. A switch frame chooses
// its edge per view.
import { describe, expect, it, vi } from "vitest";
import {
  NonRigidRouteError,
  resolveRoute,
  routeForward,
  routeInverse,
  routeIsRigid,
} from "../src/camera/route.ts";
import { tableResolver } from "../src/camera/tableResolver.ts";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import { Frame, frameTransform } from "../src/frames/Frame.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import {
  isSmoothFrame,
  isSwitchFrame,
  smoothFrame,
  switchFrame,
  type SmoothFrameSpec,
  type SwitchChoice,
} from "../src/frames/smoothFrame.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

const SECONDS = Date.UTC(2000, 0, 1, 12) / 1000;
const R = 6371e3;

function translation(x: number, y: number, z: number): Float64Array {
  const m = new Float64Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

/** Rotation about z by `a`, then translation. */
function placed(a: number, x: number, y: number, z: number): Float64Array {
  const m = translation(x, y, z);
  m[0] = Math.cos(a);
  m[1] = Math.sin(a);
  m[4] = -Math.sin(a);
  m[5] = Math.cos(a);
  return m;
}

/**
 * Height above a sphere of radius R about the origin scaled by `k`:
 * p ↦ (R + k(|p| − R)) p/|p|, with its Jacobian (f/r) I + (k − f/r) u uᵀ.
 */
function exaggeration(
  k: number,
  options: Partial<SmoothFrameSpec> = {},
): SmoothFrameSpec & { revision: number } {
  return {
    revision: 1,
    description: `height × ${k}`,
    forward(p, out, jacobian) {
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
    },
    ...options,
  };
}

function setup(
  spec: SmoothFrameSpec & { revision: number } = exaggeration(10),
) {
  const catalog = createFrameCatalog({ data: syntheticFrameData() });
  const itrf = catalog.get("ITRF");
  const exaggerated = smoothFrame("exaggerated", itrf, spec);
  catalog.add(exaggerated);
  const mast = Frame.constant("mast", exaggerated, placed(0.3, 100, -50, 20), {
    accuracy: { meters: 0.3, note: "survey" },
  });
  catalog.add(mast);
  const site = Frame.constant("site", itrf, placed(-0.7, 10, 20, 30), {
    accuracy: { meters: 0.4, note: "survey" },
  });
  catalog.add(site);
  const resolver = createFramesResolver(catalog);
  return { catalog, itrf, exaggerated, mast, site, resolver, spec };
}

const POINT = [R * 0.6 + 1234.5, R * 0.7 - 987.6, R * 0.37 + 55.5];

describe("a smooth edge of the frame tree", () => {
  it("defines a frame whose warp runs from it to its parent", () => {
    const { itrf, exaggerated } = setup();
    expect(isSmoothFrame(exaggerated)).toBe(true);
    expect(isSwitchFrame(exaggerated)).toBe(false);
    expect(exaggerated.parent).toBe(itrf);
    expect(exaggerated.warp.from).toBe(exaggerated);
    expect(exaggerated.warp.to).toBe(itrf);
    const out = new Float64Array(3);
    exaggerated.warp.forward([R + 100, 0, 0], out);
    expect(out[0]).toBeCloseTo(R + 1000, 6);
  });

  it("route() walks the warp forward going up to the parent and back going down", () => {
    const { itrf, exaggerated, resolver } = setup();
    const up = resolver.route(exaggerated, itrf, SECONDS);
    expect(up.steps.map((s) => s.kind)).toEqual(["warp"]);
    expect(up.steps[0]).toMatchObject({ kind: "warp", inverse: false });
    expect(up.frame).toBe(exaggerated);
    expect(up.base).toBe(itrf);
    expect(up.seconds).toBe(SECONDS);
    const down = resolver.route(itrf, exaggerated, SECONDS);
    expect(down.steps).toHaveLength(1);
    expect(down.steps[0]).toMatchObject({ kind: "warp", inverse: true });
    const q = routeForward(up, POINT);
    const r = Math.hypot(...POINT);
    expect(Math.hypot(...q)).toBeCloseTo(R + 10 * (r - R), 5);
  });

  it("content in the frame is drawn through the edge, and a sibling frame is not", () => {
    const { catalog, itrf, mast, resolver } = setup();
    const moon = Frame.constant("moon", itrf, translation(3.844e8, 0, 0));
    catalog.add(moon);
    expect(routeIsRigid(resolver.route(moon, itrf, SECONDS))).toBe(true);
    expect(routeIsRigid(resolver.route(mast, itrf, SECONDS))).toBe(false);
    // Content in the deformed frame reaches its parent forward; the sibling reaches it as it is.
    const steps = resolver.route(mast, itrf, SECONDS).steps;
    expect(steps.map((s) => s.kind)).toEqual(["rigid", "warp"]);
    expect(steps[1]).toMatchObject({ kind: "warp", inverse: false });
  });

  it("composes rigid runs on both sides of the warp, in order", () => {
    const { mast, site, exaggerated, itrf, resolver } = setup();
    const route = resolver.route(mast, site, SECONDS);
    expect(route.steps.map((s) => s.kind)).toEqual(["rigid", "warp", "rigid"]);
    expect(route.steps[1]).toMatchObject({ kind: "warp", inverse: false });
    // By hand: mast → exaggerated, then the warp up to ITRF, then ITRF → site.
    const instant = resolver.instant(SECONDS);
    const a = frameTransform(mast, exaggerated, instant);
    const local = [
      a[0]! * POINT[0]! + a[4]! * POINT[1]! + a[8]! * POINT[2]! + a[12]!,
      a[1]! * POINT[0]! + a[5]! * POINT[1]! + a[9]! * POINT[2]! + a[13]!,
      a[2]! * POINT[0]! + a[6]! * POINT[1]! + a[10]! * POINT[2]! + a[14]!,
    ];
    const warped = routeForward(
      resolver.route(exaggerated, itrf, SECONDS),
      local,
    );
    const b = frameTransform(itrf, site, instant);
    const expected = [
      b[0]! * warped[0]! + b[4]! * warped[1]! + b[8]! * warped[2]! + b[12]!,
      b[1]! * warped[0]! + b[5]! * warped[1]! + b[9]! * warped[2]! + b[13]!,
      b[2]! * warped[0]! + b[6]! * warped[1]! + b[10]! * warped[2]! + b[14]!,
    ];
    const got = routeForward(route, POINT);
    expect(Math.hypot(...got.map((v, i) => v - expected[i]!))).toBeLessThan(
      1e-6,
    );
  });

  it("routeForward and routeInverse round trip to 1 µm at Earth scale, both ways", () => {
    const { mast, site, itrf, exaggerated, resolver } = setup();
    for (const [from, to] of [
      [mast, site],
      [site, mast],
      [itrf, exaggerated],
      [exaggerated, itrf],
    ] as const) {
      const route = resolver.route(from, to, SECONDS);
      const p = [R * 1.0 + 12.5, 40.25, -300.75];
      const there = routeForward(route, p);
      const back = routeInverse(route, there);
      expect(
        Math.hypot(back[0]! - p[0]!, back[1]! - p[1]!, back[2]! - p[2]!),
      ).toBeLessThan(1e-6);
    }
  });

  it("resolve, frameTransform and motion refuse a route across the warp", () => {
    const { mast, site, itrf, exaggerated, resolver } = setup();
    const out = new Float64Array(16);
    expect(() => resolver.resolve(mast, site, SECONDS, out)).toThrow(
      NonRigidRouteError,
    );
    expect(() => resolver.resolve(itrf, exaggerated, SECONDS, out)).toThrow(
      /crosses a smooth edge/,
    );
    expect(() =>
      resolver.motion(mast, site, SECONDS, {
        velocity: new Float64Array(3),
        angularVelocity: new Float64Array(3),
      }),
    ).toThrow(NonRigidRouteError);
    expect(() =>
      frameTransform(exaggerated, itrf, resolver.instant(SECONDS)),
    ).toThrow(NonRigidRouteError);
  });

  it("a route that doesn't cross the warp is unchanged: one rigid step, the same matrix", () => {
    const { mast, site, itrf, exaggerated, resolver } = setup();
    const instant = resolver.instant(SECONDS);
    const matrix = resolver.resolve(site, itrf, SECONDS, new Float64Array(16));
    expect(matrix).toEqual(frameTransform(site, itrf, instant));
    const route = resolver.route(site, itrf, SECONDS);
    expect(routeIsRigid(route)).toBe(true);
    expect(route.steps).toHaveLength(1);
    const step = route.steps[0]!;
    expect(step.kind === "rigid" && step.matrix).toEqual(matrix);
    const inside = resolver.route(mast, exaggerated, SECONDS);
    expect(inside.steps).toHaveLength(1);
    expect(inside.steps[0]!.kind).toBe("rigid");
  });

  it("the route's revision is the resolver's, and counts the warp's revision", () => {
    const { mast, site, itrf, resolver, spec, exaggerated } = setup();
    const before = resolver.routeRevision(mast, site);
    const rigidBefore = resolver.routeRevision(site, itrf);
    expect(resolver.route(mast, site, SECONDS).revision).toBe(before);
    spec.revision++;
    const after = resolver.routeRevision(mast, site);
    expect(after).not.toBe(before);
    expect(resolver.route(mast, site, SECONDS).revision).toBe(after);
    // Off the warp: untouched.
    expect(resolver.routeRevision(site, itrf)).toBe(rigidBefore);
    const beforeInvalidate = resolver.routeRevision(exaggerated, itrf);
    exaggerated.invalidate();
    expect(resolver.routeRevision(exaggerated, itrf)).not.toBe(
      beforeInvalidate,
    );
  });

  it("watch hears a smooth frame defined and its revision changing", () => {
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const resolver = createFramesResolver(catalog);
    const told = vi.fn();
    const unwatch = resolver.watch(told);
    const spec = exaggeration(3);
    const exaggerated = smoothFrame("exaggerated", catalog.get("ITRF"), spec);
    catalog.add(exaggerated);
    expect(told).toHaveBeenCalledTimes(1);
    resolver.routeRevision(exaggerated, catalog.get("ITRF"));
    const heard = told.mock.calls.length;
    spec.revision++;
    exaggerated.invalidate();
    expect(told).toHaveBeenCalledTimes(heard + 1);
    unwatch();
    exaggerated.invalidate();
    expect(told).toHaveBeenCalledTimes(heard + 1);
  });

  it("accuracy adds the warp's sigma in quadrature with the rigid edges' and notes its bound", () => {
    const { mast, site, exaggerated, itrf, resolver } = setup(
      exaggeration(10, {
        accuracy: { sigma: 0.5, bound: 2, note: "fit of the model" },
      }),
    );
    const alone = resolver.accuracy(POINT, exaggerated, itrf, SECONDS);
    expect(alone.meters).toBeCloseTo(0.5, 12);
    expect(alone.note).toContain("worst case 2 m");
    const across = resolver.accuracy([1, 2, 3], mast, site, SECONDS);
    expect(across.meters).toBeCloseTo(Math.hypot(0.3, 0.5, 0.4), 9);
    expect(across.note).toContain("warp");
    // A route not crossing it is pointAccuracy's alone.
    expect(
      resolver.accuracy([1, 2, 3], site, itrf, SECONDS).meters,
    ).toBeCloseTo(0.4, 9);
  });

  it("a warp that states only a bound leaves the accuracy unstated, naming the bound", () => {
    const { exaggerated, itrf, resolver } = setup(
      exaggeration(10, { accuracy: { bound: 2 } }),
    );
    const result = resolver.accuracy(POINT, exaggerated, itrf, SECONDS);
    expect(result.meters).toBeUndefined();
    expect(result.note).toMatch(/bound of 2 m, not a 1σ/);
  });

  it("a warp stating no accuracy is exact", () => {
    const { exaggerated, itrf, resolver } = setup();
    expect(resolver.accuracy(POINT, exaggerated, itrf, SECONDS).meters).toBe(0);
  });
});

describe("a switch frame chooses its edge per view", () => {
  /** Two views: one sees the exaggeration, one the identity. */
  const exaggerating = { name: "3D" };
  const flat = { name: "plan" };

  function withSwitch() {
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const itrf = catalog.get("ITRF");
    const spec = exaggeration(10);
    const chart = switchFrame("chart", itrf, {
      byView: new Map<object, SwitchChoice>([
        [exaggerating, spec],
        [flat, "identity"],
      ]),
    });
    catalog.add(chart);
    const resolver = createFramesResolver(catalog);
    return { catalog, itrf, chart, resolver, spec };
  }

  it("is warped for one view and rigid for the other, in the same tree", () => {
    const { itrf, chart, resolver } = withSwitch();
    expect(isSwitchFrame(chart)).toBe(true);
    const warped = resolver.route(chart, itrf, SECONDS, exaggerating);
    expect(warped.steps[0]).toMatchObject({ kind: "warp", inverse: false });
    const through = routeForward(warped, POINT);
    expect(Math.hypot(...through)).toBeCloseTo(
      R + 10 * (Math.hypot(...POINT) - R),
      5,
    );
    const rigid = resolver.route(chart, itrf, SECONDS, flat);
    expect(routeIsRigid(rigid)).toBe(true);
    const step = rigid.steps[0]!;
    expect(step.kind === "rigid" && Array.from(step.matrix)).toEqual(
      Array.from(translation(0, 0, 0)),
    );
  });

  it("refuses a matrix across it, and a route without a view or default", () => {
    const { itrf, chart, resolver } = withSwitch();
    expect(() =>
      resolver.resolve(chart, itrf, SECONDS, new Float64Array(16)),
    ).toThrow(NonRigidRouteError);
    expect(() => resolver.route(chart, itrf, SECONDS)).toThrow(
      /no choice .* and no default/,
    );
    expect(() =>
      resolver.route(chart, itrf, SECONDS, { name: "other" }),
    ).toThrow(/no choice/);
  });

  it("a default serves the views not named, and the revision counts every choice", () => {
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const itrf = catalog.get("ITRF");
    const spec = exaggeration(10);
    const chart = switchFrame("chart", itrf, {
      byView: new Map([[flat, "identity" as const]]),
      default: spec,
    });
    catalog.add(chart);
    const resolver = createFramesResolver(catalog);
    expect(
      resolver.route(chart, itrf, SECONDS, exaggerating).steps[0],
    ).toMatchObject({ kind: "warp" });
    const before = resolver.routeRevision(chart, itrf);
    spec.revision++;
    expect(resolver.routeRevision(chart, itrf)).not.toBe(before);
  });
});

describe("routes without a resolver's own route()", () => {
  it("resolveRoute makes one rigid step from resolve", () => {
    const { site, itrf, resolver } = setup();
    const bare = {
      resolve: resolver.resolve.bind(resolver),
      routeRevision: resolver.routeRevision.bind(resolver),
    };
    const route = resolveRoute(bare, site, itrf, SECONDS);
    expect(routeIsRigid(route)).toBe(true);
    expect(route.steps).toHaveLength(1);
    expect(route.revision).toBe(resolver.routeRevision(site, itrf));
  });

  it("the table resolver's route is one rigid step", async () => {
    const engine = await fakeEngine();
    const world = engine.createWorld();
    const anchor = world.addAnchor("site");
    const table = tableResolver(world);
    const route = table.route!(anchor, world.root, SECONDS);
    expect(route.steps).toHaveLength(1);
    expect(route.steps[0]!.kind).toBe("rigid");
    expect(route.revision).toBe(table.routeRevision(anchor, world.root));
    const step = route.steps[0]!;
    expect(step.kind === "rigid" && step.matrix).toEqual(
      table.resolve(anchor, world.root, SECONDS, new Float64Array(16)),
    );
  });
});
