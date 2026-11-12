import {
  AXES,
  add,
  closestOnLine,
  distanceToSegment,
  insidePolygon,
  mad,
  pixelsPerMetre,
  project,
  rayAt,
  rayPlane,
  snapTo,
  sub,
  type Rig,
  type V3,
} from "./viewMath.ts";

/**
 * The translate and rotate gizmo of the selected leaf (plan §13.33, direct
 * manipulation phase 1), as the math of it: where its handles are for a
 * camera, which one a pixel is over, and what dragging one asks of the leaf.
 * It is drawn on a 2D canvas over the view (`drawGizmo`), so it is never
 * clipped or hidden by the solid, and it is tested the same way (in pixels,
 * by projecting its handles), so what the pointer hits is what it sees, with
 * no pick of the GPU. Its axes are the world's (east, north, up), and it
 * keeps a size of about 110 pixels at any distance.
 *
 * - An arrow drags the leaf along an axis: the point on the axis closest to
 *   the pointer's ray.
 * - A square between two axes drags it in their plane: the pointer's ray
 *   met with the plane.
 * - A ring turns it about its axis: the angle of the ray's point in the
 *   ring's plane, about the leaf's middle.
 */
export type Handle =
  | { kind: "axis"; axis: 0 | 1 | 2 }
  | { kind: "plane"; /** The plane's normal axis. */ axis: 0 | 1 | 2 }
  | { kind: "ring"; axis: 0 | 1 | 2 };

export const handleKey = (h: Handle | undefined): string =>
  h ? `${h.kind}${h.axis}` : "";

export const sameHandle = (a: Handle | undefined, b: Handle | undefined) =>
  handleKey(a) === handleKey(b);

export const AXIS_NAMES = ["x", "y", "z"] as const;
/** The axes' colours: x red, y green, z blue, as CAD tools show them. */
export const AXIS_COLORS = ["#e5484d", "#30a46c", "#3e63dd"] as const;
const HOVER_COLOR = "#ffc53d";

/** The gizmo's length on screen, pixels. */
export const GIZMO_PIXELS = 110;
const ARROW_START = 0.12;
const PLANE_NEAR = 0.22;
const PLANE_FAR = 0.45;
const RING_RADIUS = 0.62;
const RING_STEPS = 72;

/** A gizmo's size in metres at `centre` for a camera, so it spans `GIZMO_PIXELS`. */
export function gizmoSize(rig: Rig, centre: V3): number {
  return GIZMO_PIXELS / pixelsPerMetre(rig, centre);
}

const other = (axis: number): [number, number] => [
  (axis + 1) % 3,
  (axis + 2) % 3,
];

/** The corners of the plane handle whose normal is `axis`, in metres from the middle. */
function planeCorners(axis: number, size: number): V3[] {
  const [a, b] = other(axis);
  const at = (u: number, v: number): V3 => {
    const p: V3 = [0, 0, 0];
    p[a] = u * size;
    p[b] = v * size;
    return p;
  };
  return [
    at(PLANE_NEAR, PLANE_NEAR),
    at(PLANE_FAR, PLANE_NEAR),
    at(PLANE_FAR, PLANE_FAR),
    at(PLANE_NEAR, PLANE_FAR),
  ];
}

function ringPoints(axis: number, size: number): V3[] {
  const [a, b] = other(axis);
  const points: V3[] = [];
  for (let i = 0; i <= RING_STEPS; i++) {
    const t = (i / RING_STEPS) * 2 * Math.PI;
    const p: V3 = [0, 0, 0];
    p[a] = Math.cos(t) * RING_RADIUS * size;
    p[b] = Math.sin(t) * RING_RADIUS * size;
    points.push(p);
  }
  return points;
}

const px = (rig: Rig, p: V3) => project(rig, p);

