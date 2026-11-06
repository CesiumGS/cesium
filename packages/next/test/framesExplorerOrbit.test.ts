// The frames explorer's camera controls in space (examples/frames-explorer/
// orbit.ts): which views orbit and which keep the globe controls, each
// orbit's focus, up, heading reference and range limits, how an orbit
// follows a subject the clock moves, and what "Frame content" frames.
import { describe, expect, it } from "vitest";
import {
  AXES_RIG,
  EARTH_RADIUS,
  MOON_RADIUS,
  SITE_RIG,
  earthMoonRig,
  followRig,
  frameRig,
  frameTarget,
  isFrameKey,
  lunarSiteRange,
  pivotPlacement,
  placeRig,
  rangeLimits,
  rigFraming,
  viewHeading,
  CameraFlow,
  landedLimits,
  moonOrbitNormal,
  type Rig,
} from "../examples/frames-explorer/orbit.ts";
import {
  InspectController,
  orbitBasis,
  orbitPose,
  type OrbitFrame,
} from "../src/scene/InspectController.ts";
import type { View } from "../src/scene/View.ts";
import { orbitState, planOrbit } from "../widgets/orbitFocus.ts";
import { SCENES } from "../examples/frames-explorer/scenarios/scenes.ts";
import { Camera } from "../src/scene/Camera.ts";

const sub = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  [0, 1, 2].map((i) => a[i]! - b[i]!);
const dot = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
const norm = (a: ArrayLike<number>) => Math.sqrt(dot(a, a));
const close = (a: ArrayLike<number>, b: ArrayLike<number>, tol: number) =>
  expect(norm(sub(a, b))).toBeLessThan(tol);

/** A 4×4 column-major rigid transform: a turn of `angle` about z, then `t`. */
function turnZ(angle: number, t: number[]): Float64Array {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return Float64Array.from([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, ...t, 1]);
}

describe("which views orbit (the owner: stuck out in space)", () => {
  it("names each scenario's rig: off the Earth's surface each orbits its subject (the tour's stops 2, 5 and 6)", () => {
    const rigs = Object.fromEntries(
      Object.values(SCENES).map((s) => [s.id, s.rig]),
    );
    expect(rigs).toEqual({
      "one-path": "earthMoon",
      "earth-turns": "geocentric",
      "stand-on-moon": "lunarSite",
    });
  });

  it("orbits a selected Moon or Orion frame, on its own origin", () => {
    for (const id of ["MOON_ICRF", "MOON_ME", "MOON_PA"]) {
      expect(frameRig(id)).toBe("moon");
    }
    expect(frameRig("Lunar site")).toBe("lunarSite");
    expect(frameRig("orion-1", "orion-1")).toBe("earthMoon");
  });

  it("keeps the globe controls for Earth-surface frames and the opening view", () => {
    // ICRF and HCRS show the opening shot: their origins (the barycentre,
    // the Sun) aren't on the scene.
    // The Earth's own frames show the opening shot too, with the ground a
    // zoom away.
    for (const id of [
      "Sacramento ENU",
      "engineering:California zone 3",
      "ICRF",
      "HCRS",
      "ITRF",
      "GCRF",
      "EME2000",
      "EARTH_ICRF",
    ]) {
      expect(frameRig(id)).toBeUndefined();
    }
  });
});

