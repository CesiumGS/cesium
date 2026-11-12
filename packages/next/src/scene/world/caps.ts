// Caps for clips (plan §13.26, "Clip planes and caps: decided by the owner",
// items 5 to 7; increment 8b). A clip removes content per fragment; a cap is
// the surface that closes the cut.
//
// - **B-rep caps are exact** (`BrepCaps`): the section of the solid by each
//   plane of the set (src/brep/section.ts) gives planar faces with trimmed
//   loops, drawn as a b-rep of their own through `addBrep`, so they are diced
//   per view with per-pixel trims, and queried and picked as any form.
// - **Mesh caps are geometry** (`MeshCaps`): tiles' triangles are cut, and
//   segments are joined per element across every tile and triangulated
//   (src/scene/world/meshCaps.ts); chains that do not close are drawn as
//   section lines and reported.
//
// Both are rebuilt when the clip moves, within a per-frame budget
// (`CapScheduler`), and each cap lies a hair inside what the clip keeps (the
// `bias`), so the clip that made it does not remove it: a cap is on the plane
// itself, and a per-fragment test of the plane would drop half of it to
// rounding. Styling is the styling language's (§13.27: hatching per material
// or element, by planar fill, not built yet): a cap has a feature ID per
// element and a default flat colour, and `style` is where the language will
// hook in.
import {
  SectionJob,
  type SectionOptions,
  type SectionReport,
} from "../../brep/section.ts";
import type { SectionOutcome, SectionRunner } from "../../brep/sectionHost.ts";
import type { BrepForm } from "../../brep/form.ts";
import type { Mat4 } from "../../math/mat4.ts";
import type { World } from "../World.ts";
import { addBrep, removeBrep, type BrepHandle } from "./brep.ts";
import { capPlanes, type CapPlane, type ClipSet } from "./clips.ts";
import {
  assembleMeshCaps,
  meshPlane,
  rayHitRegions,
  sectionTile,
  tileBounds,
  type MeshCapHit,
  type MeshCapPlane,
  type MeshCapRegion,
  type MeshCapReport,
  type MeshCapTile,
  type TileSection,
} from "./meshCaps.ts";
import type { SectionPlane } from "../../brep/sectionCurves.ts";
import type { DrawHandle, DrawOptions, MeshHandle } from "./types.ts";

/** Linear RGBA. */
export type CapColor = readonly [number, number, number, number];

/** The default flat colour of a cap. */
export const DEFAULT_CAP_COLOR: CapColor = [0.78, 0.74, 0.68, 1];
/** The default colour of a section line (a chain that did not close). */
export const DEFAULT_SECTION_LINE_COLOR: CapColor = [1, 0.35, 0.1, 1];
const WHITE: CapColor = [1, 1, 1, 1];

/** What a style is asked about: a cap of one element. */
export interface CapStyleInput {
  readonly kind: "brep" | "mesh";
  /** The element's ID for a mesh cap (its features' ID); undefined for a b-rep's cap, which is one solid's. */
  readonly feature: number | undefined;
}

/**
 * Where the styling language (§13.27) will say how a cap looks, per element:
 * a colour for now. Undefined keeps the default.
 */
export type CapStyle = (input: CapStyleInput) => CapColor | undefined;

/** What the cap pass needs of a world: a `World`. */
export type CapWorld = World;

/** Placement of drawn meshes: as `DrawOptions` places a draw. */
export type CapPlacement = Pick<
  DrawOptions,
  "transform" | "parent" | "origin" | "model"
>;

/**
 * How a b-rep's caps are placed and drawn: `World.addBrep`'s options for the
 * solid itself (the caps are in the form's coordinates, so the same placement
 * puts them where the solid is).
 */
export interface CapDrawOptions extends Pick<
  DrawOptions,
  | "doubleSided"
  | "ground"
  | "material"
  | "name"
  | "parent"
  | "origin"
  | "model"
  | "shader"
  | "textureSet"
  | "transform"
  | "viewMask"
> {
  /** The error a cell of the GPU path may leave, pixels (default half a pixel). */
  errorPixels?: number;
  /** The most chunks of 4 × 4 cells a patch draw lists per view. */
  maxChunks?: number;
  /** The display tolerance of the faces' trims as a share of a face's size. */
  trimTolerance?: number;
}

