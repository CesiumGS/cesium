// The frames explorer's tree layout (examples/frames-explorer/panel/treeLayout.ts):
// pure positions for a tree diagram, over hand-made trees.
import { describe, expect, it } from "vitest";
import { layoutTree } from "../examples/frames-explorer/panel/treeLayout.ts";
import type { TreeNode } from "../examples/frames-explorer/tree.ts";

const edge: TreeNode["edge"] = {
  kind: "constant",
  detail: "test",
  accuracy: { note: "not known: test" },
};
const node = (id: string, ...children: TreeNode[]): TreeNode => ({
  id,
  label: id,
  edge,
  children,
});

const options = { width: 1200, rowHeight: 60, nodeWidth: 100 };

/** A root with `n - 1` further nodes in an uneven shape. */
function lopsided(n: number): TreeNode {
  const root = node("n0");
  const all = [root];
  for (let i = 1; i < n; i++) {
    const parent = all[Math.floor((i - 1) / 2) + (i % 3 === 0 ? 1 : 0)]!;
    const child = node(`n${i}`);
    parent.children.push(child);
    all.push(child);
  }
  return root;
}

function check(root: TreeNode, opts = options) {
  const layout = layoutTree(root, opts);
  const byId = new Map(layout.nodes.map((n) => [n.id, n]));
  return { layout, byId };
}

describe("layoutTree", () => {
  it("places a single node centred in the width", () => {
    const { layout } = check(node("only"));
    expect(layout.nodes).toEqual([{ id: "only", x: 600, y: 30, depth: 0 }]);
    expect(layout.edges).toEqual([]);
    expect(layout.height).toBe(60);
  });

  it("gives one edge per parent-child pair and rows by depth", () => {
    const root = node("a", node("b", node("d")), node("c"));
    const { layout, byId } = check(root);
    expect(layout.edges).toEqual([
      { from: "a", to: "b" },
      { from: "b", to: "d" },
      { from: "a", to: "c" },
    ]);
    expect(byId.get("d")!.depth).toBe(2);
    expect(byId.get("d")!.y).toBe(2 * 60 + 30);
    expect(layout.height).toBe(3 * 60);
  });

  it("keeps same-depth nodes at least nodeWidth apart", () => {
    const { layout } = check(lopsided(20));
    const rows = new Map<number, number[]>();
    for (const n of layout.nodes) {
      rows.set(n.depth, [...(rows.get(n.depth) ?? []), n.x]);
    }
    for (const xs of rows.values()) {
      xs.sort((p, q) => p - q);
      for (let i = 1; i < xs.length; i++) {
        expect(xs[i]! - xs[i - 1]!).toBeGreaterThanOrEqual(100 - 1e-9);
      }
    }
  });

  it("centres each parent over its children within a pixel", () => {
    const root = lopsided(20);
    const { byId } = check(root);
    const visit = (n: TreeNode) => {
      if (n.children.length > 0) {
        const xs = n.children.map((c) => byId.get(c.id)!.x);
        const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
        expect(Math.abs(byId.get(n.id)!.x - mid)).toBeLessThan(1);
      }
      n.children.forEach(visit);
    };
    visit(root);
  });

  it("fits a 20-node tree inside the width, nodes included", () => {
    const { layout } = check(lopsided(20));
    expect(layout.nodes).toHaveLength(20);
    for (const n of layout.nodes) {
      expect(n.x - 50).toBeGreaterThanOrEqual(-1e-9);
      expect(n.x + 50).toBeLessThanOrEqual(1200 + 1e-9);
    }
  });

  it("squeezes a tree wider than the width to fit rather than overflow", () => {
    const wide = node(
      "r",
      ...Array.from({ length: 12 }, (_, i) => node(`k${i}`)),
    );
    const { layout } = check(wide, { ...options, width: 800 });
    for (const n of layout.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.x).toBeLessThanOrEqual(800);
    }
  });

  it("lists every node once, parents before children", () => {
    const root = lopsided(20);
    const { layout } = check(root);
    const index = new Map(layout.nodes.map((n, i) => [n.id, i]));
    expect(index.size).toBe(20);
    for (const e of layout.edges) {
      expect(index.get(e.from)!).toBeLessThan(index.get(e.to)!);
    }
  });
});