describe("each orbit's focus and axes", () => {
  it("orbits a body's origin with its z up and its x at heading 0", () => {
    expect(AXES_RIG).toEqual({
      target: [0, 0, 0],
      up: [0, 0, 1],
      headingRef: [1, 0, 0],
    });
  });

  it("orbits a site's origin with its up up and its north at heading 0", () => {
    expect(SITE_RIG).toEqual({
      target: [0, 0, 0],
      up: [0, 0, 1],
      headingRef: [0, 1, 0],
    });
  });

  it("places a rig with its frame's transform: the origin moved, the axes turned", () => {
    const m = turnZ(Math.PI / 2, [3.8e8, 1e7, -2e7]);
    const placed = placeRig(SITE_RIG, m);
    close(placed.target, [3.8e8, 1e7, -2e7], 1e-6);
    close(placed.up, [0, 0, 1], 1e-12);
    // y turned a quarter about z is -x.
    close(placed.headingRef, [-1, 0, 0], 1e-12);
  });

  it("puts stop 5's orbit up the Moon's orbit normal, heading 0 toward the Moon", () => {
    const moon = [3.8e8, 0, 0];
    const normal = [0, 0, 2];
    const center = [1.9e8, 1e6, 0];
    const rig = earthMoonRig(center, moon, normal);
    expect(rig.target).toEqual(center);
    close(rig.up, [0, 0, 1], 1e-12);
    close(rig.headingRef, [1, 0, 0], 1e-12);
    // Heading 0 looks toward the Moon: the camera sits Earthward of the
    // focus and looks along +x.
    const cam = new Camera();
    const b = orbitBasis(rig);
    cam.lookAtInFrame(Float64Array.from(center), 0, 0, 1e8, b.north, b.up);
    close(cam.direction, [1, 0, 0], 1e-12);
  });
});

describe("range limits: zoom can't throw you into deep space or through a body", () => {
  const d = 3.84e8;

  it("lets stop 2's geocentric orbit zoom close to the ground, never inside it, and stay within the Moon's distance", () => {
    const r = rangeLimits("geocentric", d);
    expect(r.minRange).toBeGreaterThan(1.01 * EARTH_RADIUS);
    expect(r.minRange).toBeLessThanOrEqual(1.03 * EARTH_RADIUS);
    expect(r.maxRange).toBeLessThanOrEqual(d);
    expect(r.maxRange).toBeGreaterThan(20 * EARTH_RADIUS);
  });

  it("keeps the Earth–Moon orbit framing both bodies, and short of the Earth", () => {
    const r = rangeLimits("earthMoon", d);
    // The focus is between the two, about d/2 from each.
    expect(r.minRange).toBeLessThan(0.5 * d - 2 * EARTH_RADIUS);
    expect(r.minRange).toBeGreaterThan(0.1 * d);
    expect(r.maxRange).toBeGreaterThan(2 * d);
    expect(r.maxRange).toBeLessThanOrEqual(5 * d);
  });

  it("keeps the Moon orbit outside the Moon and nearer it than the Earth", () => {
    const r = rangeLimits("moon", d);
    expect(r.minRange).toBeGreaterThan(1.2 * MOON_RADIUS);
    expect(r.maxRange).toBeLessThan(0.5 * d);
  });

  it("lets the lunar site come close, and not much farther than the Moon's size", () => {
    const r = rangeLimits("lunarSite", d);
    expect(r.minRange).toBeGreaterThanOrEqual(1_000);
    expect(r.minRange).toBeLessThanOrEqual(20_000);
    expect(r.maxRange).toBeGreaterThan(10 * MOON_RADIUS);
    expect(r.maxRange).toBeLessThan(0.1 * d);
  });
});

