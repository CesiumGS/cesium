// What a walk's edge row says when the edge adds nothing to the composed
// statement (Explore.tsx `Walk`), pure so the tests can hold it. The
// follow-up review (I1): a rotation's term of 0 m is 0 because its rotation
// turns about the reference's origin, an end on its axis, not because the
// walked point is at its origin, which may be far off (the Moon against
// ITRF).
import type { ComposedView } from "./model.ts";
import type { TreeNode } from "../tree.ts";

/** The row's words for edge `child` when no term on it adds anything. */
export function addsNothingText(
  child: Pick<TreeNode, "id" | "edge">,
  view: Pick<ComposedView, "statement" | "termEdges" | "zeroAtOrigin">,
): string {
  const zero = view.zeroAtOrigin.find((z) => z.edge === child.id);
  if (zero) {
    return `Adds nothing at the origin: ${zero.why}.`;
  }
  const onEdge = view.termEdges.some((edges) => edges.includes(child.id));
  if (onEdge && child.edge.kind === "rotation") {
    return "Adds nothing here: its rotation turns about the reference's origin, so the separation from that origin doesn't change.";
  }
  return child.edge.accuracy.byDefinition
    ? "Adds nothing: exact by definition."
    : "Adds nothing at the origin.";
}
