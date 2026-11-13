// Terrain geomorphing's clock (`View.lodTransitions` "morph"): when a tile
// first drawn over a coarser one begins to morph in, and when it is done.
//
// A terrain tile carries the surface height of its nearest drawn ancestor
// (the parent, unless selection skipped levels) at each vertex
// (`HEIGHT_MORPH_ATTRIBUTE`). From the time its draw record says (the draw
// constants' `morph` word, set here through `DrawSink.setDrawMorph`), the
// vertex stage moves each vertex from that height to its own over
// `MORPH_SECONDS`. Selection and loading are not involved: the tile is
// chosen as ever, and only its look in the first moments differs.
//
// Coarsening isn't morphed: when a view's selection drops a tile's children
// they leave at once (a pop). Morphing out would keep the children alive
// after the selection deselects them; that is not built.
import type { DrawSink } from "./DrawSink.ts";
import type { SelectionView } from "./Stepwise.ts";
import type { Tile } from "./Tile.ts";

/**
 * How long a transition (a geomorph, an imagery cross-fade) takes at least,
 * seconds. The one place these three numbers live: the shaders read the
 * duration from the view block (`View.transition.x`), which the engine
 * writes each tick from `transitionSeconds`.
 */
export const MORPH_SECONDS = 0.3;
/** A transition spans at least this many rendered frames (when slower than `MORPH_SECONDS` allows). */
export const MORPH_FRAMES = 8;
/** The longest a transition is stretched to, seconds. */
export const MORPH_MAX_SECONDS = 1.0;

/**
 * The duration of a transition given the smoothed interval between rendered
 * frames, ms (0 or NaN: unknown): `MORPH_SECONDS`, or `MORPH_FRAMES` frames
 * when that is longer, up to `MORPH_MAX_SECONDS`. So a slow GPU still shows
 * the transition over a few frames instead of as a pop.
 */
export function transitionSeconds(frameIntervalMs: number): number {
  const frames = Number.isFinite(frameIntervalMs)
    ? (MORPH_FRAMES * Math.max(frameIntervalMs, 0)) / 1000
    : 0;
  return Math.min(Math.max(MORPH_SECONDS, frames), MORPH_MAX_SECONDS);
}

/** The tileset's side of morphing: what `startMorphs` and `endMorphs` read and write. */
export interface MorphHost {
  readonly world: Pick<DrawSink, "setDrawMorph">;
  readonly engine: {
    readonly scene: {
      readonly startTime: number;
      /** This tick's transition duration (`transitionSeconds`); absent: `MORPH_SECONDS`. */
      readonly transitionSeconds?: number;
    };
  };
  readonly state: {
    /** Tiles morphing in, with the time each is done (`performance.now()` ms). */
    readonly morphs: Map<Tile, number>;
  };
}

/** The shader's smoothstep of the morph's progress, `t` from 0 to 1. */
export function morphEase(t: number): number {
  const c = Math.min(Math.max(t, 0), 1);
  return c * c * (3 - 2 * c);
}

/**
 * How far a tile has morphed at `nowMs` (0: still its ancestor's surface, 1:
 * its own), as the vertex stage computes it from the record's word.
 */
export function morphFactor(
  startSeconds: number,
  nowSeconds: number,
  duration: number = MORPH_SECONDS,
): number {
  return morphEase((nowSeconds - startSeconds) / duration);
}

/** Some ancestor of `tile` has been drawn: there is a coarser surface to morph from. */
function ancestorDrawn(tile: Tile): boolean {
  for (let up = tile.parent; up; up = up.parent) {
    if (up.drawnOnce) {
      return true;
    }
  }
  return false;
}

/**
 * Begins the morph of each tile of `drawn` that has its first drawn tick in
 * a view that morphs (`SelectionView.morph`) and carries its nearest drawn
 * ancestor's heights (`GlobeTile.morphs`), when a coarser ancestor was drawn before it:
 * nothing popped in, if nothing stood there. Every drawn tile is noted as
 * drawn after, for its children's.
 */
export function startMorphs(
  tileset: MorphHost,
  views: readonly SelectionView[],
  drawn: Iterable<Tile>,
  nowMs: number,
): void {
  const seconds = Math.max(
    (nowMs - tileset.engine.scene.startTime) / 1000,
    1e-3,
  );
  const morphing = (tile: Tile): boolean => {
    for (const view of views) {
      if (view.morph && ((tile.viewMask >>> view.id) & 1) !== 0) {
        return true;
      }
    }
    return false;
  };
  const first: Tile[] = [];
  for (const tile of drawn) {
    if (tile.drawnOnce) {
      continue;
    }
    first.push(tile);
    if (
      tile.globe?.morphs &&
      tile.placement &&
      morphing(tile) &&
      ancestorDrawn(tile)
    ) {
      tile.morphStart = nowMs;
      tileset.state.morphs.set(
        tile,
        nowMs +
          (tileset.engine.scene.transitionSeconds ?? MORPH_SECONDS) * 1000,
      );
      for (const draw of tile.placement.draws) {
        tileset.world.setDrawMorph?.(draw, seconds);
      }
    }
  }
  for (const tile of first) {
    tile.drawnOnce = true;
  }
}

/**
 * Ends the morphs finished by `nowMs`: the draw's word goes back to 0, and
 * the vertex stage reads nothing more. True while some tile is still
 * morphing. A morph's end was fixed when it began; if the duration has
 * changed since, the shader and the end disagree and the tile may jump a
 * little.
 */
export function endMorphs(tileset: MorphHost, nowMs: number): boolean {
  for (const [tile, end] of tileset.state.morphs) {
    if (end <= nowMs || !tile.placement) {
      tileset.state.morphs.delete(tile);
      for (const draw of tile.placement?.draws ?? []) {
        tileset.world.setDrawMorph?.(draw, 0);
      }
    }
  }
  return tileset.state.morphs.size > 0;
}

/** Forgets a tile that left (unloaded). */
export function forgetMorph(tileset: Pick<MorphHost, "state">, tile: Tile) {
  tileset.state.morphs.delete(tile);
  tile.morphStart = undefined;
  tile.drawnOnce = undefined;
}
