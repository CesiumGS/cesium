// The tour caption's fold on narrow views (examples/frames-explorer/panel/fold.ts,
// F42): what shows, what the toggle says, and where focus goes.
import { describe, expect, it } from "vitest";
import {
  captionFold,
  focusAfter,
  foldReducer,
} from "../examples/frames-explorer/panel/fold.ts";

describe("the caption's fold", () => {
  it("has no fold at desktop width: the whole caption, no toggle", () => {
    for (const unfolded of [false, true]) {
      expect(captionFold(false, unfolded)).toEqual({
        folded: false,
        toggle: undefined,
        titleInRow: false,
        bodyHidden: false,
      });
    }
  });

  it("starts folded on a narrow view: one row with the title, the body hidden", () => {
    expect(captionFold(true, false)).toEqual({
      folded: true,
      toggle: { expanded: false, label: "Unfold the caption" },
      titleInRow: true,
      bodyHidden: true,
    });
  });

  it("unfolds to the whole caption, the toggle saying it folds", () => {
    expect(captionFold(true, true)).toEqual({
      folded: false,
      toggle: { expanded: true, label: "Fold the caption" },
      titleInRow: false,
      bodyHidden: false,
    });
  });
});

describe("its state", () => {
  it("starts folded, and the toggle flips it", () => {
    let s = foldReducer(undefined, { type: "init" });
    expect(s.unfolded).toBe(false);
    s = foldReducer(s, { type: "toggle" });
    expect(s.unfolded).toBe(true);
    s = foldReducer(s, { type: "toggle" });
    expect(s.unfolded).toBe(false);
  });

  it("holds across stops", () => {
    const open = foldReducer(foldReducer(undefined, { type: "init" }), {
      type: "toggle",
    });
    expect(foldReducer(open, { type: "stop" })).toBe(open);
  });
});

describe("focus", () => {
  it("moves to the stop's heading at each stop", () => {
    expect(focusAfter({ type: "stop" })).toBe("heading");
  });

  it("stays on the toggle when it folds or unfolds, so a keyboard user can toggle back", () => {
    expect(focusAfter({ type: "toggle" })).toBe("toggle");
  });
});
