// Orion's data as every scenario that shows it states it (Task 9, I2): its
// node in the tree at the instant, whose edge carries the OEM's covariance
// there, so one-path, the dish and the capstone give one accuracy for the
// same data at the same instant (DESIGN.md "One accuracy per thing").
import type { Frames } from "../../../src/frames/frames.ts";
import type { Instant } from "../../../src/time/Instant.ts";
import type { Trajectory } from "../../../src/trajectory/Trajectory.ts";
import { buildTree, type TreeNode } from "../tree.ts";

/** Orion's node, as the tree has it under its reference at `instant` (plain data). */
export function orionTreeNode(
  frames: Frames,
  o: Trajectory,
  instant: Instant,
): TreeNode {
  const tree = buildTree(frames, { trajectories: [o] }, instant);
  const find = (n: TreeNode): TreeNode | undefined =>
    n.id === o.name ? n : n.children.map(find).find((x) => x);
  return find(tree)!;
}

/** Orion's data pinned in the tree: what it is, its frame and its accuracy at `instant`. */
export function orionData(frames: Frames, o: Trajectory, instant: Instant) {
  return {
    label: "Orion's data",
    frame: o.reference.name,
    source: "OEM",
    accuracy: orionTreeNode(frames, o, instant).edge.accuracy,
  };
}
