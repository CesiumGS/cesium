// Curved clips (plan §13.26, increment 8c): a clip set whose frame reaches a
// draw's content only across a warp that bends it (a plane named in a design
// CRS, the content in ITRF or drawn exaggerated) is a curved surface in the
// content's own coordinates. Its signed distance is fitted per draw as a scalar
// cubic lattice over the cells of the draw's position fit, and rides in the
// free `w` channel of the lattice's rows (`ClipField`, placementTable.ts);
// the vertex stage evaluates it at the design position and the fragment
// stage discards by its sign (surface.slang `CLIP_SET_CURVED`).
//
// - **Evaluated in the set's frame, in float64.** A draw's model point goes
//   to its anchor's coordinates by its matrix, and from the anchor's frame to
//   the set's by the route (`resolveRoute`, `routeForward`): the point where
//   the content is, not where it is drawn, so a plane cuts the true surface
//   of an exaggerated tile. The route's warps at the scales they had at the
//   fit; a scale that moves later isn't followed (a refit follows a route's
//   revision).
// - **One field per draw.** The `w` channel holds one scalar, so a world's
//   curved sets are one field: the views' curved sets combine by max (kept
//   where every one keeps). Views of a world that use different curved sets
//   share the first one's field; the others' are left out and reported.
// - **Carriers.** A draw with no lattice (ITRF content under an ITRF root,
//   or only morph attributes) gets a lattice of weight 0 and no displacement
//   that carries the field, with the cells that meet the tolerance (at most
//   `CARRIER_MAX_CELLS` per axis); a draw with a lattice uses its first
//   lattice's cells. Either way the draw's placement block is rewritten
//   whenever its field is, through `setPlacement`: `decorate` runs inside it,
//   so every route to a draw's terms (the route's fit, the application's
//   placement) carries the field.
// - **Accuracy.** A field's `errorBound` is the largest residual at 9³
//   points per cell against the float64 distance (`status`), the distance's
//   kinks (a box's edge, a union's crease) included: the cut is that
//   accurate where the surface is smooth. The vertex stage's value is
//   interpolated between vertices, so the cut also follows the mesh's chords,
//   as the drawn surface does.
// - **Not covered.** Billboards, point sets and instanced draws (they have no
//   per-vertex placement) are cut by the true or drawn tests only, and a
//   draw with `MAX_WARP_TERMS` terms and no lattice has no room for a
//   carrier: both are said once.
import type { FrameKey, FrameResolver } from "../../camera/frameResolver.ts";
import { resolveRoute, routeForward, type Route } from "../../camera/route.ts";
import {
  CENTER_WORD,
  FLAGS_WORD,
  INSTANCE_COUNT_WORD,
  RADIUS_WORD,
  RECORD_WORDS,
  RecordFlags,
} from "../../render/layout.ts";
import { fitClipField, type ScalarFunction } from "../warpFit.ts";
import {
  MAX_WARP_TERMS,
  constantWeight,
  type ClipField,
  type CubicLattice,
  type WarpTerms,
} from "../warpTerms.ts";
import { PLACEMENT_TERMS } from "../placement.ts";
import { clipSetDistance, type ClipSet } from "./clips.ts";
import { setPlacement } from "./placements.ts";
import type { World } from "../World.ts";
import type { DrawHandle } from "./types.ts";

/** Cells per axis a carrier lattice may take to meet its tolerance. */
export const CARRIER_MAX_CELLS = 4;

/** The tolerance's floor, m (as the position fits'). */
const TOLERANCE_FLOOR = 1e-3;

/** What a fit hears of the tile's geometric error (as the position fits'). */
const GEOMETRIC_ERROR_SHARE = 1 / 64;

/** What the engine tells a world's curved clips each tick. */
export interface CurvedClipTick {
  readonly resolver: FrameResolver;
  /** The scene time, UTC seconds since 1970. */
  readonly seconds: number;
  /** Each view's curved sets (`curvedClipSets`), in the view's order; views without any are left out. */
  readonly demands: ReadonlyArray<readonly ClipSet[]>;
}