/** The draws of b-rep caps: the faces' patch draws (the trimmed ones, and those with a rect that is complete). */
export interface CapDraws {
  /** Cap faces whose rect is complete: early depth. Undefined when none is. */
  readonly patches: DrawHandle | undefined;
  /** Cap faces with a trim: the per-pixel trim test. Undefined when none is. */
  readonly trimmed: DrawHandle | undefined;
  /** Faces drawn from a CPU mesh, if any. */
  readonly mesh: DrawHandle | undefined;
}

/** How far inside what the clip keeps a cap lies, m (default 2e-5 of the content's size, at least 1e-6). */
export interface CapBias {
  readonly meters: number;
}

// --- similarity transforms --------------------------------------------------------------

const IDENTITY: Mat4 = Float64Array.from([
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
]) as unknown as Mat4;

/** The inverse of a rotation, translation and uniform scale (column-major 4 × 4), and its scale. */
export function invertSimilarity(m: ArrayLike<number>): {
  inverse: Float64Array;
  scale: number;
} {
  const s2 = m[0]! * m[0]! + m[1]! * m[1]! + m[2]! * m[2]!;
  const out = new Float64Array(16);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[c * 4 + r] = m[r * 4 + c]! / s2;
    }
  }
  for (let r = 0; r < 3; r++) {
    out[12 + r] = -(
      out[r]! * m[12]! +
      out[4 + r]! * m[13]! +
      out[8 + r]! * m[14]!
    );
  }
  out[15] = 1;
  return { inverse: out, scale: Math.sqrt(s2) };
}

const point = (
  m: ArrayLike<number>,
  p: ArrayLike<number>,
): [number, number, number] => [
  m[0]! * p[0]! + m[4]! * p[1]! + m[8]! * p[2]! + m[12]!,
  m[1]! * p[0]! + m[5]! * p[1]! + m[9]! * p[2]! + m[13]!,
  m[2]! * p[0]! + m[6]! * p[1]! + m[10]! * p[2]! + m[14]!,
];

const direction = (
  m: ArrayLike<number>,
  d: ArrayLike<number>,
): [number, number, number] => {
  const x = m[0]! * d[0]! + m[4]! * d[1]! + m[8]! * d[2]!;
  const y = m[1]! * d[0]! + m[5]! * d[1]! + m[9]! * d[2]!;
  const z = m[2]! * d[0]! + m[6]! * d[1]! + m[10]! * d[2]!;
  const n = Math.hypot(x, y, z);
  return [x / n, y / n, z / n];
};

/**
 * The set's cap planes with every plane moved `bias` (m, in the planes' own
 * frame) inside what is kept: the cap's plane against its outward normal, and
 * each limit's against its own, so the caps' edges stay inside the other
 * planes too.
 */
export function biasedCapPlanes(
  planes: readonly CapPlane[],
  bias: number,
): CapPlane[] {
  const move = (
    p: readonly number[],
    n: readonly number[],
  ): [number, number, number] => {
    const length = Math.hypot(n[0]!, n[1]!, n[2]!);
    return [
      p[0]! - (bias * n[0]!) / length,
      p[1]! - (bias * n[1]!) / length,
      p[2]! - (bias * n[2]!) / length,
    ];
  };
  return planes.map((plane) => ({
    point: move(plane.point, plane.normal),
    normal: plane.normal,
    limits: plane.limits.map((limit) => ({
      point: move(limit.point, limit.normal),
      normal: limit.normal,
    })),
  }));
}

// --- the scheduler ------------------------------------------------------------------------

/** What the scheduler rebuilds. */
export interface Rebuildable {
  /** Whether the caps are out of date. */
  readonly dirty: boolean;
  /** When (ms) the clip last changed. */
  readonly changedAt: number;
  /** Brings the caps up to date; for a part that can be done in pieces, `budgetMs` is how long it may take. Returns whether it is done. */
  rebuild(budgetMs: number): boolean;
  /** The caps wait on work that runs elsewhere (a worker), which calls `onChange` when it is done: the scheduler need not tick meanwhile. */
  readonly waiting?: boolean;
  /** Set by the scheduler: called when the caps go out of date (a clip or a tile changed), or when work that ran elsewhere finishes, so a resting engine wakes to rebuild. */
  onChange?: (() => void) | undefined;
}

/** What a scheduler needs of an engine to run itself: `Engine` has it. */
export interface CapEngine {
  /** Calls `listener` at the end of each frame of the loop; returns the remover. */
  onAfterTick(listener: (now: number) => void): () => void;
  /** Asks the loop for a tick. */
  wake(): void;
}

