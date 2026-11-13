import { expect } from "vitest";
import { CLIP_BOXES } from "../src/scene/contentLimits.ts";
import type { SelectionResult } from "../src/streaming/Stepwise.ts";
import type { Tile } from "../src/streaming/Tile.ts";

const isAncestorOrSelf = (a: Tile, d: Tile): boolean => {
  for (let t: Tile | undefined = d; t; t = t.parent) {
    if (t === a) {
      return true;
    }
  }
  return false;
};

/**
 * The invariant: for every placeholder, no clip tile is an ancestor-or-self
 * of a tile drawn in the same selection (the placeholder tile itself draws
 * whole, by its own clip), and the shader's box limit holds.
 */
export function expectExactPlaceholders(result: SelectionResult): void {
  for (const [placeholder, clip] of result.placeholders ?? []) {
    expect(clip.length).toBeLessThanOrEqual(CLIP_BOXES);
    for (const c of clip) {
      for (const drawn of result.selected) {
        if (drawn !== placeholder) {
          expect(isAncestorOrSelf(c, drawn), `clip tile holds drawn tile`).toBe(
            false,
          );
        }
      }
    }
  }
}
