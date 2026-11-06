// Pure positions for the frame-tree diagram. Leaves take one `nodeWidth` slot
// each, left to right; a parent sits midway between its first and last child.
// So two nodes at one depth are never closer than `nodeWidth`, and the layout
// has no state: the same tree and options give the same positions.
import type { TreeNode } from "../tree.ts";

export interface TreeLayoutOptions {
  /** The room for the diagram, px. */
  width: number;
  /** The height of one depth row, px. */
  rowHeight: number;
  /** The width one node takes, px. */
  nodeWidth: number;
}

export interface TreeLayout {
  /** Parents before their children. `x` is a node's centre, `y` its row's middle. */
  nodes: readonly { id: string; x: number; y: number; depth: number }[];
  edges: readonly { from: string; to: string }[];
  height: number;
}

/**
 * The layout of `root`. The tree is centred in `width`. One too wide for it is
 * squeezed to fit, which brings nodes closer than `nodeWidth`; the caller
 * should size `width` to avoid that.
 */
export function layoutTree(
  root: TreeNode,
  options: TreeLayoutOptions,
): TreeLayout {
  const { width, rowHeight, nodeWidth } = options;
  const nodes: { id: string; x: number; y: number; depth: number }[] = [];
  const edges: { from: string; to: string }[] = [];
  let leaves = 0;
  let maxDepth = 0;

  // Returns the node's x in slot units (one unit = one nodeWidth).
  const place = (node: TreeNode, depth: number): number => {
    maxDepth = Math.max(maxDepth, depth);
    const entry = {
      id: node.id,
      x: 0,
      y: depth * rowHeight + rowHeight / 2,
      depth,
    };
    nodes.push(entry);
    let x: number;
    if (node.children.length === 0) {
      x = leaves++ + 0.5;
    } else {
      const xs = node.children.map((child) => {
        edges.push({ from: node.id, to: child.id });
        return place(child, depth + 1);
      });
      x = (xs[0]! + xs[xs.length - 1]!) / 2;
    }
    entry.x = x;
    return x;
  };
  place(root, 0);

  const span = leaves * nodeWidth;
  const scale = span > width ? width / span : 1;
  const offset = (width - span * scale) / 2;
  for (const n of nodes) {
    n.x = offset + n.x * nodeWidth * scale;
  }
  return { nodes, edges, height: (maxDepth + 1) * rowHeight };
}
