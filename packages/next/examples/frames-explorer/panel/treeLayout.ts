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
  /** The width the tree needs so no two nodes at one depth are closer than `nodeWidth`. */
  neededWidth: number;
  /** `neededWidth <= width`. When false the tree is laid out at `neededWidth`, wider than asked. */
  fits: boolean;
}

/**
 * The layout of `root`. A tree that fits is centred in `width`. One that
 * doesn't is laid out at its `neededWidth` (never squeezed, so spacing holds)
 * with `fits` false, for the caller to scroll or switch to `layoutOutline`.
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

  const neededWidth = leaves * nodeWidth;
  const offset = Math.max(0, (width - neededWidth) / 2);
  for (const n of nodes) {
    n.x = offset + n.x * nodeWidth;
  }
  return {
    nodes,
    edges,
    height: (maxDepth + 1) * rowHeight,
    neededWidth,
    fits: neededWidth <= width,
  };
}

/**
 * An indented outline of `root` for a narrow column: one row per node in
 * depth-first order (children in `layoutTree`'s order), `x` = depth * indent
 * and `y` the row's middle. `width` is the room the indentation takes,
 * `(deepest depth + 1) * indent`; the caller adds the label's width. Edges
 * are the same parent-to-child pairs, for elbow connectors.
 */
export function layoutOutline(
  root: TreeNode,
  options: { rowHeight: number; indent: number },
): {
  nodes: readonly { id: string; x: number; y: number; depth: number }[];
  edges: readonly { from: string; to: string }[];
  height: number;
  width: number;
} {
  const { rowHeight, indent } = options;
  const nodes: { id: string; x: number; y: number; depth: number }[] = [];
  const edges: { from: string; to: string }[] = [];
  let maxDepth = 0;
  const visit = (node: TreeNode, depth: number): void => {
    maxDepth = Math.max(maxDepth, depth);
    nodes.push({
      id: node.id,
      x: depth * indent,
      y: nodes.length * rowHeight + rowHeight / 2,
      depth,
    });
    for (const child of node.children) {
      edges.push({ from: node.id, to: child.id });
      visit(child, depth + 1);
    }
  };
  visit(root, 0);
  return {
    nodes,
    edges,
    height: nodes.length * rowHeight,
    width: (maxDepth + 1) * indent,
  };
}