export interface CapSchedulerOptions {
  /** The least time between rebuilds of one item while its clip keeps moving, ms (default 100): a throttle, so a drag rebuilds a few times a second and the last position always lands. */
  readonly intervalMs?: number;
  /** The time a tick may spend, ms (default 4): a rebuild that starts may run past it, as one section is not split. */
  readonly budgetMs?: number;
  /**
   * The engine whose loop runs the scheduler: it ticks at the end of every
   * frame, and a clip or tile that changes wakes the loop (as does work still
   * to do), so caps are rebuilt without the application calling `tick` or
   * `requestRender`. Without it the application calls `tick` and wakes the
   * engine itself (`wake`).
   */
  readonly engine?: CapEngine;
  /** Called when something needs a tick (an item changed or finished work elsewhere): `engine.wake` by default. */
  readonly wake?: () => void;
}

/** What a tick did. */
export interface CapTick {
  /** Items rebuilt (finished) this tick. */
  readonly rebuilt: number;
  /** Items still out of date. */
  readonly pending: number;
  /** Time spent, ms. */
  readonly spentMs: number;
}

/** Rebuilds caps within a per-frame budget (`tick` once a frame, or by itself with `engine`). */
export class CapScheduler {
  private readonly items = new Set<Rebuildable & { lastBuilt?: number }>();
  private readonly interval: number;
  private readonly budget: number;
  private readonly wake: (() => void) | undefined;
  private offTick: (() => void) | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(options: CapSchedulerOptions = {}) {
    this.interval = options.intervalMs ?? 100;
    this.budget = options.budgetMs ?? 4;
    const { engine } = options;
    this.wake = options.wake ?? (engine ? () => engine.wake() : undefined);
    if (engine) {
      this.offTick = engine.onAfterTick(() => {
        this.tick();
      });
    }
  }

  add(item: Rebuildable): void {
    this.items.add(item);
    item.onChange = () => this.wake?.();
    if (item.dirty) {
      this.wake?.();
    }
  }

  remove(item: Rebuildable): void {
    if (this.items.delete(item)) {
      item.onChange = undefined;
    }
  }

  /** Stops ticking with the engine and lets go of the items. */
  dispose(): void {
    this.offTick?.();
    this.offTick = undefined;
    clearTimeout(this.timer);
    this.timer = undefined;
    for (const item of this.items) {
      item.onChange = undefined;
    }
    this.items.clear();
  }

  tick(now: number = performance.now()): CapTick {
    const start = performance.now();
    let rebuilt = 0;
    let pending = 0;
    /** Whether the next frame can make progress, and the soonest a throttled item is due. */
    let progress = false;
    let soonest = Infinity;
    for (const item of this.items) {
      if (!item.dirty) {
        continue;
      }
      const wait =
        item.lastBuilt === undefined
          ? 0
          : Math.max(0, this.interval - (now - item.lastBuilt));
      const spent = performance.now() - start;
      if (wait > 0 || (rebuilt > 0 && spent >= this.budget)) {
        pending++;
        if (wait > 0) {
          soonest = Math.min(soonest, wait);
        } else {
          progress = true;
        }
        continue;
      }
      if (item.rebuild(Math.max(0, this.budget - spent))) {
        item.lastBuilt = now;
        rebuilt++;
        // The clip may have moved again while it was rebuilt.
        progress ||= item.dirty;
      } else {
        pending++;
        // Work that runs elsewhere reports when it is done (`onChange`).
        progress ||= !item.waiting;
      }
    }
    if (this.wake) {
      if (progress) {
        this.wake();
      }
      clearTimeout(this.timer);
      this.timer = undefined;
      if (soonest < Infinity) {
        this.timer = setTimeout(this.wake, soonest);
      }
    }
    return { rebuilt, pending, spentMs: performance.now() - start };
  }
}

// --- b-rep caps ----------------------------------------------------------------------------

export interface BrepCapsOptions {
  readonly form: BrepForm;
  /**
   * The form's coordinates in the clip set's frame, column-major 4 × 4: a
   * rotation, a translation and a uniform scale (default: the same).
   */
  readonly formToFrame?: ArrayLike<number>;
  /**
   * How the form is drawn: `addBrep`'s options, which place the caps as they
   * place the form (the caps are in the form's coordinates). The caps take
   * their `color` from here unless the options below say.
   */
  readonly draw?: CapDrawOptions;
  readonly color?: CapColor;
  readonly style?: CapStyle;
  readonly bias?: CapBias;
  /** The section's tolerance, m (default `sectionBrep`'s). */
  readonly tolerance?: number;
  /**
   * Where the section is computed. Default: on this thread in pieces, each
   * `rebuild(budgetMs)` doing what it can in its budget, so a part of
   * hundreds of faces costs a few milliseconds a frame (and the caps take
   * the more frames, for as long as the section takes). A runner
   * (`SectionClient`, the section worker) does it off this thread: the
   * caps follow at the pace of the worker, and the thread does only the
   * drawing. Either way the caps already drawn stay until the new ones are
   * whole.
   */
  readonly runner?: SectionRunner;
}