/** The handle under a pixel, nearest first among arrows, then squares, then rings; undefined over none. */
export function hitGizmo(
  rig: Rig,
  centre: V3,
  x: number,
  y: number,
  size = gizmoSize(rig, centre),
): Handle | undefined {
  const c = px(rig, centre);
  if (!c) {
    return undefined;
  }
  let best: { handle: Handle; distance: number } | undefined;
  const offer = (handle: Handle, distance: number, limit: number) => {
    if (distance <= limit && (!best || distance < best.distance)) {
      best = { handle, distance };
    }
  };
  for (const axis of [0, 1, 2] as const) {
    const from = px(rig, mad(centre, AXES[axis]!, size * ARROW_START));
    const to = px(rig, mad(centre, AXES[axis]!, size));
    if (from && to) {
      // The arrow wins a tie with a ring it crosses.
      offer({ kind: "axis", axis }, distanceToSegment(x, y, from, to) - 2, 8);
    }
    const corners = planeCorners(axis, size)
      .map((o) => px(rig, add(centre, o)))
      .filter((p): p is NonNullable<typeof p> => p !== undefined);
    if (corners.length === 4 && insidePolygon(x, y, corners)) {
      offer({ kind: "plane", axis }, 4, 8);
    }
    const ring = ringPoints(axis, size).map((o) => px(rig, add(centre, o)));
    for (let i = 0; i + 1 < ring.length; i++) {
      const a = ring[i];
      const b = ring[i + 1];
      if (a && b) {
        offer({ kind: "ring", axis }, distanceToSegment(x, y, a, b), 6);
      }
    }
  }
  return (best as { handle: Handle } | undefined)?.handle;
}

// ---------------------------------------------------------------- drawing

export interface DrawState {
  hover: Handle | undefined;
  /** The handle being dragged: only it is drawn, brightly. */
  active: Handle | undefined;
}

function arrowHead(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: string,
) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const L = 14;
  const W = 5.5;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(to.x + Math.cos(angle) * 4, to.y + Math.sin(angle) * 4);
  ctx.lineTo(
    to.x - Math.cos(angle) * (L - 4) + Math.sin(angle) * W,
    to.y - Math.sin(angle) * (L - 4) - Math.cos(angle) * W,
  );
  ctx.lineTo(
    to.x - Math.cos(angle) * (L - 4) - Math.sin(angle) * W,
    to.y - Math.sin(angle) * (L - 4) + Math.cos(angle) * W,
  );
  ctx.closePath();
  ctx.fill();
}

