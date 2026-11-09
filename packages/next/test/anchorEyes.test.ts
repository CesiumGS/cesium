import type { CastOptions } from "../src/scene/world/types.ts";
import { rayJobs } from "../src/scene/world/rays.ts";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { EARTH, MOON } from "../src/scene/Body.ts";
import { Camera } from "../src/scene/Camera.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { createBox } from "../src/scene/meshes.ts";
import { type View } from "../src/scene/View.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { World } from "../src/scene/World.ts";
import * as m4 from "../src/math/mat4.ts";
import { splitVec3 } from "../src/math/transforms.ts";
import {
  ANCHOR_EYE_WORDS,
  MAX_ANCHORS,
  VIEW_STRIDE,
  viewBlockBytes,
  RECORD_WORDS,
  TRANSFORM_WORD,
  TRANSFORM_WORDS,
  VIEW_ANCHORS_WORD,
} from "../src/render/layout.ts";
import {
  ViewLayout,
  TransformLayout,
} from "../src/render/generated/layouts.ts";
import { ANCHOR_EYE_REACH } from "../src/scene/anchorEyes.ts";
import { LIGHT_HEADER_FLOATS } from "../src/scene/lights.ts";
import { fakeEngine } from "./fakeGpu.ts";

/** Word offsets of the view block's fields. */
const V = Object.fromEntries(
  Object.entries(ViewLayout).map(([k, v]) => [k, v / 4]),
) as Record<keyof typeof ViewLayout, number>;

/** A rotation by `angle` about z, then a translation by `t` (column-major). */
function rotationZ(angle: number, t: readonly number[] = [0, 0, 0]) {
  const c = Math.cos(angle),
    s = Math.sin(angle);
  // prettier-ignore
  return Float64Array.of(
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    t[0]!, t[1]!, t[2]!, 1,
  );
}

function translation(x: number, y: number, z: number): Float64Array {
  return rotationZ(0, [x, y, z]);
}

/** A camera looking down at Philadelphia from 1 km up (Earth-fixed). */
function pose(): Camera {
  const camera = new Camera();
  camera.position.set([1_253_000.37, -4_733_000.81, 4_074_000.06]);
  camera.direction.set([-0.19, 0.72, -0.62]);
  camera.orient(Float64Array.of(0, 0, 1));
  return camera;
}

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

function scene(): { world: World; view: View } {
  const world = engine.createWorld({
    maxDraws: 16,
    vertexBytes: 1 << 16,
    indexBytes: 1 << 16,
  });
  const view = engine.addView({ target: new OffscreenTarget(64, 48), world });
  created.push(view);
  return { world, view };
}

interface Internals {
  viewData: Float32Array;
  lightData: Float32Array;
  viewFrames: Map<View, { slot: number; viewBytes: number }>;
  scratchKey: Float64Array;
  viewKey(view: View): number;
}

/** Renders the views once; the view's block as written to the staging buffer. */
function block(view: View): Float32Array {
  engine.renderFrame();
  const internals = engine as unknown as Internals;
  const slot = internals.viewFrames.get(view)!.slot;
  const words = ViewLayout.size / 4;
  const stride = VIEW_STRIDE / 4;
  return internals.viewData.slice(slot * stride, slot * stride + words);
}

/** Bytes of the view's block uploaded and copied in the last render. */
function uploaded(view: View): number {
  return (engine as unknown as Internals).viewFrames.get(view)!.viewBytes;
}

/** The camera floats `writeView` wrote before anchors, from `camera`. */
function expected(camera: Camera, aspect: number) {
  const view = new Float64Array(16);
  const proj = new Float64Array(16);
  const viewProj = new Float64Array(16);
  camera.viewRotation(view);
  camera.projection(proj, aspect);
  m4.multiply(viewProj, proj, view);
  const planes = new Float32Array(20);
  camera.frustumPlanes(planes, aspect);
  const hi = new Float32Array(3);
  const lo = new Float32Array(3);
  splitVec3(camera.position, hi, 0, lo, 0);
  return {
    viewProj: Float32Array.from(viewProj),
    viewRotation: Float32Array.from(view),
    hi,
    lo,
    planes,
  };
}

