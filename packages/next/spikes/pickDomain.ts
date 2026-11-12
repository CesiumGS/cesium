// Picks by domain point on the GPU (plan §13.26, increment 5; the Node tests
// are test/pickDomain.test.ts). The pick variant draws what the opaque pass
// drew into a few pixels around the cursor and writes the draw's triangle and
// barycentrics, or a b-rep patch draw's face and (u, v); the content's own
// point comes from those, never from the drawn position.
//
// The Earth's anchor is placed in `exaggerated`, a smooth frame under ITRF
// that multiplies height over a sphere by 10 (spikes/warpRoute.ts), with its scale (a
// placement parameter) at 0 for the first checks, which draw the content as it
// is, and at 1 for the last, which draws a tile ten times as high. Eight checks
// on a view of the north pole, each a `View.pickPoint`:
//
//   1. a mesh: the quad's triangle, and the point on it, against the pixel's
//      ray and the triangle, in float64;
//   2. a trimmed b-rep face (a plate with a round hole, a rectangular and a
//      triangular one): the face, and the point on the plate's plane against
//      the pixel's ray;
//   3. through a hole of that plate: the pick misses the plate and hits the
//      ground quad drawn behind it, not the face;
//   3b. an untrimmed face, and 3c a quad lifted by a custom vertex stage: picked
//       where it is drawn, reported where it is;
//   4. an instance of an instanced draw: the point through its own matrix;
//   5. an idle view's pick, from its last frame, the same point;
//   6. a tile at scale 1 (height × 10): the true point is on the tile's own
//      triangle, not where it is drawn; the drawn point is the warp's
//      forward of it (`routeForward`) and the pick's pixel is where the true
//      point's forward projects.
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import { BrepBuilder, type NurbsCurve } from "../src/brep/index.ts";
import { routeForward } from "../src/camera/route.ts";
import {
  createFrameCatalog,
  createFramesResolver,
  smoothFrame,
} from "../src/frames/index.ts";
import {
  CustomShader,
  EARTH,
  Engine,
  OffscreenTarget,
  UNITLESS_EXPOSURE,
  type MeshData,
  type View,
  type World,
} from "../src/index.ts";
import type { CorePick } from "../src/scene/pick.ts";
import { weightOf } from "../src/scene/warpEvaluate.ts";
import type { CubicLattice } from "../src/scene/warpTerms.ts";
import type { AnchorHandle, DrawHandle } from "../src/scene/world/types.ts";

const TEMPLATE = `
<h1>Picks by domain point</h1>
<p>
  A mesh, a trimmed b-rep face, a pick through a hole of it, and a tile drawn
  at height × 10, picked with <code>View.pickPoint</code>. The pick variant
  draws a few pixels around the cursor and writes which triangle (or face) it
  hit and where in it; the true point is then the content's own, against the
  pixel's ray, and where the warp draws it against where the pick projects.
</p>
<div class="status">Run to check on this GPU.</div>
<div data-id="adapter"></div>
<table data-id="results"></table>`;

const WIDTH = 512;
const HEIGHT = 512;
/** The warp's sphere, m: the ellipsoid's equatorial radius. */
const SPHERE = 6_378_137;
/** The exaggeration at scale 1. */
const K = 10;
/** The camera's height above the sphere, m. */
const EYE_HEIGHT = 36;
/** The camera's turn about its axis, radians (7°). */
const TURN = (7 * Math.PI) / 180;
/** The plate's height above the sphere, m. */
const PLATE_HEIGHT = 0.8;
/** The ground quad's height, m: behind the plate. */
const GROUND_HEIGHT = -0.4;
/** The tile's height above the sphere, m, and its east offset. */
const TILE = { x: 8, h: 1.0 };
const QUAD = { x: -8, h: 0.6 };
/** The instanced draw: its origin's north offset (x), height above the sphere and the instances' east offset. */
const INSTANCES = { x: 12, h: 0.5, offset: 5 };
/** The row (north offset, m) of the plate without holes and the quad a custom stage lifts, and how far it lifts it, m. */
const WHOLE_Y = -12;
const LIFT = 4;
/** The pick's range from the camera, m, for the relative tolerance. */
const RANGE = EYE_HEIGHT;

/** The quad's corners in model coordinates, counterclockwise, off z = 0. */
const QUAD_CORNERS = [
  [-3, -3, 0.15],
  [3, -3, -0.2],
  [3, 3, 0.25],
  [-3, 3, -0.1],
] as const;
const quad: MeshData = {
  positions: Float32Array.from(QUAD_CORNERS.flat()),
  indices: Uint32Array.of(0, 1, 2, 0, 2, 3),
};