describe("following the clock", () => {
  // A subject that moved: turned a quarter about z and carried 1e6 m.
  const from: Rig = {
    target: [3.8e8, 0, 0],
    up: [0, 0, 1],
    headingRef: [1, 0, 0],
  };
  const m = turnZ(Math.PI / 2, [0, 1e6, 0]);
  const to = placeRig(from, m);
  const move = (p: number[]) =>
    [0, 1, 2].map(
      (i) => m[i]! * p[0]! + m[4 + i]! * p[1]! + m[8 + i]! * p[2]! + m[12 + i]!,
    );

  it("keeps the camera's heading, pitch and range about the subject", () => {
    const cam = new Camera();
    const b = orbitBasis(from);
    cam.lookAtInFrame(
      Float64Array.from(from.target),
      0.7,
      -0.3,
      5e6,
      b.north,
      b.up,
    );
    const f = followRig(cam.position, from.target, from, to, 0.7)!;
    expect(f.heading).toBeCloseTo(0.7, 12);
    expect(f.pitch).toBeCloseTo(-0.3, 12);
    expect(f.range).toBeCloseTo(5e6, 3);
    close(f.target, to.target, 1e-6);
    expect(f.frame).toEqual({ up: to.up, headingRef: to.headingRef });
    // The camera ends where the rigid motion carries it.
    const after = new Camera();
    const nb = orbitBasis(f.frame);
    after.lookAtInFrame(
      Float64Array.from(f.target),
      f.heading,
      f.pitch,
      f.range,
      nb.north,
      nb.up,
    );
    close(after.position, move(Array.from(cam.position)), 1e-3);
  });

  it("carries a panned pivot with the subject", () => {
    const cam = new Camera();
    const pivot = [3.8e8 + 2e5, 3e5, 0];
    const b = orbitBasis(from);
    cam.lookAtInFrame(Float64Array.from(pivot), 0, -0.5, 1e6, b.north, b.up);
    const f = followRig(cam.position, pivot, from, to, 0)!;
    close(f.target, move(pivot), 1e-3);
    expect(f.range).toBeCloseTo(1e6, 3);
  });

  it("keeps the heading it had when the camera is straight above the pivot", () => {
    const cam = { position: [3.8e8, 0, 7e6] };
    const f = followRig(cam.position, from.target, from, from, 1.25)!;
    expect(f.heading).toBe(1.25);
    expect(f.pitch).toBeCloseTo(-(Math.PI / 2 - 1e-3), 12);
  });

  it("gives up on a camera at the pivot", () => {
    expect(followRig(from.target, from.target, from, to, 0)).toBeUndefined();
  });
});

describe("framing in a rig", () => {
  const rig: Rig = {
    target: [1e7, 2e7, -3e7],
    up: [0, 0.6, 0.8],
    headingRef: [1, 0, 0],
  };

  it("looks at the focus from heading, pitch and range in the rig, as the orbit reads them back", () => {
    const f = rigFraming(rig, 0.4, -0.6, 2.5e6);
    expect(f.center).toEqual(rig.target);
    expect(f.range).toBe(2.5e6);
    const camera = sub(
      f.center,
      f.from!.direction.map((v) => -v * f.range),
    );
    const pose = orbitPose(camera, rig.target, orbitBasis(rig), 0)!;
    expect(pose.heading).toBeCloseTo(0.4, 9);
    expect(pose.pitch).toBeCloseTo(-0.6, 9);
    expect(pose.range).toBeCloseTo(2.5e6, 3);
    close(f.from!.up, [0, 0.6, 0.8], 1e-12);
  });
});

describe("handing a flight over to its orbit", () => {
  const rig: Rig = { target: [0, 0, 0], up: [0, 0, 1], headingRef: [1, 0, 0] };

  it("keeps the screen's up when the camera looks straight down the rig's up (stop 5's view)", () => {
    // Straight down, the screen's up along y, the rig's west (east is
    // north × up = -y): heading -π/2, so the orbit doesn't turn the view a
    // quarter at the hand-over.
    const camera = {
      position: [0, 0, 1e8],
      direction: [0, 0, -1],
      up: [0, 1, 0],
    };
    expect(viewHeading(camera, rig)).toBeCloseTo(-Math.PI / 2, 12);
    const cam = new Camera();
    const b = orbitBasis(rig);
    cam.lookAtInFrame(
      Float64Array.from(rig.target),
      viewHeading(camera, rig),
      -(Math.PI / 2 - 1e-3),
      1e8,
      b.north,
      b.up,
    );
    expect(dot(cam.up, [0, 1, 0])).toBeGreaterThan(1 - 1e-6);
  });

  it("is the orbit's own heading for a camera off the vertical", () => {
    const cam = new Camera();
    const b = orbitBasis(rig);
    cam.lookAtInFrame(
      Float64Array.from(rig.target),
      -2.1,
      -0.4,
      5e6,
      b.north,
      b.up,
    );
    expect(viewHeading(cam, rig)).toBeCloseTo(-2.1, 9);
  });
});