/** What a rebuild of b-rep caps made. */
export interface BrepCapsReport {
  /** The planes cut with; 0 when the set has none that caps can be made of. */
  readonly planes: number;
  /** Cap faces made. */
  readonly faces: number;
  /** The caps' total area, m². */
  readonly area: number;
  /** Why the set has no caps (it is unsupported), or undefined. */
  readonly unsupported: string | undefined;
  readonly section: SectionReport | undefined;
  /** How long the rebuild took from the clip's change to the caps drawn, ms. */
  readonly ms: number;
  /** Of that, the section and the preparing for the GPU where they ran (the worker's, or this thread's), and the page's drawing of the caps, ms. */
  readonly sectionMs: number;
  readonly drawMs: number;
  /** Whether the section ran in a worker (`BrepCapsOptions.runner`). */
  readonly offThread: boolean;
}

/** The name of a b-rep cap's draws, for picks (`DrawOptions.name`; set `CapDrawOptions.name` to change it). */
export const BREP_CAP_NAME = "brep cap";
/** The name of mesh caps' draws, and of their section lines. */
export const MESH_CAP_NAME = "mesh cap";
export const MESH_CAP_LINE_NAME = "mesh cap section line";

/** A section on its way: this thread's job, or a runner's promise. */
interface Section {
  /** The clip's generation it was started for. */
  readonly generation: number;
  readonly started: number;
  readonly scale: number;
  readonly planes: number;
  readonly job: SectionJob | undefined;
  /** What a runner answered, once it has. */
  outcome: SectionOutcome | undefined;
  failure: unknown;
}

/** The exact caps of one solid under one clip set. */
export class BrepCaps implements Rebuildable {
  private set: ClipSet | undefined;
  private handle: BrepHandle | undefined;
  private form: BrepForm | undefined;
  private built = true;
  private generation = 0;
  private section: Section | undefined;
  private disposed = false;
  changedAt = 0;
  onChange: (() => void) | undefined;
  /** What the last rebuild made. */
  report: BrepCapsReport = {
    planes: 0,
    faces: 0,
    area: 0,
    unsupported: undefined,
    section: undefined,
    ms: 0,
    sectionMs: 0,
    drawMs: 0,
    offThread: false,
  };

  constructor(
    private readonly world: CapWorld,
    private readonly options: BrepCapsOptions,
  ) {}

  /** The caps' form (planar faces, in the form's coordinates), for queries and picks; undefined until built, or when the clip cuts nothing. */
  get capForm(): BrepForm | undefined {
    return this.form;
  }

  /** The caps' draws, or undefined when there are none. */
  get draw(): CapDraws | undefined {
    return this.handle;
  }

  get dirty(): boolean {
    return !this.built;
  }

  /** A runner's section is under way: nothing to tick until it reports. */
  get waiting(): boolean {
    const s = this.section;
    return (
      s !== undefined &&
      s.job === undefined &&
      s.outcome === undefined &&
      s.failure === undefined
    );
  }

  /** The clip the caps follow (or none: no caps). The caps are rebuilt by `rebuild`, or by the scheduler. */
  setClip(set: ClipSet | undefined, now: number = performance.now()): void {
    this.set = set;
    this.built = false;
    this.generation++;
    this.changedAt = now;
    this.onChange?.();
  }

  /**
   * Brings the caps up to date, within `budgetMs` when the section is on
   * this thread. With a runner it starts the section and returns false until
   * the runner answers (a later call draws the result). A clip that moved
   * meanwhile keeps the caps out of date: the finished section is drawn
   * (close to where the clip is) and the next one started.
   */
  rebuild(budgetMs: number = Infinity): boolean {
    if (this.built) {
      return true;
    }
    if (!this.section) {
      const started = this.start();
      if (started === "done") {
        return true;
      }
    }
    const section = this.section!;
    let outcome: SectionOutcome | undefined;
    if (section.job) {
      if (!section.job.step(budgetMs)) {
        return false;
      }
      outcome = {
        result: section.job.result,
        patches: undefined,
        sectionMs: performance.now() - section.started,
        prepareMs: 0,
      };
    } else if (section.failure !== undefined) {
      // Once: the caps are not tried again until the clip changes.
      this.section = undefined;
      this.built = section.generation === this.generation;
      const failure = section.failure;
      throw failure instanceof Error ? failure : new Error(String(failure));
    } else {
      outcome = section.outcome;
      if (!outcome) {
        return false;
      }
    }
    this.section = undefined;
    return this.finish(section, outcome);
  }

