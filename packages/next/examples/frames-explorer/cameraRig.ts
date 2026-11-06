// The camera's controls (DESIGN.md "Camera controls in space", owner
// 2026-11-06): flights to a view, the globe controls on the Earth's surface
// and an orbit off it, the hand-over when a flight lands or the user takes
// the camera, the interrupt-widened wheel limits, and the orbit carried
// with its subject as the clock runs. cameraViews.ts says where to look.
import type { Frame } from "../../src/frames/Frame.ts";
import type { CameraView, CameraViews } from "./cameraViews.ts";
import type { Framing } from "./globe.ts";
import {
  CameraFlow,
  followRig,
  landedLimits,
  rangeLimits,
  viewHeading,
  type Rig,
  type RigKind,
} from "./orbit.ts";
import type { PageCore } from "./page.ts";
import { PivotMarker } from "./pivot.ts";

export interface CameraRig {
  /** Flies to `v`, in `seconds` or the globe's own time. */
  show(v: CameraView, seconds?: number): void;
  /** The globe controls again, for a view on the Earth's surface. */
  leaveOrbit(): void;
  /** Carries the orbit with its subject (once a frame, never during a flight). */
  follow(): void;
  /** An asset fetch starts: a token for `frameIfStill`. */
  ask(): number;
  /** Frames an asset with `zoom`, in the globe controls, if no flight or view picked since `token` owns the camera. */
  frameIfStill(token: number, zoom: () => void): void;
  dispose(): void;
}

