import type { ClipSet, ClipShape } from "@cesium/next";
import {
  warpFrame,
  type Frame,
  type FrameCatalog,
  type WarpFrame,
} from "@cesium/next/frames";
import {
  add,
  cross,
  dot,
  scale,
  sub,
  unit,
  type Site,
  type V3,
} from "./site.ts";

/** What the section plane, the clip box and their toggles are, in local metres (east, north, up at the site). */
export interface SectionState {
  plane: {
    on: boolean;
    /** A point on the plane. */
    center: V3;
    /** Degrees clockwise from north: where the plane's normal leans. */
    heading: number;
    /** Degrees from level: 0 is a level plane (its normal up), 90 a vertical one. */
    tilt: number;
    /** A second plane through the same point, turned a quarter about the plane's normal's lean: a corner. */
    second: boolean;
  };
  box: { on: boolean; center: V3; half: V3 };
  /** How the planes make one region (a set of one plane has nothing to combine). */
  combine: "union" | "intersection";
  planeKeeps: "inside" | "outside";
  boxKeeps: "inside" | "outside";
  /** The plane is named in a design frame that a reprojection bends away from ITRF. */
  curved: boolean;
}

export const initialState = (): SectionState => ({
  plane: {
    on: true,
    center: [0, -60, 7],
    heading: 90,
    tilt: 0,
    second: false,
  },
  box: { on: false, center: [-8, -150, 14], half: [95, 40, 22] },
  combine: "intersection",
  planeKeeps: "inside",
  boxKeeps: "inside",
  curved: false,
});

const RAD = Math.PI / 180;

const tuple = (v: ArrayLike<number>): V3 => [v[0]!, v[1]!, v[2]!];
/** The plane's axes in local metres: its normal `n` (pointing away from what `keep: "inside"` keeps) and two in the plane, `a` level. */
export function planeAxes(heading: number, tilt: number) {
  const h = heading * RAD;
  const t = tilt * RAD;
  const lean: V3 = [Math.sin(h), Math.cos(h), 0];
  const n = unit(add(scale([0, 0, 1], Math.cos(t)), scale(lean, Math.sin(t))));
  const a: V3 = [Math.cos(h), -Math.sin(h), 0];
  const b = cross(n, a);
  return { n, a, b };
}

/** The plane's signed offset from `pivot` along its normal, m. */
export function planeOffset(state: SectionState, pivot: V3): number {
  const { n } = planeAxes(state.plane.heading, state.plane.tilt);
  return dot(sub(state.plane.center, pivot), n);
}

/** The shapes of the section planes, in Earth-fixed metres: ITRF, or the design frame's, the same numbers. */
function planeShapes(site: Site, state: SectionState): ClipShape[] {
  const { n, a } = planeAxes(state.plane.heading, state.plane.tilt);
  const point = tuple(site.world(state.plane.center));
  const plane = (normal: V3): ClipShape => ({
    kind: "plane",
    point,
    normal: tuple(site.worldDirection(normal)),
  });
  return state.plane.second ? [plane(n), plane(a)] : [plane(n)];
}

/** The section planes as a clip set in `frame` (ITRF, or the design frame when curved). */
export function planeClip(
  site: Site,
  state: SectionState,
  frame: ClipSet["frame"],
): ClipSet {
  return {
    frame,
    shapes: planeShapes(site, state),
    combine: state.combine,
    keep: state.planeKeeps,
  };
}

/** The clip box, axes the site's east, north and up, as a clip set in ITRF. */
export function boxClip(
  site: Site,
  state: SectionState,
  frame: ClipSet["frame"],
): ClipSet {
  const { center, half } = state.box;
  const axes = site.axes.map(tuple) as [V3, V3, V3];
  return {
    frame,
    shapes: [
      {
        kind: "box",
        center: tuple(site.world(center)),
        halfExtents: half,
        axes,
      },
    ],
    keep: state.boxKeeps,
  };
}

