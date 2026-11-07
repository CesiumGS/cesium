// What the docked diagram keeps in view (fix 1, item 5): the frames the
// scenario uses and nothing else. A result's frames belong to Verification:
// a catalog check that runs through every frame (frame-tree.compositions)
// mustn't bring the Moon's frames into "The Earth turns".
import type { TreeNode } from "../tree.ts";
import type { DiagramSelection } from "./TreeDiagram.tsx";

/**
 * The frames to keep (with their ancestors, `focusTree`): the scenario's
 * own focus, the frames it added, its answer's path, and the diagram's own
 * node or edge selection.
 */
export function keepSet(
  tree: TreeNode,
  scenario: {
    focus: readonly string[];
    path?:
      | { up: readonly string[]; ancestor: string; down: readonly string[] }
      | undefined;
    /** Data pinned to a frame: that frame stays in view. */
    data?: { frame: string } | undefined;
    /**
     * A pair picked on the tree (the capstone): only the lit route stays,
     * every other branch folds into "+N" chips, so the route fits the
     * column (Task 9, I6). Expand shows the whole tree.
     */
    pair?: unknown;
  },
  selected: DiagramSelection | undefined,
): Set<string> {
  const p = scenario.path;
  if (scenario.pair !== undefined && p) {
    const route = new Set<string>([...p.up, p.ancestor, ...p.down]);
    if (selected !== undefined) {
      route.add(selected.id);
    }
    return route;
  }
  const keep = new Set<string>(scenario.focus);
  if (scenario.data) {
    keep.add(scenario.data.frame);
  }
  const walk = (n: TreeNode) => {
    if (n.added) {
      keep.add(n.id);
    }
    n.children.forEach(walk);
  };
  walk(tree);
  if (p) {
    [...p.up, p.ancestor, ...p.down].forEach((id) => keep.add(id));
  }
  if (selected !== undefined) {
    keep.add(selected.id);
  }
  return keep;
}

/**
 * The diagram's unfolded chips for `key` (the scenario): the same set while
 * the key holds, an empty one when it changes, so a switch folds the tree
 * again (fix 1, item 5).
 */
export function unfoldedFor(
  state: { key: string | undefined; ids: ReadonlySet<string> },
  key: string | undefined,
): { key: string | undefined; ids: ReadonlySet<string> } {
  return state.key === key ? state : { key, ids: new Set() };
}