/** How a draw's field stands (`WorldCurvedClips.status`). */
export interface CurvedClipStatus {
  /** "fitted": drawn at the current field; "stale": an older one is drawn while a refit waits; "pending": none yet; "failed": it couldn't be fitted, the draw is uncut. */
  readonly state: "fitted" | "stale" | "pending" | "failed" | "unsupported";
  /** The field's worst residual against float64, m; 0 where there is none. */
  readonly errorBound: number;
  /** Cells per axis the field is fitted over. */
  readonly cells: number;
  /** The draw's lattice only carries the field (weight 0, no displacement). */
  readonly carrier: boolean;
}

/** A draw's field and what it was fitted for. */
interface Entry {
  readonly generation: number;
  /** The terms the draw was given, before the field was put on them. */
  base: WarpTerms | undefined;
  /** The sets, the draw's anchor and matrix, the routes' revision and the tile the field is for. */
  sets: readonly ClipSet[] | undefined;
  anchor: FrameKey | undefined;
  readonly matrix: Float64Array;
  routes: number;
  tile: string;
  field: ClipField | undefined;
  cells: number;
  carrier: boolean;
  failed: string | undefined;
}

const sameSets = (
  a: readonly ClipSet[] | undefined,
  b: readonly ClipSet[] | undefined,
): boolean =>
  a !== undefined &&
  b !== undefined &&
  a.length === b.length &&
  a.every((s, i) => s === b[i]);

