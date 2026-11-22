// Camera records (CS-814): a camera's intrinsics with an off-center principal
// point and a named distortion model. A centered record leaves the projection
// exactly as it was; an off-center one moves the projection, the culling
// planes, the rays, `View.toPixel` and picks together, checked against
// `projectToPixel`; distortion models that aren't built are refused by name.
// Picks run on the fake device of test/fakeGpu.ts, answered as in
// test/corePick.test.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as m4 from "../packages/core/src/math/mat4.ts";
import * as v3 from "../packages/core/src/math/vec3.ts";
import { EARTH } from "../packages/core/src/scene/Body.ts";
import {
  Camera,
  type CameraIntrinsics,
  type CameraRecord,
  projectToPixel,
} from "../packages/core/src/scene/Camera.ts";
import type { Engine } from "../packages/core/src/scene/Engine.ts";
import { createBox } from "../packages/core/src/scene/meshes.ts";
import { OffscreenTarget } from "../packages/core/src/scene/renderTarget.ts";
import type { View } from "../packages/core/src/scene/View.ts";
import type { World } from "../packages/core/src/scene/World.ts";
import type { AnchorHandle } from "../packages/core/src/scene/world/types.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { cullCamera } from "../packages/core/src/render/view/occlusionPass.ts";
import {
  OCCLUSION_CULL_BYTES,
  occlusionCullParams,
} from "../packages/core/src/render/view/occlusionCull.ts";
import {
  buildPyramid,
  sphereHidden,
} from "../packages/core/src/render/view/occlusionMath.ts";
import {
  SHADOW_CASCADES,
  SHADOW_SIZE,
  createShadowCascades,
  fitShadowCascades,
} from "../packages/core/src/scene/shadows.ts";
import {
  LIGHTS_SIZE,
  type LightOptions,
  packViewLights,
} from "../packages/core/src/scene/lights.ts";
import { starCullInputs } from "../packages/core/src/atmosphere/starCells.ts";

const R = 6_378_137;
const WIDTH = 64;
const HEIGHT = 48;
const ROOT = { name: "render root" };

/** A camera 1 km above the equator at the prime meridian, looking down, turned a little. */
function above(): Camera {
  const camera = new Camera();
  camera.position.set([R + 1000, 3, -2]);
  camera.direction.set([-1, 0.1, 0.05]);
  camera.direction.set(
    Array.from(camera.direction, (v) => v / Math.hypot(1, 0.1, 0.05)),
  );
  camera.orient(Float64Array.of(0, 0, 1));
  return camera;
}

/** A principal point well off center and pixels a little taller than wide. */
const OFF_CENTER: CameraIntrinsics = {
  width: WIDTH,
  height: HEIGHT,
  fx: 50,
  fy: 54,
  cx: 40,
  cy: 19,
};

/** Today's projection, culling planes and ray, as Camera computed them before CS-814. */
const today = {
  projection(camera: Camera, aspect: number): Float64Array {
    return m4.perspectiveReverseZInfinite(
      m4.mat4(),
      camera.fovy(aspect),
      aspect,
      camera.near,
    );
  },
  frustumPlanes(camera: Camera, aspect: number, widen = 1): Float64Array {
    const out = new Float64Array(20);
    const t = Math.tan(camera.fovy(aspect) / 2) * widen;
    const r = t * aspect;
    const d = camera.direction,
      u = camera.up,
      x = camera.right;
    for (let k = 0; k < 3; k++) {
      out[k] = d[k]! * r + x[k]!;
      out[4 + k] = d[k]! * r - x[k]!;
      out[8 + k] = d[k]! * t + u[k]!;
      out[12 + k] = d[k]! * t - u[k]!;
      out[16 + k] = d[k]!;
    }
    out[3] = out[7] = out[11] = out[15] = 0;
    out[19] = -camera.near;
    for (let i = 0; i < 16; i += 4) {
      const len = Math.sqrt(
        out[i]! * out[i]! +
          out[i + 1]! * out[i + 1]! +
          out[i + 2]! * out[i + 2]!,
      );
      out[i] = out[i]! / len;
      out[i + 1] = out[i + 1]! / len;
      out[i + 2] = out[i + 2]! / len;
    }
    return out;
  },
  rayDirection(
    camera: Camera,
    ndcX: number,
    ndcY: number,
    aspect: number,
  ): Float64Array {
    const out = new Float64Array(3);
    const t = Math.tan(camera.fovy(aspect) / 2);
    for (let i = 0; i < 3; i++) {
      out[i] =
        camera.direction[i]! +
        camera.right[i]! * ndcX * t * aspect +
        camera.up[i]! * ndcY * t;
    }
    return v3.normalize(out, out) as Float64Array;
  },
};

