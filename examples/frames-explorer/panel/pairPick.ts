// Picking the capstone's pair on the tree (Task 8, fix 1 M2): which end a
// press on an object's pill sets, what the pair becomes, and which end the
// next plain click sets. Pure, so the alternation is tested without React
// (test/framesExplorerPairPick.test.ts); TreeDiagram.tsx shows the next end
// and announces it.

export type PairEnd = "from" | "to";

/** The pair's two ends, by node id. */
export interface PairNodes {
  from: string;
  to: string;
}

/** How the pill was pressed. */
export type PairPress = "click" | "shift-click" | "enter" | "shift-enter";

/**
 * The press's effect: the end it sets (none when it would set To to
 * From's own frame), the pair it expects to see next (a pick that takes
 * the other end's object swaps them, as spec.ts `withKnob` does), and the
 * end the next plain click sets.
 *
 * - A plain click sets `next`, then the other end: From, To, From…
 * - Shift-click and Shift+Enter set To; Enter sets From. After either, the
 *   next plain click sets the other end.
 */
export function pairPick(
  pair: PairNodes,
  next: PairEnd,
  id: string,
  press: PairPress,
): { end?: PairEnd; expect: PairNodes; next: PairEnd } {
  const end: PairEnd =
    press === "click"
      ? next
      : press === "shift-click" || press === "shift-enter"
        ? "to"
        : "from";
  if (end === "to" && id === pair.from) {
    // To can't be From's own frame: only shown, and To still comes next.
    return { expect: pair, next: "to" };
  }
  const other: PairEnd = end === "from" ? "to" : "from";
  const expect =
    pair[other] === id
      ? ({ [end]: id, [other]: pair[end] } as unknown as PairNodes)
      : { ...pair, [end]: id };
  return { end, expect, next: other };
}

/**
 * The next end after the pair became `now`: kept when it is the pair the
 * tree's own last pick expected, else From again (the knobs, Swap or a
 * moment changed it).
 */
export function nextAfter(
  next: PairEnd,
  expected: PairNodes | undefined,
  now: PairNodes,
): PairEnd {
  return expected !== undefined &&
    expected.from === now.from &&
    expected.to === now.to
    ? next
    : "from";
}

/** The status line under the diagram, read out as it changes. */
export const nextText = (next: PairEnd): string =>
  next === "from"
    ? "Next click on a dashed frame sets From (Shift-click sets To)"
    : "Next click on a dashed frame sets To";