  /** Starts a section for the clip as it is; "done" when there is nothing to section. */
  private start(): "done" | "started" {
    const { options } = this;
    const started = performance.now();
    const planes = this.set ? capPlanes(this.set) : { planes: [] };
    if ("unsupported" in planes) {
      this.replace(undefined);
      this.report = {
        planes: 0,
        faces: 0,
        area: 0,
        unsupported: planes.unsupported,
        section: undefined,
        ms: performance.now() - started,
        sectionMs: 0,
        drawMs: 0,
        offThread: false,
      };
      this.built = true;
      return "done";
    }
    const m = options.formToFrame ?? IDENTITY;
    const { inverse, scale } = invertSimilarity(m);
    const size = formSize(options.form) * scale;
    const bias = options.bias?.meters ?? Math.max(1e-6, 2e-5 * size);
    const biased = biasedCapPlanes(planes.planes, bias);
    // In the form's own coordinates, lengths there are metres over the scale.
    const inForm = biased.map((p) => ({
      point: point(inverse, p.point),
      normal: direction(inverse, p.normal),
      limits: p.limits.map((l) => ({
        point: point(inverse, l.point),
        normal: direction(inverse, l.normal),
      })),
    }));
    if (inForm.length === 0) {
      this.replace(undefined);
      this.report = {
        planes: 0,
        faces: 0,
        area: 0,
        unsupported: undefined,
        section: undefined,
        ms: performance.now() - started,
        sectionMs: 0,
        drawMs: 0,
        offThread: false,
      };
      this.built = true;
      return "done";
    }
    const sectionOptions: SectionOptions = {
      ...(options.tolerance !== undefined
        ? { tolerance: options.tolerance / scale }
        : {}),
    };
    const { runner } = options;
    const section: Section = {
      generation: this.generation,
      started,
      scale,
      planes: inForm.length,
      job: runner
        ? undefined
        : new SectionJob(options.form, inForm, sectionOptions),
      outcome: undefined,
      failure: undefined,
    };
    this.section = section;
    if (runner) {
      const draw = options.draw;
      const settle = () => {
        if (!this.disposed) {
          this.onChange?.();
        }
      };
      runner
        .run({
          form: options.form,
          planes: inForm,
          options: sectionOptions,
          prepare: {
            ...(draw?.transform ? { origin: [0, 0, 0] } : {}),
            ...(draw?.trimTolerance !== undefined
              ? { trimTolerance: draw.trimTolerance }
              : {}),
          },
        })
        .then(
          (outcome) => {
            section.outcome = outcome;
            settle();
          },
          (error: unknown) => {
            section.failure = error ?? new Error("the section failed");
            settle();
          },
        );
    }
    return "started";
  }

  /** Draws a finished section, and swaps it in before the old caps go, so no frame is without the caps. */
  private finish(section: Section, outcome: SectionOutcome): boolean {
    const { options } = this;
    const { result } = outcome;
    const current = section.generation === this.generation;
    // Where the clip has gone since: no caps wanted, so none are drawn.
    const wanted = this.set !== undefined;
    let handle: BrepHandle | undefined;
    let draw = 0;
    if (result.form && wanted) {
      const drawStart = performance.now();
      const styled = options.style?.({ kind: "brep", feature: undefined });
      const color = styled ?? options.color ?? DEFAULT_CAP_COLOR;
      handle = addBrep(this.world, result.form, {
        ...options.draw,
        name: options.draw?.name ?? BREP_CAP_NAME,
        color,
        doubleSided: true,
        ...(outcome.patches ? { prepared: outcome.patches } : {}),
      });
      draw = performance.now() - drawStart;
    }
    this.replace(handle, wanted ? result.form : undefined);
    const { scale } = section;
    this.report = {
      planes: section.planes,
      faces: result.faces.length,
      area: result.faces.reduce((s, f) => s + f.area, 0) * scale * scale,
      unsupported: undefined,
      section: result.report,
      ms: performance.now() - section.started,
      sectionMs: outcome.sectionMs + outcome.prepareMs,
      drawMs: draw,
      offThread: options.runner !== undefined,
    };
    this.built = current;
    if (!current) {
      // The clip moved on: draw what was made and make the next.
      this.onChange?.();
    }
    return current;
  }

