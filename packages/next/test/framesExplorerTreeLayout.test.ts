// The frames explorer's tree layout (examples/frames-explorer/panel/treeLayout.ts):
// pure positions for a tree diagram, over hand-made trees.
import { describe, expect, it } from "vitest";
import {
  focusTree,
  layoutOutline,
  layoutTree,
  type TreeLayoutOptions,
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

function check(root: TreeNode, opts: TreeLayoutOptions = options) {
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

describe("layoutTree with pills sized to their labels (the owner's branching diagram)", () => {
  const gap = 12;
  const widths = (root: TreeNode, w: (id: string) => number) => {
    const out = new Map<string, number>();
    const walk = (n: TreeNode) => {
      out.set(n.id, w(n.id));
      n.children.forEach(walk);
    };
    walk(root);
    return out;
  };

  it("keeps a constant gap between neighbouring pills at every depth, never overlapping", () => {
    const root = lopsided(16);
    const nodeWidths = widths(root, (id) => 40 + ((id.length * 37) % 90));
    const { layout } = check(root, {
      width: 300,
      rowHeight: 60,
      nodeWidth: 0,
      nodeWidths,
      gap,
    });
    const rows = new Map<number, { x: number; w: number }[]>();
    for (const n of layout.nodes) {
      rows.set(n.depth, [
        ...(rows.get(n.depth) ?? []),
        { x: n.x, w: nodeWidths.get(n.id)! },
      ]);
    }
    for (const row of rows.values()) {
      row.sort((a, b) => a.x - b.x);
      for (let i = 1; i < row.length; i++) {
        const space =
          row[i]!.x - row[i]!.w / 2 - (row[i - 1]!.x + row[i - 1]!.w / 2);
        expect(space).toBeGreaterThanOrEqual(gap - 1e-9);
      }
    }
    // Every pill inside the width it says it needs.
    for (const n of layout.nodes) {
      const w = nodeWidths.get(n.id)!;
      expect(n.x - w / 2).toBeGreaterThanOrEqual(-1e-9);
      expect(n.x + w / 2).toBeLessThanOrEqual(
        Math.max(layout.neededWidth, 300) + 1e-9,
      );
    }
  });

  it("packs leaves at their own widths plus the gap: three pills of 40, 80 and 120 need 276 px", () => {
    const root = node("r", node("a"), node("b"), node("c"));
    const nodeWidths = new Map([
      ["r", 30],
      ["a", 40],
      ["b", 80],
      ["c", 120],
    ]);
    const { layout, byId } = check(root, {
      width: 200,
      rowHeight: 60,
      nodeWidth: 0,
      nodeWidths,
      gap,
    });
    expect(layout.neededWidth).toBe(40 + 80 + 120 + 3 * gap);
    expect(layout.fits).toBe(false);
    expect(byId.get("b")!.x - byId.get("a")!.x).toBe(20 + gap + 40);
  });

  it("gives a parent wider than its children's span room of its own", () => {
    const root = node("r", node("wide", node("x")), node("y"));
    const nodeWidths = new Map([
      ["r", 20],
      ["wide", 200],
      ["x", 20],
      ["y", 20],
    ]);
    const { byId, layout } = check(root, {
      width: 1000,
      rowHeight: 60,
      nodeWidth: 0,
      nodeWidths,
      gap,
    });
    const wide = byId.get("wide")!;
    const y = byId.get("y")!;
    expect(y.x - 10 - (wide.x + 100)).toBeGreaterThanOrEqual(gap - 1e-9);
    expect(layout.neededWidth).toBe(200 + gap + 20 + gap);
  });
});

describe("focusTree: the frames a scenario uses, the rest folded into chips", () => {
  const tree = node(
    "ICRF",
    node("HCRS"),
    node("EARTH_ICRF", node("GCRF", node("ITRF"), node("EME2000"))),
    node("MOON_ICRF", node("MOON_ME", node("MOON_PA"))),
  );

  it("keeps what it is asked to keep and every ancestor, folding each unused subtree into a +N chip on its parent", () => {
    const f = focusTree(tree, new Set(["ITRF"]), new Set());
    const ids: string[] = [];
    const walk = (n: TreeNode) => {
      ids.push(n.id);
      n.children.forEach(walk);
    };
    walk(f.tree);
    expect(ids).toEqual(["ICRF", "EARTH_ICRF", "GCRF", "ITRF"]);
    expect(Object.fromEntries(f.folded)).toEqual({ ICRF: 4, GCRF: 1 });
  });

  it("unfolds a parent's chip when it is expanded", () => {
    const f = focusTree(tree, new Set(["ITRF"]), new Set(["ICRF"]));
    expect(f.tree.children.map((c) => c.id)).toEqual([
      "HCRS",
      "EARTH_ICRF",
      "MOON_ICRF",
    ]);
    expect(f.folded.get("ICRF")).toBeUndefined();
    // MOON_ICRF's own subtree is shown whole once its parent is unfolded.
    expect(f.tree.children[2]!.children[0]!.id).toBe("MOON_ME");
    expect(f.folded.get("GCRF")).toBe(1);
  });

  it("leaves the tree as it is when everything is kept, and doesn't change its input", () => {
    const all = new Set(["HCRS", "ITRF", "EME2000", "MOON_PA"]);
    const f = focusTree(tree, all, new Set());
    expect(f.folded.size).toBe(0);
    expect(f.tree).toEqual(tree);
    expect(focusTree(tree, new Set(), new Set()).tree.children).toEqual([]);
    expect(tree.children).toHaveLength(3);
  });
});