/**
 * Where `point` lands in a `width` × `height` image through the camera's
 * view rotation and projection matrices, as the GPU rasterizes it: pixels
 * from the top-left, y down.
 */
function rasterize(
  camera: Camera,
  width: number,
  height: number,
  point: ArrayLike<number>,
): [number, number] {
  const view = camera.viewRotation(m4.mat4());
  const projection = camera.projection(m4.mat4(), width / height);
  const viewProj = m4.multiply(m4.mat4(), projection, view);
  const p = [0, 1, 2].map((i) => point[i]! - camera.position[i]!);
  const clip = [0, 1, 2, 3].map(
    (r) =>
      viewProj[r]! * p[0]! +
      viewProj[4 + r]! * p[1]! +
      viewProj[8 + r]! * p[2]! +
      viewProj[12 + r]!,
  );
  const ndcX = clip[0]! / clip[3]!;
  const ndcY = clip[1]! / clip[3]!;
  return [((ndcX + 1) / 2) * width, ((1 - ndcY) / 2) * height];
}

/** Points in front of `camera`, spread across its view and beyond its edges. */
function pointsAhead(camera: Camera): Float64Array[] {
  const points: Float64Array[] = [];
  for (const a of [-0.7, -0.2, 0, 0.4, 0.9]) {
    for (const b of [-0.6, 0, 0.3, 0.8]) {
      for (const distance of [5, 300, 20_000]) {
        points.push(
          Float64Array.from(
            [0, 1, 2],
            (i) =>
              camera.position[i]! +
              distance *
                (camera.direction[i]! +
                  a * camera.right[i]! +
                  b * camera.up[i]!),
          ),
        );
      }
    }
  }
  return points;
}