  /** Swaps in the new draws before the old ones go, so no frame is without the caps. */
  private replace(handle: BrepHandle | undefined, form?: BrepForm): void {
    if (this.handle) {
      removeBrep(this.world, this.handle);
    }
    this.handle = handle;
    this.form = form;
  }

  dispose(): void {
    this.disposed = true;
    this.section = undefined;
    this.replace(undefined);
    this.set = undefined;
    this.built = true;
  }
}

/** The diagonal of the form's vertices' box, m (1 for a form without any). */
function formSize(form: BrepForm): number {
  const v = form.vertexPosition;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i + 2 < v.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k]!, v[i + k]!);
      hi[k] = Math.max(hi[k]!, v[i + k]!);
    }
  }
  const size = Math.hypot(hi[0]! - lo[0]!, hi[1]! - lo[1]!, hi[2]! - lo[2]!);
  return Number.isFinite(size) && size > 0 ? size : 1;
}

// --- mesh caps -----------------------------------------------------------------------------

export interface MeshCapsOptions {
  /**
   * Where a mesh in the clip frame, measured from `origin` (the plane's point,
   * in the frame), is placed in the world: as `DrawOptions` places a draw.
   * Default: `{ origin }`, in render space.
   */
  readonly place?: (origin: Float64Array) => CapPlacement;
  readonly color?: CapColor;
  /** A material for the caps (`World.addMaterial`; default the engine's). */
  readonly material?: number;
  /** Skip lighting on the caps (default: lit by the material). */
  readonly unlit?: boolean;
  /** The colour of the section lines. */
  readonly lineColor?: CapColor;
  readonly style?: CapStyle;
  /** How far inside what the clip keeps the caps lie (default: as the b-rep caps': 2e-5 of the tiles' size, at least 1e-6 m). */
  readonly bias?: CapBias;
  /** Views that draw the caps (`DrawOptions.viewMask`). */
  readonly viewMask?: number;
  /** The ends of segments within this are one point (see `assembleMeshCaps`). */
  readonly snap?: number;
  /** The name of the draws, for picks (default "mesh cap", and "mesh cap section line" for the lines). */
  readonly name?: string;
}

/** What a rebuild of mesh caps made. */
export interface MeshCapsReport {
  /** Per plane: the assembly's report. */
  readonly planes: readonly MeshCapReport[];
  readonly unsupported: string | undefined;
  /** Tile cuts made on the last rebuild (the rest were cached), and still to make. */
  readonly cut: number;
  readonly pendingCuts: number;
  /** Cuts held, for the tiles and planes of now. */
  readonly cached: number;
  readonly ms: number;
}

interface CutEntry {
  readonly revision: number;
  readonly section: TileSection;
}

/** One plane's caps as polygons, for exact queries (`MeshCaps.surfaces`). */
export interface MeshCapSurface {
  /** The plane in the clip's frame: its origin, axes and outward normal `z`. The regions' (u, v) are measured along `x` and `y` from `origin`. */
  readonly plane: SectionPlane;
  /** The filled regions: an outer loop and its holes, per element. */
  readonly regions: readonly MeshCapRegion[];
  /** How far inside what the clip keeps the plane lies, m: the cap's polygons are on it, not on the clip's own plane. */
  readonly bias: number;
}

/** Where a segment met a mesh cap. */
export interface MeshCapSurfaceHit extends MeshCapHit {
  /** The index in `MeshCaps.surfaces` of the plane's cap it is on. */
  readonly surface: number;
}

/** A bias (m) for content of a size: 2e-5 of its diagonal, at least 1e-6, up to a power of two so growing content doesn't change it at every tile. */
function biasForSize(size: number): number {
  const bias = Number.isFinite(size) ? 2e-5 * size : 0;
  return bias > 1e-6 ? 2 ** Math.ceil(Math.log2(bias)) : 1e-6;
}

/** The mesh caps of a set of tiles under one clip set. */
export class MeshCaps implements Rebuildable {
  private set: ClipSet | undefined;
  private readonly tiles = new Map<string | number, MeshCapTile>();
  /** Cuts by plane key then tile. */
  private cuts = new Map<string, Map<string | number, CutEntry>>();
  private draws: { draw: DrawHandle; mesh: MeshHandle }[] = [];
  private caps: MeshCapSurface[] = [];
  /** Each tile's box in the clip's frame, per revision (for the default bias). */
  private readonly boxes = new Map<
    string | number,
    { revision: number; box: ReturnType<typeof tileBounds> }
  >();
  private built = true;
  changedAt = 0;
  onChange: (() => void) | undefined;
  report: MeshCapsReport = {
    planes: [],
    unsupported: undefined,
    cut: 0,
    pendingCuts: 0,
    cached: 0,
    ms: 0,
  };

