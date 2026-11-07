// The design globe's exact snapping (plan 4b Task 17): the server side of
// the client/server split (src/engineering/snap.ts, as CesiumJS 1.x's
// `SnapService`). The page runs it through `refiningSnap(request, client,
// exact, onUpdate)`: the client's mesh snap shows at once, and this one,
// snapped to the corridor's design data rather than its drawn mesh,
// replaces it.
//
// It snaps in design space, from the placement's design coordinates of the
// client's hit (`testPoint`), within the aperture converted to design units
// by the pixel footprint there. In order:
//   1. a station tick's point (every 100 ft, at offsets ±35, on the tick's
//      raised face): `point`;
//   2. the nearest of the centreline and the section's edge lines, at the
//      hit's station: `segment` on a tangent, `arc` on an arc or a spiral,
//      with `curve` as 21 points over ±100 ft of station;
//   3. otherwise nothing, so the client's snap stands.
// Distances are in plan (E, N): a tick or line is near when its plan
// position is within the aperture of the hit's, at whatever height the hit
// is (on a barrier's top or a deck).
//
// The centreline is the profile grade line, offset 0 at the profile's
// elevation: the alignment's own 3D curve, as the generator's answers have
// it (under the median barrier, whose top is 2.67 ft above it). The edge
// lines are the section's breaklines on its surface: the strips' edges and
// the outer barriers' outer faces.
//
// Before the alignment's start or after its end there is no station, and
// it gives nothing (Review Focus 4): nothing is extrapolated.
import type {
  Alignment,
  StationOffset,
} from "../../src/engineering/alignment.ts";
import {
  designPoint,
  type SnapKind,
} from "../../src/engineering/EngineeringFrame.ts";
import type {
  ServiceSnapRequest,
  SnapResult,
  SnapService,
} from "../../src/engineering/snap.ts";
import { projectToPixel } from "../../src/scene/Camera.ts";
import type { Tileset3D } from "../../src/streaming/Tileset3D.ts";
import { CROSS_SECTION, TICKS, sectionSurface } from "./corridor.ts";

/** Station either side of a line snap that its `curve` covers, design units. */
const CURVE_REACH = 100;
/** Points in a line snap's `curve`. */
const CURVE_POINTS = 21;

/** The centreline (0) and the section's edge offsets, in order. */
function lineOffsets(): readonly number[] {
  const offsets = new Set<number>([0]);
  for (const strip of CROSS_SECTION.strips) {
    offsets.add(strip.from).add(strip.to);
  }
  for (const barrier of CROSS_SECTION.barriers) {
    // The outer barriers' outer faces close the section; the median
    // barrier's faces stand on the shoulders' inner edges (±1).
    if (barrier.offset !== 0) {
      offsets.add(
        barrier.offset + Math.sign(barrier.offset) * (barrier.baseWidth / 2),
      );
    }
  }
  return [...offsets].sort((a, b) => a - b);
}

/** A snap's design point and what it stands for. */
interface Found {
  readonly kind: SnapKind;
  readonly design: Float64Array;
  /** For a line: its offset, for `curve`. */
  readonly offset?: number;
  readonly station: number;
}

export class ExactSnapService implements SnapService {
  /** The offsets of the lines it snaps to: the centreline and the section's edges. */
  static readonly lineOffsets: readonly number[] = lineOffsets();

  constructor(
    readonly tileset: Tileset3D,
    readonly alignment: Alignment,
  ) {}

  async snap(
    request: ServiceSnapRequest,
    signal?: AbortSignal,
  ): Promise<SnapResult | undefined> {
    signal?.throwIfAborted();
    const placement = this.tileset.placement;
    if (request.tileset !== this.tileset || placement === undefined) {
      return undefined;
    }
    const { camera, testPoint, aperture } = request;
    const hit = placement.designOf(testPoint);
    let at: StationOffset;
    try {
      at = this.alignment.stationOffset(hit);
    } catch {
      // Outside the alignment (or its profile): no station.
      return undefined;
    }
    // One CSS pixel's footprint at the hit, metres, then the aperture in
    // design units (the placement draws a design unit about metersPerUnit
    // long, within the grid's scale factor).
    const range = Math.hypot(
      testPoint[0]! - camera.position[0]!,
      testPoint[1]! - camera.position[1]!,
      testPoint[2]! - camera.position[2]!,
    );
    const footprint = (range * 2 * Math.tan(camera.fovy / 2)) / camera.height;
    const reach = (aperture * footprint) / placement.frame.units.metersPerUnit;
    const found =
      this.tick(hit, at.station, reach) ??
      this.line(at.station, at.offset, reach);
    if (found === undefined) {
      return undefined;
    }

    const snapPoint = placement.displayed(found.design);
    const result: SnapResult = {
      snapPoint,
      hitPoint: Float64Array.from(testPoint),
      distance: pixelsBetween(request, testPoint, snapPoint),
      kind: found.kind,
      ...(found.offset !== undefined && {
        curve: this.curve(found.station, found.offset).map((d) =>
          placement.displayed(d),
        ),
      }),
      design: designPoint(placement.frame, found.design, {
        how: "snap",
        tolerance: 0,
        kind: found.kind,
      }),
      tolerance: 0,
      exact: true,
      tileset: this.tileset,
      source: "server",
      provisional: false,
      ...(request.feature !== undefined && { feature: request.feature }),
      camera,
    };
    return result;
  }

