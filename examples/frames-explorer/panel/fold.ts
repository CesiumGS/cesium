// The tour caption's fold on narrow views (F42): plain functions for what
// the caption shows, its toggle's state and label, and where focus goes.
// Hud.tsx renders from them.

/** What the caption shows, and its toggle (none at desktop width). */
export interface CaptionFold {
  /** One row: the stop's number and title, the steps, the toggle and Close. */
  readonly folded: boolean;
  /** The chevron: its `aria-expanded` and label; undefined where there's no fold. */
  readonly toggle:
    { readonly expanded: boolean; readonly label: string } | undefined;
  /** The title sits in the row (folded) rather than as the caption's heading. */
  readonly titleInRow: boolean;
  /** The caption's text and link are hidden (folded). */
  readonly bodyHidden: boolean;
}

export function captionFold(narrow: boolean, unfolded: boolean): CaptionFold {
  if (!narrow) {
    return {
      folded: false,
      toggle: undefined,
      titleInRow: false,
      bodyHidden: false,
    };
  }
  return {
    folded: !unfolded,
    toggle: {
      expanded: unfolded,
      label: unfolded ? "Fold the caption" : "Unfold the caption",
    },
    titleInRow: !unfolded,
    bodyHidden: !unfolded,
  };
}

export interface FoldState {
  readonly unfolded: boolean;
}

export type FoldEvent =
  | { readonly type: "init" }
  | { readonly type: "toggle" }
  | { readonly type: "stop" };

/** The fold's state: folded at first, flipped by the toggle, held across stops. */
export function foldReducer(
  state: FoldState | undefined,
  event: FoldEvent,
): FoldState {
  switch (event.type) {
    case "init":
      return { unfolded: false };
    case "toggle":
      return { unfolded: !(state?.unfolded ?? false) };
    case "stop":
      return state ?? { unfolded: false };
  }
}

/** Where focus goes after `event` (I18): the stop's heading, or it stays on the toggle. */
export function focusAfter(
  event: Exclude<FoldEvent, { type: "init" }>,
): "heading" | "toggle" {
  return event.type === "stop" ? "heading" : "toggle";
}
