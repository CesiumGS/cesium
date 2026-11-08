// The frames module's pick interpreter (spec section 7.9; plan 5a, Task 15;
// closes plan 3's R8): a core pick (`View.pickPoint`) tagged with its
// reference frame, its body, its body-fixed position, design coordinates
// where the content has a placement, and its composed accuracy.
import type { FrameKey } from "../camera/frameResolver.ts";
import type { Body } from "../scene/Body.ts";
import type { CorePick, PickInterpreter } from "../scene/pick.ts";
import type { AnchorHandle, DrawHandle } from "../scene/World.ts";
import type { Instant } from "../time/Instant.ts";
import type { DesignPlacement } from "../streaming/designPlacement.ts";
import type { CatalogFrameName, FrameCatalog } from "./catalog.ts";
import { Frame } from "./Frame.ts";
import { isUnstated } from "./frameAccuracy.ts";
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
   * - `frame`'s own: each edge from `frame` up to the nearest catalog
   *   reference frame at or above it, as it states its accuracy at the
   *   pick's instant. For content on a body that is its body-fixed
   *   reference frame (ITRF, MOON_ME); an engineering, trajectory or
   *   application reference frame keeps its own edges (a spacecraft's
   *   covariance relative to GCRF); a point tagged in a catalog reference
   *   frame has none. `combination` names where the walk stopped.
   *
   * Not included:
   *
   * - catalog-to-catalog edges (a body's orientation, its place among the
   *   planets) and the route to the render root: the point comes back
   *   through the placement that drew it, so they move it and its
   *   reference frame together;
   * - the GPU's float32 arithmetic in producing the depth (only the stored
   *   depth's rounding is counted);
   * - the footprint's orientation: it is measured across the ray, so it
   *   understates where the surface is grazed;
   * - content the `placements` callback gives no placement for: it has no
   *   content term;
   * - the coordinate operation's own accuracy behind `design` (the
   *   engineering frame's, from PROJ);
   * - the content's own error against the world (a mesh's simplification,
   *   a survey's), which the content doesn't state;
   * - correlations between terms.
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
 * `interpret` throws when an edge it needs can't answer at that instant
 * (`FrameUnavailableError`, as `frameTransform` and `pointAccuracy` throw):
 * an application's or a trajectory's edge between the point's reference
 * frame and the nearest catalog one (for the accuracy), or one between it
 * and the body-fixed reference frame (for `bodyFixed`). The catalog's own
 * edges aren't walked for the accuracy.
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
        accuracy: composed(pick, frame, coordinates, instant, design, catalog),
        in: (target: Frame) => convertPoint(point, target).position,
      };
    },
  };
}

/** How a picked point's terms combine, with where its reference frame terms stop. */
const combination = (upTo: string) =>
  `root-sum-square of independent 1σ terms: the pick's (a pixel's footprint and the depth's rounding, each a bound taken as 1σ), the content's placement, and each edge from the point's reference frame ${upTo} (each rotation error times the point's distance from that frame's origin, an upper bound: the accuracy names no axis)`;

/** A picked point's accuracy: its pick, content and reference frame terms. */
function composed(
  pick: CorePick,
  frame: Frame,
  coordinates: ArrayLike<number>,
  instant: Instant,
  design: FramedPoint["design"],
  catalog: FrameCatalog,
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
  // The point is recovered through the placement that drew it, so no
  // catalog-to-catalog edge moves it relative to its reference frame: the
  // walk stops at the nearest catalog reference frame.
  let stop: Frame | undefined = frame;
  while (stop && !isCatalogFrame(stop, catalog)) {
    stop = stop.parent;
  }
  terms.push(...frameTerms(frame, stop, coordinates, instant));
  const unstated = terms.find((t) => t.kind === "unstated");
  return {
    meters:
      unstated === undefined
        ? Math.hypot(...terms.map((t) => t.meters ?? NaN))
        : undefined,
    terms,
    ...(unstated !== undefined && { unboundedBy: unstated.frame }),
    combination: combination(
      stop === frame
        ? `(none: the point is in a catalog reference frame, ${frame.name})`
        : stop
          ? `up to the nearest catalog reference frame, ${stop.name}`
          : "up to the tree's root (no catalog reference frame above it)",
    ),
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
      note: "one CSS pixel's footprint at the hit: the pick reads the pixel's centre, which may be this far from where the click was meant",
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
 * `frame`'s edges up to `stop` (the nearest catalog reference frame), or
 * to the tree's root without one, each stating its accuracy at `instant`
 * (the terms `pointAccuracy` gives). A rotation's lever is the point's
 * distance from that edge's frame origin. Throws, as the edge does, when
 * an edge can't answer at `instant`.
 */
function frameTerms(
  frame: Frame,
  stop: Frame | undefined,
  coordinates: ArrayLike<number>,
  instant: Instant,
): readonly PointAccuracyTerm[] {
  const p = Float64Array.from([
    coordinates[0]!,
    coordinates[1]!,
    coordinates[2]!,
  ]);
  const m = new Float64Array(16);
  const terms: PointAccuracyTerm[] = [];
  for (let edge = frame; edge !== stop && edge.parent; edge = edge.parent) {
    const a = edge.accuracy(instant);
    const { note } = a;
    edge.toParent(instant, m);
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

/** Whether `frame` is one of the catalog's own (built-in) reference frames. */
function isCatalogFrame(frame: Frame, catalog: FrameCatalog): boolean {
  return (
    (catalog.names as readonly string[]).includes(frame.name) &&
    catalog.get(frame.name as CatalogFrameName) === frame
  );
}