  /** The station tick nearest the hit in plan, if within `reach`. */
  private tick(
    hit: Float64Array,
    station: number,
    reach: number,
  ): Found | undefined {
    const a = this.alignment;
    const nearest = Math.round(station / TICKS.interval) * TICKS.interval;
    let best: (Found & { distance: number }) | undefined;
    for (const s of [
      nearest - TICKS.interval,
      nearest,
      nearest + TICKS.interval,
    ]) {
      if (s < a.startStation || s > a.endStation) {
        continue;
      }
      for (const offset of TICKS.offsets) {
        const design = a.pointAt(s, offset);
        const distance = Math.hypot(design[0]! - hit[0]!, design[1]! - hit[1]!);
        if (
          distance <= reach &&
          (best === undefined || distance < best.distance)
        ) {
          design[2] = design[2]! + sectionSurface(offset) + TICKS.raise;
          best = { kind: "point", design, station: s, distance };
        }
      }
    }
    return best;
  }

  /** The nearest line at the hit's station, if within `reach` of its offset. */
  private line(
    station: number,
    offset: number,
    reach: number,
  ): Found | undefined {
    let nearest: number | undefined;
    for (const o of ExactSnapService.lineOffsets) {
      if (
        Math.abs(o - offset) <= reach &&
        (nearest === undefined ||
          Math.abs(o - offset) < Math.abs(nearest - offset))
      ) {
        nearest = o;
      }
    }
    if (nearest === undefined) {
      return undefined;
    }
    return {
      kind: this.kindAt(station),
      design: this.onLine(station, nearest),
      offset: nearest,
      station,
    };
  }

  /** A design point on the line at `offset`: on the surface, or the profile at 0. */
  private onLine(station: number, offset: number): Float64Array {
    const design = this.alignment.pointAt(station, offset);
    design[2] = design[2]! + sectionSurface(offset);
    return design;
  }

  /** `segment` on a tangent, `arc` on an arc or a spiral. */
  private kindAt(station: number): SnapKind {
    const elements = this.alignment.horizontalElements;
    let element = elements[0]!;
    for (const e of elements) {
      if (e.station <= station) {
        element = e;
      }
    }
    return element.kind === "line" ? "segment" : "arc";
  }

  /** 21 design points over ±100 ft of station along a line, within the alignment. */
  private curve(station: number, offset: number): Float64Array[] {
    const a = this.alignment;
    const span = Math.min(2 * CURVE_REACH, a.endStation - a.startStation);
    const from = Math.min(
      Math.max(station - CURVE_REACH, a.startStation),
      a.endStation - span,
    );
    return Array.from({ length: CURVE_POINTS }, (_, i) =>
      this.onLine(
        i === CURVE_POINTS - 1
          ? from + span
          : from + (span * i) / (CURVE_POINTS - 1),
        offset,
      ),
    );
  }
}

/** CSS pixels between two body-fixed points as the request's camera shows them. */
function pixelsBetween(
  request: ServiceSnapRequest,
  p: ArrayLike<number>,
  q: ArrayLike<number>,
): number {
  const { camera, canvasWidth, canvasHeight } = request;
  const a = new Float64Array(2);
  const b = new Float64Array(2);
  const da = projectToPixel(
    camera,
    camera.fovy,
    canvasWidth,
    canvasHeight,
    p,
    a,
  );
  const db = projectToPixel(
    camera,
    camera.fovy,
    canvasWidth,
    canvasHeight,
    q,
    b,
  );
  return da > 0 && db > 0 ? Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!) : NaN;
}