/** Draws the gizmo over the view. */
export function drawGizmo(
  ctx: CanvasRenderingContext2D,
  rig: Rig,
  centre: V3,
  state: DrawState,
  size = gizmoSize(rig, centre),
): void {
  const c = px(rig, centre);
  if (!c) {
    return;
  }
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const visible = (handle: Handle) =>
    !state.active || sameHandle(handle, state.active);
  const colour = (handle: Handle) =>
    sameHandle(handle, state.hover) || sameHandle(handle, state.active)
      ? HOVER_COLOR
      : AXIS_COLORS[handle.axis];
  const width = (handle: Handle) =>
    sameHandle(handle, state.hover) || sameHandle(handle, state.active)
      ? 4.5
      : 3;

  for (const axis of [0, 1, 2] as const) {
    const ring: Handle = { kind: "ring", axis };
    if (visible(ring)) {
      const pts = ringPoints(axis, size).map((o) => px(rig, add(centre, o)));
      ctx.strokeStyle = colour(ring);
      ctx.lineWidth = width(ring);
      ctx.globalAlpha =
        sameHandle(ring, state.hover) || state.active ? 1 : 0.75;
      ctx.beginPath();
      let pen = false;
      for (const p of pts) {
        if (!p) {
          pen = false;
          continue;
        }
        if (pen) {
          ctx.lineTo(p.x, p.y);
        } else {
          ctx.moveTo(p.x, p.y);
          pen = true;
        }
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  for (const axis of [0, 1, 2] as const) {
    const plane: Handle = { kind: "plane", axis };
    if (visible(plane)) {
      const corners = planeCorners(axis, size).map((o) =>
        px(rig, add(centre, o)),
      );
      if (corners.every((p) => p)) {
        ctx.fillStyle = colour(plane);
        ctx.strokeStyle = colour(plane);
        ctx.globalAlpha =
          sameHandle(plane, state.hover) || state.active ? 0.6 : 0.32;
        ctx.beginPath();
        corners.forEach((p, i) =>
          i === 0 ? ctx.moveTo(p!.x, p!.y) : ctx.lineTo(p!.x, p!.y),
        );
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }
  for (const axis of [0, 1, 2] as const) {
    const arrow: Handle = { kind: "axis", axis };
    if (!visible(arrow)) {
      continue;
    }
    const from = px(rig, mad(centre, AXES[axis]!, size * ARROW_START));
    const to = px(rig, mad(centre, AXES[axis]!, size));
    if (!from || !to) {
      continue;
    }
    ctx.strokeStyle = colour(arrow);
    ctx.lineWidth = width(arrow);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    arrowHead(ctx, from, to, colour(arrow));
  }
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ drags

export interface DragStart {
  handle: Handle;
  /** The leaf's middle when the drag began. */
  centre: V3;
  /** Where on the handle the pointer took hold: along the axis (m), the point in the plane, or the angle (radians). */
  grab: number | V3;
}

export interface DragOptions {
  /** Grid step the leaf's middle snaps to (m); 0 for free. */
  grid: number;
  /** Step of a turn (degrees); 0 for free. */
  angleStep: number;
}

export type DragResult =
  | { kind: "move"; centre: V3; delta: V3 }
  | { kind: "turn"; axis: 0 | 1 | 2; angle: number };

const angleIn = (centre: V3, axis: number, p: V3): number => {
  const [a, b] = other(axis);
  const d = sub(p, centre);
  return Math.atan2(d[b]!, d[a]!);
};

/** Takes hold of a handle at a pixel; undefined when the pointer's ray can't reach it (edge-on). */
export function beginDrag(
  rig: Rig,
  handle: Handle,
  centre: V3,
  x: number,
  y: number,
): DragStart | undefined {
  const ray = rayAt(rig, x, y);
  if (handle.kind === "axis") {
    const t = closestOnLine(centre, AXES[handle.axis]!, ray);
    return t === undefined ? undefined : { handle, centre, grab: t };
  }
  const p = rayPlane(ray, centre, AXES[handle.axis]!);
  if (!p) {
    return undefined;
  }
  return {
    handle,
    centre,
    grab: handle.kind === "plane" ? p : angleIn(centre, handle.axis, p),
  };
}

/** What the pointer at a pixel asks of a gripped handle; undefined where its ray can't reach the handle's line or plane. */
export function solveDrag(
  rig: Rig,
  start: DragStart,
  x: number,
  y: number,
  options: DragOptions,
): DragResult | undefined {
  const ray = rayAt(rig, x, y);
  const { handle, centre } = start;
  if (handle.kind === "axis") {
    const t = closestOnLine(centre, AXES[handle.axis]!, ray);
    if (t === undefined) {
      return undefined;
    }
    const moved = centre.slice() as V3;
    moved[handle.axis] = snapTo(
      centre[handle.axis]! + t - (start.grab as number),
      options.grid,
    );
    return { kind: "move", centre: moved, delta: sub(moved, centre) };
  }
  const p = rayPlane(ray, centre, AXES[handle.axis]!);
  if (!p) {
    return undefined;
  }
  if (handle.kind === "plane") {
    const delta = sub(p, start.grab as V3);
    const moved = add(centre, delta);
    for (const axis of other(handle.axis)) {
      moved[axis] = snapTo(moved[axis]!, options.grid);
    }
    moved[handle.axis] = centre[handle.axis]!;
    return { kind: "move", centre: moved, delta: sub(moved, centre) };
  }
  let angle = angleIn(centre, handle.axis, p) - (start.grab as number);
  angle = Math.atan2(Math.sin(angle), Math.cos(angle));
  if (options.angleStep > 0) {
    angle = snapTo(angle, (options.angleStep * Math.PI) / 180);
  }
  return { kind: "turn", axis: handle.axis, angle };
}

/** The unit axis of a handle's drag (for a readout's direction). */
export const handleAxis = (h: Handle): V3 => AXES[h.axis]!;