/** A plane of a clip set's boundary, for the exact point on a cap. */
export interface CutPlane {
  readonly name: string;
  readonly point: V3;
  /** Unit normal. */
  readonly normal: V3;
  /** Two unit directions in the plane, for the point's (u, v). */
  readonly u: V3;
  readonly v: V3;
}

/** The planes the caps of the plane set (`"plane"`) or of the box set (`"box"`) lie on, in local metres. */
export function cutPlanes(
  state: SectionState,
  which: "plane" | "box",
): CutPlane[] {
  if (which === "plane") {
    const { n, a, b } = planeAxes(state.plane.heading, state.plane.tilt);
    const point = state.plane.center;
    const planes: CutPlane[] = [
      { name: "the plane", point, normal: n, u: a, v: b },
    ];
    if (state.plane.second) {
      planes.push({ name: "the second plane", point, normal: a, u: n, v: b });
    }
    return planes;
  }
  const { center, half } = state.box;
  const names = ["east", "west", "north", "south", "top", "bottom"];
  return names.map((side, k) => {
    const axis = k >> 1;
    const normal: V3 = [0, 0, 0];
    normal[axis] = k & 1 ? -1 : 1;
    const point: V3 = [center[0], center[1], center[2]];
    point[axis] = point[axis]! + normal[axis]! * half[axis]!;
    const others = [0, 1, 2].filter((i) => i !== axis);
    const unitAxis = (i: number): V3 => {
      const e: V3 = [0, 0, 0];
      e[i] = 1;
      return e;
    };
    return {
      name: `the box's ${side} face`,
      point,
      normal,
      u: unitAxis(others[0]!),
      v: unitAxis(others[1]!),
    };
  });
}

// ---------------------------------------------------------------- the bend

/** How far the design frame's heights are bent from ITRF's, and how long a wave is, m. */
export const BEND = { amplitude: 6, length: 30 };

/** The design frame's height shift at local (east, north), m. */
export const bendAt = (east: number, north: number): number =>
  BEND.amplitude * Math.sin(east / BEND.length) * Math.sin(north / BEND.length);

/**
 * A design frame under ITRF, a reprojection that waves heights along the
 * site's up axis (`warpFrame`, with its Jacobian written out). A plane named
 * in it is a rigid plane in no frame the content or the view is in, so the
 * engine cuts it along a signed distance fitted per draw (a curved clip).
 */
export function createDesignFrame(
  catalog: FrameCatalog,
  site: Site,
): WarpFrame<"design"> {
  const [east, north, up] = site.axes;
  const frame = warpFrame("design", catalog.get("ITRF") as Frame, {
    presentation: false,
    revision: 1,
    description: "a reprojection that waves heights",
    forward(p, out, jacobian) {
      const d = [
        p[0]! - site.origin[0]!,
        p[1]! - site.origin[1]!,
        p[2]! - site.origin[2]!,
      ];
      const e = dot(d, east) / BEND.length;
      const n = dot(d, north) / BEND.length;
      const shift = bendAt(dot(d, east), dot(d, north));
      for (let i = 0; i < 3; i++) {
        out[i] = p[i]! + shift * up[i]!;
      }
      if (jacobian) {
        const k = BEND.amplitude / BEND.length;
        const gEast = k * Math.cos(e) * Math.sin(n);
        const gNorth = k * Math.sin(e) * Math.cos(n);
        // Column-major: column j is the output's derivative along input j.
        for (let j = 0; j < 3; j++) {
          const g = gEast * east[j]! + gNorth * north[j]!;
          for (let i = 0; i < 3; i++) {
            jacobian[j * 3 + i] = (i === j ? 1 : 0) + up[i]! * g;
          }
        }
      }
      return out;
    },
  });
  catalog.add(frame);
  return frame;
}

/** Where a point named in the design frame is in true space: down the wave, along up. */
export function designToTrue(local: V3): V3 {
  return sub(local, [0, 0, bendAt(local[0], local[1])]);
}
