// The design globe's exact snapping (plan 4b Task 17): the server side of
// the client/server split (src/engineering/snap.ts, as CesiumJS 1.x's
// `SnapService`). The page runs it through `refiningSnap(request, client,
// exact, onUpdate)`: the client's mesh snap shows at once, and this one,
// snapped to the corridor's design data rather than its drawn mesh,
// replaces it.
//
// It snaps in design space, from the placement's design coordinates of the
// client's hit (`testPoint`): its station and offset. In order:
//   1. a station tick's point (every 100 ft, at offsets ±35, on the tick's
//      raised face), at the hit's station or 100 ft either side: `point`;
//   2. the nearest of the centreline and the section's edge lines, at the
//      hit's station: `segment` on a tangent, `arc` on an arc or a spiral,
//      with `curve` as 21 points over ±100 ft of station;
//   3. otherwise nothing, so the client's snap stands.
// A candidate is near when the point it is shown at (below) is within the
// aperture of the cursor on the screen, as the request's camera projects
// it: the aperture is judged where the snap is drawn, at that point's own
// height and depth, not in plan at the hit's.
//
// The centreline is the profile grade line, offset 0 at the profile's
// elevation: the alignment's own 3D curve, as the generator's answers have
// it, under the median barrier, whose top is 2.67 ft above it. The snap's
// `snapPoint` and `design` are that exact point; its `shownPoint` is the
// barrier's top over it, the visible surface the marker is drawn on and
// `refiningSnap` judges (src/engineering/snap.ts). The edge lines are the
// section's breaklines on its surface (the strips' edges and the outer
// barriers' outer faces), which are visible as they are.
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
import {
  engineeringPlacement,
  type TilesetPlacement,
} from "../../src/engineering/placement.ts";
import type { CoordinateOperation } from "../../src/frames/coordinates.ts";
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

/**
 * The height above the profile of the section's visible top at an offset:
 * a barrier's top or face where one stands, else the surface
 * (`sectionSurface`). Throws a RangeError beyond ±41, as `sectionSurface`.
 */
export function visibleRise(offset: number): number {
  let rise = sectionSurface(offset);
  for (const b of CROSS_SECTION.barriers) {
    const across = Math.abs(offset - b.offset);
    const half = b.baseWidth / 2;
    if (across > half) {
      continue;
    }
    const slope = half - b.topWidth / 2;
    const up =
      across <= b.topWidth / 2 ? 1 : slope > 0 ? (half - across) / slope : 0;
    rise = Math.max(rise, sectionSurface(b.offset) + b.height * up);
  }
  return rise;
}

/** A snap's design point and what it stands for. */
interface Found {
  readonly kind: SnapKind;
  readonly design: Float64Array;
  /** Where it is drawn (body-fixed), and the visible point when that differs. */
  readonly snapPoint: Float64Array;
  readonly shownPoint?: Float64Array;
  /** CSS pixels from the cursor to where it is shown. */
  readonly pixels: number;
  /** For a line: its offset, for `curve`. */
  readonly offset?: number;
  readonly station: number;
}

/** What a candidate is judged with: the request, the placement and the cursor's pixel. */
interface Judge {
  readonly request: ServiceSnapRequest;
  readonly placement: TilesetPlacement<CoordinateOperation>;
  readonly cursor: Float64Array;
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
    const placement = engineeringPlacement(this.tileset.placement);
    if (request.tileset !== this.tileset || placement === undefined) {
      return undefined;
    }
    const { camera, testPoint } = request;
    const hit = placement.designOf(testPoint);
    let at: StationOffset;
    try {
      at = this.alignment.stationOffset(hit);
    } catch {
      // Outside the alignment (or its profile): no station.
      return undefined;
    }
    const cursor = new Float64Array(2);
    const depth = projectToPixel(
      camera,
      camera.fovy,
      request.canvasWidth,
      request.canvasHeight,
      testPoint,
      cursor,
    );
    if (!(depth > 0 && depth >= camera.near)) {
      return undefined;
    }
    const judge = { request, placement, cursor };
    const found =
      this.tick(at.station, judge) ?? this.line(at.station, at.offset, judge);
    if (found === undefined) {
      return undefined;
    }

    const result: SnapResult = {
      snapPoint: found.snapPoint,
      ...(found.shownPoint !== undefined && { shownPoint: found.shownPoint }),
      hitPoint: Float64Array.from(testPoint),
      distance: found.pixels,
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

  /**
   * A candidate's drawn and shown points, and how far from the cursor it is
   * shown; undefined when it is shown behind the camera, nearer than its near
   * plane or beyond the aperture.
   */
  private candidate(
    judge: Judge,
    design: Float64Array,
    shownDesign: Float64Array | undefined,
  ): Pick<Found, "snapPoint" | "shownPoint" | "pixels"> | undefined {
    const { request, placement, cursor } = judge;
    const { camera } = request;
    const snapPoint = placement.displayed(design);
    const shownPoint =
      shownDesign === undefined ? undefined : placement.displayed(shownDesign);
    const at = new Float64Array(2);
    const depth = projectToPixel(
      camera,
      camera.fovy,
      request.canvasWidth,
      request.canvasHeight,
      shownPoint ?? snapPoint,
      at,
    );
    if (!(depth > 0 && depth >= camera.near)) {
      return undefined;
    }
    const pixels = Math.hypot(at[0]! - cursor[0]!, at[1]! - cursor[1]!);
    if (!(pixels <= request.aperture)) {
      return undefined;
    }
    return {
      snapPoint,
      ...(shownPoint !== undefined && { shownPoint }),
      pixels,
    };
  }

  /** The station tick shown nearest the cursor, within the aperture. */
  private tick(station: number, judge: Judge): Found | undefined {
    const a = this.alignment;
    const nearest = Math.round(station / TICKS.interval) * TICKS.interval;
    let best: Found | undefined;
    for (const s of [
      nearest - TICKS.interval,
      nearest,
      nearest + TICKS.interval,
    ]) {
      if (s < a.startStation || s > a.endStation) {
        continue;
      }
      for (const offset of TICKS.offsets) {
        // On the tick's raised face: visible as it is.
        const design = a.pointAt(s, offset);
        design[2] = design[2]! + sectionSurface(offset) + TICKS.raise;
        const c = this.candidate(judge, design, undefined);
        if (c !== undefined && (best === undefined || c.pixels < best.pixels)) {
          best = { kind: "point", design, station: s, ...c };
        }
      }
    }
    return best;
  }

  /** The line at the hit's station shown nearest the cursor, within the aperture. */
  private line(
    station: number,
    offset: number,
    judge: Judge,
  ): Found | undefined {
    let best: Found | undefined;
    for (const o of ExactSnapService.lineOffsets) {
      const design = this.onLine(station, o);
      const rise = visibleRise(o);
      const shown =
        rise === sectionSurface(o)
          ? undefined
          : Float64Array.from([
              design[0]!,
              design[1]!,
              design[2]! - sectionSurface(o) + rise,
            ]);
      const c = this.candidate(judge, design, shown);
      if (
        c !== undefined &&
        (best === undefined ||
          c.pixels < best.pixels ||
          (c.pixels === best.pixels &&
            Math.abs(o - offset) < Math.abs(best.offset! - offset)))
      ) {
        best = {
          kind: this.kindAt(station),
          design,
          offset: o,
          station,
          ...c,
        };
      }
    }
    return best;
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
