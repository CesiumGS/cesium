// The transform graph's CPU side (plan section 13.37, task 1): nodes,
// routes through the lowest common ancestor, collapsed affine runs, smooth
// nodes inverted by declaration or by Newton, switches chosen per view, and
// the frames catalogue as affine nodes.
import { describe, expect, it } from "vitest";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import { frameTransform } from "../src/frames/Frame.ts";
import { graphOfFrames } from "../src/frames/graphOfFrames.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import {
  affine,
  routeBetween,
  smooth,
  switchEdge,
  TransformGraph,
  type Params,
  type PlainEdge,
  type SmoothSpec,
} from "../src/transform/index.ts";

const translate = (x: number, y: number, z: number): number[] => [
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
  x,
  y,
  z,
  1,
];
/** Rotation about z by `a`, then scale `s`, then translation. */
const turn = (a: number, s: number, x: number, y: number, z: number) => [
  s * Math.cos(a),
  s * Math.sin(a),
  0,
  0,
  -s * Math.sin(a),
  s * Math.cos(a),
  0,
  0,
  0,
  0,
  s,
  0,
  x,
  y,
  z,
  1,
];

/** `m � (p, 1)` for a column-major matrix. */
const apply = (m: ArrayLike<number>, p: ArrayLike<number>): number[] =>
  [0, 1, 2].map(
    (r) => m[r]! * p[0]! + m[4 + r]! * p[1]! + m[8 + r]! * p[2]! + m[12 + r]!,
  );

const near = (a: ArrayLike<number>, b: ArrayLike<number>, digits = 9) => {
  for (let i = 0; i < 3; i++) {
    expect(a[i]).toBeCloseTo(b[i]!, digits);
  }
};

/** Twist about z by k·z radians per metre: a smooth map with a Jacobian and an exact inverse. */
function twist(extra: Partial<SmoothSpec> = {}): SmoothSpec {
  const rotate = (
    p: ArrayLike<number>,
    sign: number,
    params: Params,
    out: Float64Array,
  ) => {
    const a = sign * params.k! * p[2]!;
    out[0] = p[0]! * Math.cos(a) - p[1]! * Math.sin(a);
    out[1] = p[0]! * Math.sin(a) + p[1]! * Math.cos(a);
    out[2] = p[2]!;
  };
  return {
    id: "twist",
    params: { k: 0.002 },
    forward: (p, params, out) => rotate(p, 1, params, out),
    inverse: (q, params, out) => rotate(q, -1, params, out),
    ...extra,
  };
}

/** Scale heights about `h0` by `k`: the exaggeration of an Earth's content. */
const exaggerate = (extra: Partial<SmoothSpec> = {}): SmoothSpec => ({
  id: "exaggerate",
  params: { k: 3, h0: 100 },
  forward: (p, params, out, jacobian) => {
    out[0] = p[0]!;
    out[1] = p[1]!;
    out[2] = params.h0! + (p[2]! - params.h0!) * params.k!;
    if (jacobian) {
      jacobian.set([1, 0, 0, 0, 1, 0, 0, 0, params.k!]);
    }
  },
  ...extra,
});

