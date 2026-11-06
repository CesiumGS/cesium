// Pure positions for the frame-tree diagram, and the focused tree a narrow
// column draws. Leaves take one slot each, left to right (`nodeWidth`, or a
// pill's own width and the gap); a parent sits midway between its first and
// last child. So two nodes at one depth are never closer than their slots,
// and the layout has no state: the same tree and options give the same
// positions. The docked diagram uses `focusTree` then `layoutTree` (the
// owner's branching diagram, overriding ruling S6's outline);
// `layoutOutline` stays for a later narrow fallback, unused today.
import type { TreeNode } from "../tree.ts";

export interface TreeLayoutOptions {
  /** The room for the diagram, px. */
  width: number;
  /** The height of one depth row, px. */
  rowHeight: number;
  /** The width one node takes, px (its slot: the node and the space beside it). */
  nodeWidth: number;
  /**
   * Each node's own width, px (pills sized to their labels): its slot is
   * that and `gap`. A node it doesn't name takes `nodeWidth`.
   */
  nodeWidths?: ReadonlyMap<string, number>;
  /** The space between neighbouring pills, px, with `nodeWidths` (default 0). */
  gap?: number;
}

export interface TreeLayout {
  /** Parents before their children. `x` is a node's centre, `y` its row's middle. */
  nodes: readonly { id: string; x: number; y: number; depth: number }[];
  edges: readonly { from: string; to: string }[];
  height: number;
  /** The width the tree needs so no two nodes at one depth are closer than their slots. */
  neededWidth: number;
  /** `neededWidth <= width`. When false the tree is laid out at `neededWidth`, wider than asked. */
  fits: boolean;
}

/**
 * The layout of `root`. Each subtree takes a span as wide as its own node's
 * slot or its children's spans side by side, whichever is wider; children
 * sit side by side, centred in their parent's span, and a parent midway
 * between its first and last child (moved in only where its own pill is
 * wider than that). So two nodes at one depth never come closer than their
 * slots: with `nodeWidths`, a constant `gap` between pills. A tree that fits
 * is centred in `width`. One that doesn't is laid out at its `neededWidth`
 * (never squeezed, so spacing holds) with `fits` false, for the caller to
 * pan or switch to `layoutOutline`.
 */
export function layoutTree(
  root: TreeNode,
  options: TreeLayoutOptions,
): TreeLayout {
  const { width, rowHeight, nodeWidth, nodeWidths, gap = 0 } = options;
  const slot = (n: TreeNode) => {
    const w = nodeWidths?.get(n.id);
    return w === undefined ? nodeWidth : w + gap;
  };
  const span = new Map<TreeNode, number>();
  const measure = (n: TreeNode): number => {
    const children = n.children.reduce((sum, c) => sum + measure(c), 0);
    const w = Math.max(slot(n), children);
    span.set(n, w);
    return w;
  };
  const neededWidth = measure(root);
  const nodes: { id: string; x: number; y: number; depth: number }[] = [];
  const edges: { from: string; to: string }[] = [];
  let maxDepth = 0;
  const place = (node: TreeNode, depth: number, left: number): number => {
    maxDepth = Math.max(maxDepth, depth);
    const entry = {
      id: node.id,
      x: 0,
      y: depth * rowHeight + rowHeight / 2,
      depth,
    };
    nodes.push(entry);
    const w = span.get(node)!;
    let x = left + w / 2;
    if (node.children.length > 0) {
      const sum = node.children.reduce((s, c) => s + span.get(c)!, 0);
      let at = left + (w - sum) / 2;
      const xs = node.children.map((child) => {
        edges.push({ from: node.id, to: child.id });
        const cx = place(child, depth + 1, at);
        at += span.get(child)!;
        return cx;
      });
      const half = slot(node) / 2;
      x = Math.min(
        left + w - half,
        Math.max(left + half, (xs[0]! + xs[xs.length - 1]!) / 2),
      );
    }
    entry.x = x;
    return x;
  };
  const offset = Math.max(0, (width - neededWidth) / 2);
  place(root, 0, offset);
  return {
    nodes,
    edges,
    height: (maxDepth + 1) * rowHeight,
    neededWidth,
    fits: neededWidth <= width,
  };
}

/**
 * The tree a diagram in a narrow column draws (the owner's branching
 * diagram): the nodes in `keep` and every ancestor of one, each other
 * subtree folded away and counted on its parent (`folded`, a "+N" chip). A
 * parent in `expanded` shows its folded subtrees whole; its kept ones stay
 * focused. `tree` isn't changed.
 */
export function focusTree(
  tree: TreeNode,
  keep: ReadonlySet<string>,
  expanded: ReadonlySet<string>,
): { tree: TreeNode; folded: Map<string, number> } {
  const folded = new Map<string, number>();
  const size = (n: TreeNode): number =>
    1 + n.children.reduce((s, c) => s + size(c), 0);
  const wanted = (n: TreeNode): boolean =>
    keep.has(n.id) || n.children.some(wanted);
  const visit = (n: TreeNode, whole: boolean): TreeNode => {
    if (whole || expanded.has(n.id)) {
      // Its folded subtrees whole; the ones it kept stay focused.
      return {
        ...n,
        children: n.children.map((c) => visit(c, whole || !wanted(c))),
      };
    }
    const shown = n.children.filter(wanted);
    const hidden = n.children
      .filter((c) => !wanted(c))
      .reduce((s, c) => s + size(c), 0);
    if (hidden > 0) {
      folded.set(n.id, hidden);
    }
    return { ...n, children: shown.map((c) => visit(c, false)) };
  };
  return { tree: visit(tree, false), folded };
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
