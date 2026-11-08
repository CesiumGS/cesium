// The frames module's pick interpreter (spec section 7.9; plan 5a, Task 15;
// closes plan 3's R8): a core pick (`View.pickPoint`) tagged with its
// reference frame, its body, its body-fixed position, design coordinates
// where the content has a placement, and its composed accuracy.
import {
  FrameUnavailableError,
  type FrameKey,
} from "../camera/frameResolver.ts";
import type { Body } from "../scene/Body.ts";
import type { CorePick, PickInterpreter } from "../scene/pick.ts";
import type { AnchorHandle, DrawHandle } from "../scene/World.ts";
import type { Instant } from "../time/Instant.ts";
import type { DesignPlacement } from "../streaming/designPlacement.ts";
import {
  ANALYTIC_ACCURACY,
  analyticEdges,
  type StandInName,
} from "./analytic.ts";
import type { FrameCatalog } from "./catalog.ts";
import type { FrameEdge } from "./edges.ts";
import { Frame } from "./Frame.ts";
import { isUnstated, type FrameAccuracy } from "./frameAccuracy.ts";
import { convertPoint, framePoint } from "./local.ts";
import type { PointAccuracy, PointAccuracyTerm } from "./pointAccuracy.ts";
import type { FramesResolver } from "./resolver.ts";

/** A picked point tagged with its reference frame (`createFramesPickInterpreter`). */
export interface FramedPoint {
  /**
   * The reference frame the point is in: the hit draw's anchor's binding
   * (ITRF under the Earth's anchor), else the render root's.
   */
  readonly frame: Frame;
  /** The body whose fixed reference frame `frame` is or descends from. */
  readonly body?: Body;
  /** The point in the body's fixed reference frame (ITRF, MOON_ME), m. */
  readonly bodyFixed?: Float64Array;
  /**
   * Design coordinates, where the hit draw's content has a placement
   * (`placements`) that can invert the point.
   */
  readonly design?: {
    readonly placement: DesignPlacement;
    readonly coordinates: Float64Array;
  };
  /**
   * How accurately the point is known, 1σ, composed from its own terms
   * (root-sum-square, as `pointAccuracy`), nearest the point first:
   *
   * - the pick's (`kind: "pick"`): one CSS pixel's footprint at the hit
   *   (`pickDesign`'s tolerance), and the rounding of the float32 depth
   *   the position was read from (half a step);
   * - the content's (`kind: "content"`), with design coordinates: how far
   *   its placement draws the design from where it truly is
   *   (`displayError`; 0 m when reprojected);
   * - `frame`'s own, as drawn: every edge from `frame` up to the tree's
   *   root (ICRF), each as it states its accuracy at the pick's instant,
   *   so a reference frame on its analytic stand-in (loading, or outside
   *   its data) states the stand-in's wider figure.
   *
   * Not included: the content's own error against the world (a mesh's
   * simplification, a survey's), which the content doesn't state; the
   * route to the render root, which cancels (the point comes back through
   * the placement that drew it); correlations between terms.
   */
  readonly accuracy: PointAccuracy;
  /**
   * The point in `frame` (any reference frame of the catalog's tree), at
   * the pick's instant. Throws as `frameTransform` does (a reference frame
   * that can't answer at that instant).
   */
  in(frame: Frame): Float64Array;
}

/** Options of `createFramesPickInterpreter`. */
export interface FramesPickInterpreterOptions {
  /**
   * The design placement of a draw's content, if it has one (a tileset's
   * `placement`). The interpreter inverts every point it is given one for:
   * which draws count (a morph's ghost, a placement that is changing) and
   * whether the point lies within the content (`pickDesign` checks the hit
   * tile's bounds) are this callback's rules; return undefined to refuse.
   */
  placements?(draw: DrawHandle): DesignPlacement | undefined;
}

/**
 * The frames module's `PickInterpreter`: turns a core pick into a point
 * tagged with its reference frame, through `resolver`'s anchor bindings, at
 * the pick's scene seconds (`resolver.instant`).
 *
 * - The point's reference frame is the hit draw's anchor's binding, with
 *   its coordinates `anchorPosition`. Content under an unbound anchor, or
 *   under none, sits in the render root's reference frame (the resolver
 *   puts an unbound end at the root's origin), with `position`.
 * - Undefined when neither names a reference frame (the transform table's
 *   root as the render root, under no bound anchor).
 * - A placement that can't invert the point (`designOf` throws) gives the
 *   point without design coordinates.
 */
