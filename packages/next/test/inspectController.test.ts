// InspectController's orbit math, in Node without a GPU: a frame of its own
// (an up and a heading reference), the east-north-up path unchanged, the
// pitch clamp, the wheel's range limits, re-focusing and dispose.
import { describe, expect, it } from "vitest";
import { Camera } from "../src/scene/Camera.ts";
import {
  InspectController,
  type InspectControllerOptions,
} from "../src/scene/InspectController.ts";
import type { View } from "../src/scene/View.ts";
import { Ellipsoid, cartographic } from "../src/math/ellipsoid.ts";
import { eastNorthUpToFixedFrame } from "../src/math/transforms.ts";
import * as v3 from "../src/math/vec3.ts";
import * as m4 from "../src/math/mat4.ts";
import { followZoom, orbitState, planOrbit } from "../widgets/orbitFocus.ts";

const SIZE = 100;
const maxPitch = Math.PI / 2 - 1e-3;
const zUp = { up: [0, 0, 1], headingRef: [1, 0, 0] };

/** A view of SIZE × SIZE pixels and an element whose box matches it. */
function setup(options?: InspectControllerOptions) {
  const camera = new Camera();
  // The Earth's anchor at the identity: posing through it is a copy.
  const earth = { index: 0, generation: 0, name: "Earth", slot: 1 };
  const view = {
    camera,
    world: { bodyAnchor: () => earth },
    setCameraFromAnchor: (_anchor: unknown, pose: Camera) => {
      if (pose !== camera) {
        camera.copyFrom(pose);
      }
    },
    target: { width: SIZE, height: SIZE },
    contains: () => true,
    pixelRect: () => ({ x: 0, y: 0, width: SIZE, height: SIZE }),
  } as unknown as View;
  const element = new EventTarget() as EventTarget & {
    getBoundingClientRect(): {
      left: number;
      top: number;
      width: number;
      height: number;
    };
  };
  element.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: SIZE,
    height: SIZE,
  });
  const controller = new InspectController(
    view,
    element as unknown as HTMLElement,
    options,
  );
  const fire = (type: string, init: Record<string, number | boolean> = {}) =>
    element.dispatchEvent(
      Object.assign(new Event(type, { cancelable: true }), {
        clientX: 0,
        clientY: 0,
        button: 0,
        shiftKey: false,
        deltaY: 0,
        ...init,
      }),
    );
  const drag = (dx: number, dy: number, init = {}) => {
    fire("pointerdown", { clientX: 50, clientY: 50, ...init });
    fire("pointermove", { clientX: 50 + dx, clientY: 50 + dy, ...init });
    fire("pointerup");
  };
  return { camera, controller, fire, drag };
}

function expectVec(actual: ArrayLike<number>, expected: number[], digits = 9) {
  for (let i = 0; i < 3; i++) {
    expect(actual[i]).toBeCloseTo(expected[i]!, digits);
  }
}

const S = Math.SQRT1_2;

