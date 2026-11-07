// The placement morph's driver (plan 4b Task 18): the one place that turns
// the wall clock into the morph's `t` and hands it, with the exaggeration
// and the ghost, to everything that draws the placements (each site's pair,
// the whiskers). Plan 5's animation core replaces this module: its tween is
// page.ts `retargetMorph`/`morphValue`, its frames one requestAnimationFrame
// loop that runs only while the morph does.
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
}

export class MorphDriver {
  private tween: MorphTween;
  private frame = 0;
  private morphing_ = false;
  ghost = true;
  exaggerate = false;

  constructor(
    private readonly deps: MorphDriverDeps,
    mode: Placement,
  ) {
    const at = mode === "reprojected" ? 1 : 0;
    this.tween = { from: at, to: at, start: 0, duration: 0 };
  }

  /** The morph's `t` now: 0 rigid, 1 reprojected. */
  t(): number {
    return morphValue(this.tween, performance.now());
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
    this.tween = retargetMorph(
      this.tween,
      mode === "rigid" ? 0 : 1,
      performance.now(),
      reduced ? 0 : MORPH_MS,
    );
    this.apply();
  }

  /** Gives the state to every target; runs a frame loop while morphing. */
  apply(): void {
    const t = this.t();
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
    if (!settled && this.frame === 0) {
      this.frame = requestAnimationFrame(() => {
        this.frame = 0;
        if (!this.deps.disposed()) {
          this.apply();
        }
      });
    }
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
  }
}