describe("affine routes", () => {
  const graph = new TransformGraph();
  const world = graph.root("world");
  const a = graph.add("a", world, affine({ matrix: turn(0.3, 2, 10, 20, 30) }));
  const b = graph.add("b", a, affine({ matrix: turn(-0.7, 0.5, 1, -2, 3) }));
  const c = graph.add("c", b, affine({ matrix: translate(5, 6, 7) }));
  const d = graph.add("d", a, affine({ matrix: turn(1.1, 1, -4, 0, 9) }));
  const p = [1, 2, 3];

  it("composes up the chain and collapses it into one matrix step", () => {
    const route = routeBetween(c, world);
    expect(route.steps).toHaveLength(1);
    expect(route.steps[0]).toMatchObject({ kind: "affine", edges: 3 });
    const expected = [c, b, a].reduce(
      (q, node) => apply((node.edge as { matrix: Float64Array }).matrix, q),
      p,
    );
    near(route.forward(p), expected);
  });

  it("goes up and down through the lowest common ancestor in one step", () => {
    const route = routeBetween(c, d);
    expect(route.steps).toHaveLength(1);
    expect(route.steps[0]).toMatchObject({ kind: "affine", edges: 3 });
    const viaA = routeBetween(c, a).forward(p);
    near(route.forward(p), routeBetween(a, d).forward(viaA));
    near(route.inverse(route.forward(p)), p);
    near(routeBetween(d, c).forward(route.forward(p)), p);
  });

  it("is the identity from a node to itself", () => {
    const route = routeBetween(b, b);
    expect(route.steps).toHaveLength(0);
    near(route.forward(p), p);
  });

  it("refuses nodes of different trees", () => {
    const other = graph.root("other");
    expect(() => routeBetween(c, other)).toThrow(/no common ancestor/);
    expect(() => routeBetween(c, new TransformGraph().root("x"))).toThrow(
      /two graphs/,
    );
  });

  it("follows a time-varying edge and a changed matrix through its revision", () => {
    const g = new TransformGraph();
    const root = g.root("root");
    const moving = g.add(
      "moving",
      root,
      affine({
        at: (seconds, out) => {
          out.set(translate(seconds, 0, 0));
        },
      }),
    );
    const fixed = g.add("fixed", root, affine({ matrix: translate(0, 1, 0) }));
    const route = routeBetween(moving, fixed, { seconds: 2 });
    near(route.forward([0, 0, 0]), [2, -1, 0]);
    const before = route.revision;
    near(route.at(5).forward([0, 0, 0]), [5, -1, 0]);
    expect(route.revision).toBeGreaterThan(before);
    g.setMatrix(fixed, translate(0, 2, 0));
    near(route.forward([0, 0, 0]), [5, -2, 0]);
  });
});

describe("smooth routes", () => {
  const graph = new TransformGraph();
  const world = graph.root("world");
  const shear = graph.add(
    "shear",
    world,
    affine({ matrix: turn(0.2, 1.5, 1, 2, 3) }),
  );
  const declared = graph.add("declared", shear, smooth(twist()));
  const solved = graph.add(
    "solved",
    shear,
    smooth(twist({ id: "twist", inverse: undefined })),
  );
  const leaf = graph.add(
    "leaf",
    declared,
    affine({ matrix: translate(0, 0, 40) }),
  );
  const p = [30, -20, 55];

  it("rotates by the parameter, and says so in its steps", () => {
    const route = routeBetween(declared, world);
    expect(route.steps.map((s) => s.kind)).toEqual(["smooth", "affine"]);
    const out = new Float64Array(3);
    twist().forward([30, -20, 55], { k: 0.002 }, out);
    near(route.forward(p), routeBetween(shear, world).forward(out));
  });

  it("round trips with a declared inverse and with Newton", () => {
    for (const node of [declared, solved]) {
      const route = routeBetween(node, world);
      const q = route.forward(p);
      near(route.inverse(q), p, 8);
    }
    const down = routeBetween(world, solved);
    near(down.forward(routeBetween(solved, world).forward(p)), p, 8);
  });

  it("round trips a mixed route up through one smooth node and down through another", () => {
    const route = routeBetween(leaf, solved);
    expect(route.steps.map((s) => s.kind)).toEqual([
      "affine",
      "smooth",
      "smooth",
    ]);
    near(route.inverse(route.forward(p)), p, 7);
    const back = routeBetween(solved, leaf);
    near(back.forward(route.forward(p)), p, 7);
  });

  it("solves a point whose map is not the identity far from the origin", () => {
    const route = routeBetween(solved, world);
    const q = route.forward([5e3, -4e3, 3e3]);
    near(route.inverse(q), [5e3, -4e3, 3e3], 6);
  });

  it("gives the Jacobian by the chain rule, with central differences where the function writes none", () => {
    for (const node of [declared, solved, leaf]) {
      const route = routeBetween(node, world);
      const j = route.jacobian(p);
      const h = 1e-3;
      for (let axis = 0; axis < 3; axis++) {
        const up = [...p];
        const down = [...p];
        up[axis]! += h;
        down[axis]! -= h;
        const a = route.forward(up);
        const b = route.forward(down);
        for (let r = 0; r < 3; r++) {
          expect(j[axis * 3 + r]).toBeCloseTo((a[r]! - b[r]!) / (2 * h), 5);
        }
      }
    }
  });

  it("uses a function's own Jacobian, and the inverse of it down a route", () => {
    const g = new TransformGraph();
    const root = g.root("root");
    const node = g.add("node", root, smooth(exaggerate()));
    const j = routeBetween(node, root).jacobian([1, 2, 3]);
    expect(Array.from(j)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 3]);
    const down = routeBetween(root, node).jacobian([1, 2, 103]);
    near(down.slice(6, 9), [0, 0, 1 / 3]);
  });

  it("throws when Newton meets a singular Jacobian", () => {
    const g = new TransformGraph();
    const root = g.root("root");
    const flat = g.add(
      "flat",
      root,
      smooth({
        id: "flat",
        params: {},
        forward: (p, _params, out) => {
          out[0] = p[0]!;
          out[1] = p[1]!;
          out[2] = 0;
        },
      }),
    );
    expect(() => routeBetween(root, flat).forward([1, 2, 3])).toThrow(
      /singular/,
    );
  });
});