export function createFramesPickInterpreter(
  resolver: FramesResolver,
  catalog: FrameCatalog,
  options: FramesPickInterpreterOptions = {},
): PickInterpreter<FramedPoint> {
  /** The reference frame a frame key names through the resolver, if any. */
  const frameOf = (key: FrameKey | undefined): Frame | undefined => {
    if (key instanceof Frame) {
      return key;
    }
    if (key !== undefined && "slot" in key) {
      return resolver.binding(key as AnchorHandle);
    }
    return undefined;
  };
  let edges: Readonly<Record<StandInName, FrameEdge>> | undefined;
  /** The analytic stand-ins, as the resolver draws them, made on first need. */
  const standIns = () => (edges ??= analyticEdges(() => catalog.leapSeconds));
  return {
    interpret(pick: CorePick): FramedPoint | undefined {
      // The render root names the reference frame of content under no
      // bound anchor; the route to it doesn't enter the accuracy.
      const root = frameOf(pick.root);
      let frame = frameOf(pick.anchor);
      let coordinates = pick.anchorPosition;
      if (!frame) {
        frame = root;
        coordinates = pick.position;
      }
      if (!frame) {
        return undefined;
      }
      const instant = resolver.instant(pick.seconds);
      const point = framePoint(frame, coordinates, instant);
      const body = catalog.bodyOf(frame);
      let bodyFixed: Float64Array | undefined;
      if (body) {
        const fixed = catalog.bodyFixed(body);
        bodyFixed =
          fixed === frame
            ? Float64Array.from(coordinates)
            : convertPoint(point, fixed).position;
      }
      let design: FramedPoint["design"];
      const placement =
        pick.draw && options.placements
          ? options.placements(pick.draw)
          : undefined;
      if (placement && bodyFixed) {
        try {
          design = {
            placement,
            coordinates: placement.designOf(bodyFixed),
          };
        } catch {
          // The placement can't invert this point (outside its operation's
          // domain): the true values stand, without design coordinates.
        }
      }
      return {
        frame,
        ...(body !== undefined && { body }),
        ...(bodyFixed !== undefined && { bodyFixed }),
        ...(design !== undefined && { design }),
        accuracy: composed(
          pick,
          frame,
          coordinates,
          instant,
          design,
          catalog,
          standIns,
        ),
        in: (target: Frame) => convertPoint(point, target).position,
      };
    },
  };
}

const COMBINATION =
  "root-sum-square of independent 1σ terms: the pick's (a pixel's footprint and the depth's rounding, each a bound taken as 1σ), the content's placement, and each edge from the point's reference frame up to the tree's root (each rotation error times the point's distance from that frame's origin, an upper bound: the accuracy names no axis)";

/** A picked point's accuracy: its pick, content and reference frame terms. */
function composed(
  pick: CorePick,
  frame: Frame,
  coordinates: ArrayLike<number>,
  instant: Instant,
  design: FramedPoint["design"],
  catalog: FrameCatalog,
  standIns: () => Readonly<Record<StandInName, FrameEdge>>,
): PointAccuracy {
  const terms: PointAccuracyTerm[] = [...pickTerms(pick, frame.name)];
  if (design !== undefined) {
    const { placement } = design;
    terms.push({
      frame: placement.frameName,
      kind: "content",
      meters: placement.displayError(design.coordinates),
      note: `the ${placement.mode} placement draws the design this far from where it truly is (displayError)`,
    });
  }
  terms.push(...frameTerms(frame, coordinates, instant, catalog, standIns));
  const unstated = terms.find((t) => t.kind === "unstated");
  return {
    meters:
      unstated === undefined
        ? Math.hypot(...terms.map((t) => t.meters ?? NaN))
        : undefined,
    terms,
    ...(unstated !== undefined && { unboundedBy: unstated.frame }),
    combination: COMBINATION,
  };
}

/**
 * The pick's own terms: one CSS pixel's footprint at the hit, and half a
 * float32 step of the depth it was read from, carried along the ray. Each
 * is a bound, taken as 1σ (conservative: an error uniform over a width w
 * has σ = w/√12).
 */
