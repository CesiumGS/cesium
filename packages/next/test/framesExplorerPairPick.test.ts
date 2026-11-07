// Picking the capstone's pair on the tree (Task 8 fix 1, M2): a click sets
// From, the next To, and so on; Shift sets To, Enter From; To never becomes
// From's own frame; a pick of the other end's object swaps them; and the
// alternation starts again at From when something else changed the pair.
import { describe, expect, it } from "vitest";
import {
  nextAfter,
  nextText,
  pairPick,
} from "../examples/frames-explorer/panel/pairPick.ts";

const pair = { from: "Mast sensor", to: "Lunar site" };

describe("pairPick", () => {
  it("alternates plain clicks: From, then To, then From again", () => {
    const a = pairPick(pair, "from", "orion", "click");
    expect(a).toEqual({
      end: "from",
      expect: { from: "orion", to: "Lunar site" },
      next: "to",
    });
    const b = pairPick(a.expect, a.next, "Tool", "click");
    expect(b).toEqual({
      end: "to",
      expect: { from: "orion", to: "Tool" },
      next: "from",
    });
    expect(pairPick(b.expect, b.next, "DSS-43 ENU", "click").end).toBe("from");
  });

  it("sets To with Shift (click or Enter) and From with Enter, whatever comes next", () => {
    for (const press of ["shift-click", "shift-enter"] as const) {
      expect(pairPick(pair, "from", "Tool", press)).toEqual({
        end: "to",
        expect: { from: "Mast sensor", to: "Tool" },
        next: "from",
      });
    }
    expect(pairPick(pair, "to", "Tool", "enter")).toEqual({
      end: "from",
      expect: { from: "Tool", to: "Lunar site" },
      next: "to",
    });
  });

  it("never sets To to From's own frame: it only shows it, and To still comes next", () => {
    expect(pairPick(pair, "to", "Mast sensor", "click")).toEqual({
      expect: pair,
      next: "to",
    });
    expect(pairPick(pair, "from", "Mast sensor", "shift-click").end).toBe(
      undefined,
    );
  });

  it("expects a swap when one end takes the other's object (spec.ts withKnob)", () => {
    expect(pairPick(pair, "from", "Lunar site", "click").expect).toEqual({
      from: "Lunar site",
      to: "Mast sensor",
    });
  });
});

describe("nextAfter", () => {
  it("keeps the next end while the pair is the one the tree's pick expected, else starts again at From", () => {
    const expected = { from: "orion", to: "Lunar site" };
    expect(nextAfter("to", expected, { ...expected })).toBe("to");
    // The knobs, Swap or a moment changed it.
    expect(nextAfter("to", expected, { from: "Lunar site", to: "orion" })).toBe(
      "from",
    );
    expect(nextAfter("to", undefined, expected)).toBe("from");
  });

  it("says which end comes next", () => {
    expect(nextText("from")).toMatch(/sets From/);
    expect(nextText("to")).toMatch(/sets To$/);
  });
});