describe("stop 6 from straight above the site", () => {
  const fov = Math.PI / 3;

  it("frames the whole lunar disk with its limb inside the view, on a wide and a narrow view", () => {
    for (const aspect of [728 / 680, 1440 / 900, 388 / 700]) {
      const range = lunarSiteRange(fov, aspect);
      const radius = Math.asin(MOON_RADIUS / (MOON_RADIUS + range));
      const half = Math.min(
        aspect >= 1 ? fov / 2 : Math.atan(Math.tan(fov / 2) * aspect),
        aspect >= 1 ? Math.atan(Math.tan(fov / 2) / aspect) : fov / 2,
      );
      expect(radius).toBeLessThan(0.85 * half);
      expect(radius).toBeGreaterThan(0.6 * half);
    }
  });

  it("is a backdrop distance: thousands of kilometres, not the 100 m that put the triad 400 km off", () => {
    expect(lunarSiteRange(fov, 1)).toBeGreaterThan(1.5e6);
  });
});

describe("Frame content", () => {
  const none = { kind: "none" } as const;

  it("re-flies the scenario's view when nothing is selected", () => {
    expect(frameTarget("one-path", none)).toEqual({
      kind: "scenario",
      id: "one-path",
    });
  });

  it("frames the selected frame or result first, what the user picked last", () => {
    expect(frameTarget("one-path", { kind: "frame", id: "MOON_ME" })).toEqual({
      kind: "frame",
      id: "MOON_ME",
    });
    expect(frameTarget(undefined, { kind: "frame", id: "MOON_ME" })).toEqual({
      kind: "frame",
      id: "MOON_ME",
    });
    expect(frameTarget(undefined, { kind: "result", id: "r.1" })).toEqual({
      kind: "result",
      id: "r.1",
    });
  });

  it("frames a tree diagram's node, and an edge's child node, as that frame", () => {
    for (const kind of ["node", "edge"] as const) {
      expect(frameTarget(undefined, { kind, id: "MOON_ME" })).toEqual({
        kind: "frame",
        id: "MOON_ME",
      });
    }
  });

  it("else the opening view", () => {
    expect(frameTarget(undefined, none)).toEqual({ kind: "opening" });
  });

  it("answers the F key, without modifiers, outside text fields", () => {
    const outside = { closest: () => null };
    const field = { closest: () => ({}) };
    const key = (k: string, extra: object = {}) => ({
      key: k,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      target: outside,
      ...extra,
    });
    expect(isFrameKey(key("f"))).toBe(true);
    expect(isFrameKey(key("F"))).toBe(true);
    expect(isFrameKey(key("g"))).toBe(false);
    expect(isFrameKey(key("f", { metaKey: true }))).toBe(false);
    expect(isFrameKey(key("f", { ctrlKey: true }))).toBe(false);
    expect(isFrameKey(key("f", { altKey: true }))).toBe(false);
    expect(isFrameKey(key("f", { target: field }))).toBe(false);
    expect(isFrameKey(key("f", { target: null }))).toBe(true);
  });
});

describe("the pivot marker", () => {
  const camera = {
    position: Float64Array.from([0, 0, 0]),
    direction: Float64Array.from([1, 0, 0]),
    up: Float64Array.from([0, 0, 1]),
    right: Float64Array.from([0, -1, 0]),
    fov: Math.PI / 3,
  };

  it("sits at the pivot's place in the view, in CSS px", () => {
    expect(pivotPlacement([10, 0, 0], camera, 800, 600)).toEqual({
      x: 400,
      y: 300,
    });
    const p = pivotPlacement([10, -1, 1], camera, 800, 600)!;
    expect(p.x).toBeGreaterThan(400);
    expect(p.y).toBeLessThan(300);
  });

  it("hides behind the camera and outside the view", () => {
    expect(pivotPlacement([-10, 0, 0], camera, 800, 600)).toBeUndefined();
    expect(pivotPlacement([1, 50, 0], camera, 800, 600)).toBeUndefined();
  });
});

