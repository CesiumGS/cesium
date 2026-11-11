/**
 * Snapping, split as CesiumJS 1.x splits it: a client side that snaps at once
 * to what is drawn (1.x `Scene#snap`; here `ClientSnapService`, on the CPU
 * over retained tile geometry, which plan 5 replaces with a GPU snap pass),
 * and a server side that snaps to the source design data (1.x
 * `SnapService`, as `IonSnapService` implements it). `refiningSnap` shows the
 * client's answer and then updates it with the server's.
 */
import { projectToPixel } from "../scene/Camera.ts";
import type { PickResult } from "../scene/View.ts";
import type { CoordinateOperation } from "../frames/coordinates.ts";
import type { SceneItem } from "../scene/SceneItem.ts";
import { routeMap } from "../scene/warpBounds.ts";
import type { TileGeometry } from "../streaming/Tile.ts";
import type { Tileset3D } from "../streaming/Tileset3D.ts";
import { routeForward, type Route } from "../camera/route.ts";
import { invertAffine } from "../math/mat4.ts";
import type { DrawnThrough } from "../frames/drawn.ts";
import type { TruePick } from "../frames/pickTruth.ts";
import {
  designPoint,
  type DesignPoint,
  type SnapKind,
} from "./EngineeringFrame.ts";
import { meshGeometry } from "../geometry/mesh.ts";
import { pickInFrame, type PickCamera, type PickView } from "./pick.ts";
import { engineeringPlacement } from "./placement.ts";

/**
 * The camera a snap's pick was read with, and its view's size in CSS
 * pixels: what a server needs to snap as the screen shows it (1.x passes the
 * `Camera` and the canvas size). In the hit's coordinates (body-fixed for
 * content on a body), from the tick the pick read. Under a view warp
 * (`SnapResult.drawn`) it sees content where the view draws it: a true
 * point is projected with it through `ServiceSnapRequest.toDrawn`.
 */
export type SnapCamera = PickCamera;

/** Where to snap: CSS pixels from the view's top-left, as `pickDesign`. */
export interface SnapRequest {
  readonly view: PickView;
  readonly x: number;
  readonly y: number;
  /** How far from the cursor a snap may land, in CSS pixels. */
  readonly aperture: number;
}

/** What a snap landed on (1.x `SnapService.Result`, and more). */
export interface SnapResult {
  /**
   * The snapped point, the one to use: body-fixed metres, where the content
   * is, as its placement displays it. A view that draws the content through
   * a warp draws it elsewhere (`drawn`, `drawnPosition`); this is the true
   * point, never inverted from the drawn one. With `design`, the exact
   * design answer, where the placement draws it.
   */
  readonly snapPoint: Float64Array;
  /**
   * Where the snap is shown and judged on the screen, when that isn't
   * `snapPoint` (body-fixed metres, as displayed): the visible point on the
   * drawn surface directly over, or nearest, an exact design point that
   * lies under it, such as an alignment's profile grade line under a median
   * barrier. `snapPoint` and `design` stay the exact design answer, and the
   * readout uses them; a marker is drawn here. At most `SHOWN_POINT_REACH`
   * from `snapPoint`. Absent, `snapPoint` is shown.
   */
  readonly shownPoint?: Float64Array;
  /**
   * Where the cursor hit the geometry (body-fixed, displayed). From a
   * server, 1.x's meaning: the nearest edge point within the aperture, else
   * the surface point under the cursor (the client's when the server gives
   * none). From the client, always the surface under the cursor, on the
   * object and off its edges, so it seeds a server snap well (1.x's hybrid
   * snapping seeds from `Scene#snap`'s `surfacePosition` for that reason).
   */
  readonly hitPoint: Float64Array;
  /** CSS pixels from the cursor to `snapPoint` on the screen (0 on a surface). */
  readonly distance: number;
  readonly kind: SnapKind;
  /**
   * The unit normal of a face at `snapPoint`: one facing the camera where
   * there is one, else another turned toward it.
   */
  readonly normal?: Float64Array;
  /** The geometry snapped to: an edge's two ends for a client `segment`. */
  readonly curve?: readonly Float64Array[];
  /**
   * Design coordinates of `snapPoint` (`obtained: { how: "snap", tolerance,
   * kind }`). A client snap gives them only where `pickDesign` gives the
   * pick design coordinates.
   */
  readonly design?: DesignPoint<CoordinateOperation>;
  /** Metres: how far `snapPoint` may be from the geometry it stands for. */
  readonly tolerance: number;
  /** Whether `snapPoint` lies on the analytic geometry (tolerance 0). */
  readonly exact: boolean;
  /** The listed tileset whose content was hit. */
  readonly tileset?: Tileset3D;
  /** The item hit (`DesignPick.item`). */
  readonly item?: SceneItem;
  /** "client": snapped to what is drawn; "server": to the design data. */
  readonly source: "client" | "server";
  /** A client snap a server was asked to refine, still unanswered. */
  readonly provisional: boolean;
  /** The element hit (1.x's `elementId` comes from it). */
  readonly feature?: PickResult;
  /**
   * The camera the client snap used (from the pick's tick, in the
   * coordinates of `snapPoint`), to build a server request from: absent
   * only when a view without `pickPoint` kept its camera moving during the
   * pick.
   */
  readonly camera?: SnapCamera;
  /**
   * On a client snap a server was asked to refine: the server's answer was
   * sound, but the point it is shown at is out of sight from this camera,
   * and this says which ("snapPoint hidden from the camera by the drawn
   * mesh"). A correct refusal, not a failure: a server knows the design,
   * not what is drawn in front of it (`refiningSnap`).
   */
  readonly serverOutOfSight?: string;
  /**
   * What the view drew the content through, when through a warp
   * (`drawnThrough`: "drawn ×10 vertically; values are true"). The snap
   * worked in drawn space (the aperture is pixels on the screen, candidates
   * go forward through the route for their screen distance) and returns true
   * points: `snapPoint`, `hitPoint`, `curve` and `normal` are the
   * content's. Absent when drawn as it is.
   */
  readonly drawn?: DrawnThrough;
  /** Where `snapPoint` is drawn (the view's render space), m, when `drawn`. */
  readonly drawnPosition?: Float64Array;
}