function pickTerms(pick: CorePick, frame: string): PointAccuracyTerm[] {
  const c = pick.camera;
  const p = pick.anchorPosition;
  const dx = p[0]! - c.position[0]!;
  const dy = p[1]! - c.position[1]!;
  const dz = p[2]! - c.position[2]!;
  const distance = Math.hypot(dx, dy, dz);
  const terms: PointAccuracyTerm[] = [
    {
      frame,
      kind: "pick",
      part: "footprint",
      meters: (distance * 2 * Math.tan(c.fovy / 2)) / c.height,
      note: "one CSS pixel's footprint at the hit: where in the pixel the surface was hit isn't known",
    },
  ];
  // Reverse-Z: the stored depth is near / z, z along the view axis; its
  // rounding moves z, and the hit along the ray, by the same fraction.
  const z = dx * c.direction[0]! + dy * c.direction[1]! + dz * c.direction[2]!;
  const depth = Math.fround(c.near / z);
  if (z > 0 && depth > 0 && Number.isFinite(depth)) {
    const step = 2 ** (Math.floor(Math.log2(depth)) - 23);
    terms.push({
      frame,
      kind: "pick",
      part: "depth",
      meters: (distance * step) / 2 / depth,
      note: "half a float32 step of the depth buffer's depth at the hit, along the ray",
    });
  }
  return terms;
}

/**
 * `frame`'s edges up to the tree's root, each as it is drawn at `instant`
 * and states its accuracy there (the terms `pointAccuracy` gives). A
 * catalog edge outside its data (`FrameUnavailableError`) is drawn on its
 * analytic stand-in, as the frames resolver draws it: it states the
 * stand-in's accuracy, and carries the point on with the stand-in. A
 * rotation's lever is the point's distance from that edge's frame origin.
 */
function frameTerms(
  frame: Frame,
  coordinates: ArrayLike<number>,
  instant: Instant,
  catalog: FrameCatalog,
  standIns: () => Readonly<Record<StandInName, FrameEdge>>,
): readonly PointAccuracyTerm[] {
  const p = Float64Array.from([
    coordinates[0]!,
    coordinates[1]!,
    coordinates[2]!,
  ]);
  const m = new Float64Array(16);
  const terms: PointAccuracyTerm[] = [];
  for (let edge = frame; edge.parent; edge = edge.parent) {
    let a: Readonly<FrameAccuracy> = edge.accuracy(instant);
    let note = a.note;
    try {
      edge.toParent(instant, m);
    } catch (error) {
      const standIn = standInName(edge, catalog);
      if (!(error instanceof FrameUnavailableError) || !standIn) {
        throw error;
      }
      a = ANALYTIC_ACCURACY[standIn];
      note = `drawn on its stand-in at this instant (${error.message}): ${a.note}`;
      standIns()[standIn](instant, m);
    }
    const name = edge.name;
    if (a.byDefinition === true) {
      terms.push({ frame: name, kind: "exact", meters: 0, note });
    } else if (isUnstated(a)) {
      terms.push({ frame: name, kind: "unstated", note });
    } else {
      if (a.meters !== undefined) {
        terms.push({ frame: name, kind: "meters", meters: a.meters, note });
      }
      if (a.radians !== undefined) {
        const lever = Math.hypot(p[0]!, p[1]!, p[2]!);
        terms.push({
          frame: name,
          kind: "angular",
          meters: a.radians * lever,
          radians: a.radians,
          lever,
          note,
        });
      }
    }
    // The point in the parent's coordinates, for the next edge's lever.
    const x = p[0]!,
      y = p[1]!,
      z = p[2]!;
    for (let i = 0; i < 3; i++) {
      p[i] = m[i]! * x + m[4 + i]! * y + m[8 + i]! * z + m[12 + i]!;
    }
  }
  return terms;
}

/** The stand-in name of a catalog reference frame that has an analytic stand-in. */
function standInName(
  frame: Frame,
  catalog: FrameCatalog,
): StandInName | undefined {
  const name = frame.name as StandInName;
  return name in ANALYTIC_ACCURACY &&
    (catalog.names as readonly string[]).includes(name) &&
    catalog.get(name) === frame
    ? name
    : undefined;
}