describe("a centered record", () => {
  it("leaves the projection, the culling planes and the rays exactly as they were", () => {
    const camera = above();
    camera.fov = 1.1;
    for (const aspect of [WIDTH / HEIGHT, 0.75, 1]) {
      expect(camera.projection(m4.mat4(), aspect)).toEqual(
        today.projection(camera, aspect),
      );
      for (const widen of [1, 1.5]) {
        expect(
          camera.frustumPlanes(new Float64Array(20), aspect, widen),
        ).toEqual(today.frustumPlanes(camera, aspect, widen));
      }
      expect(
        camera.rayDirection(0.3, -0.8, aspect, new Float64Array(3)),
      ).toEqual(today.rayDirection(camera, 0.3, -0.8, aspect));
    }
  });

  it("set from intrinsics gives exactly the matrix of the field of view it implies", () => {
    const camera = above();
    camera.setIntrinsics({
      width: WIDTH,
      height: HEIGHT,
      fx: 47,
      fy: 47,
      cx: WIDTH / 2,
      cy: HEIGHT / 2,
    });
    expect(camera.centered).toBe(true);
    const plain = above();
    plain.fov = camera.fov;
    const matrix = camera.projection(m4.mat4(), WIDTH / HEIGHT);
    expect(matrix).toEqual(plain.projection(m4.mat4(), WIDTH / HEIGHT));
    expect(matrix).toEqual(today.projection(plain, WIDTH / HEIGHT));
    // No negative zeros where the principal point's offset would go.
    expect(Object.is(matrix[8], 0) && Object.is(matrix[9], 0)).toBe(true);
    // And the field of view is fy's.
    expect(camera.fovy(WIDTH / HEIGHT)).toBeCloseTo(
      2 * Math.atan(HEIGHT / 2 / 47),
      14,
    );
  });

  it("is what a plain camera reports, and applying it gives back today's matrix", () => {
    const camera = above();
    camera.fov = 0.9;
    const record = camera.record(WIDTH, HEIGHT, ROOT, 12.5);
    expect(record.cx).toBe(WIDTH / 2);
    expect(record.cy).toBe(HEIGHT / 2);
    expect(record.fx).toBeCloseTo(record.fy, 12);
    expect(record.distortion).toEqual({ model: "none", coefficients: [] });
    expect(record.pose.referenceFrame).toBe(ROOT);
    expect(record.pose.seconds).toBe(12.5);
    expect(Array.from(record.pose.position)).toEqual(
      Array.from(camera.position),
    );
    const applied = new Camera().setIntrinsics(record);
    const got = applied.projection(m4.mat4(), WIDTH / HEIGHT);
    const want = today.projection(camera, WIDTH / HEIGHT);
    for (let i = 0; i < 16; i++) {
      expect(Math.abs(got[i]! - want[i]!)).toBeLessThanOrEqual(
        Math.abs(want[i]!) * 1e-15,
      );
    }
    // A plain camera's record projects as the fovy form does.
    const out = new Float64Array(2);
    const expected = new Float64Array(2);
    for (const point of pointsAhead(camera)) {
      projectToPixel(record, point, out);
      projectToPixel(
        camera,
        camera.fovy(WIDTH / HEIGHT),
        WIDTH,
        HEIGHT,
        point,
        expected,
      );
      expect(Math.abs(out[0]! - expected[0]!)).toBeLessThan(1e-9);
      expect(Math.abs(out[1]! - expected[1]!)).toBeLessThan(1e-9);
    }
    // The pose is a copy: moving the camera doesn't move the record.
    camera.position[0] = camera.position[0]! + 1;
    camera.version++;
    expect(record.pose.position[0]).toBe(camera.position[0]! - 1);
  });
});