describe("flights and the controls they land in (fix round 1)", () => {
  const rig = { name: "moon" };
  const site = { name: "site" };

  it("flies to a surface view on the globe controls, and lands in nothing more", () => {
    const flow = new CameraFlow<typeof rig>();
    expect(flow.fly(undefined)).toBe("globe");
    // A grab of the globe ends it: the globe controls are already the
    // destination's.
    expect(flow.interrupt()).toBeUndefined();
    expect(flow.arrive()).toBeUndefined();
  });

  it("flies to an orbit view on an interim orbit (no jump), and lands in the destination's orbit when it arrives", () => {
    const flow = new CameraFlow<typeof rig>();
    expect(flow.fly(rig)).toBe("interim");
    expect(flow.arrive()).toBe(rig);
    // Landed once: a later input is the user's orbit, not a hand-over.
    expect(flow.interrupt()).toBeUndefined();
  });

  it("lands in the destination's orbit the moment the user interrupts, from the surface or from another orbit", () => {
    for (const from of [undefined, site]) {
      const flow = new CameraFlow<typeof rig>();
      if (from) {
        flow.fly(from);
        flow.arrive();
      }
      flow.fly(rig);
      expect(flow.interrupt()).toBe(rig);
      // The ended flight doesn't land again.
      expect(flow.arrive()).toBeUndefined();
      expect(flow.interrupt()).toBeUndefined();
    }
  });

  it("lands in the latest flight's controls when a flight replaces another", () => {
    const flow = new CameraFlow<typeof rig>();
    flow.fly(site);
    flow.fly(rig);
    expect(flow.interrupt()).toBe(rig);
    flow.fly(site);
    expect(flow.fly(undefined)).toBe("globe");
    expect(flow.interrupt()).toBeUndefined();
  });

  it("lets a fetched asset frame itself only if nothing moved the camera since it was asked for", () => {
    const flow = new CameraFlow<typeof rig>();
    const asked = flow.ask();
    expect(flow.arrival(asked, false)).toBe(true);
    // A flight under way, or one since (even if arrived), keeps the camera.
    expect(flow.arrival(asked, true)).toBe(false);
    const again = flow.ask();
    flow.fly(rig);
    flow.arrive();
    expect(flow.arrival(again, false)).toBe(false);
  });
});

describe("following the subject during a drag (fix round 1)", () => {
  // An orbit controller as the Viewer drives it: setControls' options
  // resolved by planOrbit, then the frame, limits and focus applied.
  const SIZE = 100;
  function setup() {
    const camera = new Camera();
    const view = {
      camera,
      target: { width: SIZE, height: SIZE },
      contains: () => true,
      pixelRect: () => ({ x: 0, y: 0, width: SIZE, height: SIZE }),
    } as unknown as View;
    const element = new EventTarget() as EventTarget & {
      getBoundingClientRect(): object;
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
    );
    const fire = (type: string, x = 0, y = 0) =>
      element.dispatchEvent(
        Object.assign(new Event(type), {
          clientX: x,
          clientY: y,
          button: 0,
          shiftKey: false,
        }),
      );
    const set = (options: {
      target: ArrayLike<number>;
      frame: OrbitFrame;
      heading?: number;
      pitch?: number;
      range?: number;
    }) => {
      const plan = planOrbit(orbitState(controller), options, {
        focusCenter: options.target,
        cameraPosition: camera.position,
        globeHeading: 0,
      });
      controller.frame = plan.frame;
      controller.focus(plan.target, plan.heading, plan.pitch, plan.range);
    };
    return { camera, controller, fire, set };
  }

  it("carries the pivot with the subject mid-drag, keeps the pose, and lets the drag go on from it", () => {
    const { camera, controller, fire, set } = setup();
    const from: Rig = {
      target: [3.8e8, 0, 0],
      up: [0, 0, 1],
      headingRef: [1, 0, 0],
    };
    set({
      target: from.target,
      frame: from,
      heading: 0.3,
      pitch: -0.4,
      range: 5e6,
    });
    fire("pointerdown", 50, 50);
    fire("pointermove", 60, 50);
    expect(controller.dragging).toBe(true);
    const turned = controller.heading;
    expect(turned).toBeCloseTo(0.3 + Math.PI / 10, 12);
    // The subject moves 28 km and turns a little, mid-drag.
    const to = placeRig(from, turnZ(1e-4, [0, 28_000, 0]));
    const next = followRig(
      camera.position,
      controller.target,
      from,
      to,
      turned,
    )!;
    set(next);
    close(controller.target, to.target, 1e-3);
    expect(controller.heading).toBeCloseTo(turned, 9);
    expect(controller.pitch).toBeCloseTo(-0.4, 9);
    expect(controller.range).toBeCloseTo(5e6, 3);
    expect(controller.dragging).toBe(true);
    // The drag goes on by its own increments, from where it was.
    fire("pointermove", 70, 50);
    expect(controller.heading).toBeCloseTo(turned + Math.PI / 10, 9);
    fire("pointerup");
  });
});

