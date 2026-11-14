// The shared refinement words and timing (examples/refinement.ts): a card
// until the first draw, then a chip that comes and goes with the work.
import { describe, expect, it } from "vitest";
import {
  createRefinement,
  refinementText,
  type RefinementSource,
} from "../examples/refinement.ts";

const source = (one: string, many: string, n: { v: number }) =>
  ({ one, many, count: () => n.v }) satisfies RefinementSource;

describe("refinementText", () => {
  it("says what is left, counts first named by kind, and nothing at zero", () => {
    const tiles = { v: 12 };
    const fits = { v: 3 };
    const s = [source("tile", "tiles", tiles), source("fit", "fits", fits)];
    expect(refinementText(s)).toBe("Refining · 12 tiles, 3 fits");
    fits.v = 0;
    expect(refinementText(s)).toBe("Refining · 12 tiles");
    tiles.v = 1;
    expect(refinementText(s)).toBe("Refining · 1 tile");
    tiles.v = 0;
    expect(refinementText(s)).toBeUndefined();
    tiles.v = 1234;
    expect(refinementText(s)).toBe("Refining · 1,234 tiles");
  });
});

describe("createRefinement", () => {
  it("gives the card a timeout so a scene with nothing near the camera is not held", () => {
    const r = createRefinement({ cardTimeout: 2 });
    const none = { v: 0 };
    const sources = [source("tile", "tiles", none)];
    expect(r.update({ drawn: false, sources }).card).toBeDefined();
    expect(r.update({ drawn: false, sources }).card).toBeDefined();
    expect(r.update({ drawn: false, sources }).card).toBeUndefined();
  });

  it("shows no chip before the first draw: the card says it", () => {
    const r = createRefinement();
    const n = { v: 5 };
    const view = r.update({
      drawn: false,
      sources: [source("tile", "tiles", n)],
    });
    expect(view.card).toBe("Waiting for the first tiles…");
    expect(view.chip).toBeUndefined();
  });
});