describe("an off-center record", () => {
  it("rasterizes every point where projectToPixel puts it", () => {
    const camera = above().setIntrinsics(OFF_CENTER);
    expect(camera.centered).toBe(false);
    const record = camera.record(WIDTH, HEIGHT, ROOT, 0);
    const out = new Float64Array(2);
    for (const point of pointsAhead(camera)) {
      const depth = projectToPixel(record, point, out);
      expect(depth).toBeGreaterThan(0);
      const [x, y] = rasterize(camera, WIDTH, HEIGHT, point);
      expect(Math.abs(x - out[0]!)).toBeLessThan(1e-6);
      expect(Math.abs(y - out[1]!)).toBeLessThan(1e-6);
    }
    // The view axis lands on the principal point.
    const ahead = Float64Array.from(
      [0, 1, 2],
      (i) => camera.position[i]! + 100 * camera.direction[i]!,
    );
    projectToPixel(record, ahead, out);
    expect(out[0]).toBeCloseTo(OFF_CENTER.cx, 9);
    expect(out[1]).toBeCloseTo(OFF_CENTER.cy, 9);
  });

  it("scales with the view: at twice the size, twice the pixels", () => {
    const camera = above().setIntrinsics(OFF_CENTER);
    const record = camera.record(2 * WIDTH, 2 * HEIGHT, ROOT, 0);
    for (const key of ["fx", "fy", "cx", "cy"] as const) {
      expect(record[key]).toBeCloseTo(2 * OFF_CENTER[key], 10);
    }
    const out = new Float64Array(2);
    for (const point of pointsAhead(camera)) {
      projectToPixel(record, point, out);
      const [x, y] = rasterize(camera, 2 * WIDTH, 2 * HEIGHT, point);
      expect(Math.abs(x - out[0]!)).toBeLessThan(1e-6);
      expect(Math.abs(y - out[1]!)).toBeLessThan(1e-6);
    }
  });

  it("gives back its intrinsics", () => {
    const camera = above().setIntrinsics(OFF_CENTER);
    const got = camera.intrinsics(WIDTH, HEIGHT);
    for (const key of ["width", "height", "fx", "fy", "cx", "cy"] as const) {
      expect(got[key]).toBeCloseTo(OFF_CENTER[key], 10);
    }
    // A portrait image too (the field of view's rule switches dimension).
    const portrait = { ...OFF_CENTER, width: 30, height: 80, cx: 12 };
    const back = new Camera().setIntrinsics(portrait).intrinsics(30, 80);
    for (const key of ["fx", "fy", "cx", "cy"] as const) {
      expect(back[key]).toBeCloseTo(portrait[key], 10);
    }
  });

  it("casts each pixel's ray through that pixel", () => {
    const camera = above().setIntrinsics(OFF_CENTER);
    const record = camera.record(WIDTH, HEIGHT, ROOT, 0);
    const out = new Float64Array(2);
    for (const [px, py] of [
      [0.5, 0.5],
      [40, 19],
      [63.5, 47.5],
      [10, 30],
    ] as const) {
      const ndcX = (px / WIDTH) * 2 - 1;
      const ndcY = 1 - (py / HEIGHT) * 2;
      const ray = camera.rayDirection(
        ndcX,
        ndcY,
        WIDTH / HEIGHT,
        new Float64Array(3),
      );
      const point = [0, 1, 2].map((i) => camera.position[i]! + 500 * ray[i]!);
      projectToPixel(record, point, out);
      expect(out[0]).toBeCloseTo(px, 9);
      expect(out[1]).toBeCloseTo(py, 9);
    }
  });

  it("culls with planes through the image's edges", () => {
    const camera = above().setIntrinsics(OFF_CENTER);
    const planes = camera.frustumPlanes(new Float64Array(20), WIDTH / HEIGHT);
    const side = (plane: number, p: ArrayLike<number>) =>
      planes[plane * 4]! * p[0]! +
      planes[plane * 4 + 1]! * p[1]! +
      planes[plane * 4 + 2]! * p[2]! +
      planes[plane * 4 + 3]!;
    const along = (ndcX: number, ndcY: number) =>
      camera
        .rayDirection(ndcX, ndcY, WIDTH / HEIGHT, new Float64Array(3))
        .map((v) => v * 1000);
    // Each edge's ray lies on its plane, and the image's middle inside all.
    expect(side(0, along(-1, 0))).toBeCloseTo(0, 9);
    expect(side(1, along(1, 0))).toBeCloseTo(0, 9);
    expect(side(2, along(0, -1))).toBeCloseTo(0, 9);
    expect(side(3, along(0, 1))).toBeCloseTo(0, 9);
    for (let plane = 0; plane < 4; plane++) {
      expect(side(plane, along(0, 0))).toBeGreaterThan(0);
    }
  });

  it("is kept by copies, and dropped by undefined", () => {
    const camera = above().setIntrinsics(OFF_CENTER);
    const copy = new Camera().copyFrom(camera);
    expect(copy.projection(m4.mat4(), 1.5)).toEqual(
      camera.projection(m4.mat4(), 1.5),
    );
    camera.setIntrinsics(undefined);
    expect(camera.centered).toBe(true);
    expect(camera.projection(m4.mat4(), 1.5)).toEqual(
      today.projection(camera, 1.5),
    );
  });

  it("refuses intrinsics that can't describe an image", () => {
    const camera = new Camera();
    expect(() => camera.setIntrinsics({ ...OFF_CENTER, fx: 0 })).toThrow(
      /fx must be a positive, finite number/,
    );
    expect(() =>
      camera.setIntrinsics({ ...OFF_CENTER, height: Number.NaN }),
    ).toThrow(/height must be/);
    expect(() =>
      camera.setIntrinsics({ ...OFF_CENTER, cx: Number.POSITIVE_INFINITY }),
    ).toThrow(/principal point/);
  });
});

