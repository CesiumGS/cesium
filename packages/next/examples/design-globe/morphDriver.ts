// The placement morph's driver (plan 4b Task 18): the one place that turns
// the wall clock into the morph's `t` and hands it, with the exaggeration
// and the ghost, to everything that draws the placements (each site's pair,
// the whiskers). Its frames are the engine's (frameDriver.ts `animate`): each
// step sets the state before the engine renders, busy while the morph runs,
// and `t()` is the value last drawn, which the labels placed after the
// render read. Plan 5's animation core replaces this module: its tween is
// page.ts `retargetMorph`/`morphValue`.
import {
  EXAGGERATION,
  MORPH_MS,
  morphValue,
  retargetMorph,
  type MorphTween,
  type Placement,
} from "./page.ts";
import type { PairState } from "./placementPair.ts";

/** Something drawn in both placements: it takes the morph's state. */
export interface MorphTarget {
  setState(state: PairState): void;
}

export interface MorphDriverDeps {
  /** What draws the placements now (each frame's list). */
  targets(): Iterable<MorphTarget>;
  /** The engine should draw a frame. */
  requestRender(): void;
  /** `morphing` started or ended. */
  changed(): void;
  disposed(): boolean;
  /** Runs `step(now)` before each render until it returns false (frameDriver.ts). */
  animate(step: (now: number) => boolean): () => void;
  /** The wall clock, ms (default `performance.now`). */
  now?(): number;
}

export class MorphDriver {
  private tween: MorphTween;
  /** Ends the running morph's frames. */
  private end: (() => void) | undefined;
  private morphing_ = false;
  /** The `t` last given to the targets (drawn). */
  private t_: number;
  ghost = true;
  exaggerate = false;

  constructor(
    private readonly deps: MorphDriverDeps,
    mode: Placement,
  ) {
    const at = mode === "reprojected" ? 1 : 0;
    this.tween = { from: at, to: at, start: 0, duration: 0 };
    this.t_ = at;
  }

  private now(): number {
    return this.deps.now?.() ?? performance.now();
  }

  /** The morph's `t` as drawn: 0 rigid, 1 reprojected. */
  t(): number {
    return this.t_;
  }

  /** Between placements now. */
  get morphing(): boolean {
    return this.morphing_;
  }

  /** The factor each rigid error is drawn at. */
  get exaggeration(): number {
    return this.exaggerate ? EXAGGERATION : 1;
  }

  /** Whether `mode` is where the morph is heading already. */
  heading(mode: Placement): boolean {
    return this.tween.to === (mode === "rigid" ? 0 : 1);
  }

  /** Morphs toward `mode`; `reduced` (reduced motion) switches at once. */
  setMode(mode: Placement, reduced: boolean): void {
    const now = this.now();
    this.tween = retargetMorph(
      this.tween,
      mode === "rigid" ? 0 : 1,
      now,
      reduced ? 0 : MORPH_MS,
    );
    this.apply(now);
  }

  /**
   * Gives the state at `now` to every target; while morphing, again before
   * each of the engine's renders until it settles.
   */
  apply(now = this.now()): void {
    // Never backward: a frame's timestamp may be a little before the
    // clock read by an input handled since.
    const t = morphValue(this.tween, Math.max(now, this.tween.start));
    this.t_ = t;
    const settled = t === this.tween.to;
    const state: PairState = {
      t,
      morphing: !settled,
      exaggeration: this.exaggeration,
      ghost: this.ghost,
    };
    for (const target of this.deps.targets()) {
      target.setState(state);
    }
    this.deps.requestRender();
    if (this.morphing_ !== !settled) {
      this.morphing_ = !settled;
      this.deps.changed();
    }
    if (settled) {
      this.end?.();
      this.end = undefined;
    } else if (this.end === undefined) {
      this.end = this.deps.animate((frameNow) => {
        if (this.deps.disposed()) {
          this.end = undefined;
          return false;
        }
        this.apply(frameNow);
        return this.end !== undefined; // apply ends it once settled
      });
    }
  }

  dispose(): void {
    this.end?.();
    this.end = undefined;
  }
}
