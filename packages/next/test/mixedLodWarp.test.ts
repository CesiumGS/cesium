// Mixed LOD under a placement or warp: a tileset that moves vertices still
// mixes (its placeholders' boxes are in the true frame), `mixedLod: "never"`
// is still honoured, and a box is made from the tile's own, unmoved volume.
import { describe, expect, it } from "vitest";
import { BudgetedSelection } from "../src/streaming/Budgeted.ts";
import { clipBox } from "../src/streaming/tilesetUpdate.ts";
import type { Tile } from "../src/streaming/Tile.ts";

type Mixes = { mixes(tile: Tile): boolean };
const mixes = (s: BudgetedSelection, t: Tile) =>
  (s as unknown as Mixes).mixes(t);
const tileOf = (moves: boolean, partition: boolean) =>
  ({ tileset: { movesVertices: moves }, childrenPartition: partition }) as Tile;

describe("mixed LOD under warps", () => {
  it("mixes where children partition, whether or not vertices move", () => {
    const auto = new BudgetedSelection({});
    expect(mixes(auto, tileOf(false, true))).toBe(true);
    expect(mixes(auto, tileOf(true, true))).toBe(true);
    expect(mixes(auto, tileOf(true, false))).toBe(false);
    expect(
      mixes(new BudgetedSelection({ mixedLod: "always" }), tileOf(true, false)),
    ).toBe(true);
  });

  it('"never" holds under a warp', () => {
    const never = new BudgetedSelection({ mixedLod: "never" });
    expect(mixes(never, tileOf(true, true))).toBe(false);
    expect(mixes(never, tileOf(false, true))).toBe(false);
  });

  it("a placeholder's box is the hole's own volume, in the true frame", () => {
    const R = 6_378_137;
    const hole = {
      ownVolume: {
        sphere: { center: [R, 0, 0], radius: 10 },
        box: undefined,
      },
    } as unknown as Tile;
    const a = clipBox(hole, 5);
    expect(Array.from(a.center)).toEqual([R, 0, 0]);
    // Whatever moves the draw, the box doesn't: same inputs, same box.
    const b = clipBox(hole, 5);
    expect(Array.from(b.rows)).toEqual(Array.from(a.rows));
  });
});