describe("parameters", () => {
  it("are held by the graph, with a per-view override, and move the route's revision", () => {
    const g = new TransformGraph();
    const root = g.root("root");
    const node = g.add("node", root, smooth(exaggerate()));
    const main = routeBetween(node, root, { view: "main" });
    const inset = routeBetween(node, root, { view: "inset" });
    expect(main.forward([0, 0, 200])[2]).toBe(400);
    const revision = main.revision;
    g.setParams(node, { k: 10 });
    expect(main.revision).toBeGreaterThan(revision);
    expect(main.forward([0, 0, 200])[2]).toBe(1100);
    g.setParams(node, { k: 1 }, "inset");
    expect(inset.forward([0, 0, 200])[2]).toBe(200);
    expect(main.forward([0, 0, 200])[2]).toBe(1100);
    expect(g.values(node, "inset")).toEqual({ k: 1, h0: 100 });
    expect(g.values(node)).toEqual({ k: 10, h0: 100 });
    expect(() => g.setParams(node, { nope: 1 })).toThrow(/no parameter/);
  });
});

describe("switch nodes", () => {
  const graph = new TransformGraph();
  const root = graph.root("root");
  const chart = graph.add(
    "chart",
    root,
    switchEdge({
      byView: new Map<string, PlainEdge>([
        ["plan", affine({ matrix: translate(100, 0, 0) })],
        ["profile", smooth(twist())],
      ]),
      default: affine({ matrix: translate(0, 0, 0) }),
    }),
  );
  const p = [10, 20, 30];

  it("chooses the transform by view, with a default", () => {
    near(routeBetween(chart, root, { view: "plan" }).forward(p), [110, 20, 30]);
    const twisted = new Float64Array(3);
    twist().forward(p, { k: 0.002 }, twisted);
    near(routeBetween(chart, root, { view: "profile" }).forward(p), twisted);
    near(routeBetween(chart, root, { view: "other" }).forward(p), p);
    near(routeBetween(chart, root).forward(p), p);
  });

  it("throws with no choice for the view and no default", () => {
    const g = new TransformGraph();
    const r = g.root("r");
    const s = g.add(
      "s",
      r,
      switchEdge({
        byView: new Map<string, PlainEdge>([
          ["a", affine({ matrix: translate(1, 0, 0) })],
        ]),
      }),
    );
    expect(() => routeBetween(s, r, { view: "b" })).toThrow(/no choice/);
  });

  it("keeps the shape key under parameter changes and changes it with the choice", () => {
    const plan = routeBetween(chart, root, { view: "plan" });
    const profile = routeBetween(chart, root, { view: "profile" });
    const fallback = routeBetween(chart, root, { view: "x" });
    const keys = [plan.shapeKey, profile.shapeKey, fallback.shapeKey];
    expect(new Set(keys).size).toBe(3);
    graph.setParams(chart, { k: 0.5 });
    expect(routeBetween(chart, root, { view: "profile" }).shapeKey).toBe(
      profile.shapeKey,
    );
    expect(profile.shapeKey).toBe(keys[1]);
  });
});