describe("distortion", () => {
  it("takes none, and refuses the models that aren't built by name", () => {
    const camera = new Camera();
    expect(() =>
      camera.setIntrinsics(OFF_CENTER, { model: "none", coefficients: [] }),
    ).not.toThrow();
    expect(() =>
      camera.setIntrinsics(OFF_CENTER, {
        model: "opencvPinhole",
        coefficients: [0.1, -0.02, 0, 0, 0],
      }),
    ).toThrow(/"opencvPinhole" distortion model is not built yet/);
    expect(() =>
      camera.setIntrinsics(OFF_CENTER, {
        model: "opencvFisheye",
        coefficients: [0.1, 0, 0, 0],
      }),
    ).toThrow(/"opencvFisheye" distortion model is not built yet/);
    expect(() =>
      camera.setIntrinsics(OFF_CENTER, {
        model: "brownConrady" as "none",
        coefficients: [],
      }),
    ).toThrow(/"brownConrady" is not a distortion model/);
    // A refused distortion leaves the lens as it was.
    expect(camera.intrinsics(WIDTH, HEIGHT).cx).toBeCloseTo(OFF_CENTER.cx, 10);
  });

  it("is refused by name when projecting through a record", () => {
    const record: CameraRecord = {
      ...new Camera().record(WIDTH, HEIGHT, ROOT, 0),
      distortion: { model: "opencvFisheye", coefficients: [0, 0, 0, 0] },
    };
    expect(() =>
      projectToPixel(record, [0, 0, -10], new Float64Array(2)),
    ).toThrow(/"opencvFisheye" distortion model is not built yet/);
  });
});

