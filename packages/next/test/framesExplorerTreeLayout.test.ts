// The frames explorer's tree layout (examples/frames-explorer/panel/treeLayout.ts):
// pure positions for a tree diagram, over hand-made trees.
import { describe, expect, it } from "vitest";
import {
  layoutOutline,
  layoutTree,
} from "../examples/frames-explorer/panel/treeLayout.ts";
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
    expect(layout.nodes).toHaveLength(1);
    expect(layout.nodes[0]!.id).toBe("only");
    expect(layout.nodes[0]!.x).toBeCloseTo(600, 6);
    expect(layout.nodes[0]!.y).toBeCloseTo(30, 6);
    expect(layout.nodes[0]!.depth).toBe(0);
    expect(layout.fits).toBe(true);
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

  it("reports a tree wider than the width as not fitting, with the width it needs and no overlaps", () => {
    const { layout } = check(lopsided(20), { ...options, width: 800 });
    expect(layout.fits).toBe(false);
    expect(layout.neededWidth).toBeGreaterThanOrEqual(1000);
    const rows = new Map<number, number[]>();
    for (const n of layout.nodes) {
      expect(n.x - 50).toBeGreaterThanOrEqual(-1e-9);
      expect(n.x + 50).toBeLessThanOrEqual(layout.neededWidth + 1e-9);
      rows.set(n.depth, [...(rows.get(n.depth) ?? []), n.x]);
    }
    for (const xs of rows.values()) {
      xs.sort((p, q) => p - q);
      for (let i = 1; i < xs.length; i++) {
        expect(xs[i]! - xs[i - 1]!).toBeGreaterThanOrEqual(100 - 1e-9);
      }
    }
  });

  it("reports fits and the needed width when the tree fits", () => {
    const { layout } = check(lopsided(20));
    expect(layout.fits).toBe(true);
    expect(layout.neededWidth).toBeLessThanOrEqual(1200);
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

describe("layoutOutline", () => {
  const outlineOptions = { rowHeight: 24, indent: 16 };

  it("gives one row per node in depth-first order, indented by depth", () => {
    const root = node("a", node("b", node("d")), node("c"));
    const out = layoutOutline(root, outlineOptions);
    expect(out.nodes.map((n) => n.id)).toEqual(["a", "b", "d", "c"]);
    out.nodes.forEach((n, i) => {
      expect(n.y).toBeCloseTo(i * 24 + 12, 6);
      expect(n.x).toBeCloseTo(n.depth * 16, 6);
    });
    expect(out.height).toBe(4 * 24);
    expect(out.edges).toEqual([
      { from: "a", to: "b" },
      { from: "b", to: "d" },
      { from: "a", to: "c" },
    ]);
  });

  it("puts every child one indent right of its parent and below it", () => {
    const root = lopsided(20);
    const out = layoutOutline(root, outlineOptions);
    const byId = new Map(out.nodes.map((n) => [n.id, n]));
    expect(out.edges).toHaveLength(19);
    for (const e of out.edges) {
      const parent = byId.get(e.from)!;
      const child = byId.get(e.to)!;
      expect(child.x - parent.x).toBeCloseTo(16, 6);
      expect(child.y).toBeGreaterThan(parent.y);
    }
    const ys = out.nodes.map((n) => n.y);
    expect([...ys].sort((p, q) => p - q)).toEqual(ys);
    expect(new Set(ys).size).toBe(20);
  });

  it("orders children as layoutTree does", () => {
    const root = lopsided(20);
    const tree = layoutTree(root, options);
    const out = layoutOutline(root, outlineOptions);
    const kids = (edges: readonly { from: string; to: string }[]) =>
      edges.map((e) => `${e.from}>${e.to}`).sort();
    expect(kids(out.edges)).toEqual(kids(tree.edges));
    const treeX = new Map(tree.nodes.map((n) => [n.id, n.x]));
    const siblings = new Map<string, string[]>();
    for (const e of out.edges) {
      siblings.set(e.from, [...(siblings.get(e.from) ?? []), e.to]);
    }
    for (const list of siblings.values()) {
      const xs = list.map((id) => treeX.get(id)!);
      expect([...xs].sort((p, q) => p - q)).toEqual(xs);
    }
  });

  it("fits a 20-node tree in a 320 px column", () => {
    const out = layoutOutline(lopsided(20), outlineOptions);
    expect(out.width).toBeLessThanOrEqual(320);
    for (const n of out.nodes) {
      expect(n.x).toBeLessThan(out.width);
    }
  });
});