/**
 * A server snap's request, as 1.x's `SnapService.snap` takes it: `feature`
 * stands for 1.x's `elementId` (the element id is the server's to read from
 * it) and `aperture` for `snapAperture`.
 */
export interface ServiceSnapRequest {
  readonly tileset: Tileset3D;
  /** The item hit, whose placement the answer is to be drawn by. */
  readonly item?: SceneItem;
  /** The element to snap to (1.x `elementId`). */
  readonly feature?: PickResult;
  /** The point to snap from: body-fixed, displayed. */
  readonly testPoint: Float64Array;
  /** A point near the target geometry that seeds the search (1.x default: `testPoint`). */
  readonly closePoint?: Float64Array;
  readonly camera: SnapCamera;
  /** The view's size in CSS pixels. */
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  /** The snap tolerance in CSS pixels (1.x `snapAperture`). */
  readonly aperture: number;
  /**
   * Where the view draws content through a warp: `camera` sees the content
   * where it is drawn, so a true point (`testPoint`, `closePoint`, a
   * candidate) is projected with `camera` after `toDrawn`. Absent when
   * drawn as it is, where a point is projected as it is.
   */
  readonly toDrawn?: (point: ArrayLike<number>) => Float64Array;
  /**
   * [σ_min, σ_max] of the view's warp near the hit: a drawn distance over a
   * true one is at least σ_min and at most σ_max. Divide drawn tolerances
   * by σ_min to get true ones.
   */
  readonly stretch?: readonly [number, number];
  /**
   * `aperture` as the most true metres a point within it can be from the
   * cursor's hit: the aperture's pixels at the hit, over σ_min. The same as
   * the aperture's size at the hit when drawn as it is.
   */
  readonly apertureMeters?: number;
}

/**
 * The server side (1.x `SnapService`): snaps against the source design
 * data, not the drawn mesh. Resolves undefined (or null) when no snap is
 * possible. `refiningSnap` checks what it returns before trusting it, and
 * sets its `source`, `provisional`, `distance`, `feature` and `camera`.
 */
export interface SnapService {
  snap(
    request: ServiceSnapRequest,
    signal?: AbortSignal,
  ): Promise<SnapResult | null | undefined>;
}

/**
 * Metres: how far a result's `shownPoint` may be from its `snapPoint`. A
 * shown point stands for the surface over a design point (a barrier, a
 * kerb, a deck's wearing course), so it is near; 2 m covers such a surface
 * and refuses a shown point somewhere else on the screen.
 */
export const SHOWN_POINT_REACH = 2;

/** Added once to a tileset's `warnings` when snapping finds no geometry. */
export const GEOMETRY_NOT_RETAINED = "snap: geometry not retained";

/** Added once to a tileset's `warnings` when its snap server fails. */
export const SNAP_SERVER_FAILED =
  "snap: the snap server failed; client snaps stand";

/**
 * Begins the warning added once per reason when a server's answer doesn't
 * check out (`refiningSnap`): "snap: a server snap was refused: <reason>".
 * A point merely out of sight isn't one (`SnapResult.serverOutOfSight`),
 * unless the server's answers all are (`SNAP_SERVER_ALWAYS_OUT_OF_SIGHT`).
 */
export const SNAP_SERVER_REFUSED = "snap: a server snap was refused";

/** Added once to a tileset's `warnings` when `refiningSnap`'s `onUpdate` throws. */
export const SNAP_UPDATE_FAILED = "snap: onUpdate threw; it must not";

/**
 * Added once to a tileset's `warnings` when a server's answers are out of
 * sight `OUT_OF_SIGHT_WARNING` times in a row. One such answer is the
 * camera's view (a barrier's far face, a road under a deck); every answer
 * being so is a server wrong only along the view ray, such as a height
 * datum off by a few meters, and worth a developer's notice.
 */
export const SNAP_SERVER_ALWAYS_OUT_OF_SIGHT =
  "snap: every answer from the snap server was hidden from the camera by the drawn mesh, 10 in a row; check its heights";

/** How many answers in a row out of sight make the warning above. */
export const OUT_OF_SIGHT_WARNING = 10;

/** Each server's answers out of sight in a row. */
const outOfSightRuns = new WeakMap<object, number>();

/** Ends a refusal that is the camera's view, not the server's fault. */
const OUT_OF_SIGHT = "hidden from the camera by the drawn mesh";

const SNAP_KINDS: readonly SnapKind[] = ["point", "segment", "arc", "surface"];

/**
 * `g` as `item` draws it: its positions moved by the item's dual position, at `t` exactly 1 the attribute as loaded. Between, a new
 * array each call (a snap there has no design coordinates; it is the surface
 * as drawn). Without the attribute, `g` itself.
 */
function drawnGeometry(g: TileGeometry, item: SceneItem): TileGeometry {
  const semantic = item.tileset.dualPosition?.semantic;
  const second = semantic !== undefined ? g.attributes?.[semantic] : undefined;
  const t = item.placement;
  if (second === undefined || t === 0) {
    return g;
  }
  if (t === 1) {
    return { ...g, positions: second };
  }
  const p = g.positions;
  const positions = new Float32Array(p.length);
  for (let i = 0; i < p.length; i++) {
    positions[i] = p[i]! + t * (second[i]! - p[i]!);
  }
  return { ...g, positions };
}

/**
 * What a snap keeps of a view that draws content through a warp: the map
 * from a true point (the anchor's coordinates) to where the pick's camera
 * sees it, and the route's stretch there.
 */
interface DrawnSnap {
  readonly toDrawn: (p: ArrayLike<number>) => Float64Array;
  readonly stretch: readonly [number, number];
  readonly apertureMeters: number;
  readonly through: DrawnThrough;
  readonly route: Route;
  /** `snapPoint` as drawn: the route's image, render space. */
  readonly render: (p: ArrayLike<number>) => Float64Array;
}

/** What each client result under a view warp was found with: read by `refiningSnap` and a server's check, whichever client made it. */
const DRAWN = new WeakMap<SnapResult, DrawnSnap>();