  constructor(
    private readonly world: CapWorld,
    private readonly options: MeshCapsOptions = {},
  ) {}

  get dirty(): boolean {
    return !this.built;
  }

  /**
   * The caps as polygons, one per plane of the clip, in the clip's frame:
   * what is drawn, for exact queries (`rayHit`). Empty until built, and when
   * the clip has no caps.
   */
  get surfaces(): readonly MeshCapSurface[] {
    return this.caps;
  }

  /**
   * Where the segment from `from` to `to` (in the clip's frame, float64)
   * first meets a cap, exactly: the plane is crossed and the point tested
   * against the cap's loops. The point is on the cap's plane, which lies
   * `bias` inside the clip's own. `keeps` drops a hit the caller's clips
   * remove (a point in the same frame).
   */
  rayHit(
    from: ArrayLike<number>,
    to: ArrayLike<number>,
    keeps?: (point: ArrayLike<number>) => boolean,
  ): MeshCapSurfaceHit | undefined {
    let best: MeshCapSurfaceHit | undefined;
    this.caps.forEach((cap, surface) => {
      const hit = rayHitRegions(cap.plane, cap.regions, from, to, keeps);
      if (hit && (!best || hit.t < best.t)) {
        best = { ...hit, surface };
      }
    });
    return best;
  }

  /** Adds a tile, or replaces the one of its id (a new `revision` is a new cut). */
  setTile(tile: MeshCapTile, now: number = performance.now()): void {
    this.tiles.set(tile.id, tile);
    this.built = false;
    this.changedAt = now;
    this.onChange?.();
  }

  removeTile(id: string | number, now: number = performance.now()): void {
    if (this.tiles.delete(id)) {
      this.boxes.delete(id);
      for (const cuts of this.cuts.values()) {
        cuts.delete(id);
      }
      this.built = false;
      this.changedAt = now;
      this.onChange?.();
    }
  }

  setClip(set: ClipSet | undefined, now: number = performance.now()): void {
    this.set = set;
    this.built = false;
    this.changedAt = now;
    this.onChange?.();
  }

  /**
   * The bias that beats the clip test's float32 rounding at the content's
   * size (as the b-rep caps' does, 2e-5 of it): the clip test and the cap's
   * vertices are float32, so a cap a micrometre inside the plane would be
   * dropped to speckle at tens of metres or more.
   */
  private defaultBias(): number {
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (const tile of this.tiles.values()) {
      let held = this.boxes.get(tile.id);
      if (held?.revision !== tile.revision) {
        held = { revision: tile.revision, box: tileBounds(tile) };
        this.boxes.set(tile.id, held);
      }
      const { box } = held;
      if (box) {
        for (let k = 0; k < 3; k++) {
          lo[k] = Math.min(lo[k]!, box.lo[k]!);
          hi[k] = Math.max(hi[k]!, box.hi[k]!);
        }
      }
    }
    return biasForSize(
      Math.hypot(hi[0]! - lo[0]!, hi[1]! - lo[1]!, hi[2]! - lo[2]!),
    );
  }