describe("views and picks", () => {
  let engine: Engine;
  let world: World;
  let earth: AnchorHandle;
  let view: View;
  let featureId: number;
  let depth: number;

  /** Answers each pick pass with `featureId` at `depth`, mapped at once. */
  function answerPicks(): void {
    const picks = engine.raster.picks;
    picks.push = (...items) => {
      for (const item of items) {
        const words = new Uint32Array(4);
        words[0] = featureId;
        new Float32Array(words.buffer)[1] = depth;
        item.readback = {
          mapAsync: () => Promise.resolve(),
          getMappedRange: () => words.buffer.slice(0),
          unmap: () => {},
          destroy: () => {},
        } as unknown as GPUBuffer;
      }
      return Array.prototype.push.apply(picks, items);
    };
  }

  const settle = () => new Promise((resolve) => setImmediate(resolve));

  beforeEach(async () => {
    vi.spyOn(performance, "now").mockImplementation(() => 1000);
    engine = await fakeEngine();
    answerPicks();
    world = engine.createWorld({ maxDraws: 16 });
    earth = world.bodyAnchor(EARTH);
    const draw = world.addDraw({
      mesh: world.addMesh(createBox()),
      origin: Float64Array.of(R, 0, 0),
      parent: earth,
      name: "box",
    });
    featureId = 0;
    for (let id = 1; id < 10_000 && featureId === 0; id++) {
      if (world.feature(id)?.draw.index === draw.index) {
        featureId = id;
      }
    }
    view = engine.addView({
      target: new OffscreenTarget(WIDTH, HEIGHT),
      world,
    });
    view.setCameraFromAnchor(earth, above());
  });

  afterEach(() => {
    engine.destroy();
    vi.restoreAllMocks();
  });

  it("renders through the off-center lens: the body camera keeps it", () => {
    view.camera.setIntrinsics(OFF_CENTER);
    engine.renderFrame();
    // writeView draws with the body anchor's camera (Engine.bodyCamera).
    const drawn = engine.bodyCamera(view);
    expect(drawn.centered).toBe(false);
    expect(drawn.projection(m4.mat4(), WIDTH / HEIGHT)).toEqual(
      view.camera.projection(m4.mat4(), WIDTH / HEIGHT),
    );
  });

  it("toPixel follows an off-center record, and is unchanged for a centered one", () => {
    const point = pointsAhead(view.camera)[7]!;
    const before = view.toPixel(point)!;
    const expected = new Float64Array(2);
    projectToPixel(
      view.camera,
      view.camera.fovy(WIDTH / HEIGHT),
      WIDTH,
      HEIGHT,
      point,
      expected,
    );
    expect(before).toEqual(expected);
    view.camera.setIntrinsics(OFF_CENTER);
    const after = view.toPixel(point)!;
    projectToPixel(
      view.camera.record(WIDTH, HEIGHT, world.root, 0),
      point,
      expected,
    );
    expect(after).toEqual(expected);
    expect(after[0]).not.toBeCloseTo(before[0]!, 3);
  });

  it("an off-center pick finds what is drawn under its pixel, and reports the record it used", async () => {
    view.camera.setIntrinsics(OFF_CENTER);
    // 1 km along the view axis: reverse-Z depth is near / distance.
    depth = Math.fround(view.camera.near / 1000);
    const [x, y] = [9, 37];
    const point = view.pickPoint(x, y);
    const position = view.pickPosition(x, y);
    const feature = view.pick(x, y);
    for (let i = 0; i < 3; i++) {
      engine.renderFrame();
      await settle();
    }
    const pick = (await point)!;
    const record = pick.cameraRecord;
    expect(record.cx).toBeCloseTo(OFF_CENTER.cx, 10);
    expect(record.cy).toBeCloseTo(OFF_CENTER.cy, 10);
    expect(record.pose.referenceFrame).toBe(pick.root);
    expect(record.pose.seconds).toBe(pick.seconds);
    expect(record.distortion.model).toBe("none");
    const pixel = new Float64Array(2);
    const z = view.camera.near / depth;
    // The picked point is on the pixel's center, at the depth read, each
    // through the record it came with (on the default rig, render space and
    // the body anchor's coordinates are the same).
    const own = (await position)!;
    expect(own.camera.cx).toBeCloseTo(OFF_CENTER.cx, 10);
    expect(own.camera.pose.referenceFrame).toBe(earth);
    for (const [p, r] of [
      [pick.position, record],
      [own.position, own.camera],
    ] as const) {
      const along = projectToPixel(r, p, pixel);
      expect(along).toBeCloseTo(z, 6);
      expect(pixel[0]).toBeCloseTo(x + 0.5, 6);
      expect(pixel[1]).toBeCloseTo(y + 0.5, 6);
    }
    const result = (await feature)!;
    expect(result.id).toBe(world.identities.idOfSlot(featureId));
    expect(result.camera).toEqual(record);
    expect(result.time.seconds).toBe(record.pose.seconds);
  });

  it("a centered pick reports a centered record", async () => {
    depth = Math.fround(view.camera.near / 500);
    const result = view.pick(32, 24);
    const point = view.pickPoint(32, 24);
    for (let i = 0; i < 3; i++) {
      engine.renderFrame();
      await settle();
    }
    const record = (await result)!.camera;
    expect(record.cx).toBe(WIDTH / 2);
    expect(record.cy).toBe(HEIGHT / 2);
    expect(record.width).toBe(WIDTH);
    expect(record).toEqual((await point)!.cameraRecord);
  });
});