/** Where the pick's camera sees `point` (a true point of the result's anchor): `point` itself when drawn as it is. */
function drawnPoint(
  result: SnapResult,
  point: ArrayLike<number>,
): ArrayLike<number> {
  return DRAWN.get(result)?.toDrawn(point) ?? point;
}

/** What a server is told of the view's warp: `toDrawn`, `stretch`, `apertureMeters`. */
function drawnRequest(
  result: SnapResult,
): Pick<ServiceSnapRequest, "toDrawn" | "stretch" | "apertureMeters"> {
  const drawn = DRAWN.get(result);
  return drawn === undefined
    ? {}
    : {
        toDrawn: drawn.toDrawn,
        stretch: drawn.stretch,
        apertureMeters: drawn.apertureMeters,
      };
}

/** The hit draw's geometry behind a result, for checking a server's. */
interface SnapContext {
  readonly geometry?: TileGeometry;
  readonly error: number;
  readonly drawn?: DrawnSnap;
  /** `geometry` as drawn, made when a server's answer is first checked. */
  drawnGeometry?: TileGeometry;
}

function drawnSnapOf(
  truth: TruePick | undefined,
  aperture: number,
): DrawnSnap | undefined {
  const route = truth?.route;
  if (truth === undefined || route === undefined || truth.drawn === undefined) {
    return undefined;
  }
  // The pick's camera is the render camera in the anchor's affine
  // coordinates: the drawn point goes there the way the camera did.
  const after = truth.placement
    ? invertAffine(new Float64Array(16), truth.placement)
    : undefined;
  const map = routeMap(route, after);
  return {
    toDrawn: (p) => map(p, new Float64Array(3)),
    render: (p) => routeForward(route, p),
    stretch: truth.drawn.stretch ?? [1, 1],
    apertureMeters: aperture * truth.trueFootprint,
    through: truth.drawn,
    route,
  };
}