/** A tile: a 4 × 4 grid of cells, 6 m across, heights varied, two triangles a cell. */
const TILE_CELLS = 4;
const tile: MeshData = (() => {
  const positions: number[] = [];
  const stride = TILE_CELLS + 1;
  for (let j = 0; j < stride; j++) {
    for (let i = 0; i < stride; i++) {
      const x = (i / TILE_CELLS - 0.5) * 6;
      const y = (j / TILE_CELLS - 0.5) * 6;
      positions.push(x, y, 0.25 * Math.sin(x * 0.9) * Math.cos(y * 0.7));
    }
  }
  const indices: number[] = [];
  for (let j = 0; j < TILE_CELLS; j++) {
    for (let i = 0; i < TILE_CELLS; i++) {
      const a = j * stride + i;
      indices.push(a, a + 1, a + stride + 1, a, a + stride + 1, a + stride);
    }
  }
  return {
    positions: Float32Array.from(positions),
    indices: Uint32Array.from(indices),
  };
})();

/** The ground: a 12 m square, below the plate. */
const ground: MeshData = {
  positions: Float32Array.from([-6, -6, 0, 6, -6, 0, 6, 6, 0, -6, 6, 0]),
  indices: Uint32Array.of(0, 1, 2, 0, 2, 3),
};

type Pair = readonly [number, number];
type V3 = [number, number, number];

interface Check {
  id: number;
  name: string;
  measured: Record<string, number>;
  limit: string;
  pass: boolean;
}

export interface PickDomainResult {
  adapter: string;
  checks: Check[];
  pass: boolean;
}

let root: HTMLElement;
const $ = <T extends Element = HTMLElement>(id: string) =>
  root.querySelector<T>(`[data-id="${id}"]`)!;
let active: Engine | undefined;