describe("InspectController in a frame (up +z, heading reference +x)", () => {
  it("places the camera from heading and pitch in the frame", () => {
    const { camera, controller } = setup({ frame: zUp });
    // Heading 0, level: behind the target along -headingRef, looking +x.
    controller.focus([0, 0, 0], 0, 0, 10);
    expectVec(camera.position, [-10, 0, 0]);
    expectVec(camera.direction, [1, 0, 0]);
    expectVec(camera.up, [0, 0, 1]);
    // Heading π/2: clockwise seen from +z, looking along east = x × z = -y.
    controller.focus([0, 0, 0], Math.PI / 2, 0, 10);
    expectVec(camera.position, [0, 10, 0]);
    expectVec(camera.direction, [0, -1, 0]);
    // Pitch -π/4 tilts up out of the xy plane, looking down at the target.
    controller.focus([1, 2, 3], 0, -Math.PI / 4, 10);
    expectVec(camera.position, [1 - 10 * S, 2, 3 + 10 * S]);
    expectVec(camera.direction, [S, 0, -S]);
    expectVec(camera.up, [S, 0, S]);
    // Unrolled: right stays in the plane perpendicular to up.
    expect(camera.right[2]).toBeCloseTo(0, 12);
  });

  it("turns about z on a horizontal drag and tilts from xy on a vertical one", () => {
    const { camera, controller, drag } = setup({ frame: zUp });
    controller.focus([0, 0, 0], 0, 0, 10);
    drag(SIZE / 2, 0); // half the view's height: +π/2 heading
    expect(controller.heading).toBeCloseTo(Math.PI / 2, 12);
    expectVec(camera.position, [0, 10, 0]);
    expect(camera.position[2]).toBeCloseTo(0, 12);
    drag(0, SIZE / 4); // a quarter down: pitch -π/4
    expect(controller.pitch).toBeCloseTo(-Math.PI / 4, 12);
    expectVec(camera.position, [0, 10 * S, 10 * S]);
    expect(v3.length(camera.position)).toBeCloseTo(10, 9);
    expect(camera.right[2]).toBeCloseTo(0, 12);
  });

  it("normalizes the frame and makes the heading reference perpendicular", () => {
    const { camera, controller } = setup({
      frame: { up: [0, 0, 5], headingRef: [2, 0, 1] },
    });
    const f = controller.frame!;
    expectVec(f.up, [0, 0, 1], 12);
    expectVec(f.headingRef, [1, 0, 0], 12);
    controller.focus([0, 0, 0], 0, 0, 10);
    expectVec(camera.position, [-10, 0, 0]);
    expect(
      () => (controller.frame = { up: [0, 0, 1], headingRef: [0, 0, 2] }),
    ).toThrow(RangeError);
    expect(
      () => (controller.frame = { up: [0, 0, 0], headingRef: [1, 0, 0] }),
    ).toThrow(RangeError);
    // A rejected frame leaves the old one.
    expectVec(controller.frame!.up, [0, 0, 1], 12);
  });

  it("pans in the plane perpendicular to up", () => {
    const { camera, controller, drag } = setup({ frame: zUp });
    controller.focus([0, 0, 0], 0, -0.7, 10);
    drag(10, -20, { button: 2 });
    expect(controller.target[2]).toBeCloseTo(0, 12);
    expect(v3.length(controller.target)).toBeGreaterThan(0.1);
    expect(v3.distance(camera.position, controller.target)).toBeCloseTo(10, 9);
  });

  it("re-reads a camera moved by other code at the next input", () => {
    const { camera, controller, fire } = setup({ frame: zUp });
    controller.focus([0, 0, 0], 0, 0, 10);
    // A flight elsewhere: from (20, 0, 5), looking at (0, 0, 5).
    camera.lookAtInFrame(
      v3.vec3(0, 0, 5),
      Math.PI,
      0,
      20,
      v3.vec3(1, 0, 0),
      v3.vec3(0, 0, 1),
    );
    const before = v3.copy(v3.vec3(), camera.position);
    fire("pointerdown", { clientX: 50, clientY: 50 });
    expectVec(camera.position, [...before]);
    // The pivot is on the view axis at the old target's depth.
    expectVec(controller.target, [0, 0, 5]);
    expect(controller.range).toBeCloseTo(20, 9);
    expect(controller.dragging).toBe(true);
    fire("pointerup");
    expect(controller.dragging).toBe(false);
  });

  it("orbits a pivot from where the camera is (syncFromCamera)", () => {
    const { camera, controller } = setup({ frame: zUp });
    v3.set(camera.position, 0, -10, 10);
    controller.syncFromCamera([0, 0, 0]);
    expect(controller.range).toBeCloseTo(10 * Math.SQRT2, 9);
    expect(controller.pitch).toBeCloseTo(-Math.PI / 4, 12);
    // Looking +y, i.e. west (east is -y): heading 3π/2.
    expect(controller.heading).toBeCloseTo((3 * Math.PI) / 2, 12);
    expectVec(camera.position, [0, -10, 10]);
    expectVec(camera.direction, [0, S, -S]);
  });
});