/** `g` as the view draws it: vertices through `toDrawn`, in the camera's coordinates. */
function geometryAsDrawn(
  g: TileGeometry,
  toDrawn: (p: ArrayLike<number>) => Float64Array,
): TileGeometry {
  const { positions, matrix: m } = g;
  const count = Math.floor(positions.length / 3);
  const drawn = new Float64Array(3 * count);
  const p = new Float64Array(3);
  for (let v = 0; v < count; v++) {
    const x = positions[3 * v]!,
      y = positions[3 * v + 1]!,
      z = positions[3 * v + 2]!;
    p[0] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
    p[1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
    p[2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
    drawn.set(toDrawn(p), 3 * v);
  }
  // Relative to the first vertex's drawn place, which the matrix carries, so
  // float32 positions keep their precision at Earth scale.
  const origin = drawn.slice(0, 3);
  const local = new Float32Array(3 * count);
  for (let v = 0; v < count; v++) {
    for (let k = 0; k < 3; k++) {
      local[3 * v + k] = drawn[3 * v + k]! - origin[k]!;
    }
  }
  const matrix = new Float64Array(16);
  matrix[0] = matrix[5] = matrix[10] = matrix[15] = 1;
  matrix.set(origin, 12);
  return { ...g, positions: local, matrix };
}

/**
 * The client side (1.x `Scene#snap`), on the CPU over the triangles tiles
 * keep with `retainGeometry` until plan 5's GPU snap pass replaces it. From
 * `pickDesign`'s hit, the hit draw's vertices are projected with the camera
 * of the pick's frame: the nearest within the aperture is a `point`; failing
 * that, the nearest point of an edge within it is a `segment`; failing that,
 * the hit is a `surface`. A snapped point is a vertex or on an edge of the
 * tile's mesh, which stands for the true geometry within the tile's
 * geometric error: that is the tolerance (a geometric error of 0 is taken at
 * its word), and no client snap is exact.
 *
 * Where the view draws the content through a warp (a vertical exaggeration,
 * a reprojection) the snap works in what is drawn and answers in what is
 * true: the aperture is pixels on the screen, so each vertex goes forward
 * through the route for its screen distance and for the sight tests, and the
 * point returned is the vertex (or the edge's point at the same parameter)
 * of the true mesh, in float64, never inverted. `SnapResult.drawn` says so.
 *
 * A vertex or edge point the hit draw's own triangles hide from the camera
 * (the line of sight crosses one of them before reaching it) is passed over
 * for the next nearest. Occlusion by other draws isn't tested: such a point
 * is still a vertex of the drawn mesh, within the aperture.
 *
 * Its results have `source: "client"`, are not provisional, and carry the
 * camera and feature a server request is built from (`refiningSnap`).
 */
export class ClientSnapService {
  /**
   * Per-vertex work buffers, kept across snaps: about 57 bytes per vertex
   * of the largest draw snapped to.
   */
  private readonly scratch = new Scratch();
  /** The hit draw's geometry behind each result, for checking a server's. */
  private readonly context = new WeakMap<SnapResult, SnapContext>();

  constructor(readonly tilesets: readonly Tileset3D[]) {}

  /**
   * @internal Whether the hit draw, as it is drawn, hides `point` (a true
   * point) from the result's camera, by more than the tile's geometric
   * error (drawn: at most σ_max times it) and a millimetre. False when that
   * draw kept no geometry.
   */
  hides(result: SnapResult, point: ArrayLike<number>): boolean {
    const context = this.context.get(result);
    const camera = result.camera;
    if (context?.geometry === undefined || camera === undefined) {
      return false;
    }
    const drawn = context.drawn;
    if (drawn === undefined) {
      return hiddenFrom(context.geometry, camera, point, context.error + 1e-3);
    }
    context.drawnGeometry ??= geometryAsDrawn(context.geometry, drawn.toDrawn);
    return hiddenFrom(
      context.drawnGeometry,
      camera,
      drawn.toDrawn(point),
      context.error * drawn.stretch[1] + 1e-3,
    );
  }

  async snap(request: SnapRequest): Promise<SnapResult | undefined> {
    const { view, x, y, aperture } = request;
    checkAperture(aperture);
    const framed = await pickInFrame(view, x, y, this.tilesets);
    if (framed === undefined) {
      return undefined;
    }
    const { pick, camera, draw, tile, truth } = framed;
    const tileset = pick.tileset;
    const hitPoint = pick.position;
    const drawn = drawnSnapOf(truth, aperture);
    const common = {
      hitPoint,
      exact: false,
      source: "client",
      provisional: false,
      ...(tileset !== undefined && { tileset }),
      ...(pick.item !== undefined && { item: pick.item }),
      ...(pick.feature !== undefined && { feature: pick.feature }),
      ...(camera !== undefined && { camera }),
      ...(drawn !== undefined && { drawn: drawn.through }),
    } as const;
    /** A result, with where it is drawn when the view warps. */
    const shown = (result: SnapResult): SnapResult => {
      const out =
        drawn === undefined
          ? result
          : { ...result, drawnPosition: drawn.render(result.snapPoint) };
      this.context.set(out, {
        error: tile?.geometricError ?? 0,
        ...(drawn !== undefined && { drawn }),
      });
      if (drawn !== undefined) {
        DRAWN.set(out, drawn);
      }
      return out;
    };
    const surface = (tolerance: number): SnapResult =>
      shown({
        ...common,
        snapPoint: Float64Array.from(hitPoint),
        distance: 0,
        kind: "surface",
        ...(pick.design !== undefined && {
          design: designPoint(
            pick.design.engineeringFrame,
            pick.design.design,
            {
              how: "snap",
              tolerance,
              kind: "surface",
            },
          ),
        }),
        tolerance,
      });
    if (
      camera === undefined ||
      tileset === undefined ||
      draw === undefined ||
      tile === undefined
    ) {
      return surface(pick.tolerance);
    }
    // The hit is on the mesh within a pixel's footprint, and the mesh on the
    // geometry within the geometric error.
    const surfaceTolerance = pick.tolerance + tile.geometricError;
    if (tile.geometry === undefined) {
      if (!tileset.retainGeometry) {
        warnOnce(tileset, GEOMETRY_NOT_RETAINED);
      }
      return surface(surfaceTolerance);
    }
    const source = tileset.sourceOfDraw(draw) ?? draw;
    const listed = tile.geometry.find(
      (g) =>
        g.draw.index === source.index &&
        g.draw.generation === source.generation,
    );
    const geometry =
      listed && pick.item ? drawnGeometry(listed, pick.item) : listed;
    const found =
      geometry === undefined
        ? undefined
        : nearest(
            geometry,
            camera,
            x,
            y,
            aperture,
            this.scratch,
            drawn?.toDrawn,
          );
    const kept = (result: SnapResult): SnapResult => {
      if (geometry !== undefined) {
        this.context.set(result, {
          geometry,
          error: tile.geometricError,
          ...(drawn !== undefined && { drawn }),
        });
      }
      return result;
    };
    if (found === undefined) {
      return kept(surface(surfaceTolerance));
    }
    const tolerance = tile.geometricError;
    const placement = engineeringPlacement(
      pick.item !== undefined ? pick.item.designPlacement : tileset.placement,
    );
    return kept(
      shown({
        ...common,
        snapPoint: found.point,
        distance: found.distance,
        kind: found.kind,
        ...(found.normal !== undefined && { normal: found.normal }),
        ...(found.curve !== undefined && { curve: found.curve }),
        ...(pick.design !== undefined &&
          placement !== undefined && {
            design: designPoint(
              placement.frame,
              placement.designOf(found.point),
              { how: "snap", tolerance, kind: found.kind },
            ),
          }),
        tolerance,
      }),
    );
  }
}

function checkAperture(aperture: number): void {
  if (!(Number.isFinite(aperture) && aperture >= 0)) {
    throw new Error(
      `snap: the aperture must be a finite number of CSS pixels, not negative, got ${aperture}`,
    );
  }
}

function warnOnce(tileset: Tileset3D, warning: string): void {
  if (!tileset.warnings.has(warning)) {
    tileset.warnings.add(warning);
  }
}

/**
 * Snaps on the client and refines on the server, as 1.x's hybrid snapping
 * does: `onUpdate` gets the client snap at once (provisional while a server
 * was asked), then the server's (`source: "server"`) when it answers and
 * checks out, and the promise resolves with the last of them.
 *
 * The server is asked when there is one and the client snap hit a listed
 * tileset in one camera frame: with the client's `hitPoint` as `testPoint`,
 * its `snapPoint` as `closePoint`, its feature and its camera. When the
 * server finds no snap (undefined or null), fails, or gives an answer that
 * doesn't check out, the client snap stands: `onUpdate` gets it again, no
 * longer provisional, and the promise resolves with it. A failure, and each
 * reason for refusing an answer that doesn't check out, adds a warning to
 * the tileset once.
 *
 * A server answer is refused when it is malformed (points, tolerance,
 * `kind`, `normal`, `curve`, `shownPoint`); when it is `exact` with a
 * tolerance other than 0; when its `design` isn't where its tileset's
 * placement draws `snapPoint` (within the tolerance and 1 mm); when its
 * `shownPoint` is more than `SHOWN_POINT_REACH` from `snapPoint`; when the
 * point it is shown at (`shownPoint`, else `snapPoint`) is behind the
 * client's camera, nearer than its near plane or more than the aperture
 * and 1 px from the cursor; or when the client's hit draw hides that point
 * from the camera by more than the tile's geometric error (an exact design
 * point a little inside the drawn mesh still passes; one well inside it,
 * such as a profile grade line under a barrier, passes when its
 * `shownPoint` is on the surface over it).
 *
 * That last refusal is no fault of the server's: a server knows the design,
 * not what is drawn in front of it from here (a barrier's far face seen
 * from the road, a road under a deck). So it adds no warning: the client
 * snap stands and says why (`SnapResult.serverOutOfSight`). Only a server
 * whose answers are out of sight 10 times in a row gets a warning.
 *
 * Abort `signal` when a newer snap supersedes this one: the server request
 * is aborted with it, and `onUpdate` is not called again, even if the server
 * answers anyway; the promise then resolves with the client snap, not
 * provisional. A signal already aborted resolves undefined at once.
 * `onUpdate` must not throw: a throw is caught and warned once on the
 * tileset hit (when there is one).
 */
export async function refiningSnap(
  request: SnapRequest,
  client: ClientSnapService,
  server: SnapService | undefined,
  onUpdate: (result: SnapResult) => void,
  signal?: AbortSignal,
): Promise<SnapResult | undefined> {
  if (signal?.aborted) {
    return undefined;
  }
  const found = await client.snap(request);
  if (found === undefined) {
    return undefined;
  }
  const { tileset, camera } = found;
  const update = (result: SnapResult) => {
    try {
      onUpdate(result);
    } catch {
      if (tileset !== undefined) {
        warnOnce(tileset, SNAP_UPDATE_FAILED);
      }
    }
  };
  const settled: SnapResult = { ...found, provisional: false };
  if (signal?.aborted) {
    return settled;
  }
  if (server === undefined || tileset === undefined || camera === undefined) {
    update(settled);
    return settled;
  }
  update({ ...found, provisional: true });
  let refined: SnapResult | undefined;
  let warning: string | undefined;
  let outOfSight: string | undefined;
  try {
    const answer = await server.snap(
      {
        tileset,
        ...(found.item !== undefined && { item: found.item }),
        ...(found.feature !== undefined && { feature: found.feature }),
        testPoint: found.hitPoint,
        closePoint: found.snapPoint,
        camera,
        canvasWidth: camera.width,
        canvasHeight: camera.height,
        aperture: request.aperture,
        ...drawnRequest(found),
      },
      signal,
    );
    if (signal?.aborted) {
      return settled;
    }
    const run = (outOfSightRuns.get(server) ?? 0) + 1;
    outOfSightRuns.delete(server); // any other answer ends the run
    if (answer !== undefined && answer !== null) {
      const reason = refusal(answer, found, client, request, tileset, camera);
      if (reason?.endsWith(OUT_OF_SIGHT)) {
        outOfSight = reason;
        outOfSightRuns.set(server, run);
        if (run >= OUT_OF_SIGHT_WARNING) {
          warning = SNAP_SERVER_ALWAYS_OUT_OF_SIGHT;
        }
      } else if (reason !== undefined) {
        warning = `${SNAP_SERVER_REFUSED}: ${reason}`;
      } else {
        // The client's feature and camera, never the server's.
        const { feature: ignored, ...rest } = answer;
        void ignored;
        const render = DRAWN.get(found)?.render(answer.snapPoint);
        refined = {
          ...rest,
          hitPoint: answer.hitPoint ?? found.hitPoint,
          distance: cursorDistance(
            camera,
            drawnPoint(found, answer.shownPoint ?? answer.snapPoint),
            request,
          ),
          tileset: answer.tileset ?? tileset,
          ...(found.item !== undefined && { item: found.item }),
          ...(found.drawn !== undefined &&
            render !== undefined && {
              drawn: found.drawn,
              drawnPosition: render,
            }),
          source: "server",
          provisional: false,
          ...(found.feature !== undefined && { feature: found.feature }),
          camera,
        };
      }
    }
  } catch {
    if (signal?.aborted) {
      return settled;
    }
    warning = SNAP_SERVER_FAILED;
  }
  if (warning !== undefined) {
    warnOnce(tileset, warning);
  }
  const result =
    refined ??
    (outOfSight !== undefined
      ? { ...settled, serverOutOfSight: outOfSight }
      : settled);
  update(result);
  return result;
}

/** CSS pixels from the cursor to where `camera` shows `point`. */
function cursorDistance(
  camera: SnapCamera,
  point: ArrayLike<number>,
  cursor: { readonly x: number; readonly y: number },
): number {
  const at = new Float64Array(2);
  const depth = projectToPixel(
    camera,
    camera.fovy,
    camera.width,
    camera.height,
    point,
    at,
  );
  return depth > 0 && depth >= camera.near
    ? Math.hypot(at[0]! - cursor.x, at[1]! - cursor.y)
    : NaN;
}

const finite3 = (p: unknown): boolean =>
  (p instanceof Float64Array || Array.isArray(p)) &&
  p.length === 3 &&
  Number.isFinite(p[0]) &&
  Number.isFinite(p[1]) &&
  Number.isFinite(p[2]);

/**
 * Why a server's answer can't replace the client snap `found`, or undefined
 * when it checks out.
 */
function refusal(
  r: SnapResult,
  found: SnapResult,
  client: ClientSnapService,
  request: SnapRequest,
  tileset: Tileset3D,
  camera: SnapCamera,
): string | undefined {
  if (!(r.snapPoint instanceof Float64Array) || !finite3(r.snapPoint)) {
    return "snapPoint is not 3 finite numbers";
  }
  if (r.hitPoint !== undefined && !finite3(r.hitPoint)) {
    return "hitPoint is not 3 finite numbers";
  }
  if (r.shownPoint !== undefined) {
    if (!(r.shownPoint instanceof Float64Array) || !finite3(r.shownPoint)) {
      return "shownPoint is not 3 finite numbers";
    }
    const apart = Math.hypot(
      r.shownPoint[0]! - r.snapPoint[0]!,
      r.shownPoint[1]! - r.snapPoint[1]!,
      r.shownPoint[2]! - r.snapPoint[2]!,
    );
    if (!(apart <= SHOWN_POINT_REACH)) {
      return `shownPoint more than ${SHOWN_POINT_REACH} m from snapPoint`;
    }
  }
  if (!(
    typeof r.tolerance === "number" &&
    Number.isFinite(r.tolerance) &&
    r.tolerance >= 0
  )) {
    return "tolerance is not a finite number of metres, not negative";
  }
  if (typeof r.exact !== "boolean") {
    return "exact is not a boolean";
  }
  if (r.exact && r.tolerance !== 0) {
    return "exact with a tolerance other than 0";
  }
  if (!SNAP_KINDS.includes(r.kind)) {
    return "kind is not a SnapKind";
  }
  if (r.normal !== undefined && !finite3(r.normal)) {
    return "normal is not 3 finite numbers";
  }
  if (
    r.curve !== undefined &&
    !(Array.isArray(r.curve) && r.curve.length >= 2 && r.curve.every(finite3))
  ) {
    return "curve is not two or more points of 3 finite numbers";
  }
  if (r.design !== undefined) {
    const placement = engineeringPlacement(
      found.item !== undefined
        ? found.item.designPlacement
        : (r.tileset ?? tileset).placement,
    );
    if (placement === undefined) {
      return "design coordinates on a tileset without an engineering frame's placement";
    }
    if (r.design.engineeringFrame !== placement.frame) {
      return "design coordinates in another engineering frame than the placement's";
    }
    const shown = placement.displayed(r.design.design);
    const off = Math.hypot(
      shown[0]! - r.snapPoint[0]!,
      shown[1]! - r.snapPoint[1]!,
      shown[2]! - r.snapPoint[2]!,
    );
    if (!(off <= r.tolerance + 1e-3)) {
      return "design coordinates not where the placement draws snapPoint";
    }
  }
  // What the screen shows: the shown point, else the snapped one.
  const [shown, name] =
    r.shownPoint !== undefined
      ? [r.shownPoint, "shownPoint"]
      : [r.snapPoint, "snapPoint"];
  const distance = cursorDistance(camera, drawnPoint(found, shown), request);
  if (Number.isNaN(distance)) {
    return `${name} behind the camera or nearer than its near plane`;
  }
  if (distance > request.aperture + 1) {
    return `${name} outside the aperture`;
  }
  if (client.hides(found, shown)) {
    return `${name} ${OUT_OF_SIGHT}`;
  }
  return undefined;
}

/**
 * Where triangle `t` (first index into `indices`, vertices eye-relative in
 * `rel`) crosses the ray from the eye (0) along `p` (Möller–Trumbore), as a
 * fraction of the way to `p`; NaN when it doesn't.
 */
function crossing(
  rel: Float64Array,
  indices: Uint32Array,
  t: number,
  px: number,
  py: number,
  pz: number,
): number {
  const i0 = 3 * indices[t]!,
    i1 = 3 * indices[t + 1]!,
    i2 = 3 * indices[t + 2]!;
  const ox = rel[i0]!,
    oy = rel[i0 + 1]!,
    oz = rel[i0 + 2]!;
  const e1x = rel[i1]! - ox,
    e1y = rel[i1 + 1]! - oy,
    e1z = rel[i1 + 2]! - oz;
  const e2x = rel[i2]! - ox,
    e2y = rel[i2 + 1]! - oy,
    e2z = rel[i2 + 2]! - oz;
  const qx = py * e2z - pz * e2y,
    qy = pz * e2x - px * e2z,
    qz = px * e2y - py * e2x;
  const det = e1x * qx + e1y * qy + e1z * qz;
  if (!(Math.abs(det) > 0)) {
    return NaN;
  }
  const inv = 1 / det;
  const u = -(ox * qx + oy * qy + oz * qz) * inv;
  if (u < 0 || u > 1) {
    return NaN;
  }
  const rx = -oy * e1z + oz * e1y,
    ry = -oz * e1x + ox * e1z,
    rz = -ox * e1y + oy * e1x;
  const v = (px * rx + py * ry + pz * rz) * inv;
  if (v < 0 || u + v > 1) {
    return NaN;
  }
  return (e2x * rx + e2y * ry + e2z * rz) * inv;
}

/**
 * Whether a triangle of `g` crosses the camera's line of sight to `point`
 * (body-fixed) beyond the near plane and more than `epsilon` metres (and a
 * millionth of the distance) before it.
 */
function hiddenFrom(
  g: TileGeometry,
  camera: SnapCamera,
  point: ArrayLike<number>,
  epsilon: number,
): boolean {
  const e = camera.position;
  const px = point[0]! - e[0]!,
    py = point[1]! - e[1]!,
    pz = point[2]! - e[2]!;
  const limit = 1 - Math.max(1e-6, epsilon / Math.hypot(px, py, pz));
  const d = camera.direction;
  const first = camera.near / (px * d[0]! + py * d[1]! + pz * d[2]!);
  return (
    meshGeometry(g).rayHit(
      { from: e, to: point },
      {
        origin: e,
        tMin: Math.max(first, Number.MIN_VALUE),
        tMax: limit,
        anyHit: true,
      },
    ).verdict === "hit"
  );
}

interface Found {
  kind: "point" | "segment";
  point: Float64Array;
  distance: number;
  normal?: Float64Array;
  curve?: Float64Array[];
}

/** Outcodes against the aperture's box on the screen. */
const LEFT = 1,
  RIGHT = 2,
  ABOVE = 4,
  BELOW = 8;

/** Work buffers grown to the largest draw snapped to, and reused. */
class Scratch {
  /** Each vertex Earth-fixed, relative to the eye (float64). */
  rel = new Float64Array(0);
  /** Each vertex's CSS pixel (`projected`). */
  pixel = new Float64Array(0);
  /** Depth along the view direction; NaN nearer than the near plane. */
  depth = new Float64Array(0);
  /** Outcode; 0 also for a vertex not in front (never culls). */
  code = new Uint8Array(0);
  /** `stamp` where a vertex was already visited this snap. */
  seen = new Uint32Array(0);
  /** `stamp` where `pixel` holds a vertex's pixel (else camera right, up). */
  projected = new Uint32Array(0);
  stamp = 0;
  /** First index of the triangles the aperture may touch. */
  triangles = new Uint32Array(0);

  reserve(vertices: number, triangles: number): void {
    if (this.depth.length < vertices) {
      const n = Math.max(vertices, 2 * this.depth.length);
      this.rel = new Float64Array(3 * n);
      this.pixel = new Float64Array(2 * n);
      this.depth = new Float64Array(n);
      this.code = new Uint8Array(n);
      this.seen = new Uint32Array(n);
      this.projected = new Uint32Array(n);
      this.stamp = 0;
    }
    if (this.triangles.length < triangles) {
      this.triangles = new Uint32Array(
        Math.max(triangles, 2 * this.triangles.length),
      );
    }
    if (++this.stamp > 0xfffffff0) {
      this.seen.fill(0);
      this.projected.fill(0);
      this.stamp = 1;
    }
  }
}

/**
 * The nearest vertex of `g` to the cursor within `aperture` CSS pixels that
 * the camera sees, else the nearest such point of an edge, as `camera` shows
 * them.
 */
function nearest(
  g: TileGeometry,
  camera: PickCamera,
  cx: number,
  cy: number,
  aperture: number,
  s: Scratch,
  toDrawn?: (p: ArrayLike<number>) => Float64Array,
): Found | undefined {
  const { positions, indices, matrix: m } = g;
  const count = Math.floor(positions.length / 3);
  s.reserve(count, Math.floor(indices.length / 3));
  const { rel, pixel, depth, code, seen, projected, triangles } = s;
  const e = camera.position;
  // Relative to the eye: the translation's difference is taken once, in
  // float64, so the projection and ray tests keep metre-scale precision.
  const tx = m[12]! - e[0]!,
    ty = m[13]! - e[1]!,
    tz = m[14]! - e[2]!;
  const d0 = camera.direction[0]!,
    d1 = camera.direction[1]!,
    d2 = camera.direction[2]!;
  const r0 = camera.right[0]!,
    r1 = camera.right[1]!,
    r2 = camera.right[2]!;
  const u0 = camera.up[0]!,
    u1 = camera.up[1]!,
    u2 = camera.up[2]!;
  const { width, height, near: nearPlane } = camera;
  const tan = Math.tan(camera.fovy / 2);
  const aspect = width / height;
  // The aperture's box as bounds on right/depth and up/depth: a cheap
  // reject (no division) before any vertex is projected to a pixel.
  const left = ((2 * (cx - aperture)) / width - 1) * tan * aspect,
    right = ((2 * (cx + aperture)) / width - 1) * tan * aspect,
    above = (1 - (2 * (cy - aperture)) / height) * tan,
    below = (1 - (2 * (cy + aperture)) / height) * tan;
  for (let v = 0; v < count; v++) {
    const x = positions[3 * v]!,
      y = positions[3 * v + 1]!,
      z = positions[3 * v + 2]!;
    let px: number, py: number, pz: number;
    if (toDrawn) {
      // Where the view draws the vertex, in the camera's coordinates: the
      // aperture is on the screen. The vertex itself stays true.
      const d = toDrawn(absolute(v));
      px = d[0]! - e[0]!;
      py = d[1]! - e[1]!;
      pz = d[2]! - e[2]!;
    } else {
      px = m[0]! * x + m[4]! * y + m[8]! * z + tx;
      py = m[1]! * x + m[5]! * y + m[9]! * z + ty;
      pz = m[2]! * x + m[6]! * y + m[10]! * z + tz;
    }
    rel[3 * v] = px;
    rel[3 * v + 1] = py;
    rel[3 * v + 2] = pz;
    const w = px * d0 + py * d1 + pz * d2;
    if (!(w > 0 && w >= nearPlane)) {
      depth[v] = NaN;
      code[v] = 0;
      continue;
    }
    depth[v] = w;
    // Camera-space right and up, made pixels only where needed.
    const sx = px * r0 + py * r1 + pz * r2,
      sy = px * u0 + py * u1 + pz * u2;
    pixel[2 * v] = sx;
    pixel[2 * v + 1] = sy;
    code[v] =
      (sx < left * w ? LEFT : sx > right * w ? RIGHT : 0) |
      (sy > above * w ? ABOVE : sy < below * w ? BELOW : 0);
  }
  const valid = (v: number) => !Number.isNaN(depth[v]!);

  // The triangles the aperture may touch: not all beyond one side of its box.
  // They hold every candidate, and every occluder of a line of sight through
  // the box.
  let near = 0;
  for (let t = 0; t + 2 < indices.length; t += 3) {
    const a = indices[t]!,
      b = indices[t + 1]!,
      c = indices[t + 2]!;
    if (
      a < count &&
      b < count &&
      c < count &&
      !(code[a]! & code[b]! & code[c]!)
    ) {
      triangles[near++] = t;
    }
  }
  // Their vertices' pixels, as `projectToPixel` gives them.
  for (let i = 0; i < near; i++) {
    const t = triangles[i]!;
    for (let k = 0; k < 3; k++) {
      const v = indices[t + k]!;
      if (projected[v] === s.stamp || !valid(v)) {
        continue;
      }
      projected[v] = s.stamp;
      const f = tan * depth[v]!;
      pixel[2 * v] = ((pixel[2 * v]! / (f * aspect) + 1) / 2) * width;
      pixel[2 * v + 1] = ((1 - pixel[2 * v + 1]! / f) / 2) * height;
    }
  }

  // Vertices first, nearest first, the first the camera sees.
  const vertices: { v: number; d: number }[] = [];
  for (let i = 0; i < near; i++) {
    const t = triangles[i]!;
    for (let k = 0; k < 3; k++) {
      const v = indices[t + k]!;
      if (seen[v] === s.stamp) {
        continue;
      }
      seen[v] = s.stamp;
      if (code[v] !== 0 || !valid(v)) {
        continue;
      }
      const d = Math.hypot(pixel[2 * v]! - cx, pixel[2 * v + 1]! - cy);
      if (d <= aperture) {
        vertices.push({ v, d });
      }
    }
  }
  vertices.sort((p, q) => p.d - q.d);
  for (const { v, d } of vertices) {
    const at = rel.subarray(3 * v, 3 * v + 3);
    if (!hidden(at, (t) => has(t, v))) {
      const found: Found = { kind: "point", point: absolute(v), distance: d };
      return withNormal(found, at, (t) => has(t, v));
    }
  }

  // Then edges: the nearest point on the screen, and the 3D point that
  // projects there (perspective-correct along the edge).
  const edges: { a: number; b: number; s: number; d: number }[] = [];
  for (let i = 0; i < near; i++) {
    const t = triangles[i]!;
    for (let k = 0; k < 3; k++) {
      const a = indices[t + k]!;
      const b = indices[t + ((k + 1) % 3)]!;
      if (code[a]! & code[b]! || !valid(a) || !valid(b)) {
        continue;
      }
      const ax = pixel[2 * a]!,
        ay = pixel[2 * a + 1]!;
      const ex = pixel[2 * b]! - ax,
        ey = pixel[2 * b + 1]! - ay;
      const length2 = ex * ex + ey * ey;
      if (!(length2 > 0)) {
        continue;
      }
      const f = Math.min(
        1,
        Math.max(0, ((cx - ax) * ex + (cy - ay) * ey) / length2),
      );
      const d = Math.hypot(ax + f * ex - cx, ay + f * ey - cy);
      if (d <= aperture) {
        edges.push({ a, b, s: f, d });
      }
    }
  }
  edges.sort((p, q) => p.d - q.d);
  const at = new Float64Array(3);
  for (const { a, b, s: f, d } of edges) {
    const wa = depth[a]!,
      wb = depth[b]!;
    // A screen fraction f is the fraction f·wa / (f·wa + (1 - f)·wb) in 3D.
    const u = (f * wa) / (f * wa + (1 - f) * wb);
    for (let i = 0; i < 3; i++) {
      at[i] = rel[3 * a + i]! + u * (rel[3 * b + i]! - rel[3 * a + i]!);
    }
    const onEdge = (t: number) => has(t, a) && has(t, b);
    if (hidden(at, onEdge)) {
      continue;
    }
    const A = absolute(a),
      B = absolute(b);
    const p = new Float64Array(3);
    for (let i = 0; i < 3; i++) {
      p[i] = A[i]! + u * (B[i]! - A[i]!);
    }
    return withNormal(
      { kind: "segment", point: p, distance: d, curve: [A, B] },
      at,
      onEdge,
    );
  }
  return undefined;

  /** Whether triangle `t` (first index) has vertex `v`. */
  function has(t: number, v: number): boolean {
    return indices[t] === v || indices[t + 1] === v || indices[t + 2] === v;
  }

  /** A vertex Earth-fixed, as the matrix places it (exactly as drawn). */
  function absolute(v: number): Float64Array {
    const x = positions[3 * v]!,
      y = positions[3 * v + 1]!,
      z = positions[3 * v + 2]!;
    return Float64Array.from([
      m[0]! * x + m[4]! * y + m[8]! * z + m[12]!,
      m[1]! * x + m[5]! * y + m[9]! * z + m[13]!,
      m[2]! * x + m[6]! * y + m[10]! * z + m[14]!,
    ]);
  }

  /**
   * Whether a triangle other than `skip`'s crosses the line of sight from
   * the eye to `p` (eye-relative) before it, by more than a millionth of the
   * distance (and a millimetre), and beyond the near plane (nearer isn't
   * drawn).
   */
  function hidden(p: Float64Array, skip: (t: number) => boolean): boolean {
    const px = p[0]!,
      py = p[1]!,
      pz = p[2]!;
    const limit = 1 - Math.max(1e-6, 1e-3 / Math.hypot(px, py, pz));
    const d = camera.direction;
    // The fraction of the way to p where the near plane is.
    const first = camera.near / (px * d[0]! + py * d[1]! + pz * d[2]!);
    for (let i = 0; i < near; i++) {
      const t = triangles[i]!;
      if (skip(t)) {
        continue;
      }
      const along = crossing(rel, indices, t, px, py, pz);
      if (along >= first && along > 0 && along < limit) {
        return true;
      }
    }
    return false;
  }

  /**
   * The unit normal of a triangle at the snap facing the camera (another,
   * flipped toward it, when none does).
   */
  function withNormal(
    found: Found,
    p: Float64Array,
    at: (t: number) => boolean,
  ): Found {
    let fallback: Float64Array | undefined;
    for (let i = 0; i < near; i++) {
      const t = triangles[i]!;
      if (!at(t)) {
        continue;
      }
      const i0 = 3 * indices[t]!,
        i1 = 3 * indices[t + 1]!,
        i2 = 3 * indices[t + 2]!;
      const ux = rel[i1]! - rel[i0]!,
        uy = rel[i1 + 1]! - rel[i0 + 1]!,
        uz = rel[i1 + 2]! - rel[i0 + 2]!;
      const vx = rel[i2]! - rel[i0]!,
        vy = rel[i2 + 1]! - rel[i0 + 1]!,
        vz = rel[i2 + 2]! - rel[i0 + 2]!;
      const n = Float64Array.from([
        uy * vz - uz * vy,
        uz * vx - ux * vz,
        ux * vy - uy * vx,
      ]);
      const length = Math.hypot(n[0]!, n[1]!, n[2]!);
      if (!(length > 0)) {
        continue;
      }
      // The eye is at 0: facing it is a negative dot with p.
      const facing = n[0]! * p[0]! + n[1]! * p[1]! + n[2]! * p[2]! < 0;
      // Which way the triangle faces is as it is drawn; its normal is the
      // true triangle's, wound as drawn.
      const normal = toDrawn
        ? trueNormal(indices[t]!, indices[t + 1]!, indices[t + 2]!)
        : n;
      const size = toDrawn
        ? Math.hypot(normal[0]!, normal[1]!, normal[2]!)
        : length;
      if (!(size > 0)) {
        continue;
      }
      for (let k = 0; k < 3; k++) {
        normal[k] = (normal[k]! / size) * (facing ? 1 : -1);
      }
      if (facing) {
        return { ...found, normal };
      }
      fallback ??= normal;
    }
    return fallback === undefined ? found : { ...found, normal: fallback };
  }

  /** The (unnormalized) normal of the true triangle of vertices a, b, c, in float64. */
  function trueNormal(a: number, b: number, c: number): Float64Array {
    const A = absolute(a),
      B = absolute(b),
      C = absolute(c);
    const ux = B[0]! - A[0]!,
      uy = B[1]! - A[1]!,
      uz = B[2]! - A[2]!;
    const vx = C[0]! - A[0]!,
      vy = C[1]! - A[1]!,
      vz = C[2]! - A[2]!;
    return Float64Array.from([
      uy * vz - uz * vy,
      uz * vx - ux * vz,
      ux * vy - uy * vx,
    ]);
  }
}
