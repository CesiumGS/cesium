// The camera's views (DESIGN.md "Flights", "Camera controls in space"):
// where each scenario, frame and stop frames the globe, and for a view off
// the Earth's surface the orbit its flight hands over to (orbit.ts), its rig
// in a frame's own coordinates, placed Earth-fixed at the clock's instant.
// cameraRig.ts flies to them.
import { frameTransform, type Frame } from "../../src/frames/Frame.ts";
import { fromDegrees } from "../../src/math/ellipsoid.ts";
import { Instant } from "../../src/time/Instant.ts";
import type { Framing } from "./globe.ts";
import { RIGID_FRAMING, type EngineeringSetup } from "./overlayConfig.ts";
import {
  AXES_RIG,
  SITE_RIG,
  earthMoonRig,
  frameRig,
  lunarSiteRange,
  moonOrbitNormal,
  placeRig,
  rigFraming,
  type Rig,
  type RigKind,
} from "./orbit.ts";
import { compose, planeFraming } from "./orion.ts";
import type { OrionBuilt } from "./orionLayer.ts";
import {
  DRAW_IN,
  EARTH_MEAN_RADIUS,
  FLYBY,
  IDENTITY,
  WGS84,
  deg,
  type PageCore,
} from "./page.ts";
import type { RigidBuilt } from "./rigidOverlay.ts";
import {
  DSN_STATIONS,
  LUNAR_SITE,
  SITE_GRIDS,
  type SceneSpec,
} from "./scenarios/scenes.ts";
import type { KnobState } from "./scenarios/spec.ts";
import { offsetPlace } from "./scenarios/sites.ts";

/** A surface view at `lon`, `lat` (degrees), `range` (m), `heading` (degrees) and `pitch` (radians). */
export const framingAt = (
  lon: number,
  lat: number,
  range: number,
  heading = 0,
  pitch = -Math.PI / 2 + 1e-3,
): Framing => ({
  center: WGS84.cartographicToCartesian(
    fromDegrees(lon, lat, 0),
    new Float64Array(3),
  ),
  range,
  heading: heading * deg,
  pitch,
});

/** The opening shot (DESIGN.md): the Pacific face, two Earth radii out. */
export const OPENING = framingAt(-135, 25, 2 * EARTH_MEAN_RADIUS);

/** The stops and sites a view can name. */
export type CameraName =
  | "opening"
  | "northPole"
  | "designGrid"
  | "rigidVsExact"
  | "earthMoon"
  | "lunarSite"
  | "moon"
  | "site"
  | "portland";

/**
 * A framing and, for a view off the Earth's surface, the orbit it hands
 * over to when the flight ends (orbit.ts): its rig in `frame`'s own
 * coordinates, placed Earth-fixed at the clock's instant.
 */
export interface CameraView {
  framing: Framing;
  rig?: { kind: RigKind; local: Rig; frame: Frame };
}

/** A view on the Earth's surface: the globe controls. */
export const surface = (f: Framing | undefined): CameraView | undefined =>
  f && { framing: f };

export interface CameraViews {
  /** The Moon's centre in ITRF at the clock's instant. */
  moonCenter(): Float64Array | undefined;
  framing(camera: CameraName): Framing | undefined;
  /** A rig placed Earth-fixed at the clock's instant. */
  placed(local: Rig, frame: Frame): Rig | undefined;
  moonView(): CameraView | undefined;
  lunarSiteView(): CameraView | undefined;
  earthMoonView(): CameraView | undefined;
  frameView(id: string): CameraView | undefined;
  sceneView(sc: SceneSpec, knobs: KnobState): CameraView | undefined;
  /** The lunar site's origin in ITRF now, if the scene has the site. */
  lunarSiteOrigin(): Float64Array | undefined;
  dispose(): void;
}