describe("InspectController without a frame", () => {
  const e = Ellipsoid.WGS84;
  const target = e.cartographicToCartesian(
    cartographic(-1.3, 0.69, 120),
    v3.vec3(),
  );

  function expectSameCamera(a: Camera, b: Camera) {
    expect([...a.position]).toEqual([...b.position]);
    expect([...a.direction]).toEqual([...b.direction]);
    expect([...a.up]).toEqual([...b.up]);
    expect([...a.right]).toEqual([...b.right]);
  }

  it("matches Camera.lookAt in east-north-up exactly", () => {
    const { camera, controller } = setup();
    controller.focus(target, 0.6, -0.4, 250);
    const reference = new Camera().lookAt(target, 0.6, -0.4, 250, e);
    expectSameCamera(camera, reference);
  });

  it("drags and pans as before", () => {
    const { camera, controller, drag } = setup();
    controller.focus(target, 0.6, -0.4, 250);
    drag(17, -9);
    const heading = 0.6 + (17 / SIZE) * Math.PI;
    const pitch = -0.4 - (-9 / SIZE) * Math.PI;
    expectSameCamera(
      camera,
      new Camera().lookAt(target, heading, pitch, 250, e),
    );

    drag(12, 7, { shiftKey: true });
    // The pre-frame pan, verbatim.
    const enu = eastNorthUpToFixedFrame(target, e, m4.mat4());
    const scale = (250 * 1.2) / SIZE;
    const c = Math.cos(heading);
    const s = Math.sin(heading);
    const east = -12 * c + 7 * s;
    const north = 12 * s + 7 * c;
    const panned = v3.vec3();
    for (let i = 0; i < 3; i++) {
      panned[i] = target[i]! + (enu[i]! * east + enu[4 + i]! * north) * scale;
    }
    expect([...controller.target]).toEqual([...panned]);
    expectSameCamera(
      camera,
      new Camera().lookAt(panned, heading, pitch, 250, e),
    );
  });

  it("does not re-read a camera moved by other code (as before)", () => {
    const { camera, controller, fire } = setup();
    controller.focus(target, 0.6, -0.4, 250);
    camera.lookAt(target, 2, -1, 900, e);
    fire("wheel", { clientX: 50, clientY: 50, deltaY: 1 });
    expectSameCamera(
      camera,
      new Camera().lookAt(target, 0.6, -0.4, 250 * 1.15, e),
    );
  });
});

describe("InspectController limits", () => {
  it("clamps the pitch to ±(π/2 − 1e-3) on a drag", () => {
    const { controller, drag } = setup({ frame: zUp });
    controller.focus([0, 0, 0], 0, 0, 10);
    drag(0, 10 * SIZE);
    expect(controller.pitch).toBe(-maxPitch);
    drag(0, -20 * SIZE);
    expect(controller.pitch).toBe(maxPitch);
    const enu = setup();
    enu.controller.focus([6378137, 0, 0], 0, 0, 10);
    enu.drag(0, 10 * SIZE);
    expect(enu.controller.pitch).toBe(-maxPitch);
  });

  it("keeps the wheel's range within minRange and maxRange", () => {
    const { controller, fire } = setup({
      frame: zUp,
      minRange: 8,
      maxRange: 12,
    });
    controller.focus([0, 0, 0], 0, 0, 10);
    const wheel = (deltaY: number) =>
      fire("wheel", { clientX: 50, clientY: 50, deltaY });
    wheel(1);
    expect(controller.range).toBeCloseTo(11.5, 12);
    wheel(1);
    expect(controller.range).toBe(12);
    wheel(-1);
    wheel(-1);
    wheel(-1);
    expect(controller.range).toBe(8);
  });

  it("defaults to a 0.01 m minimum and no maximum", () => {
    const { controller, fire } = setup();
    expect(controller.minRange).toBe(0.01);
    expect(controller.maxRange).toBe(Infinity);
    controller.focus([6378137, 0, 0], 0, 0, 0.011);
    fire("wheel", { clientX: 50, clientY: 50, deltaY: -1 });
    expect(controller.range).toBe(0.01);
  });
});