describe("stop 5's orbit normal", () => {
  it("is the prograde normal: r before × r after, normalized", () => {
    // A circular orbit counter-clockwise about +z: the normal is +z.
    const at = (ms: number) => {
      const a = (ms / 3.6e6) * 0.01;
      return [3.8e8 * Math.cos(a), 3.8e8 * Math.sin(a), 0];
    };
    close(moonOrbitNormal(at), [0, 0, 1], 1e-12);
    // Clockwise: -z.
    close(
      moonOrbitNormal((ms) => at(-ms)),
      [0, 0, -1],
      1e-12,
    );
  });
});

describe("landing far outside the destination's range (fix rounds 2 and 3)", () => {
  // Flying to stop 6, interrupted by the wheel about 140,000 km out: the
  // site's orbit zooms 5 km to 25,000 km.
  const site = rangeLimits("lunarSite", 3.844e8);
  const landed = 1.4e8;

  it("widens the limits to take the landing range, and holds them until the camera is inside the destination's", () => {
    expect(landedLimits(site, landed, landed)).toEqual({
      minRange: site.minRange,
      maxRange: landed,
    });
    // Still outside after zooming in: the same widened limits, not the
    // range now (no ratchet).
    expect(landedLimits(site, landed, 9e7)).toEqual({
      minRange: site.minRange,
      maxRange: landed,
    });
    // Inside: the destination's own.
    expect(landedLimits(site, landed, 1e6)).toEqual(site);
    // Landing under the minimum widens the minimum the same way.
    expect(landedLimits(site, 2_000, 2_500)).toEqual({
      minRange: 2_000,
      maxRange: site.maxRange,
    });
    expect(landedLimits(site, 2_000, 6_000)).toEqual(site);
  });

  it("drives the orbit's wheel one notch at a time, and back out to where it landed", () => {
    // The real controller and wheel events, its limits set after each
    // change as cameraRig.ts's narrowLimits sets them.
    const camera = new Camera();
    const view = {
      camera,
      target: { width: 100, height: 100 },
      contains: () => true,
      pixelRect: () => ({ x: 0, y: 0, width: 100, height: 100 }),
    } as unknown as View;
    const element = new EventTarget() as EventTarget & {
      getBoundingClientRect(): object;
    };
    element.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
    });
    const c = new InspectController(view, element as unknown as HTMLElement, {
      frame: { up: [0, 0, 1], headingRef: [1, 0, 0] },
    });
    c.focus([3.8e8, 0, 0], 0, -0.5, landed);
    const apply = () => {
      const l = landedLimits(site, landed, c.range);
      c.minRange = l.minRange;
      c.maxRange = l.maxRange;
    };
    apply();
    const wheel = (deltaY: number) => {
      element.dispatchEvent(
        Object.assign(new Event("wheel", { cancelable: true }), {
          clientX: 50,
          clientY: 50,
          deltaY,
        }),
      );
      apply();
    };
    wheel(-100);
    // One notch, not the 5.6× cut to 25,000 km.
    expect(landed / c.range).toBeCloseTo(1.15, 9);
    wheel(-100);
    wheel(-100);
    expect(landed / c.range).toBeCloseTo(1.15 ** 3, 9);
    wheel(100);
    wheel(100);
    wheel(100);
    expect(c.range).toBeCloseTo(landed, 0);
    // No farther out than the landing.
    wheel(100);
    expect(c.range).toBe(landed);
    // Zoomed into the destination's limits, they hold from then on.
    for (let i = 0; i < 40; i++) {
      wheel(-100);
    }
    expect([c.minRange, c.maxRange]).toEqual([site.minRange, site.maxRange]);
    for (let i = 0; i < 100; i++) {
      wheel(100);
    }
    expect(c.range).toBe(site.maxRange);
  });
});