function sameMatrix(a: Float64Array, b: Float64Array): boolean {
  for (let i = 0; i < 16; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

export class WorldCurvedClips {
  /** The sets the world's draws carry the field of; undefined: none. */
  #sets: readonly ClipSet[] | undefined;
  #tick: CurvedClipTick | undefined;
  #report: ((message: string) => void) | undefined;
  readonly #entries = new Map<number, Entry>();
  readonly #pending = new Set<number>();
  readonly #said = new Set<string>();
  #transformRevision = -1;
  readonly #scratch = new Float64Array(16);

  constructor(
    private readonly world: World,
    private readonly geometricError: (index: number) => number,
  ) {}

  /** Whether the world's draws carry a field now. */
  get active(): boolean {
    return this.#sets !== undefined;
  }

  /** Draws whose field is not yet drawn. */
  get pending(): number {
    return this.#pending.size;
  }

  /** Whether the world's field is `sets` (a view's curved sets): the view's table may test it. */
  serves(sets: readonly ClipSet[]): boolean {
    return sameSets(sets, this.#sets);
  }

  /** How the draw's field stands, if the world has one. */
  status(handle: DrawHandle): CurvedClipStatus | undefined {
    if (!this.#sets || !this.world.hasDraw(handle)) {
      return undefined;
    }
    if (!this.#eligible(handle.index)) {
      return { state: "unsupported", errorBound: 0, cells: 0, carrier: false };
    }
    const entry = this.#entries.get(handle.index);
    if (!entry || entry.generation !== handle.generation) {
      return { state: "pending", errorBound: 0, cells: 0, carrier: false };
    }
    const state = entry.failed
      ? "failed"
      : entry.field === undefined
        ? "pending"
        : entry.sets === this.#sets && !this.#pending.has(handle.index)
          ? "fitted"
          : "stale";
    return {
      state,
      errorBound: entry.field?.errorBound ?? 0,
      cells: entry.cells,
      carrier: entry.carrier,
    };
  }

  /** The field's error (m) of the draw at `index`, 0 where it has none (joins the position fit's error: `WorldWarps.fitError`). */
  errorOf(index: number): number {
    return this.#entries.get(index)?.field?.errorBound ?? 0;
  }

  /** A draw was added: it takes the field if the world has one. */
  drawAdded(handle: DrawHandle): void {
    if (this.#sets) {
      this.#pending.add(handle.index);
    }
  }

  /** A draw is being removed. */
  drawRemoved(handle: DrawHandle): void {
    this.#entries.delete(handle.index);
    this.#pending.delete(handle.index);
  }

  clear(): void {
    this.#entries.clear();
    this.#pending.clear();
    this.#sets = undefined;
    this.#tick = undefined;
  }

  /**
   * The frame's step: the world's field follows its views' curved sets; draws
   * that need one are fitted for up to `budgetMs`. Returns whether any wait.
   */
  frame(
    tick: CurvedClipTick,
    budgetMs: number,
    report: (message: string) => void,
  ): boolean {
    this.#tick = tick;
    this.#report = report;
    const wanted = tick.demands.filter((d) => d.length > 0);
    const chosen =
      wanted.find((d) => sameSets(d, this.#sets)) ?? wanted[0] ?? undefined;
    if (wanted.some((d) => !sameSets(d, chosen))) {
      this.#say(
        "views",
        "clips: views of a world use different curved clips; a draw carries one field, so the first view's is cut and the others' curved clips are left out.",
      );
    }
    if (!sameSets(chosen, this.#sets)) {
      this.#use(chosen);
    }
    if (!this.#sets) {
      return false;
    }
    this.#follow(tick);
    const deadline = performance.now() + budgetMs;
    let first = true;
    for (const index of [...this.#pending]) {
      if (!first && performance.now() >= deadline) {
        break;
      }
      first = false;
      this.#pending.delete(index);
      this.#apply(index);
    }
    return this.#pending.size > 0;
  }

  /**
   * Puts the field on the terms a draw is being given (`setPlacement`, the
   * one place every placement of a draw goes through): the first lattice's
   * rows carry it, or a lattice of weight 0 that only carries it. Returns
   * `terms` as they are where the draw has no field: none in this world, no
   * per-vertex placement, no room, or the fit couldn't be made.
   */
  decorate(index: number, terms: WarpTerms | undefined): WarpTerms | undefined {
    if (!this.#sets || !this.#tick || !this.#eligible(index)) {
      this.#entries.delete(index);
      return terms;
    }
    const generation = this.world.raster.drawGeneration[index]!;
    let entry = this.#entries.get(index);
    if (!entry || entry.generation !== generation) {
      entry = {
        generation,
        base: undefined,
        sets: undefined,
        anchor: undefined,
        matrix: new Float64Array(16),
        routes: -1,
        tile: "",
        field: undefined,
        cells: 0,
        carrier: false,
        failed: undefined,
      };
      this.#entries.set(index, entry);
    }
    entry.base = terms;
    const at = terms?.findIndex(({ term }) => term.kind === "cubic") ?? -1;
    const carried = at >= 0 ? (terms![at]!.term as CubicLattice) : undefined;
    if (!carried && (terms?.length ?? 0) >= MAX_WARP_TERMS) {
      this.#say(
        "room",
        `clips: a draw with ${MAX_WARP_TERMS} terms and no lattice has no room for a curved clip's field; it is not cut by it.`,
      );
      entry.field = undefined;
      return terms;
    }
    const handle = this.#handle(index, generation);
    const anchor = this.world.drawAnchor(handle) ?? this.world.root;
    const matrix = this.world.drawMatrix(handle, this.#scratch)!;
    const tile = carried
      ? { center: carried.center, scale: carried.scale }
      : this.#sphere(index);
    const key = `${carried ? `c${carried.cells}` : "k"}:${Array.from(tile.center).join(",")}:${tile.scale}`;
    const tick = this.#tick;
    const routes = this.#routesOf(anchor, tick);
    const same =
      entry.sets === this.#sets &&
      entry.anchor === anchor &&
      entry.routes === routes &&
      entry.tile === key &&
      sameMatrix(entry.matrix, matrix);
    if (!same || (!entry.field && !entry.failed)) {
      entry.sets = this.#sets;
      entry.anchor = anchor;
      entry.routes = routes;
      entry.tile = key;
      entry.matrix.set(matrix);
      entry.field = undefined;
      entry.failed = undefined;
      try {
        const geometricError = this.geometricError(index);
        const tolerance = Math.max(
          TOLERANCE_FLOOR,
          geometricError * GEOMETRIC_ERROR_SHARE,
        );
        const fit = fitClipField(this.#scalar(anchor, matrix, tick), tile, {
          tolerance,
          ...(carried
            ? { cells: carried.cells }
            : { maxCells: CARRIER_MAX_CELLS }),
          operation: `${this.#sets.length} curved clip${this.#sets.length === 1 ? "" : "s"} from ${anchor.name}`,
        });
        entry.field = fit.field;
        entry.cells = fit.cells;
        entry.carrier = !carried;
      } catch (error) {
        entry.failed = error instanceof Error ? error.message : String(error);
        this.#say(
          `fit:${entry.failed}`,
          `clips: a curved clip's field could not be fitted (${entry.failed}); the draw is not cut by it.`,
        );
      }
    }
    if (!entry.field) {
      return terms;
    }
    const field = entry.field;
    if (carried) {
      return terms!.map((t, i) =>
        i === at ? { ...t, term: { ...carried, clip: field } } : t,
      );
    }
    const cells = entry.cells;
    const lattice: CubicLattice = {
      kind: "cubic",
      center: Array.from(tile.center),
      scale: tile.scale,
      cells,
      coefficients: new Float64Array(cells ** 3 * PLACEMENT_TERMS * 3),
      errorBound: 0,
      estimate: false,
      operation: "curved clip carrier",
      clip: field,
    };
    return [...(terms ?? []), { term: lattice, weight: constantWeight(0) }];
  }

  // ------------------------------------------------------------------ steps

  /** The world's field is now for `sets`: every draw that can carry it is asked to. */
  #use(sets: readonly ClipSet[] | undefined): void {
    this.#sets = sets;
    if (!sets) {
      // Back to what the draws were given: each is set again without the field.
      const indices = [...this.#entries.keys()];
      this.#pending.clear();
      for (const index of indices) {
        this.#apply(index);
      }
      this.#entries.clear();
      return;
    }
    const raster = this.world.raster;
    for (let index = 0; index < raster.drawCount; index++) {
      if (raster.drawBatches[index] !== undefined && this.#eligible(index)) {
        this.#pending.add(index);
      }
    }
  }

  /** Draws whose transforms or routes changed are fitted again. */
  #follow(tick: CurvedClipTick): void {
    const revision = this.world.scene.transformRevision_;
    const moved = revision !== this.#transformRevision;
    this.#transformRevision = revision;
    const routes = new Map<FrameKey, number>();
    for (const [index, entry] of this.#entries) {
      if (this.#pending.has(index)) {
        continue;
      }
      let outdated = entry.sets !== this.#sets;
      if (!outdated && entry.anchor) {
        let r = routes.get(entry.anchor);
        if (r === undefined) {
          r = this.#routesOf(entry.anchor, tick);
          routes.set(entry.anchor, r);
        }
        outdated = r !== entry.routes;
      }
      if (!outdated && moved) {
        const handle = this.#handle(index, entry.generation);
        const m = this.world.drawMatrix(handle, this.#scratch);
        outdated = m !== undefined && !sameMatrix(m, entry.matrix);
      }
      if (outdated) {
        this.#pending.add(index);
      }
    }
  }

  /** Sets the draw's placement again: `decorate` puts the field on its terms. */
  #apply(index: number): void {
    const raster = this.world.raster;
    if (raster.drawBatches[index] === undefined) {
      return;
    }
    const handle = this.#handle(index, raster.drawGeneration[index]!);
    if (!this.world.hasDraw(handle)) {
      return;
    }
    const placed = this.world.scene.drawPlacements[index];
    const entry = this.#entries.get(index);
    const held = entry && entry.generation === handle.generation;
    const given = placed?.placement ?? (held ? entry.base : placed?.terms);
    try {
      setPlacement(this.world, handle, given);
    } catch (error) {
      this.#say(
        "apply",
        `clips: a draw's curved-clip field could not be drawn: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ---------------------------------------------------------------- helpers

  /** Whether the draw is a mesh a per-vertex placement reaches. */
  #eligible(index: number): boolean {
    const raster = this.world.raster;
    const o = index * RECORD_WORDS;
    const flags = raster.recordsU32[o + FLAGS_WORD]!;
    if (flags & (RecordFlags.billboard | RecordFlags.points)) {
      this.#say(
        "kind",
        "clips: a billboard or point draw has no per-vertex placement to carry a curved clip's field; it is not cut by one.",
      );
      return false;
    }
    if (raster.recordsU32[o + INSTANCE_COUNT_WORD]! > 0) {
      this.#say(
        "instances",
        "clips: an instanced draw has no per-vertex placement to carry a curved clip's field; it is not cut by one.",
      );
      return false;
    }
    return true;
  }

  /** The draw's bounding sphere without its placement, as the placement's own base. */
  #sphere(index: number): { center: number[]; scale: number } {
    const own = this.world.scene.drawPlacements[index];
    const raster = this.world.raster;
    const o = index * RECORD_WORDS;
    const center = own
      ? [...own.center]
      : [0, 1, 2].map((i) => raster.recordsF32[o + CENTER_WORD + i]!);
    const radius = own?.base ?? raster.recordsF32[o + RADIUS_WORD]!;
    return { center, scale: Math.max(radius, 1e-3) };
  }

  /** A number that changes when a route from `anchor` to any set's frame does. */
  #routesOf(anchor: FrameKey, tick: CurvedClipTick): number {
    let sum = 0;
    for (const set of this.#sets ?? []) {
      if (set.frame !== anchor) {
        try {
          sum = sum * 31 + tick.resolver.routeRevision(anchor, set.frame) + 1;
        } catch {
          sum = sum * 31 - 1;
        }
      }
    }
    return sum;
  }

  /** The field's value at a model point of a draw in `anchor`, in float64: the sets' greatest signed distance. */
  #scalar(
    anchor: FrameKey,
    matrix: Float64Array,
    tick: CurvedClipTick,
  ): ScalarFunction {
    const sets = this.#sets!;
    const routes: Array<Route | undefined> = sets.map((set) =>
      set.frame === anchor
        ? undefined
        : resolveRoute(tick.resolver, anchor, set.frame, tick.seconds),
    );
    const a = new Float64Array(3);
    const q = new Float64Array(3);
    return (p) => {
      a[0] =
        matrix[0]! * p[0]! +
        matrix[4]! * p[1]! +
        matrix[8]! * p[2]! +
        matrix[12]!;
      a[1] =
        matrix[1]! * p[0]! +
        matrix[5]! * p[1]! +
        matrix[9]! * p[2]! +
        matrix[13]!;
      a[2] =
        matrix[2]! * p[0]! +
        matrix[6]! * p[1]! +
        matrix[10]! * p[2]! +
        matrix[14]!;
      let f = -Infinity;
      for (let i = 0; i < sets.length; i++) {
        const route = routes[i];
        f = Math.max(
          f,
          clipSetDistance(sets[i]!, route ? routeForward(route, a, q) : a),
        );
      }
      return f;
    };
  }

  #handle(index: number, generation: number): DrawHandle {
    return { index, generation, name: undefined };
  }

  #say(key: string, message: string): void {
    if (this.#report && !this.#said.has(key)) {
      this.#said.add(key);
      this.#report(message);
    }
  }
}