  /** Cuts tiles within `budgetMs`, then, when every tile has its cut, assembles and draws the caps. Returns whether the caps are now up to date. */
  rebuild(budgetMs: number = Infinity): boolean {
    const start = performance.now();
    const planes = this.set ? capPlanes(this.set) : { planes: [] };
    if ("unsupported" in planes) {
      this.clearDraws();
      this.caps = [];
      this.report = {
        planes: [],
        unsupported: planes.unsupported,
        cut: 0,
        pendingCuts: 0,
        cached: 0,
        ms: performance.now() - start,
      };
      this.built = true;
      return true;
    }
    const bias = this.options.bias?.meters ?? this.defaultBias();
    const biased = biasedCapPlanes(planes.planes, bias);
    const keys = biased.map((p) => planeKey(p));
    // Drop the cuts of planes the clip no longer has.
    for (const key of [...this.cuts.keys()]) {
      if (!keys.includes(key)) {
        this.cuts.delete(key);
      }
    }
    let cut = 0;
    let pending = 0;
    biased.forEach((plane, i) => {
      const frame = meshPlane(plane);
      let cuts = this.cuts.get(keys[i]!);
      if (!cuts) {
        cuts = new Map();
        this.cuts.set(keys[i]!, cuts);
      }
      for (const tile of this.tiles.values()) {
        const have = cuts.get(tile.id);
        if (have && have.revision === tile.revision) {
          continue;
        }
        if (performance.now() - start >= budgetMs) {
          pending++;
          continue;
        }
        cuts.set(tile.id, {
          revision: tile.revision,
          section: sectionTile(tile, frame),
        });
        cut++;
      }
    });
    let cached = 0;
    for (const cuts of this.cuts.values()) {
      cached += cuts.size;
    }
    if (pending > 0) {
      this.report = {
        ...this.report,
        cut,
        pendingCuts: pending,
        cached,
        ms: performance.now() - start,
      };
      return false;
    }
    const reports: MeshCapReport[] = [];
    const surfaces: MeshCapSurface[] = [];
    const made: { draw: DrawHandle; mesh: MeshHandle }[] = [];
    try {
      biased.forEach((plane, i) => {
        const sections = [...this.cuts.get(keys[i]!)!.values()].map(
          (c) => c.section,
        );
        const caps = assembleMeshCaps(sections, plane as MeshCapPlane, {
          ...(this.options.snap !== undefined
            ? { snap: this.options.snap }
            : {}),
        });
        reports.push(caps.report);
        surfaces.push({ plane: caps.plane, regions: caps.regions, bias });
        const origin = Float64Array.from(caps.origin);
        const place = this.options.place?.(origin) ?? { origin };
        const common = {
          ...place,
          ...(this.options.viewMask !== undefined
            ? { viewMask: this.options.viewMask }
            : {}),
        };
        if (caps.triangles) {
          const mesh = this.world.addMesh(this.styled(caps.triangles));
          const draw = this.world.addDraw({
            mesh,
            ...common,
            name: this.options.name ?? MESH_CAP_NAME,
            color: this.options.style
              ? WHITE
              : (this.options.color ?? DEFAULT_CAP_COLOR),
            ...(this.options.material !== undefined
              ? { material: this.options.material }
              : {}),
            ...(this.options.unlit !== undefined
              ? { unlit: this.options.unlit }
              : {}),
            doubleSided: true,
          });
          made.push({ draw, mesh });
        }
        if (caps.lines) {
          const mesh = this.world.addMesh(caps.lines);
          const draw = this.world.addDraw({
            mesh,
            ...common,
            name: this.options.name ?? MESH_CAP_LINE_NAME,
            color: this.options.lineColor ?? DEFAULT_SECTION_LINE_COLOR,
            unlit: true,
          });
          made.push({ draw, mesh });
        }
      });
    } catch (error) {
      for (const { draw, mesh } of made) {
        this.world.removeDraw(draw);
        this.world.removeMesh(mesh);
      }
      throw error;
    }
    this.clearDraws();
    this.draws = made;
    this.caps = surfaces;
    this.report = {
      planes: reports,
      unsupported: undefined,
      cut,
      pendingCuts: 0,
      cached,
      ms: performance.now() - start,
    };
    this.built = true;
    return true;
  }

  /** The cap mesh with a colour per vertex where the style names an element's. */
  private styled<
    T extends { featureIds?: Uint32Array; positions: Float32Array },
  >(mesh: T): T {
    const style = this.options.style;
    if (!style || !mesh.featureIds) {
      return mesh;
    }
    const colors = new Float32Array((mesh.positions.length / 3) * 4);
    const fallback = this.options.color ?? DEFAULT_CAP_COLOR;
    const byFeature = new Map<number, CapColor>();
    mesh.featureIds.forEach((feature, v) => {
      let color = byFeature.get(feature);
      if (!color) {
        color = style({ kind: "mesh", feature }) ?? fallback;
        byFeature.set(feature, color);
      }
      colors.set(color, v * 4);
    });
    return { ...mesh, colors };
  }

  private clearDraws(): void {
    for (const { draw, mesh } of this.draws) {
      this.world.removeDraw(draw);
      this.world.removeMesh(mesh);
    }
    this.draws = [];
  }

  dispose(): void {
    this.clearDraws();
    this.caps = [];
    this.tiles.clear();
    this.boxes.clear();
    this.cuts.clear();
    this.built = true;
  }
}

const planeKey = (plane: CapPlane): string =>
  [
    ...plane.point,
    ...plane.normal,
    ...plane.limits.flatMap((l) => [...l.point, ...l.normal]),
  ]
    .map((x) => x.toPrecision(17))
    .join(",");
