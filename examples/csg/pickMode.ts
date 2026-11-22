import type { IconName } from "./icons.ts";

/**
 * What a click in the view selects: CAD's selection filter (SolidWorks' F5
 * toolbar, Fusion's selection priority). A face shows its push-pull arrow
 * alone, a part (the leaf that made the face) shows the move and rotate
 * gizmo, and a body is the whole model. Edges aren't offered: the edges
 * drawn over the solid are an overlay, not something a pick can name.
 */
export type PickMode = "face" | "part" | "body";

export interface PickModeInfo {
  mode: PickMode;
  label: string;
  icon: IconName;
  /** The key that chooses it. */
  key: string;
  /** What a click does and what a drag then does, for the tooltip. */
  title: string;
  /** The status bar's hint. */
  hint: string;
}

export const PICK_MODES: readonly PickModeInfo[] = [
  {
    mode: "face",
    label: "Face",
    icon: "pickFace",
    key: "P",
    title: "Pick faces: click a face, then drag its arrow to push or pull",
    hint: "drag the arrow to push or pull",
  },
  {
    mode: "part",
    label: "Part",
    icon: "pickPart",
    key: "V",
    title:
      "Pick parts: click the part (primitive) that made a face, then drag its gizmo to move or rotate it",
    hint: "drag the gizmo",
  },
  {
    mode: "body",
    label: "Body",
    icon: "pickBody",
    key: "B",
    title: "Pick the body: a click selects the whole model",
    hint: "click selects the model",
  },
];

/** The mode a link's `ui` flags name; Face by default. */
export function pickModeOf(flags: ReadonlySet<string>): PickMode {
  return flags.has("part") ? "part" : flags.has("body") ? "body" : "face";
}

/** The `ui` flag that keeps a mode in the link, if it isn't the default. */
export function pickFlag(mode: PickMode): string[] {
  return mode === "face" ? [] : [mode];
}

/** The mode a key chooses (case-insensitive), if any. */
export function pickModeForKey(key: string): PickMode | undefined {
  const upper = key.toUpperCase();
  return PICK_MODES.find((info) => info.key === upper)?.mode;
}

/**
 * The nodes a pick selects. `leaf` is the one that made the picked face
 * (undefined when the kernel gave the face no leaf); `chosen` is the
 * selection so far, which an additive pick of a part adds to or takes
 * from. A face selects its leaf as well, so the tree and the properties
 * follow it; the manipulator shows only what the mode says.
 */
export function selectionFor(
  mode: PickMode,
  pick: { leaf: number | undefined; root: number },
  chosen: readonly number[],
  additive: boolean,
): number[] {
  if (mode === "body") {
    return [pick.root];
  }
  if (pick.leaf === undefined) {
    return [];
  }
  if (!additive) {
    return [pick.leaf];
  }
  return chosen.includes(pick.leaf)
    ? chosen.filter((id) => id !== pick.leaf)
    : [...chosen, pick.leaf];
}
