// Stop 4's lines (DESIGN.md "The rigid line at true scale", owner's rework):
// a 400 km line at true scale, the rigid one straight and dashed (white),
// the exact one solid on the ellipsoid, a gap tick every 50 km, a leader at
// the far end with the true sag, and the 20 km mark for the inset. This
// turns the worker's geometry into the globe's layers and labels.
import { WGS84 } from "./page.ts";
import type { GapInsetSpec } from "./gapInset.ts";
import { SECONDARY, hexRgba, type LabelSpec } from "./globe.ts";
import { gapParts } from "./inset.ts";
import { overlayMesh, type OverlayChunk, type Rgba } from "./overlays.ts";
import type { OverlayPart } from "./panel/model.ts";
import type { OverlayGeometry } from "./protocol.ts";
import { rigidCopy } from "./rigidLine.ts";

/**
 * The rigid and exact lines as drawn: their ends, for the stop's camera,
 * and both placements at the 20 km mark, for the inset.
 */
export interface RigidBuilt {
  start: Float64Array;
  end: Float64Array;
  mark?: { exact: number[]; rigid: number[]; along: number[] };
  inset: Pick<GapInsetSpec, "caption" | "leader" | "parts" | "description">;
}

/** The first chunk's first vertex (or the last one's last), Earth-fixed: where to hang a label. */
export const pointOf = (
  chunks: readonly OverlayChunk[],
  last = false,
): Float64Array | undefined => {
  const c = last ? chunks.at(-1) : chunks[0];
  if (!c) {
    return undefined;
  }
  const p = c.mesh.positions;
  const i = last ? p.length - 3 : 0;
  return Float64Array.from([
    c.origin[0]! + p[i]!,
    c.origin[1]! + p[i + 1]!,
    c.origin[2]! + p[i + 2]!,
  ]);
};

/** The rigid and exact lines' layers, labels and legend lines from the worker's geometry. */
export function rigidLayers(
  g: OverlayGeometry,
  engineeringColor: Rgba,
): {
  built: RigidBuilt | undefined;
  layers: {
    chunks: readonly OverlayChunk[];
    color?: Rgba;
    strength?: number;
  }[];
  accuracy: string;
  detail: string;
  parts: readonly OverlayPart[];
  labels: LabelSpec[];
} {
  const layer = (name: string) =>
    g.layers.find((l) => l.name === name)?.chunks ?? [];
  const exact = layer("exact");
  const sag = g.sagAtEnd ?? NaN;
  const mark = g.marks?.[0];
  const start = pointOf(exact);
  const a = pointOf(exact, true);
  const rigidLine = layer("rigid");
  const r0 = pointOf(rigidLine);
  const b = pointOf(rigidLine, true);
  const along = r0 && b ? [0, 1, 2].map((i) => b[i]! - r0[i]!) : undefined;
  // The gap at the mark in its two parts, as the inset sees it: the
  // drop and the grid scale's part along the line (why its leader
  // leans).
  const parts =
    mark && along ? gapParts(mark.exact, mark.rigid, along) : undefined;
  const copy = rigidCopy({
    sagEnd: sag,
    gapAtMark: mark?.separation ?? NaN,
    ...(parts && { markDrop: parts.drop, markAlong: parts.along }),
  });
  const built =
    start && a
      ? {
          start,
          end: a,
          ...(mark &&
            along && {
              mark: { exact: mark.exact, rigid: mark.rigid, along },
            }),
          inset: copy.inset,
        }
      : undefined;
  const white = (pairs: number[]) =>
    overlayMesh({
      positions: Float64Array.from(pairs),
      colors: new Uint8Array((pairs.length / 3) * 4).fill(255),
    });
  // 1 px white leaders: at the far end (the true sag) and at the
  // 20 km mark (the gap the inset shows).
  const leaders = white([
    ...(a && b ? [...a, ...b] : []),
    ...(mark ? [...mark.exact, ...mark.rigid] : []),
  ]);
  const mid = a && b ? a.map((v, i) => (v + b[i]!) / 2) : undefined;
  // The labels: the rigid line's near its start, above it (its
  // chord is the line itself); the exact line's at 60%, under it,
  // the chord's point dropped to the ellipsoid (on the line to
  // metres); the sag above the far-end leader.
  const along3 = (
    p: ArrayLike<number> | undefined,
    q: ArrayLike<number> | undefined,
    t: number,
  ) =>
    p && q
      ? Float64Array.from([0, 1, 2].map((i) => p[i]! + (q[i]! - p[i]!) * t))
      : undefined;
  const rigidAt = along3(r0, b, 0.08);
  const chord = along3(start, a, 0.6);
  const onGround =
    chord &&
    WGS84.cartesianToCartographic(chord, {
      longitude: 0,
      latitude: 0,
      height: 0,
    });
  const exactAt =
    onGround &&
    WGS84.cartographicToCartesian(
      { ...onGround, height: 0 },
      new Float64Array(3),
    );
  return {
    built,
    layers: [
      { chunks: exact, color: engineeringColor },
      { chunks: rigidLine, color: hexRgba("#ffffff") },
      {
        chunks: layer("ticks"),
        color: hexRgba("#ffffff"),
        strength: SECONDARY,
      },
      { chunks: leaders },
    ],
    accuracy: copy.accuracy,
    detail: copy.detail,
    parts: copy.parts,
    labels: [
      ...(rigidAt
        ? [
            {
              id: "label:rigid",
              text: copy.labels.rigid,
              at: rigidAt,
              priority: 2,
              dy: -28,
            },
          ]
        : []),
      ...(exactAt
        ? [
            {
              id: "label:exact",
              text: copy.labels.exact,
              at: exactAt,
              family: "engineering" as const,
              priority: 2,
            },
          ]
        : []),
      ...(mid
        ? [
            {
              // Above and left of the far-end leader (the view's
              // right edge is close), a row above the rigid line's
              // label, so the two fit side by side on a narrow view.
              id: "label:sag",
              text: copy.labels.end,
              at: Float64Array.from(mid),
              priority: 3,
              side: "left" as const,
              dy: -44,
            },
          ]
        : []),
    ],
  };
}
