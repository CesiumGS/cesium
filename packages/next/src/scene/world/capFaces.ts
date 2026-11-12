// The section caps' faces for a view (`View.clipCaps`): the planes its clips'
// kept regions are bounded by, as rows after the sets' in the view's clip table
// (`packClipTable`), for the parity pass (surface.slang `capParityOf`) and the
// cap pass (sectionCap.slang). Camera-relative, in the table's own axes, like
// the shapes'.
import { capPlanes, type PlannedClip, type Vec3Like } from "./clips.ts";

/** Faces a view's caps hold at once: four to each of the two parity targets. */
export const CAP_MAX_FACES = 8;
/** Rows of the cap look, before the faces: the colour, then the hatch. */
export const CAP_LOOK_ROWS = 2;
/** Rows of a face: its plane, its origin and its set, its first in-plane axis. */
export const CAP_FACE_ROWS = 3;

/** Linear RGBA. */
export type CapRgba = readonly [number, number, number, number];

/** How a cap's hatching looks: lines in the plane, anchored to the cut. */
export interface CapHatch {
  /** Distance between the lines, m (default 1). */
  readonly spacing?: number;
  /** Their direction in the plane, degrees from its first axis (default 45). */
  readonly angle?: number;
  /** A line's width as a share of the spacing (default 0.12). */
  readonly width?: number;
  /** How much a line darkens the colour, 0 to 1 (default 1). */
  readonly strength?: number;
}

/**
 * The section caps of a view (`View.clipCaps`): the cut of every solid draw
 * (`DrawOptions.solid`) closed by a flat colour, at once, on the GPU, with no
 * geometry to build as a clip moves.
 */
export interface ClipCaps {
  /** Linear RGBA (default a warm grey). */
  readonly color?: CapRgba;
  /** Lines over the colour; none by default. */
  readonly hatch?: CapHatch;
}

export const DEFAULT_CLIP_CAP_COLOR: CapRgba = [0.78, 0.74, 0.68, 1];

/** What `packCapFaces` wrote, and why not more. */
export interface CapFaces {
  /** Rows written, from the first row given. */
  readonly rows: number;
  readonly faces: number;
  /** Why no cap is drawn for some or all of the clips, or undefined. */
  readonly note: string | undefined;
}

const NONE: CapFaces = { rows: 0, faces: 0, note: undefined };

const dot = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;

/**
 * Writes the cap rows for `plans` (as `packClipTable` took them, in the same
 * order: a face names its set by the set's index) at `firstRow` of `out`, and
 * sets the header's third and fourth words (the first face's row, and the
 * number of faces). A set makes faces when it is tested in true space, removes
 * what it doesn't keep, and is of planes or one box (`capPlanes`). A face is
 * written only if the camera is on its outward side: a ray from inside the
 * kept region never enters it through the face. With a curved set in the view
 * there are none: its field is fitted per draw, so no pixel knows it.
 */