function stop(engine: Engine | undefined): void {
  if (engine && active === engine) {
    active = undefined;
    engine.destroy();
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Height over the sphere times `k`, along the radial, with its Jacobian. */
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
  const f = SPHERE + k * (r - SPHERE);
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

// The plate: pcurves written in (u, v), outer loops counter-clockwise, inner
// clockwise (spikes/brepTrims.ts).

type Use = Parameters<BrepBuilder["face"]>[1][number][number];

function polygon(edge: number, corners: readonly Pair[]): Use[] {
  return corners.map((a, i) => ({
    edge,
    pcurve: [a, corners[(i + 1) % corners.length]!] as const,
  }));
}

/** A rational quadratic circle in (u, v), clockwise. */
function circle(cx: number, cy: number, r: number): NurbsCurve {
  const s = Math.SQRT1_2;
  const ring = [
    [1, 0, 1],
    [1, 1, s],
    [0, 1, 1],
    [-1, 1, s],
    [-1, 0, 1],
    [-1, -1, s],
    [0, -1, 1],
    [1, -1, s],
    [1, 0, 1],
  ];
  const points = new Float64Array(18);
  ring.forEach(([x, y], i) => {
    points.set([cx + r * x!, cy - r * y!], i * 2);
  });
  return {
    degree: 2,
    knots: Float64Array.from([
      0, 0, 0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1, 1, 1,
    ]),
    count: 9,
    dimension: 2,
    points,
    weights: Float64Array.from(ring.map((p) => p[2]!)),
  };
}

/** The plate's half extent: 3.2 × 2.4 m, centred; `HOLE` its round hole's centre (u, v) and radius. */
const PLATE = { x: 1.6, y: 1.2 };
const HOLE = { u: 1, v: 1.2, r: 0.55 };

/** A plate: the same 3.2 × 2.4 m, with the holes only if `holes`. */
function plateForm(holes = true) {
  const b = new BrepBuilder();
  const v = b.vertex([0, 0, 0]);
  const e = b.edge(v, v, { tolerance: 1e-5 });
  const s = b.plane([-PLATE.x, -PLATE.y, 0], [1, 0, 0], [0, 1, 0]);
  b.face(s, [
    polygon(e, [
      [0, 0],
      [3.2, 0],
      [3.2, 2.4],
      [0, 2.4],
    ]),
    ...(holes
      ? [
          [{ edge: e, pcurve: circle(HOLE.u, HOLE.v, HOLE.r) }],
          polygon(e, [
            [1.9, 0.5],
            [1.9, 1.7],
            [2.8, 1.7],
            [2.8, 0.5],
          ]),
          polygon(e, [
            [0.4, 1.85],
            [0.7, 2.25],
            [1.0, 1.85],
          ]),
        ]
      : []),
  ]);
  return b.build();
}

// Float64 geometry the checks compare to.

const sub = (a: ArrayLike<number>, b: ArrayLike<number>): V3 => [
  a[0]! - b[0]!,
  a[1]! - b[1]!,
  a[2]! - b[2]!,
];
const dot = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
const cross = (a: ArrayLike<number>, b: ArrayLike<number>): V3 => [
  a[1]! * b[2]! - a[2]! * b[1]!,
  a[2]! * b[0]! - a[0]! * b[2]!,
  a[0]! * b[1]! - a[1]! * b[0]!,
];
const distance = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

/** Where a ray meets a triangle (Möller–Trumbore, float64): the point, or undefined. */
function rayTriangle(
  origin: ArrayLike<number>,
  direction: ArrayLike<number>,
  a: V3,
  b: V3,
  c: V3,
): V3 | undefined {
  const e1 = sub(b, a);
  const e2 = sub(c, a);
  const p = cross(direction, e2);
  const det = dot(e1, p);
  if (Math.abs(det) < 1e-12) {
    return undefined;
  }
  const s = sub(origin, a);
  const u = dot(s, p) / det;
  const q = cross(s, e1);
  const v = dot(direction, q) / det;
  const t = dot(e2, q) / det;
  if (u < 0 || v < 0 || u + v > 1 || t < 0) {
    return undefined;
  }
  return [
    origin[0]! + t * direction[0]!,
    origin[1]! + t * direction[1]!,
    origin[2]! + t * direction[2]!,
  ];
}

/** The ray through pixel (x, y)'s centre: the camera's position in render space and a unit direction. */
function pixelRay(
  view: View,
  x: number,
  y: number,
): { origin: V3; direction: V3 } {
  const ndcX = ((x + 0.5) / WIDTH) * 2 - 1;
  const ndcY = 1 - ((y + 0.5) / HEIGHT) * 2;
  const direction = view.camera.rayDirection(
    ndcX,
    ndcY,
    WIDTH / HEIGHT,
    new Float64Array(3),
  );
  const p = view.camera.position;
  return {
    origin: [p[0]!, p[1]!, p[2]!],
    direction: [direction[0]!, direction[1]!, direction[2]!],
  };
}

/** A pixel of the view for a point in render space. */
function pixelOf(view: View, point: ArrayLike<number>): [number, number] {
  const p = view.toPixel(point, view.world.root);
  if (!p) {
    throw new Error("a point is behind the camera");
  }
  return [p[0]!, p[1]!];
}

/** The pixel a point is in. */
const pixelIn = (view: View, point: ArrayLike<number>): [number, number] => {
  const [x, y] = pixelOf(view, point);
  return [Math.floor(x), Math.floor(y)];
};

/** Picks the pixel (x, y) and waits for the answer, rendering frames as it needs. */
async function pick(
  engine: Engine,
  view: View,
  x: number,
  y: number,
): Promise<CorePick | undefined> {
  let done = false;
  let answer: CorePick | undefined;
  void view.pickPoint(x, y).then((p) => {
    answer = p;
    done = true;
  });
  for (let i = 0; i < 400 && !done; i++) {
    engine.renderFrame();
    await sleep(8);
  }
  if (!done) {
    throw new Error(`the pick at (${x}, ${y}) did not answer`);
  }
  return answer;
}

/** How far a point on the content may be from it: float32 of the content's size, and 1e-6 of the range. */
const tolerance = (size: number) => 1e-6 * RANGE + 2 ** -23 * size;
/**
 * How far the pick's point may be from the pixel's ray: that, and the
 * rasterizer's snapping of vertices to 1/256 pixel, which moves the
 * barycentrics (and a face's (u, v)) of a pixel by as much on the surface.
 */
const lateral = (size: number, view: View) =>
  tolerance(size) +
  (2 ** -8 * 2 * RANGE * Math.tan(view.camera.fovy(WIDTH / HEIGHT) / 2)) /
    HEIGHT;

async function runPickDomain(): Promise<PickDomainResult> {
  const status = root.querySelector(".status")!;
  $("results").replaceChildren();
  status.textContent = "checking…";
  const engine = await Engine.create();
  active = engine;
  let lostReason: string | undefined;
  void engine.gpu.device.lost.then((info) => {
    lostReason = info.message || info.reason;
  });
  const lost = () => {
    if (lostReason !== undefined) {
      throw new Error(`the GPU device was lost (${lostReason}); stopped`);
    }
    if (active !== engine) {
      throw new Error("stopped");
    }
  };
  const checks: Check[] = [];
  let id = 1;
  const add = (
    name: string,
    measured: Record<string, number>,
    limit: string,
    pass: boolean,
  ) => checks.push({ id: id++, name, measured, limit, pass });
  try {
    const world: World = engine.createWorld({
      maxDraws: 16,
      vertexBytes: 1 << 20,
      indexBytes: 1 << 16,
    });
    const target = new OffscreenTarget(WIDTH, HEIGHT);
    const view = engine.addView({
      target,
      world,
      background: "color",
      clearColor: [0, 0, 0],
      observer: { exposure: UNITLESS_EXPOSURE },
    });
    const catalog = createFrameCatalog();
    const itrf = catalog.get("ITRF");
    const scale = world.createPlacementParameter(0);
    const exaggerated = smoothFrame("exaggerated", itrf, {
      revision: 1,
      description: `height × ${K}`,
      scale,
      forward: (p, out, jacobian) => exaggerate(K, p, out, jacobian),
    });
    catalog.add(exaggerated);
    const resolver = createFramesResolver(catalog);
    engine.cameras.setResolver(world, resolver);
    const earth: AnchorHandle = world.bodyAnchor(EARTH);
    resolver.bindAnchor(earth, exaggerated);
    engine.cameras.setRig(view, {
      position: { frame: itrf },
      orientation: { kind: "free" },
    });
    view.camera.position.set([0, 0, SPHERE + EYE_HEIGHT]);
    view.camera.direction.set([0, 0, -1]);
    view.camera.orient(Float64Array.of(Math.sin(TURN), Math.cos(TURN), 0));
    view.camera.version++;

    const at = (x: number, h: number, y = 0): V3 => [x, y, SPHERE + h];
    const quadDraw: DrawHandle = world.addDraw({
      mesh: world.addMesh(quad),
      parent: earth,
      origin: Float64Array.from(at(QUAD.x, QUAD.h)),
      color: [1, 1, 1, 1],
      unlit: true,
      doubleSided: true,
      name: "quad",
    });
    const tileDraw: DrawHandle = world.addDraw({
      mesh: world.addMesh(tile),
      parent: earth,
      origin: Float64Array.from(at(TILE.x, TILE.h)),
      color: [1, 1, 1, 1],
      unlit: true,
      doubleSided: true,
      name: "tile",
    });
    const groundDraw: DrawHandle = world.addDraw({
      mesh: world.addMesh(ground),
      parent: earth,
      origin: Float64Array.from(at(0, GROUND_HEIGHT)),
      color: [0.4, 0.4, 0.4, 1],
      unlit: true,
      doubleSided: true,
      name: "ground",
    });
    // Two instances of the quad, 5 m either side of the draw's origin.
    const instancedDraw: DrawHandle = world.addDraw({
      mesh: world.addMesh(quad),
      parent: earth,
      origin: Float64Array.from(at(INSTANCES.x, INSTANCES.h)),
      color: [1, 1, 1, 1],
      unlit: true,
      doubleSided: true,
      name: "instances",
      instances: {
        matrices: [
          ...[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -INSTANCES.offset, 0, 0, 1],
          ...[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, INSTANCES.offset, 0, 0, 1],
        ],
      },
    });
    const plate = world.addBrep(plateForm(), {
      parent: earth,
      origin: Float64Array.from(at(0, PLATE_HEIGHT)),
      color: [1, 1, 1, 1],
      doubleSided: true,
      name: "plate",
    });
    // A plate without holes: its complete face is an untrimmed patch draw.
    const whole = world.addBrep(plateForm(false), {
      parent: earth,
      origin: Float64Array.from(at(-8, 0.7, WHOLE_Y)),
      color: [1, 1, 1, 1],
      doubleSided: true,
      name: "whole",
    });
    // A quad a custom vertex stage lifts 4 m: drawn, and picked, there.
    const lift = new CustomShader({
      label: "pick lift",
      vertex: `fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>) {
  (*vsOutput).positionMC = vsInput.positionMC + vec3f(0.0, 0.0, ${LIFT});
}`,
      displacement: LIFT,
    });
    const liftedDraw: DrawHandle = world.addDraw({
      mesh: world.addMesh(quad),
      parent: earth,
      origin: Float64Array.from(at(8, 0.5, WHOLE_Y)),
      color: [1, 1, 1, 1],
      unlit: true,
      doubleSided: true,
      shader: lift,
      name: "lifted",
    });
    const plateDraw = plate.trimmed;
    if (!plateDraw) {
      throw new Error("the plate has no GPU draw with a trim");
    }
    const frames = async (n: number) => {
      for (let i = 0; i < n; i++) {
        engine.renderFrame();
        lost();
        await sleep(16);
      }
    };

    // 1. A mesh, as it is (scale 0).
    scale.value = 0;
    await frames(3);
    {
      // The quad's first triangle, at its middle.
      const origin = at(QUAD.x, QUAD.h);
      const corner = (k: number): V3 => [
        origin[0] + QUAD_CORNERS[k]![0],
        origin[1] + QUAD_CORNERS[k]![1],
        origin[2] + QUAD_CORNERS[k]![2],
      ];
      const centroid = [0, 1, 2].map(
        (k) => (corner(0)[k]! + corner(1)[k]! + corner(2)[k]!) / 3,
      );
      const [px, py] = pixelIn(view, centroid);
      const result = await pick(engine, view, px, py);
      lost();
      const ray = pixelRay(view, px, py);
      const expected = rayTriangle(
        ray.origin,
        ray.direction,
        corner(0),
        corner(1),
        corner(2),
      );
      const truth = result?.truePosition?.position;
      const measured: Record<string, number> = {};
      let pass = false;
      if (result?.domain && truth && expected) {
        measured["triangle (expected 0)"] = result.domain.primitive ?? -1;
        measured["true point − the pixel's ray's, m"] = distance(
          truth,
          expected,
        );
        measured["true point − drawn point, m"] = distance(
          truth,
          result.drawnPosition!.position,
        );
        const normal = cross(
          sub(corner(1), corner(0)),
          sub(corner(2), corner(0)),
        );
        measured["true point's distance from the triangle's plane, m"] =
          Math.abs(dot(sub(truth, corner(0)), normal)) / Math.hypot(...normal);
        measured["accuracy, m"] = result.accuracy?.meters ?? -1;
        pass =
          result.domain.kind === "triangle" &&
          result.domain.draw.index === quadDraw.index &&
          result.domain.primitive === 0 &&
          measured["true point − the pixel's ray's, m"]! <= lateral(6, view) &&
          measured["true point's distance from the triangle's plane, m"]! <=
            tolerance(6);
      }
      add(
        "a mesh: the triangle and the point on it (scale 0)",
        measured,
        `triangle 0 of the quad; the point on its plane within ${tolerance(6).toExponential(1)} m (float32, and 1e-6 of ${RANGE} m), and within ${lateral(6, view).toExponential(1)} m (with the rasterizer's 1/256 px) of the pixel's ray's meeting with it`,
        pass,
      );
    }

    // 2. A trimmed b-rep face.
    {
      const origin = at(0, PLATE_HEIGHT);
      // A point of the plate away from its holes, in plate coordinates.
      const [px, py] = pixelIn(view, [
        origin[0] - 1.2,
        origin[1] - 0.8,
        origin[2],
      ]);
      const result = await pick(engine, view, px, py);
      lost();
      const ray = pixelRay(view, px, py);
      // The plate's plane: z = its height; the ray's meeting with it.
      const t = (origin[2] - ray.origin[2]) / ray.direction[2];
      const expected: V3 = [
        ray.origin[0] + t * ray.direction[0],
        ray.origin[1] + t * ray.direction[1],
        origin[2],
      ];
      const truth = result?.truePosition?.position;
      const measured: Record<string, number> = {};
      let pass = false;
      if (result?.domain && truth) {
        measured["face (expected 0)"] = result.domain.face ?? -1;
        measured["true point − the pixel's ray's meeting with the plane, m"] =
          distance(truth, expected);
        measured["true point's height − the plane's, m"] = Math.abs(
          truth[2]! - origin[2],
        );
        measured["accuracy, m"] = result.accuracy?.meters ?? -1;
        pass =
          result.domain.kind === "face" &&
          result.domain.draw.index === plateDraw.index &&
          result.domain.face === 0 &&
          measured[
            "true point − the pixel's ray's meeting with the plane, m"
          ]! <= lateral(3.2, view) &&
          measured["true point's height − the plane's, m"]! <= 1e-6 &&
          result.accuracy?.exact === true;
      }
      add(
        "a trimmed b-rep face: refined to the face's own point",
        measured,
        `face 0 of the plate's trimmed draw; the point on its plane (to 1 µm) within ${lateral(3.2, view).toExponential(1)} m of the pixel's ray's meeting with it; the accuracy exact`,
        pass,
      );
    }

    // 3. Through the plate's round hole: the ground behind, not the face.
    {
      const origin = at(0, PLATE_HEIGHT);
      const hole: V3 = [
        origin[0] - PLATE.x + HOLE.u,
        origin[1] - PLATE.y + HOLE.v,
        origin[2],
      ];
      const [px, py] = pixelIn(view, hole);
      const result = await pick(engine, view, px, py);
      lost();
      const floor = at(0, GROUND_HEIGHT)[2];
      const ray = pixelRay(view, px, py);
      const t = (floor - ray.origin[2]) / ray.direction[2];
      const expected: V3 = [
        ray.origin[0] + t * ray.direction[0],
        ray.origin[1] + t * ray.direction[1],
        floor,
      ];
      const truth = result?.truePosition?.position;
      const measured: Record<string, number> = {
        "hit the plate (1) or not (0)":
          result?.domain?.draw.index === plateDraw.index ? 1 : 0,
        "hit the ground (1) or not (0)":
          result?.domain?.draw.index === groundDraw.index ? 1 : 0,
      };
      let pass = false;
      if (result?.domain && truth) {
        measured["true point − the ray's meeting with the ground, m"] =
          distance(truth, expected);
        pass =
          result.domain.kind === "triangle" &&
          result.domain.draw.index === groundDraw.index &&
          measured["true point − the ray's meeting with the ground, m"]! <=
            lateral(12, view);
      }
      add(
        "through the plate's hole: a miss of the face, the ground behind",
        measured,
        `the pick's draw is the ground's; its point within ${lateral(12, view).toExponential(1)} m of the ray's meeting with the ground`,
        pass,
      );
    }

    // 4. An instance of an instanced draw: through its own matrix.
    {
      const origin = at(INSTANCES.x, INSTANCES.h);
      const corner = (k: number): V3 => [
        origin[0] + INSTANCES.offset + QUAD_CORNERS[k]![0],
        origin[1] + QUAD_CORNERS[k]![1],
        origin[2] + QUAD_CORNERS[k]![2],
      ];
      const centroid = [0, 1, 2].map(
        (k) => (corner(0)[k]! + corner(1)[k]! + corner(2)[k]!) / 3,
      );
      const [px, py] = pixelIn(view, centroid);
      const result = await pick(engine, view, px, py);
      lost();
      const ray = pixelRay(view, px, py);
      const expected = rayTriangle(
        ray.origin,
        ray.direction,
        corner(0),
        corner(1),
        corner(2),
      );
      const truth = result?.truePosition?.position;
      const measured: Record<string, number> = {};
      let pass = false;
      if (result?.domain && truth && expected) {
        measured["instance (expected 1)"] = result.domain.instance ?? -1;
        measured["true point − the pixel's ray's, m"] = distance(
          truth,
          expected,
        );
        pass =
          result.domain.kind === "triangle" &&
          result.domain.draw.index === instancedDraw.index &&
          result.domain.instance === 1 &&
          result.domain.primitive === 0 &&
          measured["true point − the pixel's ray's, m"]! <= lateral(6, view);
      }
      add(
        "an instance: the point through its own matrix (scale 0)",
        measured,
        `instance 1, triangle 0; the point within ${lateral(6, view).toExponential(1)} m of the pixel's ray's meeting with the instance's triangle`,
        pass,
      );
    }

    // 3b. An untrimmed face (the patch draw without a trim test).
    {
      const origin = at(-8, 0.7, WHOLE_Y);
      const [px, py] = pixelIn(view, [
        origin[0] - 1.2,
        origin[1] - 0.8,
        origin[2],
      ]);
      const result = await pick(engine, view, px, py);
      lost();
      const ray = pixelRay(view, px, py);
      const t = (origin[2] - ray.origin[2]) / ray.direction[2];
      const expected: V3 = [
        ray.origin[0] + t * ray.direction[0],
        ray.origin[1] + t * ray.direction[1],
        origin[2],
      ];
      const truth = result?.truePosition?.position;
      const measured: Record<string, number> = {};
      let pass = false;
      if (result?.domain && truth) {
        measured["true point − the pixel's ray's meeting with the plane, m"] =
          distance(truth, expected);
        measured["true point's height − the plane's, m"] = Math.abs(
          truth[2]! - origin[2],
        );
        pass =
          result.domain.kind === "face" &&
          result.domain.draw.index === whole.patches?.index &&
          result.domain.face === 0 &&
          measured[
            "true point − the pixel's ray's meeting with the plane, m"
          ]! <= lateral(3.2, view) &&
          measured["true point's height − the plane's, m"]! <= 1e-6;
      }
      add(
        "an untrimmed b-rep face: the same, without the trim test",
        measured,
        `face 0 of the untrimmed patch draw; the point on its plane (to 1 µm) within ${lateral(3.2, view).toExponential(1)} m of the pixel's ray's meeting with it`,
        pass,
      );
    }

    // 3c. A custom vertex stage lifts the quad: the pick sees it where it is
    // drawn, 4 m up, and reports the content's own point, which it is not.
    {
      const origin = at(8, 0.5, WHOLE_Y);
      const corner = (k: number, lifted: number): V3 => [
        origin[0] + QUAD_CORNERS[k]![0],
        origin[1] + QUAD_CORNERS[k]![1],
        origin[2] + QUAD_CORNERS[k]![2] + lifted,
      ];
      const centroid = [0, 1, 2].map(
        (k) =>
          (corner(0, LIFT)[k]! + corner(1, LIFT)[k]! + corner(2, LIFT)[k]!) / 3,
      );
      const [px, py] = pixelIn(view, centroid);
      // The shader compiles in the background: the quad draws with the default
      // material, unlifted, until its pipelines are ready.
      let result = await pick(engine, view, px, py);
      const lifted = (r: CorePick | undefined) =>
        r?.drawnPosition !== undefined &&
        r.truePosition !== undefined &&
        r.drawnPosition.position[2]! - r.truePosition.position[2]! > LIFT / 2;
      for (let i = 0; i < 100 && !lifted(result); i++) {
        await frames(5);
        result = await pick(engine, view, px, py);
      }
      lost();
      const ray = pixelRay(view, px, py);
      // The ray meets the lifted triangle where it is drawn; the content's
      // point is that one, 4 m down.
      const drawnHit = rayTriangle(
        ray.origin,
        ray.direction,
        corner(0, LIFT),
        corner(1, LIFT),
        corner(2, LIFT),
      );
      const truth = result?.truePosition?.position;
      const measured: Record<string, number> = {};
      let pass = false;
      if (result?.domain && truth && drawnHit) {
        const down: V3 = [drawnHit[0], drawnHit[1], drawnHit[2] - LIFT];
        measured["true point − the drawn hit lowered by the lift, m"] =
          distance(truth, down);
        measured["true point − drawn point, m"] = distance(
          truth,
          result.drawnPosition!.position,
        );
        pass =
          result.domain.kind === "triangle" &&
          result.domain.draw.index === liftedDraw.index &&
          result.domain.primitive === 0 &&
          measured["true point − the drawn hit lowered by the lift, m"]! <=
            lateral(6, view) &&
          Math.abs(measured["true point − drawn point, m"]! - LIFT) < 0.05;
      }
      add(
        "a custom vertex stage: picked where drawn, the content's point reported",
        measured,
        `the lifted quad's triangle 0; the point the drawn hit lowered by ${LIFT} m within ${lateral(6, view).toExponential(1)} m; ${LIFT} m (to 5 cm) from the drawn point`,
        pass,
      );
    }

    // 5. A view that is idle serves its pick from its last frame, with no
    // render: the same point as the pick in the frame.
    {
      const origin = at(QUAD.x, QUAD.h);
      const corner = (k: number): V3 => [
        origin[0] + QUAD_CORNERS[k]![0],
        origin[1] + QUAD_CORNERS[k]![1],
        origin[2] + QUAD_CORNERS[k]![2],
      ];
      const centroid = [0, 1, 2].map(
        (k) => (corner(0)[k]! + corner(1)[k]! + corner(2)[k]!) / 3,
      );
      const [px, py] = pixelIn(view, centroid);
      const inFrame = await pick(engine, view, px, py);
      engine.start();
      for (let i = 0; i < 200 && !engine.stats.idle; i++) {
        await sleep(16);
      }
      await sleep(100);
      const idle = engine.stats.idle;
      const rendered = engine.stats.framesRendered;
      const answer = await Promise.race([view.pickPoint(px, py), sleep(3000)]);
      const served = answer as CorePick | undefined;
      const framesAfter = engine.stats.framesRendered;
      engine.stop();
      lost();
      const measured: Record<string, number> = {
        "engine idle (1) or not (0)": idle ? 1 : 0,
        "frames rendered for the pick": framesAfter - rendered,
      };
      let pass = false;
      if (served?.domain && inFrame?.truePosition) {
        measured["true point − the frame's pick's, m"] = distance(
          served.truePosition!.position,
          inFrame.truePosition.position,
        );
        pass =
          idle &&
          framesAfter === rendered &&
          served.domain.kind === "triangle" &&
          served.domain.primitive === inFrame.domain?.primitive &&
          measured["true point − the frame's pick's, m"]! <= 1e-9;
      }
      add(
        "an idle view's pick: the same point, no frame rendered",
        measured,
        "the engine idle; no frame rendered for the pick; the same triangle and the same point, within 1 nm, as the pick in a frame",
        pass,
      );
    }

    // 6. A tile at scale 1: the true point is on the tile, not where it is drawn.
    scale.value = 1;
    await frames(4);
    {
      const route = view.anchorRoute(earth);
      if (!route) {
        throw new Error(
          "the Earth's anchor has no route: it is not placed in a smooth frame",
        );
      }
      const origin = at(TILE.x, TILE.h);
      const corner = (k: number): V3 => [
        origin[0] + tile.positions[k * 3]!,
        origin[1] + tile.positions[k * 3 + 1]!,
        origin[2] + tile.positions[k * 3 + 2]!,
      ];
      // The middle cell's first triangle's middle, as drawn.
      const stride = TILE_CELLS + 1;
      const cell = (TILE_CELLS / 2) * stride + TILE_CELLS / 2;
      const [a, b, c] = [cell, cell + 1, cell + stride + 1].map(corner) as [
        V3,
        V3,
        V3,
      ];
      const middle = [0, 1, 2].map((k) => (a[k]! + b[k]! + c[k]!) / 3);
      const [px, py] = pixelIn(view, routeForward(route, middle));
      const result = await pick(engine, view, px, py);
      lost();
      const measured: Record<string, number> = {};
      let pass = false;
      const truth = result?.truePosition?.position;
      const barycentrics = result?.domain?.barycentrics;
      if (result?.domain && truth && barycentrics) {
        // The corners of the triangle the pick says it hit, from the mesh.
        const first = result.domain.primitive! * 3;
        const hit = [0, 1, 2].map((k) => corner(tile.indices[first + k]!));
        const weighted = [0, 1, 2].map(
          (k) =>
            barycentrics[0]! * hit[0]![k]! +
            barycentrics[1]! * hit[1]![k]! +
            barycentrics[2]! * hit[2]![k]!,
        );
        const normal = cross(sub(hit[1]!, hit[0]!), sub(hit[2]!, hit[0]!));
        const length = Math.hypot(...normal);
        const off = Math.abs(dot(sub(truth, hit[0]!), normal)) / length;
        const drawn = result.drawnPosition!.position;
        const forwarded = routeForward(route, truth);
        const back = pixelOf(view, forwarded);
        const projection = Math.hypot(
          back[0] - (px + 0.5),
          back[1] - (py + 0.5),
        );
        const fit = fitErrorPx(view, world, tileDraw, drawn);
        measured["true point − the mesh's weighted corners, m"] = distance(
          truth,
          weighted,
        );
        measured["true point's distance from the triangle's plane, m"] = off;
        measured["true point − drawn point, m"] = distance(truth, drawn);
        measured["drawn point − the warp's forward of the true point, m"] =
          distance(drawn, forwarded);
        measured["the forward point's pixel − the pick's, px"] = projection;
        measured["the fit's error, px"] = fit;
        pass =
          result.domain.kind === "triangle" &&
          result.domain.draw.index === tileDraw.index &&
          measured["true point − the mesh's weighted corners, m"]! <=
            tolerance(6) &&
          off <= tolerance(6) &&
          measured["true point − drawn point, m"]! > 1 &&
          projection <= 0.75 + fit;
      }
      add(
        `a warped tile (height × ${K}): the content's point, not the drawn one`,
        measured,
        `the true point within ${tolerance(6).toExponential(1)} m of the triangle it names, and on its plane; more than 1 m from the drawn point; the warp's forward of it projecting within 0.75 px plus the fit's error of the pick's pixel`,
        pass,
      );
    }
  } finally {
    $("adapter").textContent = `Adapter: ${describe(engine)}`;
    stop(engine);
    render(checks);
    const failed = checks.filter((c) => !c.pass);
    status.textContent = failed.length
      ? `FAIL: check ${failed.map((c) => c.id).join(", ")}`
      : `pass: all ${checks.length} checks`;
    if (failed.length) {
      // The benchmark runner (bench/run.mjs) fails a suite on console errors.
      console.error(
        `[pickDomain] failed: ${failed.map((c) => `${c.id} ${c.name}`).join("; ")}`,
      );
    }
  }
  return {
    adapter: describe(engine),
    checks,
    pass: checks.length === 8 && checks.every((c) => c.pass),
  };
}

/**
 * A draw's fit error in pixels at a drawn point: its lattice's bound times the
 * weight (the scale), over the distance to the camera, times the focal length.
 */
function fitErrorPx(
  view: View,
  world: World,
  draw: DrawHandle,
  drawn: ArrayLike<number>,
): number {
  const focal = HEIGHT / 2 / Math.tan(view.camera.fovy(WIDTH / HEIGHT) / 2);
  const last = world.scene.drawPlacements[draw.index]?.terms.at(-1);
  if (!last || last.term.kind !== "cubic") {
    return 0;
  }
  const lattice: CubicLattice = last.term;
  const eye = view.camera.position;
  const range = Math.hypot(
    drawn[0]! - eye[0]!,
    drawn[1]! - eye[1]!,
    drawn[2]! - eye[2]!,
  );
  return (
    (lattice.errorBound * Math.abs(weightOf(last.weight)) * focal) /
    Math.max(range, 1)
  );
}

function describe(engine: Engine): string {
  const info = engine.gpu.adapter.info;
  return `${info.vendor} ${info.architecture} ${info.description}`;
}

function format(value: number): string {
  if (Number.isInteger(value)) {
    return value.toLocaleString("en-US");
  }
  return Math.abs(value) < 0.001 ? value.toExponential(2) : value.toFixed(3);
}

function render(checks: readonly Check[]): void {
  const cell = (text: string, className?: string) => {
    const td = document.createElement("td");
    td.textContent = text;
    if (className) {
      td.className = className;
    }
    return td;
  };
  const table = $("results");
  const head = document.createElement("tr");
  for (const title of ["check", "measured", "value", "passes when", ""]) {
    const th = document.createElement("th");
    th.textContent = title;
    head.append(th);
  }
  table.replaceChildren(head);
  for (const c of checks) {
    const entries = Object.entries(c.measured);
    if (entries.length === 0) {
      entries.push(["(no answer)", Number.NaN]);
    }
    entries.forEach(([key, value], i) => {
      const tr = document.createElement("tr");
      if (i === 0) {
        const name = cell(`${c.id}. ${c.name}`, "text");
        name.rowSpan = entries.length;
        tr.append(name);
      }
      tr.append(cell(key, "text"), cell(format(value)));
      if (i === 0) {
        const limit = cell(c.limit, "text");
        limit.rowSpan = entries.length;
        const verdict = cell(c.pass ? "pass" : "FAIL");
        verdict.rowSpan = entries.length;
        tr.append(limit, verdict);
      }
      table.append(tr);
    });
  }
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runPickDomain, dispose: () => stop(active) };
  },
};