export function createCameraRig(deps: {
  core: Pick<PageCore, "viewer" | "globe" | "disposed">;
  hud: HTMLElement;
  views: Pick<CameraViews, "placed" | "moonCenter">;
}): CameraRig {
  const { viewer, globe, disposed } = deps.core;
  const { hud, views } = deps;

  /**
   * The orbit in effect off the surface, followed as the clock moves its
   * subject: its rig, where it was last placed and the heading it had (kept
   * when the camera is straight above the pivot).
   */
  let orbit:
    | {
        kind: RigKind;
        local: Rig;
        frame: Frame;
        placed: Rig;
        heading: number;
        at: number;
        /** The destination's wheel limits, the range it landed at, and the limits set now (`landedLimits`). */
        limits: { minRange: number; maxRange: number };
        landed: number;
        applied: { minRange: number; maxRange: number };
      }
    | undefined;
  /** Set while the example itself sets the orbit: any other change is the user's. */
  let orbitInternal = false;
  /** Which controls each flight lands in, at its arrival or the user's first input (orbit.ts). */
  const flow = new CameraFlow<NonNullable<CameraView["rig"]>>();
  const setOrbit = (options: Parameters<typeof viewer.setControls>[1]) => {
    orbitInternal = true;
    try {
      viewer.setControls("orbit", options);
    } finally {
      orbitInternal = false;
    }
  };

  /** The globe controls again, for a view on the Earth's surface. */
  function leaveOrbit(): void {
    orbit = undefined;
    orbitInternal = true;
    try {
      viewer.setControls("globe");
    } finally {
      orbitInternal = false;
    }
  }

  /**
   * Flies to `v`. A surface view takes the globe controls at once (so a
   * grab ends the flight there). A view off the surface takes an interim
   * orbit about the camera's own line of sight, which moves nothing, so a
   * drag or wheel ends the flight and lands in the destination's orbit at
   * once (`onOrbitChange`); otherwise it lands there when the flight
   * arrives, the camera read where the flight left it.
   */
  function show(v: CameraView, seconds?: number): void {
    orbit = undefined;
    if (flow.fly(v.rig) === "globe") {
      leaveOrbit();
    } else {
      interimOrbit(v.framing);
    }
    globe.flyTo(v.framing, seconds, () => {
      const rig = flow.arrive();
      if (rig) {
        startOrbit(rig);
      }
    });
  }

  /**
   * The orbit while flying to one: about the point straight ahead at the
   * destination's distance, up the camera's own up, so taking it moves the
   * camera not at all; any limits off.
   */
  function interimOrbit(to: Framing): void {
    const cam = viewer.view.camera;
    const d = Math.max(
      1,
      Math.hypot(...[0, 1, 2].map((i) => to.center[i]! - cam.position[i]!)),
    );
    setOrbit({
      target: [0, 1, 2].map((i) => cam.position[i]! + cam.direction[i]! * d),
      frame: { up: Array.from(cam.up), headingRef: Array.from(cam.direction) },
      heading: 0,
      pitch: 0,
      range: d,
      minRange: 0.01,
      maxRange: Infinity,
    });
  }

  function startOrbit(rig: NonNullable<CameraView["rig"]>): void {
    const at = views.placed(rig.local, rig.frame);
    if (disposed() || !at) {
      return;
    }
    const moon = views.moonCenter();
    // Pitch and range are read from where the flight left the camera; the
    // heading too, from the view, so the hand-over doesn't turn it. A flight
    // interrupted outside the destination's range widens its limits to
    // take it (fix round 2).
    const heading = viewHeading(viewer.view.camera, at);
    const limits = rangeLimits(
      rig.kind,
      moon ? Math.hypot(moon[0]!, moon[1]!, moon[2]!) : 3.844e8,
    );
    const landed = cameraRange(at.target);
    const applied = landedLimits(limits, landed, landed);
    setOrbit({
      target: at.target,
      frame: { up: at.up, headingRef: at.headingRef },
      heading,
      ...applied,
    });
    orbit = {
      ...rig,
      placed: at,
      heading,
      at: viewer.clock.time,
      limits,
      landed,
      applied,
    };
  }

  const cameraRange = (pivot: ArrayLike<number>) =>
    Math.hypot(
      ...[0, 1, 2].map((i) => viewer.view.camera.position[i]! - pivot[i]!),
    );

  /** After the user's change: the widened limits hold until the camera is inside the destination's. */
  function narrowLimits(): void {
    const pivot = viewer.orbitPivot;
    if (!orbit || !pivot) {
      return;
    }
    const next = landedLimits(orbit.limits, orbit.landed, cameraRange(pivot));
    if (
      next.minRange !== orbit.applied.minRange ||
      next.maxRange !== orbit.applied.maxRange
    ) {
      orbit.applied = next;
      setOrbit(next);
    }
  }

  /**
   * The Moon and the site move in the Earth-fixed world as the clock runs
   * (the Moon at about 28 km/s; stop 5's plane turns with GCRF): once a
   * frame at most, never during a flight, the orbit is carried with its
   * subject, during a drag too. Heading, pitch and range are the
   * controller's own (`followRig` reads them back from the camera it
   * placed), so the drag goes on by its own increments, unfought.
   */
  function followOrbit(): void {
    if (
      !orbit ||
      viewer.controls !== "orbit" ||
      globe.flying ||
      viewer.clock.time === orbit.at
    ) {
      return;
    }
    const to = views.placed(orbit.local, orbit.frame);
    const pivot = viewer.orbitPivot;
    if (!to || !pivot) {
      return;
    }
    orbit.at = viewer.clock.time;
    const next = followRig(
      viewer.view.camera.position,
      pivot,
      orbit.placed,
      to,
      orbit.heading,
    );
    if (next) {
      setOrbit(next);
      orbit.placed = to;
      orbit.heading = next.heading;
    }
  }

  // The pivot marker while the orbit is dragged (HUD); a drag or wheel of
  // the orbit ends a flight, as a grab of the globe does.
  const pivotMarker = new PivotMarker(viewer, hud);
  viewer.onOrbitChange = () => {
    pivotMarker.update();
    if (orbitInternal) {
      return;
    }
    // The user's drag or wheel during a flight ends it, in the
    // destination's orbit (if it was flying to one).
    if (globe.flying) {
      globe.stopFlight();
    }
    const rig = flow.interrupt();
    if (rig) {
      startOrbit(rig);
    } else {
      narrowLimits();
    }
  };

  return {
    show,
    leaveOrbit,
    follow: followOrbit,
    ask: () => flow.ask(),
    frameIfStill: (token, zoom) => {
      if (flow.arrival(token, globe.flying)) {
        flow.fly(undefined);
        leaveOrbit();
        zoom();
      }
    },
    dispose: () => {
      viewer.onOrbitChange = undefined;
      pivotMarker.dispose();
      leaveOrbit();
    },
  };
}