describe("shape keys", () => {
  it("are the node kinds without values, and differ with structure", () => {
    const g = new TransformGraph();
    const root = g.root("root");
    const warp = g.add("warp", root, smooth(exaggerate()));
    const solved = g.add("solved", root, smooth(twist({ inverse: undefined })));
    const plain = g.add("plain", root, affine({ matrix: translate(1, 2, 3) }));
    expect(routeBetween(warp, root).shapeKey).toBe("+exaggerate");
    expect(routeBetween(root, warp).shapeKey).toBe("-exaggerate~");
    expect(routeBetween(root, solved).shapeKey).toBe("-twist~");
    expect(routeBetween(plain, root).shapeKey).toBe("M");
    expect(routeBetween(plain, warp).shapeKey).toBe("M>-exaggerate~");
    g.setParams(warp, { k: 7 });
    g.setMatrix(plain, translate(9, 9, 9));
    expect(routeBetween(plain, warp).shapeKey).toBe("M>-exaggerate~");
  });
});

describe("placement decides what is warped", () => {
  const graph = new TransformGraph();
  const display = graph.root("display");
  const earth = graph.add("earth", display, smooth(exaggerate()));
  const moon = graph.add(
    "moon",
    display,
    affine({ matrix: translate(3.8e8, 0, 0) }),
  );
  const camera = graph.add(
    "camera",
    earth,
    affine({ matrix: translate(0, 0, 500) }),
  );
  const terrain = [1000, 2000, 300];

  it("warps Earth's content and not the Moon placed elsewhere", () => {
    near(routeBetween(earth, display).forward(terrain), [1000, 2000, 700]);
    near(routeBetween(moon, display).forward([5, 6, 7]), [3.8e8 + 5, 6, 7]);
    expect(routeBetween(moon, display).shapeKey).toBe("M");
    expect(routeBetween(earth, display).shapeKey).toBe("+exaggerate");
  });

  it("puts a camera inside the deformer: it sees outside content through the inverse", () => {
    const seen = routeBetween(moon, camera);
    expect(seen.shapeKey).toBe("M>-exaggerate~>M");
    // In the display, then back through the exaggeration into Earth's true frame, then the camera's.
    near(seen.forward([5, 6, 107]), [3.8e8 + 5, 6, 100 + 7 / 3 - 500], 6);
    near(seen.inverse(seen.forward([5, 6, 107])), [5, 6, 107], 6);
    // The camera's own content, in the same frame, is not warped relative to it.
    near(routeBetween(earth, camera).forward(terrain), [1000, 2000, 300 - 500]);
  });

  it("round trips Earth's content through the display", () => {
    const seen = routeBetween(earth, display).forward(terrain);
    near(routeBetween(display, earth).forward(seen), terrain);
  });
});

describe("the frames catalogue as affine nodes", () => {
  const catalog = createFrameCatalog();
  const resolver = createFramesResolver(catalog);
  const itrf = catalog.get("ITRF", { user: "application" });
  const moon = catalog.get("MOON_ME", { user: "application" });
  const seconds = Date.UTC(2026, 2, 20, 14, 3, 7, 250) / 1000;
  const frames = graphOfFrames(catalog, resolver);
  const p = [6378137 + 10, 20, 30];

  it("makes each edge an affine node whose route is frameTransform's", () => {
    const route = routeBetween(frames.node(itrf)!, frames.node(moon)!, {
      seconds,
    });
    expect(route.steps).toHaveLength(1);
    expect(route.steps[0]!.kind).toBe("affine");
    const expected = frameTransform(itrf, moon, resolver.instant(seconds));
    // Lunar distances: composition order differs, so a few microns of rounding.
    near(route.forward(p), apply(expected, p), 3);
    near(route.inverse(route.forward(p)), p, 5);
  });

  it("follows a frame's revision through sync", () => {
    const route = routeBetween(frames.node(itrf)!, frames.node(moon)!, {
      seconds,
    });
    const before = route.revision;
    itrf.invalidate();
    frames.sync();
    expect(route.revision).toBeGreaterThan(before);
  });
});

describe("a switch's views", () => {
  it("keeps one alternative's index when two views share it", () => {
    const g = new TransformGraph();
    const root = g.root("root");
    const shared = affine({ matrix: translate(1, 0, 0) });
    const node = g.add(
      "node",
      root,
      switchEdge({
        byView: new Map<string, PlainEdge>([
          ["a", shared],
          ["b", shared],
          ["c", smooth(twist())],
        ]),
      }),
    );
    expect(routeBetween(node, root, { view: "a" }).shapeKey).toBe(
      routeBetween(node, root, { view: "b" }).shapeKey,
    );
    expect(routeBetween(node, root, { view: "c" }).shapeKey).not.toBe(
      routeBetween(node, root, { view: "a" }).shapeKey,
    );
  });
});