describe("InspectController focus and dispose", () => {
  it("re-focuses on a new target, frame and pose", () => {
    const { camera, controller } = setup({ frame: zUp });
    controller.focus([0, 0, 0], 0, 0, 10);
    controller.frame = { up: [1, 0, 0], headingRef: [0, 1, 0] };
    controller.focus([5, 5, 5], 0, 0, 2);
    // Heading 0 in the new frame: behind the target along -y.
    expectVec(camera.position, [5, 3, 5]);
    expectVec(camera.up, [1, 0, 0]);
    // Back to east-north-up at an Earth point.
    controller.frame = undefined;
    const p = v3.vec3(6378137, 0, 0);
    controller.focus(p, 0.3, -0.5, 100);
    const reference = new Camera().lookAt(p, 0.3, -0.5, 100);
    expect([...camera.position]).toEqual([...reference.position]);
  });

  it("reports changes and drags through onChange", () => {
    const { controller, fire } = setup({ frame: zUp });
    let calls = 0;
    controller.onChange = () => calls++;
    controller.focus([0, 0, 0], 0, 0, 10);
    expect(calls).toBe(1);
    fire("pointerdown", { clientX: 50, clientY: 50 });
    expect(controller.dragging).toBe(true);
    fire("pointerleave");
    expect(controller.dragging).toBe(false);
    expect(calls).toBe(3);
  });

  it("removes its listeners on dispose", () => {
    const { camera, controller, fire, drag } = setup({ frame: zUp });
    controller.focus([0, 0, 0], 0, 0, 10);
    let calls = 0;
    controller.onChange = () => calls++;
    controller.dispose();
    const version = camera.version;
    drag(30, 30);
    drag(30, 30, { button: 2 });
    fire("wheel", { clientX: 50, clientY: 50, deltaY: 1 });
    expect(camera.version).toBe(version);
    expect(controller.range).toBe(10);
    expect(controller.dragging).toBe(false);
    expect(calls).toBe(0);
  });
});

describe("syncFromCamera's pitch clamp", () => {
  it("clamps a camera looking straight along -up, keeping heading and roll", () => {
    const { camera, controller, drag } = setup({ frame: zUp });
    controller.focus([0, 0, 0], 1, -0.3, 10);
    // Placed by other code straight above, looking down -z.
    v3.set(camera.position, 0, 0, 10);
    v3.set(camera.direction, 0, 0, -1);
    controller.syncFromCamera([0, 0, 0]);
    expect(controller.pitch).toBe(-maxPitch);
    expect(controller.heading).toBe(1);
    expect(camera.right[2]).toBeCloseTo(0, 12);
    // The roll is the heading's: a tiny drag doesn't snap it.
    const right = v3.copy(v3.vec3(), camera.right);
    drag(0.001, 0);
    expect(v3.distance(camera.right, right)).toBeLessThan(1e-3);
  });

  it("clamps one looking straight along +up", () => {
    const { camera, controller } = setup({ frame: zUp });
    controller.focus([0, 0, 0], 0.5, 0.3, 10);
    v3.set(camera.position, 0, 0, -10);
    controller.syncFromCamera([0, 0, 0]);
    expect(controller.pitch).toBe(maxPitch);
    expect(controller.heading).toBe(0.5);
  });
});

// An oblique frame: up (1, 2, 2)/3, headingRef (2, 1, -2)/3, east = north × up.
const obliqueUp = [1 / 3, 2 / 3, 2 / 3];
const obliqueNorth = [2 / 3, 1 / 3, -2 / 3];
const oblique = { up: obliqueUp, headingRef: obliqueNorth };
const obliqueEast = [
  ...v3.cross(v3.vec3(), v3.vec3(...obliqueNorth), v3.vec3(...obliqueUp)),
];

describe("InspectController in an oblique frame", () => {
  it("places the camera from the frame's own axes", () => {
    const { camera, controller } = setup({ frame: oblique });
    const t = [7, -3, 2];
    const at = (n: number[], k: number) => t.map((x, i) => x + n[i]! * k);
    controller.focus(t, 0, 0, 9);
    expectVec(camera.position, at(obliqueNorth, -9));
    expectVec(camera.direction, obliqueNorth);
    expectVec(camera.up, obliqueUp);
    controller.focus(t, Math.PI / 2, 0, 9);
    expectVec(camera.position, at(obliqueEast, -9));
    controller.focus(t, 0, -Math.PI / 6, 9);
    // cos 30° behind along north, sin 30° above along up.
    expectVec(
      camera.position,
      t.map(
        (x, i) =>
          x -
          9 * Math.cos(Math.PI / 6) * obliqueNorth[i]! +
          4.5 * obliqueUp[i]!,
      ),
    );
    expect(v3.dot(camera.right, v3.vec3(...obliqueUp))).toBeCloseTo(0, 12);
  });

  it("round-trips through syncFromCamera", () => {
    const { camera, controller } = setup({ frame: oblique });
    controller.focus([7, -3, 2], 2.2, -0.6, 9);
    controller.syncFromCamera();
    expect(controller.heading).toBeCloseTo(2.2, 12);
    expect(controller.pitch).toBeCloseTo(-0.6, 12);
    expect(controller.range).toBeCloseTo(9, 12);
    expectVec(controller.target, [7, -3, 2], 12);
    expect(v3.dot(camera.right, v3.vec3(...obliqueUp))).toBeCloseTo(0, 12);
  });
});