describe("every reader of the field of view follows the lens", () => {
  /** A view 128 × 96 whose principal point is 32 px right of center. */
  const W = 128;
  const H = 96;
  const SHIFTED: CameraIntrinsics = {
    width: W,
    height: H,
    fx: 80,
    fy: 80,
    cx: 96,
    cy: 48,
  };

  it("occlusion culling keeps an item in view near the image's edge", async () => {
    const engine = await fakeEngine();
    try {
      const world = engine.createWorld({ maxDraws: 4 });
      const view = engine.addView({
        target: new OffscreenTarget(W, H),
        world,
      });
      view.camera.setIntrinsics(SHIFTED);
      // The lens the engine culls with (occlusionPass `cullCamera`).
      const built = cullCamera(engine, view, { width: W, height: H });
      expect(built.shiftX).toBeCloseTo(0.5, 12);
      const near = view.camera.near;
      // The off-center image: a wall 10 m away over x in [70, 110), the sky
      // (reverse-Z 0) elsewhere.
      const levels = buildPyramid(W, H, (x) =>
        x >= 70 && x < 110 ? near / 10 : 0,
      );
      const camera = { frameWidth: W, frameHeight: H, ...built };
      // Items 50 m away, drawn beside the wall at the right edge (columns
      // 112 to 127), in the middle and at the corners: none hidden.
      for (const [u, v] of [
        [120, 48],
        [124, 6],
        [124, 90],
      ] as const) {
        const z = 50;
        const center = [
          ((u - SHIFTED.cx) / SHIFTED.fx) * z,
          ((SHIFTED.cy - v) / SHIFTED.fy) * z,
          z,
        ];
        expect(sphereHidden(levels, camera, center, 0.5), `${u}, ${v}`).toBe(
          false,
        );
        // The centered lens puts it 32 px left, on the wall: it was hidden.
        expect(
          sphereHidden(
            levels,
            { ...camera, shiftX: 0, shiftY: 0 },
            center,
            0.5,
          ),
        ).toBe(true);
      }
      // And behind the wall, it is hidden.
      expect(sphereHidden(levels, camera, [0.125 * 50, 0, 50], 0.5)).toBe(true);
      // The GPU cull's uniform carries both cameras' principal points.
      const out = new ArrayBuffer(OCCLUSION_CULL_BYTES);
      occlusionCullParams(
        out,
        built,
        built,
        { width: W, height: H, levels: 7 },
        { argumentRows: 1, itemRows: 1, counterWord: 0 },
      );
      expect(Array.from(new Float32Array(out, 128, 4))).toEqual([
        0.5, 0, 0.5, 0,
      ]);
    } finally {
      engine.destroy();
    }
  });

  it("the sky's rays leave from the principal point", async () => {
    const engine = await fakeEngine();
    try {
      const world = engine.createWorld({ maxDraws: 4 });
      world.bodyAnchor(EARTH);
      const view = engine.addView({
        target: new OffscreenTarget(W, H),
        world,
      });
      view.setCameraFromAnchor(world.bodyAnchor(EARTH), above());
      view.camera.setIntrinsics(SHIFTED);
      // The view's uniform as the sky writes it (the environment's faces
      // write theirs, centered, from the same array afterward).
      const sky = engine.raster.sky as unknown as {
        f32: Float32Array;
        write: (...args: unknown[]) => void;
      };
      let f = new Float32Array(0);
      const write = sky.write.bind(sky);
      sky.write = (...args: unknown[]) => {
        write(...args);
        f = Float32Array.from(sky.f32);
      };
      engine.renderFrame();
      expect(f.length).toBeGreaterThan(89);
      const camera = engine.bodyCamera(view);
      const lens = camera.lens(W / H);
      expect(f[88]).toBe(Math.fround(lens.shiftX));
      expect(f[89]).toBe(Math.fround(lens.shiftY));
      expect(f[11]).toBe(Math.fround(lens.tanX));
      // sky.slang `viewDirection` for a pixel, from the uniform: the ray
      // through that pixel of the record.
      const record = camera.record(W, H, ROOT, 0);
      const out = new Float64Array(2);
      const u = f;
      const ray = (nx: number, ny: number) =>
        [0, 1, 2].map(
          (i) =>
            u[8 + i]! + u[12 + i]! * nx * u[11]! + u[16 + i]! * ny * u[15]!,
        );
      for (const [px, py] of [
        [2, 3],
        [96, 48],
        [125, 90],
      ] as const) {
        const nx = (px / u[20]!) * 2 - 1 - u[88]!;
        const ny = 1 - (py / u[21]!) * 2 - u[89]!;
        const d = ray(nx, ny);
        const point = d.map((v, i) => camera.position[i]! + 1000 * v);
        projectToPixel(record, point, out);
        expect(Math.abs(out[0]! - px)).toBeLessThan(1e-3);
        expect(Math.abs(out[1]! - py)).toBeLessThan(1e-3);
      }
    } finally {
      engine.destroy();
    }
  });

  it("shadow cascades cover every corner of an off-center view", () => {
    const camera = above().setIntrinsics({
      ...SHIFTED,
      cx: 110,
      cy: 20,
    });
    const cascades = createShadowCascades();
    const sun = [0.3, 0.2, 0.93];
    const length = Math.hypot(...sun);
    fitShadowCascades(
      cascades,
      camera,
      W / H,
      sun.map((v) => v / length),
      50,
    );
    let previous = Math.max(camera.near, 1);
    for (let c = 0; c < SHADOW_CASCADES; c++) {
      const m = cascades.matrices.subarray(c * 16, c * 16 + 16);
      for (const d of [previous, cascades.splits[c]!]) {
        for (const [nx, ny] of [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ] as const) {
          const ray = camera.rayDirection(nx, ny, W / H, new Float64Array(3));
          const along = d / v3.dot(ray, camera.direction);
          const p = [0, 1, 2].map((i) => ray[i]! * along);
          for (const row of [0, 1]) {
            const clip =
              m[row]! * p[0]! +
              m[4 + row]! * p[1]! +
              m[8 + row]! * p[2]! +
              m[12 + row]!;
            expect(Math.abs(clip), `cascade ${c}`).toBeLessThanOrEqual(
              1 + 2 / SHADOW_SIZE,
            );
          }
        }
      }
      previous = cascades.splits[c]!;
    }
  });

  it("light culling uses each edge's own tangent", () => {
    // Looking down +y, x right, z up; the principal point half a view right.
    const camera = {
      position: [0, 0, 0],
      direction: [0, 1, 0],
      up: [0, 0, 1],
      right: [1, 0, 0],
      near: 0.1,
      tanX: 1,
      tanY: 1,
      shiftX: 0.5,
      shiftY: 0,
    };
    const at = (x: number, y: number, z: number) => {
      const m = new Float64Array(16);
      m[0] = m[5] = m[10] = m[15] = 1;
      m[12] = x;
      m[13] = y;
      m[14] = z;
      return m;
    };
    const kept = (x: number) => {
      const out = new Float32Array(LIGHTS_SIZE / 4);
      const count = packViewLights(
        out,
        0,
        (visit) =>
          visit(
            {
              type: "point",
              intensity: 1,
              range: 0.5,
            } as LightOptions,
            at(x, 10, 0),
          ),
        camera,
        1,
      );
      return { count, shift: [out[15], out[19]] };
    };
    // The left edge's tangent is 1.5 and the right's 0.5.
    expect(kept(-13).count).toBe(1); // beyond the centered edge, in view
    expect(kept(8).count).toBe(0); // within the centered edge, out of view
    expect(kept(4).count).toBe(1);
    // lights.slang's tiles read the principal point from the header.
    expect(kept(4).shift).toEqual([0.5, 0]);
  });

  it("the star cells' planes are the off-center edges", () => {
    const inputs = starCullInputs(
      [0, 0, -1],
      [1, 0, 0],
      [0, 1, 0],
      1,
      1,
      0.5,
      0,
      1000,
      1000,
      1,
      [1, 0, 0, 0, 1, 0, 0, 0, 1],
      1,
      { core: 0.5 },
      1,
    );
    const p = inputs.planes;
    const side = (k: number, d: readonly number[]) =>
      p[k]! * d[0]! + p[k + 1]! * d[1]! + p[k + 2]! * d[2]!;
    // A star at slope −1.4 (in view: the left edge is at −1.5) and one at
    // 0.6 (out: the right edge is at 0.5).
    const unit = (v: number[]) => v.map((x) => x / Math.hypot(...v));
    expect(side(0, unit([-1.4, 0, -1]))).toBeGreaterThan(0);
    expect(side(4, unit([0.6, 0, -1]))).toBeLessThan(0);
  });
});