/** Slot `slot` of a block's anchor table. */
function eye(b: Float32Array, slot: number) {
  const o = VIEW_ANCHORS_WORD + slot * ANCHOR_EYE_WORDS;
  return {
    hi: b.slice(o, o + 3),
    hidden: b[o + 3],
    lo: b.slice(o + 4, o + 7),
    axes: [
      ...b.slice(o + 8, o + 11),
      ...b.slice(o + 12, o + 15),
      ...b.slice(o + 16, o + 19),
    ],
  };
}

/**
 * Within `ulps` float32 steps of `b`, value by value; a step is at least
 * the float32 step of the largest value of `b` (a matrix's zeros move by
 * its rounding too).
 */
function closeF32(a: ArrayLike<number>, b: ArrayLike<number>, ulps = 1) {
  expect(a.length).toBe(b.length);
  let largest = 0;
  for (let i = 0; i < b.length; i++) {
    largest = Math.max(largest, Math.abs(b[i]!));
  }
  for (let i = 0; i < a.length; i++) {
    const step = Math.max(Math.abs(b[i]!), largest) * 2 ** -23;
    expect(Math.abs(a[i]! - b[i]!)).toBeLessThanOrEqual(ulps * step);
  }
}

const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

describe("an eye per anchor (plan 5a, Task 9)", () => {
  it("with every anchor at identity the view block's camera floats are today's", () => {
    const { world, view } = scene();
    const earth = world.bodyAnchor(EARTH);
    world.bodyAnchor(MOON);
    const mesh = world.addMesh(createBox());
    world.addDraw({ mesh, origin: Float64Array.of(1, 2, 3), parent: earth });
    view.camera.copyFrom(pose());
    const b = block(view);
    const want = expected(view.camera, 64 / 48);
    expect(b.slice(V.viewProj, V.viewProj + 16)).toEqual(want.viewProj);
    expect(b.slice(V.viewRotation, V.viewRotation + 16)).toEqual(
      want.viewRotation,
    );
    expect(b.slice(V.cameraHi, V.cameraHi + 3)).toEqual(want.hi);
    expect(b.slice(V.cameraLo, V.cameraLo + 3)).toEqual(want.lo);
    expect(b.slice(V.planes, V.planes + 20)).toEqual(want.planes);
    // Every slot in use (the root, the Earth's, the Moon's): the camera,
    // the identity, shown. Only those go up: 656 bytes, not the struct's
    // 2,976.
    expect(earth.slot).toBe(1);
    expect(uploaded(view)).toBe(viewBlockBytes(3));
    expect(viewBlockBytes(3)).toBe(656);
    expect(ViewLayout.size).toBe(2976);
    expect(MAX_ANCHORS).toBe(32);
    for (let slot = 0; slot < 3; slot++) {
      const e = eye(b, slot);
      expect(e.hi).toEqual(want.hi);
      expect(e.lo).toEqual(want.lo);
      expect(e.axes).toEqual(I3);
      expect(e.hidden).toBe(0);
    }
  });

  it("the body camera is the camera in the body anchor", () => {
    const { world, view } = scene();
    const earth = world.bodyAnchor(EARTH);
    view.camera.copyFrom(pose());
    const identity = block(view);
    view.setAnchorPlacement(earth, rotationZ(0.3));
    view.setCameraFromAnchor(earth, pose());
    const placed = block(view);
    // The split position: the same whole meters, and the rest to the
    // float64 round trip through the placement (nanometers), far inside
    // one float32 step of the position (0.25 m to 0.5 m here).
    expect(placed.slice(V.cameraHi, V.cameraHi + 3)).toEqual(
      identity.slice(V.cameraHi, V.cameraHi + 3),
    );
    for (let i = 0; i < 3; i++) {
      expect(
        Math.abs(placed[V.cameraLo + i]! - identity[V.cameraLo + i]!),
      ).toBeLessThan(1e-6);
    }
    for (const [field, n] of [
      ["viewProj", 16],
      ["viewRotation", 16],
      ["planes", 20],
    ] as const) {
      closeF32(
        placed.slice(V[field], V[field] + n),
        identity.slice(V[field], V[field] + n),
      );
    }
    // The body anchor's slot: the camera, the identity.
    const e = eye(placed, earth.slot);
    expect(e.hi).toEqual(placed.slice(V.cameraHi, V.cameraHi + 3));
    expect(e.lo).toEqual(placed.slice(V.cameraLo, V.cameraLo + 3));
    expect(e.axes).toEqual(I3);
    // The root (slot 0) turns by the body's rotation backward.
    const root = eye(placed, 0);
    const c = Math.cos(0.3),
      s = Math.sin(0.3);
    closeF32(root.axes, [c, s, 0, -s, c, 0, 0, 0, 1].map(Math.fround));
  });

  it("each slot holds the eye in its anchor and the rotation into the shading axes", () => {
    const { world, view } = scene();
    const earth = world.bodyAnchor(EARTH);
    const moon = world.bodyAnchor(MOON);
    const mesh = world.addMesh(createBox());
    const draw = world.addDraw({
      mesh,
      origin: Float64Array.of(10, 20, 30),
      parent: moon,
    });
    view.camera.copyFrom(pose());
    // The Earth turned by 0.3 rad about z; the Moon 384,400 km out along
    // x, turned by 1 rad about z.
    view.setAnchorPlacement(earth, rotationZ(0.3));
    view.setAnchorPlacement(moon, rotationZ(1, [384_400_000, 0, 0]));
    view.setCameraFromAnchor(earth, pose());
    const b = block(view);
    // The eye in the Moon: Rmᵀ (Re c − tm), float64.
    const p = pose().position;
    const ce = Math.cos(0.3),
      se = Math.sin(0.3);
    const render = [ce * p[0]! - se * p[1]!, se * p[0]! + ce * p[1]!, p[2]!];
    const d = [render[0]! - 384_400_000, render[1]!, render[2]!];
    const cm = Math.cos(1),
      sm = Math.sin(1);
    const inMoon = Float64Array.of(
      cm * d[0]! + sm * d[1]!,
      -sm * d[0]! + cm * d[1]!,
      d[2]!,
    );
    const hi = new Float32Array(3);
    const lo = new Float32Array(3);
    splitVec3(inMoon, hi, 0, lo, 0);
    const e = eye(b, moon.slot);
    expect(e.hi).toEqual(hi);
    closeF32(e.lo, lo, 2);
    expect(e.hidden).toBe(0);
    // Moon axes to Earth axes: a turn by 1 − 0.3 rad about z.
    const c = Math.cos(0.7),
      s = Math.sin(0.7);
    closeF32(e.axes, [c, -s, 0, s, c, 0, 0, 0, 1].map(Math.fround));
    // The draw's transform carries the Moon's slot in flags bits 8 to 15.
    const internals = world.raster;
    const t = internals.recordsU32[draw.index * RECORD_WORDS + TRANSFORM_WORD]!;
    const flags =
      internals.transforms.u32[
        t * TRANSFORM_WORDS + TransformLayout.flags / 4
      ]!;
    expect((flags >> 8) & 0xff).toBe(moon.slot);
    expect(flags & 1).toBe(0);
  });

  it("a light under an anchor is camera-relative through its anchor's eye", () => {
    const { world, view } = scene();
    world.bodyAnchor(EARTH);
    const moon = world.bodyAnchor(MOON);
    view.camera.copyFrom(pose());
    view.setAnchorPlacement(moon, rotationZ(Math.PI / 2, [384_400_000, 0, 0]));
    // 100 m along render space's x from the camera, given in the Moon's
    // coordinates (turned a quarter turn about z, 384,400 km out).
    const p = pose().position;
    // Render point q = camera + (100, 0, 0); in the Moon: Rᵀ (q − t).
    const q = [p[0]! + 100, p[1]!, p[2]!];
    const local = [q[1]!, -(q[0]! - 384_400_000), q[2]!];
    world.addLight({
      type: "point",
      intensity: 1e9,
      range: 1000,
      transform: world.addTransform(
        translation(local[0]!, local[1]!, local[2]!),
        moon,
      ),
    });
    block(view);
    const lights = (engine as unknown as Internals).lightData;
    expect(lights[3]).toBe(1);
    // 100 m along x from the camera, to float64's rounding at 384,400 km
    // (about 60 nm), never float32's (about 30 m there).
    const at = LIGHT_HEADER_FLOATS;
    [100, 0, 0].forEach((want, i) => {
      expect(Math.abs(lights[at + i]! - want)).toBeLessThan(1e-6);
    });
  });

  it("an eye beyond 2^31 m of an anchor hides its draws and reports once", () => {
    const { world, view } = scene();
    const far = world.addAnchor("far away");
    view.camera.copyFrom(pose());
    view.setAnchorPlacement(far, translation(ANCHOR_EYE_REACH * 1.5, 0, 0));
    const before = engine.errors.filter((e) =>
      e.message.includes("far away"),
    ).length;
    const b = block(view);
    expect(eye(b, far.slot).hidden).toBe(1);
    expect(eye(b, 0).hidden).toBe(0);
    block(view);
    const reports = engine.errors.filter((e) => e.message.includes("far away"));
    expect(reports.length - before).toBe(1);
    expect(reports.at(-1)!.count).toBe(1);
    expect(reports.at(-1)!.message).toMatch(
      /more than 2,147,483,648 m \(2\^31 m\) from the anchor far away: its draws are hidden/,
    );
    // Brought within reach, shown again.
    view.setAnchorPlacement(far, translation(1000, 0, 0));
    expect(eye(block(view), far.slot).hidden).toBe(0);
  });

  it("castRays tests only draws under the cast's anchor", () => {
    const { world } = scene();
    const earth = world.bodyAnchor(EARTH);
    const mesh = world.addMesh(createBox());
    const under = world.addDraw({
      mesh,
      origin: Float64Array.of(0, 0, 0),
      parent: earth,
    });
    const root = world.addDraw({ mesh, origin: Float64Array.of(0, 0, 0) });
    const rays = [
      {
        origin: Float64Array.of(0, 0, 10),
        direction: Float64Array.of(0, 0, -1),
        maxDistance: 100,
      },
    ];
    const jobs = (anchor?: typeof earth) => {
      const bySlab = rayJobs(world, rays, anchor ? { anchor } : {});
      const records = new Set<number>();
      for (const list of bySlab.values()) {
        for (let i = 0; i < list.length; i += 4) {
          records.add(list[i + 1]!);
        }
      }
      return [...records];
    };
    expect(jobs(earth)).toEqual([under.index]);
    expect(jobs()).toEqual([root.index]);
    // A listed draw must be under the cast's anchor.
    const listed = (anchor: typeof earth | undefined, draws: unknown[]) =>
      rayJobs(
        world,
        rays,
        (anchor ? { anchor, draws } : { draws }) as CastOptions,
      );
    expect(() => listed(earth, [under])).not.toThrow();
    expect(() => listed(earth, [under, root])).toThrow(
      `castRays: draw ${root.index} is under no anchor (the table's root); the cast's rays are under the anchor Earth.`,
    );
    expect(() => listed(undefined, [under])).toThrow(
      `castRays: draw ${under.index} is under the anchor Earth; the cast's rays are under no anchor (the table's root).`,
    );
    const other = engine.createWorld().addAnchor("elsewhere");
    expect(() => jobs(other)).toThrow(
      /castRays: elsewhere is not an anchor of this world/,
    );
  });

  it("a globe-only view uploads the root's and the Earth's slots", () => {
    const { world, view } = scene();
    view.camera.copyFrom(pose());
    block(view);
    // No anchor yet: the root's slot alone.
    expect(uploaded(view)).toBe(496);
    const earth = world.bodyAnchor(EARTH);
    const mesh = world.addMesh(createBox());
    world.addDraw({ mesh, origin: Float64Array.of(1, 2, 3), parent: earth });
    block(view);
    expect(uploaded(view)).toBe(576);
  });

  it("the body camera follows a camera written in place without version++", () => {
    const { world, view } = scene();
    world.bodyAnchor(EARTH);
    view.camera.copyFrom(pose());
    const before = block(view);
    view.camera.position[0] = view.camera.position[0]! + 1000;
    const after = block(view);
    expect(after[V.cameraHi]! - before[V.cameraHi]!).toBe(1000);
  });

  it("the view's fingerprint fills exactly VIEW_KEY_LENGTH values", () => {
    const { world, view } = scene();
    world.bodyAnchor(EARTH);
    const internals = engine as unknown as Internals;
    internals.scratchKey.fill(Number.NaN);
    const n = internals.viewKey(view);
    expect(n).toBe(internals.scratchKey.length);
    for (let i = 0; i < n; i++) {
      expect(Number.isFinite(internals.scratchKey[i]), `value ${i}`).toBe(true);
    }
  });
});