describe("InspectController at the Moon's distance", () => {
  const target = [3.8e8, 2.1e7, -3.3e7];
  const range = 4.2e6;

  it("places the camera range from the target, facing it, unrolled", () => {
    const { camera, controller } = setup({ frame: oblique });
    controller.focus(target, 0.7, -0.35, range);
    const t = v3.vec3(...target);
    expect(v3.distance(camera.position, t) / range - 1).toBeCloseTo(0, 12);
    const toTarget = v3.normalize(
      v3.vec3(),
      v3.sub(v3.vec3(), t, camera.position),
    );
    expect(v3.dot(toTarget, camera.direction)).toBeCloseTo(1, 12);
    expect(v3.dot(camera.right, v3.vec3(...obliqueUp))).toBeCloseTo(0, 12);
    // Pitch from the plane perpendicular to up.
    const offset = v3.sub(v3.vec3(), camera.position, t);
    expect(
      Math.asin(v3.dot(offset, v3.vec3(...obliqueUp)) / range),
    ).toBeCloseTo(0.35, 12);
  });

  it("stays put over many syncFromCamera round trips", () => {
    const { camera, controller } = setup({ frame: oblique });
    controller.focus(target, 0.7, -0.35, range);
    const position = v3.copy(v3.vec3(), camera.position);
    for (let i = 0; i < 200; i++) {
      controller.syncFromCamera();
    }
    // Float64 resolution at 3.8e8 m is ~6e-8 m.
    expect(v3.distance(camera.position, position)).toBeLessThan(1e-5);
    expect(v3.distance(controller.target, v3.vec3(...target))).toBeLessThan(
      1e-5,
    );
    expect(controller.heading).toBeCloseTo(0.7, 11);
    expect(controller.pitch).toBeCloseTo(-0.35, 11);
    expect(controller.range / range - 1).toBeCloseTo(0, 11);
  });
});