export function packCapFaces(
  plans: readonly PlannedClip[],
  camera: ArrayLike<number>,
  caps: ClipCaps,
  out: Float32Array,
  firstRow: number,
  rowLimit: number,
): CapFaces {
  const u32 = new Uint32Array(out.buffer, out.byteOffset, out.length);
  u32[2] = 0;
  u32[3] = 0;
  if (plans.some((p) => p.space === "curved")) {
    return {
      ...NONE,
      note: "a curved clip is in the view: its cut has no cap, and the others' are left off with it",
    };
  }
  const faces: Array<{
    set: number;
    n: [number, number, number];
    w: number;
    origin: [number, number, number];
    u: [number, number, number];
  }> = [];
  const notes: string[] = [];
  plans.forEach((plan, set) => {
    const effect = plan.set.effect;
    if (
      plan.space !== "true" ||
      (typeof effect === "object" && effect.kind !== "discard")
    ) {
      notes.push("a clip drawn in another space, or by an effect, has no cap");
      return;
    }
    const planes = capPlanes(plan.set);
    if ("unsupported" in planes) {
      notes.push(planes.unsupported);
      return;
    }
    const m = plan.matrix;
    const rotate = (v: Vec3Like): [number, number, number] => [
      m[0]! * v[0] + m[4]! * v[1] + m[8]! * v[2],
      m[1]! * v[0] + m[5]! * v[1] + m[9]! * v[2],
      m[2]! * v[0] + m[6]! * v[1] + m[10]! * v[2],
    ];
    const axes = [
      rotate([1, 0, 0]),
      rotate([0, 1, 0]),
      rotate([0, 0, 1]),
    ] as const;
    for (const plane of planes.planes) {
      const r = rotate(plane.point);
      const origin: [number, number, number] = [
        r[0] + m[12]! - camera[0]!,
        r[1] + m[13]! - camera[1]!,
        r[2] + m[14]! - camera[2]!,
      ];
      const normal = rotate(plane.normal);
      const length = Math.hypot(normal[0], normal[1], normal[2]);
      const unit: [number, number, number] = [
        normal[0] / length,
        normal[1] / length,
        normal[2] / length,
      ];
      // The camera, at the origin, is on the outward side: -N · origin > 0.
      const side = -dot(unit, origin);
      if (!(side > 1e-6)) {
        continue;
      }
      // The first in-plane axis: the frame's own axis least along the normal.
      let best = axes[0];
      for (const axis of axes) {
        if (Math.abs(dot(axis, unit)) < Math.abs(dot(best, unit))) {
          best = axis;
        }
      }
      const along = dot(best, unit);
      const u: [number, number, number] = [
        best[0] - unit[0] * along,
        best[1] - unit[1] * along,
        best[2] - unit[2] * along,
      ];
      const ul = Math.hypot(u[0], u[1], u[2]);
      faces.push({
        set,
        // f(p) = (−N) · p + N · origin: negative at the camera, positive past the face.
        n: [-unit[0], -unit[1], -unit[2]],
        w: dot(unit, origin),
        origin,
        u: [u[0] / ul, u[1] / ul, u[2] / ul],
      });
    }
  });
  if (faces.length === 0) {
    return { ...NONE, note: notes[0] };
  }
  const kept = faces.slice(0, CAP_MAX_FACES);
  const rows = CAP_LOOK_ROWS + CAP_FACE_ROWS * kept.length;
  if (firstRow + rows > rowLimit) {
    return { ...NONE, note: "the clip table has no room for the caps' faces" };
  }
  const color = caps.color ?? DEFAULT_CLIP_CAP_COLOR;
  const hatch = caps.hatch;
  out.set(color, firstRow * 4);
  out.set(
    hatch
      ? [
          Math.max(hatch.spacing ?? 1, 1e-3),
          Math.min(Math.max(hatch.width ?? 0.12, 0), 1),
          ((hatch.angle ?? 45) * Math.PI) / 180,
          Math.min(Math.max(hatch.strength ?? 1, 0), 1),
        ]
      : [1, 0, 0, 0],
    (firstRow + 1) * 4,
  );
  kept.forEach((face, k) => {
    const at = firstRow + CAP_LOOK_ROWS + CAP_FACE_ROWS * k;
    out.set([face.n[0], face.n[1], face.n[2], face.w], at * 4);
    out.set([face.origin[0], face.origin[1], face.origin[2], 0], (at + 1) * 4);
    u32[(at + 1) * 4 + 3] = face.set;
    out.set([face.u[0], face.u[1], face.u[2], 0], (at + 2) * 4);
  });
  u32[2] = firstRow + CAP_LOOK_ROWS;
  u32[3] = kept.length;
  return {
    rows,
    faces: kept.length,
    note:
      faces.length > kept.length
        ? `only ${CAP_MAX_FACES} faces get caps; ${faces.length - kept.length} are left off`
        : notes[0],
  };
}