export function createCameraViews(deps: {
  core: Pick<PageCore, "viewer" | "frames" | "instantNow">;
  /** The scene's own frames (the lunar site). */
  local(): readonly Frame[];
  /** Orion's drawn path, for stop 5's framing. */
  orionBuilt(): OrionBuilt | undefined;
  /** Orion's node in the tree, if the worker named it. */
  orionNodeId(): string | undefined;
  /** Stop 4's lines as drawn. */
  rigidBuilt(): RigidBuilt | undefined;
  /** The engineering overlays' setup (a scenario's, or the default). */
  engineering(): EngineeringSetup;
  /** The azimuth the scene's line of sight leaves its site at now, degrees (skyRay.ts). */
  skyAzimuth?(instant: Instant): number | undefined;
}): CameraViews {
  const { viewer, frames: framesNow, instantNow } = deps.core;

  /** The Moon's centre in ITRF at the clock's instant. */
  function moonCenter(): Float64Array | undefined {
    const frames = framesNow();
    const instant = instantNow();
    if (!frames || !instant) {
      return undefined;
    }
    const m = frameTransform(frames.moonIcrf, frames.itrf, instant);
    return Float64Array.from([m[12]!, m[13]!, m[14]!]);
  }

  function framing(camera: CameraName): Framing | undefined {
    switch (camera) {
      case "opening":
        return OPENING;
      case "northPole":
        // Stop 2 (S-I10): straight down the pole, so both triads' x and y
        // stay clear of the disc as GCRF's turn against ITRF's, and their
        // z axes point at the camera.
        return framingAt(
          0,
          90,
          5.5 * EARTH_MEAN_RADIUS,
          0,
          -Math.PI / 2 + 1e-3,
        );
      case "designGrid": {
        const [lon, lat, range] = deps.engineering().look;
        return framingAt(lon, lat, range, 0, -35 * deg);
      }
      case "rigidVsExact": {
        // Stop 4 (owner's rework): from the side, to the right of the 400
        // km line looking across it (south of an eastward line, looking
        // north), a little down, the whole line across the left of the view
        // (the legend and the inset take the bottom right), so the straight
        // tangent visibly leaves the curving ground.
        const built = deps.rigidBuilt();
        const geo = (p: ArrayLike<number>) =>
          WGS84.cartesianToCartographic(Float64Array.from(p), {
            longitude: 0,
            latitude: 0,
            height: 0,
          });
        const a = built && geo(built.start);
        const b = built && geo(built.end);
        // Until it is drawn: from the setup's start and azimuth.
        const start = deps.engineering().rigid.start;
        const end =
          a && b
            ? undefined
            : offsetPlace(
                start.longitude,
                start.latitude,
                400_000 * Math.sin(start.azimuth * deg),
                400_000 * Math.cos(start.azimuth * deg),
              );
        const lon0 = a ? a.longitude / deg : start.longitude;
        const lat0 = a ? a.latitude / deg : start.latitude;
        const lon1 = b ? b.longitude / deg : end!.longitude;
        const lat1 = b ? b.latitude / deg : end!.latitude;
        // Looking square to the line: its azimuth less 90°.
        const mid = ((lat0 + lat1) / 2) * deg;
        const azimuth =
          Math.atan2((lon1 - lon0) * Math.cos(mid), lat1 - lat0) / deg;
        // The range fits the line across the view's width: on a portrait
        // (narrow) view the camera's field of view is the height's, so it
        // steps back by the aspect.
        const { clientWidth: w, clientHeight: h } = viewer.container;
        const aspect = w > 0 && h > 0 ? w / h : 1;
        return framingAt(
          lon0 + (lon1 - lon0) * RIGID_FRAMING.along,
          lat0 + (lat1 - lat0) * RIGID_FRAMING.along - RIGID_FRAMING.south,
          RIGID_FRAMING.range / Math.min(1, aspect),
          azimuth - 90,
          RIGID_FRAMING.pitch * deg,
        );
      }
      case "site":
        return framingAt(-122.43, 37.76, 8000, 0, -45 * deg);
      case "portland":
        return framingAt(-122.75, 45.5, 90_000, 0, -50 * deg);
      case "earthMoon":
        return earthMoonView()?.framing;
      case "moon":
        return moonView()?.framing;
      case "lunarSite":
        return lunarSiteView()?.framing;
    }
  }

  const placed = (local: Rig, frame: Frame): Rig | undefined => {
    const frames = framesNow();
    const instant = instantNow();
    return frames && instant
      ? placeRig(local, frameTransform(frame, frames.itrf, instant))
      : undefined;
  };

  /** Stop 2, the polar view: the Earth's centre, up its axis. */
  function geocentricView(f: Framing): CameraView {
    const frames = framesNow();
    return {
      framing: f,
      ...(frames && {
        rig: { kind: "geocentric", local: AXES_RIG, frame: frames.itrf },
      }),
    };
  }

  /** The Moon's frames: its centre at 20,000 km, from the Earth's side, a little above its equator. */
  function moonView(): CameraView | undefined {
    const frames = framesNow();
    const rig = frames && placed(AXES_RIG, frames.moonMe);
    return (
      frames &&
      rig && {
        framing: rigFraming(rig, Math.PI, -20 * deg, 2e7),
        rig: { kind: "moon", local: AXES_RIG, frame: frames.moonMe },
      }
    );
  }

  /**
   * Stop 6 and the site: straight down its vertical from a few thousand
   * kilometres, the whole lunar disk in view. The disk is the sky's
   * backdrop, right only along that vertical (lunar-pole-investigation.md),
   * so the triad sits on the imagery's pole region from here alone.
   */
  function lunarSiteView(): CameraView | undefined {
    const site = deps.local().find((f) => f.name === LUNAR_SITE);
    const rig = site && placed(SITE_RIG, site);
    if (!site || !rig) {
      return undefined;
    }
    const { clientWidth: w, clientHeight: h } = viewer.container;
    const range = lunarSiteRange(
      viewer.view.camera.fov,
      w > 0 && h > 0 ? w / h : 1,
    );
    return {
      framing: rigFraming(rig, 0, -Math.PI / 2 + 1e-3, range),
      rig: { kind: "lunarSite", local: SITE_RIG, frame: site },
    };
  }

  /**
   * Down on the orbit plane (tour stop 5): along the normal of the Moon's
   * orbit at the flyby, where Orion's free return lies, with the Earth–Moon
   * line across the screen, framing the Earth, the Moon and Orion's path as
   * drawn. Its orbit turns about the framing's centre, between the Earth and
   * the Moon, up that normal and heading 0 toward the Moon at the flyby:
   * fixed in GCRF (DE440 through the frames), as Orion's path is.
   */
  function earthMoonView(): CameraView | undefined {
    const frames = framesNow();
    const moon = moonCenter();
    const instant = instantNow();
    if (!moon || !frames || !instant) {
      return undefined;
    }
    const leap = frames.data.leapSeconds;
    // In GCRF the Moon's motion is its orbit's; then turned to ITRF.
    const at = (ms: number) =>
      frameTransform(
        frames!.moonIcrf,
        frames!.gcrf,
        Instant.fromUtc(FLYBY + ms, leap),
      );
    // Up the prograde normal of the Moon's orbit at the flyby, in GCRF.
    const g = moonOrbitNormal((ms) => {
      const t = at(ms);
      return [t[12]!, t[13]!, t[14]!];
    });
    const m = frameTransform(frames.gcrf, frames.itrf, instant);
    const toItrf = (v: ArrayLike<number>) =>
      [0, 1, 2].map(
        (i) => m[i]! * v[0]! + m[4 + i]! * v[1]! + m[8 + i]! * v[2]!,
      );
    const normal = toItrf(g);
    // The Earth and the Moon with room around them, and Orion's path.
    const points: number[][] = [];
    for (const [c, radius] of [
      [[0, 0, 0], 2.5e7],
      [Array.from(moon), 2.5e7],
    ] as const) {
      for (const d of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          const p = [...c];
          p[k] = p[k]! + d * radius;
          points.push(p);
        }
      }
    }
    const orionBuilt = deps.orionBuilt();
    if (orionBuilt) {
      const place =
        orionBuilt.frame === "ITRF"
          ? IDENTITY
          : compose(
              frameTransform(
                frames[DRAW_IN[orionBuilt.frame]],
                frames.itrf,
                instant,
              ),
              orionBuilt.inverse,
            );
      for (const c of orionBuilt.chunks) {
        const o = c.origin;
        points.push(
          [0, 1, 2].map(
            (i) =>
              place[i]! * o[0]! +
              place[4 + i]! * o[1]! +
              place[8 + i]! * o[2]! +
              place[12 + i]!,
          ),
        );
      }
    }
    const canvas = viewer.canvas;
    const f = planeFraming(points, normal, moon, {
      fov: viewer.view.camera.fov,
      aspect: canvas.clientWidth / Math.max(1, canvas.clientHeight),
    });
    // The focus back in GCRF (the transform is a rotation: GCRF and ITRF
    // share the Earth's centre), with the Moon at the flyby.
    const center = [0, 1, 2].map(
      (i) =>
        m[4 * i]! * f.center[0]! +
        m[4 * i + 1]! * f.center[1]! +
        m[4 * i + 2]! * f.center[2]!,
    );
    const flyby = at(0);
    return {
      framing: {
        center: f.center,
        range: f.range,
        heading: 0,
        pitch: -Math.PI / 2,
        from: f.from,
      },
      rig: {
        kind: "earthMoon",
        local: earthMoonRig(center, [flyby[12]!, flyby[13]!, flyby[14]!], g),
        frame: frames.gcrf,
      },
    };
  }

  /** What "Show on globe" and Frame content frame for a frame: Earth frames the opening shot, the Moon's at 20,000 km, sites close. */
  function frameView(id: string): CameraView | undefined {
    switch (frameRig(id, deps.orionNodeId())) {
      case "moon":
        return moonView();
      case "lunarSite":
        return lunarSiteView();
      case "earthMoon":
        return earthMoonView();
    }
    if (id === "Sacramento ENU") {
      return { framing: framingAt(-121.4944, 38.5816, 8000, 0, -45 * deg) };
    }
    const station = Object.values(DSN_STATIONS).find((s) => s.name === id);
    if (station) {
      return {
        framing: framingAt(
          station.longitude,
          station.latitude,
          8000,
          0,
          -45 * deg,
        ),
      };
    }
    if (id.startsWith("engineering:")) {
      const f = framing("designGrid");
      return f && { framing: f };
    }
    if ((SITE_GRIDS as readonly string[]).includes(id)) {
      // A site grid: its setup's look, closer (the corridor's road, the
      // BIM site's origin).
      const [lon, lat, range] = deps.engineering().look;
      return {
        framing: framingAt(lon, lat, Math.min(range, 20_000), 0, -50 * deg),
      };
    }
    return { framing: OPENING };
  }

  /** A scenario's view: its framing and the orbit it names (scenes.ts). */
  function sceneView(sc: SceneSpec, knobs: KnobState): CameraView | undefined {
    switch (sc.cameraFor?.(knobs) ?? sc.camera) {
      case "site": {
        // On the ground at the scene's site (the dish, Sacramento), behind
        // it and facing the way its line of sight leaves at the clock's
        // instant (fix 2): the ray rises away from the camera, up the view.
        const l = sc.look?.(knobs);
        const instant = instantNow();
        const heading =
          (instant && deps.skyAzimuth?.(instant)) ?? l?.heading ?? 0;
        return (
          l &&
          surface(
            framingAt(l.longitude, l.latitude, l.range, heading, l.pitch * deg),
          )
        );
      }
      case "earthMoon":
        return earthMoonView();
      case "lunarSite":
        return lunarSiteView();
      case "northPole": {
        const f = framing("northPole");
        return f && geocentricView(f);
      }
      case "rigidLine":
        return surface(framing("rigidVsExact"));
      case "engineering": {
        const [lon, lat, range] = deps.engineering().look;
        return surface(framingAt(lon, lat, range, 0, -55 * deg));
      }
    }
  }

  function lunarSiteOrigin(): Float64Array | undefined {
    const frames = framesNow();
    const instant = instantNow();
    const site = deps.local().find((f) => f.name === LUNAR_SITE);
    if (!frames || !instant || !site) {
      return undefined;
    }
    const m = frameTransform(site, frames.itrf, instant);
    return Float64Array.from([m[12]!, m[13]!, m[14]!]);
  }

  return {
    moonCenter,
    framing,
    placed,
    moonView,
    lunarSiteView,
    earthMoonView,
    frameView,
    sceneView,
    lunarSiteOrigin,
    dispose: () => {},
  };
}