describe("planOrbit (Viewer.setControls)", () => {
  const ctx = {
    focusCenter: [6378137, 0, 0],
    cameraPosition: [6378137 + 300, 0, 400],
    globeHeading: 0.25,
  };

  it("starts as setControls always has without options", () => {
    const plan = planOrbit(undefined, {}, ctx);
    expect([...plan.target]).toEqual(ctx.focusCenter);
    expect(plan.heading).toBe(0.25);
    expect(plan.pitch).toBe(-0.4);
    expect(plan.range).toBe(500);
    expect(plan.frame).toBeUndefined();
    expect(plan.minRange).toBe(0.01);
    expect(plan.maxRange).toBe(Infinity);
  });

  it("starts in a frame from where the camera is", () => {
    const plan = planOrbit(
      undefined,
      { frame: zUp, target: [6378137, 0, 0] },
      ctx,
    );
    // Offset (300, 0, 400): 36.87° above the xy plane, along +x = north.
    expect(plan.range).toBeCloseTo(500, 9);
    expect(plan.pitch).toBeCloseTo(-Math.asin(0.8), 12);
    expect(plan.heading).toBeCloseTo(Math.PI, 12);
  });

  it("keeps the orbit's state for fields left out", () => {
    const { controller } = setup({ frame: zUp, minRange: 2, maxRange: 50 });
    controller.focus([1, 2, 3], 0.9, -0.2, 20);
    const current = orbitState(controller);
    for (const options of [{}, { minRange: 5 }]) {
      const plan = planOrbit(current, options, ctx);
      expect([...plan.target]).toEqual([1, 2, 3]);
      expect(plan.heading).toBe(0.9);
      expect(plan.pitch).toBe(-0.2);
      expect(plan.range).toBe(20);
      expectVec(plan.frame!.up, [0, 0, 1], 12);
      expect(plan.maxRange).toBe(50);
    }
    expect(planOrbit(current, {}, ctx).minRange).toBe(2);
    expect(planOrbit(current, { minRange: 5 }, ctx).minRange).toBe(5);
    // Only what's given changes.
    const moved = planOrbit(current, { target: [4, 5, 6], pitch: -1 }, ctx);
    expect([...moved.target]).toEqual([4, 5, 6]);
    expect([moved.heading, moved.pitch, moved.range]).toEqual([0.9, -1, 20]);
  });

  it("keeps an east-north-up orbit's state too", () => {
    const { controller } = setup();
    controller.focus([6378137, 0, 0], 1.1, -0.7, 80);
    const plan = planOrbit(orbitState(controller), { maxRange: 900 }, ctx);
    expect([plan.heading, plan.pitch, plan.range]).toEqual([1.1, -0.7, 80]);
    expect(plan.frame).toBeUndefined();
    expect(plan.maxRange).toBe(900);
  });

  it("re-reads heading, pitch and range from the camera for a new frame", () => {
    const { camera, controller } = setup({ frame: zUp });
    controller.focus([0, 0, 0], 0, 0, 10); // camera at (-10, 0, 0)
    const plan = planOrbit(
      orbitState(controller),
      { frame: { up: [1, 0, 0], headingRef: [0, 1, 0] } },
      { ...ctx, cameraPosition: camera.position },
    );
    expect(plan.range).toBeCloseTo(10, 12);
    expect(plan.pitch).toBeCloseTo(Math.PI / 2 - 1e-3, 12); // below, clamped
    // null clears the frame and re-reads in east-north-up.
    const cleared = planOrbit(
      orbitState(controller),
      { frame: null },
      {
        ...ctx,
        cameraPosition: camera.position,
      },
    );
    expect(cleared.frame).toBeUndefined();
    expect(cleared.range).toBeCloseTo(10, 12);
  });

  it("throws a RangeError on non-finite or bad values", () => {
    const bad: object[] = [
      { target: [0, Number.NaN, 0] },
      { target: [0, 0] },
      { heading: Infinity },
      { pitch: Number.NaN },
      { range: 0 },
      { range: -3 },
      { range: Infinity },
      { minRange: Number.NaN },
      { minRange: 10, maxRange: 5 },
      { frame: { up: [0, 0, 1], headingRef: [0, 0, 1] } },
    ];
    for (const options of bad) {
      expect(
        () => planOrbit(undefined, options, ctx),
        JSON.stringify(options),
      ).toThrow(RangeError);
    }
    expect(() =>
      planOrbit(undefined, {}, { ...ctx, focusCenter: [Number.NaN, 0, 0] }),
    ).toThrow(RangeError);
  });
});

describe("followZoom (zoomTo while orbiting)", () => {
  it("keeps the frame and pivots on what was framed", () => {
    const { camera, controller } = setup({ frame: zUp });
    controller.focus([0, 0, 0], 0, 0, 10);
    const center = v3.vec3(6378137, 1000, 2000);
    followZoom(controller, center, 0.6, -0.5, 300);
    const reference = new Camera().lookAt(center, 0.6, -0.5, 300);
    expectVec(camera.position, [...reference.position], 6);
    expectVec(camera.direction, [...reference.direction], 12);
    expectVec(controller.target, [...center]);
    expect(controller.range).toBeCloseTo(300, 9);
    expectVec(controller.frame!.up, [0, 0, 1], 12);
    expect(camera.right[2]).toBeCloseTo(0, 12);
  });

  it("focuses an east-north-up orbit exactly as before", () => {
    const { camera, controller } = setup();
    const center = v3.vec3(6378137, 1000, 2000);
    followZoom(controller, center, 0.6, -0.5, 300);
    const reference = new Camera().lookAt(center, 0.6, -0.5, 300);
    expect([...camera.position]).toEqual([...reference.position]);
    expect([...camera.up]).toEqual([...reference.up]);
    expect([controller.heading, controller.pitch, controller.range]).toEqual([
      0.6, -0.5, 300,
    ]);
  });
});
