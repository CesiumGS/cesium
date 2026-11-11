// The CSG sample's model (plan §13.33), without a kernel or a GPU: a tree
// becomes the worker's recipe and comes back from it, and from JSON; edits
// keep ids unique; a face's tag finds its leaf and a node finds its faces;
// the preview's outline and the edit scheduler behave.
import { describe, expect, it, vi } from "vitest";
import { EvaluationScheduler } from "../examples/csg/evaluator.ts";
import { outlineOf, place } from "../examples/csg/preview.ts";
import {
  addChild,
  createLeaf,
  createOp,
  defaultBracket,
  duplicateNode,
  facesOfNode,
  facesToLeaves,
  findNode,
  indentNode,
  leavesOf,
  moveNode,
  newTree,
  outdentNode,
  parentOf,
  parseTree,
  pathTo,
  recipeOf,
  removeNode,
  treeFromRecipe,
  type CsgTree,
  type TreeNode,
} from "../examples/csg/tree.ts";
import {
  checkRecipe,
  countBooleans,
  recipeLeaves,
} from "../src/brep/kernelProtocol.ts";

const ids = (tree: CsgTree) => {
  const out: number[] = [];
  const visit = (n: TreeNode) => {
    out.push(n.id);
    if (n.type === "op") {
      n.children.forEach(visit);
    }
  };
  visit(tree.root);
  return out;
};

describe("the tree and its recipe", () => {
  it("makes the bracket's recipe: leaves tagged by id, centred, placed", () => {
    const tree = defaultBracket();
    const recipe = recipeOf(tree.root)!;
    expect(() => checkRecipe(recipe)).not.toThrow();
    expect(countBooleans(recipe)).toBe(8);
    expect(recipeLeaves(recipe).map((l) => l.tag)).toEqual(
      leavesOf(tree.root).map((l) => l.id),
    );
    // A box is centred on the origin, then placed.
    const base = recipeLeaves(recipe)[0]!;
    expect(base.primitive).toEqual({
      kind: "box",
      origin: [-1.2, -0.75, -0.1],
      size: [2.4, 1.5, 0.2],
    });
    expect(base.placement).toEqual({ translate: [0, -0.05, 0.1] });
    // The cutter is turned about y only; a leaf at the origin has no placement.
    const cutter = recipeLeaves(recipe).find(
      (l) => l.primitive.kind === "cylinder" && l.placement?.rotate?.[1] === 90,
    )!;
    expect(cutter.placement).toEqual({
      rotate: [0, 90, 0],
      translate: [0, 0, 0.7],
    });
    const lone = recipeOf(createLeaf(newTree(), "sphere"))!;
    expect(lone).toEqual({
      type: "primitive",
      tag: 2,
      primitive: { kind: "sphere", centre: [0, 0, 0], radius: 0.5 },
    });
  });

  it("round-trips through the worker's format, JSON, and a structured clone", () => {
    const tree = defaultBracket();
    const recipe = recipeOf(tree.root)!;
    const sent = structuredClone(JSON.parse(JSON.stringify(recipe)));
    expect(sent).toEqual(recipe);
    const back = treeFromRecipe(sent);
    // The same recipe again, from a tree built from it: every leaf and op.
    expect(recipeOf(back.root)).toEqual(recipe);
    expect(leavesOf(back.root).map((l) => [l.id, l.kind])).toEqual(
      leavesOf(tree.root).map((l) => [l.id, l.kind]),
    );
    expect(new Set(ids(back)).size).toBe(ids(back).length);
  });

  it("round-trips the tree itself through JSON", () => {
    const tree = defaultBracket();
    const parsed = parseTree(JSON.parse(JSON.stringify(tree)));
    expect(parsed).toEqual(tree);
    expect(recipeOf(parsed.root)).toEqual(recipeOf(tree.root));
  });

  it("rejects bad data by saying what is wrong", () => {
    const tree = JSON.parse(JSON.stringify(defaultBracket()));
    const broken = (edit: (t: ReturnType<typeof JSON.parse>) => void) => {
      const copy = structuredClone(tree);
      edit(copy);
      return () => parseTree(copy);
    };
    expect(
      broken((t) => (t.root.children[0].children[0].kind = "teapot")),
    ).toThrow(/unknown primitive "teapot"/);
    expect(broken((t) => (t.root.children[0].children[1].id = 1))).toThrow(
      /missing or repeated id/,
    );
    expect(broken((t) => (t.root.operation = "xor"))).toThrow(
      /unknown operation "xor"/,
    );
    expect(
      broken((t) => (t.root.children[0].children[0].params.sizeX = "wide")),
    ).toThrow(/sizeX is not a number/);
    expect(
      broken((t) => (t.root.children[0].children[0].translate = [1, 2])),
    ).toThrow(/placement/);
    expect(() => parseTree(null)).toThrow(/not an object/);
    expect(() =>
      parseTree({ root: tree.root.children[0].children[0] }),
    ).toThrow(/root must be an operation/);
  });

  it("leaves out disabled nodes, and nodes with nothing under them", () => {
    const tree = defaultBracket();
    const body = findNode(tree, 2)!;
    expect(body.type).toBe("op");
    // Disabling the cutters' leaf leaves the fillet's gusset on its own.
    const cutter = leavesOf(tree.root).find((l) => l.name === "Fillet cutter")!;
    cutter.enabled = false;
    expect(countBooleans(recipeOf(tree.root)!)).toBe(7);
    // Disabling the whole body leaves the cutters, with no first operand to cut.
    body.enabled = false;
    const rest = recipeOf(tree.root)!;
    expect(recipeLeaves(rest).map((l) => l.tag)).toEqual(
      leavesOf(tree.root)
        .filter((l) => l.enabled && !leavesOf(body).includes(l))
        .map((l) => l.id),
    );
    // Nothing enabled: no recipe.
    tree.root.enabled = false;
    expect(recipeOf(tree.root)).toBeUndefined();
    const empty = newTree();
    expect(recipeOf(empty.root)).toBeUndefined();
  });
});

describe("editing the tree", () => {
  const sample = () => {
    const tree = newTree();
    const a = createLeaf(tree, "box", { name: "a" });
    const b = createLeaf(tree, "sphere", { name: "b" });
    const group = createOp(tree, "difference", "group");
    const c = createLeaf(tree, "cone", { name: "c" });
    addChild(tree, tree.root.id, a);
    addChild(tree, tree.root.id, group);
    addChild(tree, tree.root.id, b);
    addChild(tree, group.id, c);
    return { tree, a, b, c, group };
  };
  const names = (n: TreeNode): string =>
    n.type === "leaf"
      ? n.name
      : `${n.name}(${n.children.map(names).join(" ")})`;

  it("reorders among siblings, and moves in and out of an operation", () => {
    const { tree, a, b, c, group } = sample();
    expect(names(tree.root)).toBe("Model(a group(c) b)");
    expect(moveNode(tree, b.id, -1)).toBe(true);
    expect(names(tree.root)).toBe("Model(a b group(c))");
    expect(moveNode(tree, a.id, -1)).toBe(false);
    expect(moveNode(tree, group.id, 1)).toBe(false);
    // b goes into the operation before it, as its last operand; and c out, after it.
    expect(indentNode(tree, b.id)).toBe(false);
    expect(indentNode(tree, group.id)).toBe(false);
    expect(moveNode(tree, group.id, -1)).toBe(true);
    expect(indentNode(tree, b.id)).toBe(true);
    expect(names(tree.root)).toBe("Model(a group(c b))");
    expect(outdentNode(tree, c.id)).toBe(true);
    expect(names(tree.root)).toBe("Model(a group(b) c)");
    expect(outdentNode(tree, a.id)).toBe(false);
    expect(parentOf(tree, b.id)).toBe(group);
    expect(pathTo(tree, b.id).map((n) => n.name)).toEqual([
      "Model",
      "group",
      "b",
    ]);
  });

  it("removes a node with what is under it, never the root, and duplicates with fresh ids", () => {
    const { tree, group } = sample();
    const copy = duplicateNode(tree, group.id)!;
    expect(names(tree.root)).toBe("Model(a group(c) group(c) b)");
    expect(new Set(ids(tree)).size).toBe(ids(tree).length);
    expect(copy.id).not.toBe(group.id);
    expect(removeNode(tree, group.id)).toBe(true);
    expect(names(tree.root)).toBe("Model(a group(c) b)");
    expect(removeNode(tree, tree.root.id)).toBe(false);
    expect(() => addChild(tree, 2, createLeaf(tree, "box"))).toThrow(
      /not an operation/,
    );
    // Ids never repeat, even after removals.
    const next = createLeaf(tree, "torus");
    expect(ids(tree)).not.toContain(next.id);
  });
});

describe("provenance: faces to nodes and back", () => {
  const tree = defaultBracket();
  const leaves = leavesOf(tree.root);
  const id = (name: string) => leaves.find((l) => l.name === name)!.id;
  // Eight faces, as a kernel's tags would say.
  const faceTags = Int32Array.of(
    id("Base plate"),
    id("Base plate"),
    id("Upright"),
    id("Fillet cutter"),
    id("Gusset"),
    id("Hole A"),
    id("Countersink A"),
    -1,
  );

  it("names the leaf each face came from, undefined where there is none", () => {
    const from = facesToLeaves(tree, faceTags);
    expect(from.map((l) => l?.name)).toEqual([
      "Base plate",
      "Base plate",
      "Upright",
      "Fillet cutter",
      "Gusset",
      "Hole A",
      "Countersink A",
      undefined,
    ]);
  });

  it("finds a node's faces: a leaf's own, and an operation's, through its subtree", () => {
    const node = (name: string) => {
      const found = [
        tree.root,
        ...leaves,
        findNode(tree, 2)!,
        findNode(tree, 5)!,
      ].find((n) => n.name === name);
      return found!;
    };
    expect(facesOfNode(node("Base plate"), faceTags)).toEqual([0, 1]);
    expect(facesOfNode(node("Body"), faceTags)).toEqual([0, 1, 2, 3, 4]);
    expect(facesOfNode(node("Fillet"), faceTags)).toEqual([3, 4]);
    expect(facesOfNode(tree.root, faceTags)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    // The path from a face's leaf to the root names every node that made it.
    const cutter = id("Fillet cutter");
    expect(pathTo(tree, cutter).map((n) => n.name)).toEqual([
      "Bracket",
      "Body",
      "Fillet",
      "Fillet cutter",
    ]);
  });
});

describe("the preview outline", () => {
  const tree = newTree();
  const bounds = (positions: Float32Array) => {
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    positions.forEach((v, i) => {
      lo[i % 3] = Math.min(lo[i % 3]!, v);
      hi[i % 3] = Math.max(hi[i % 3]!, v);
    });
    return { lo, hi };
  };

  it("turns about x, then y, then z, then moves: as the kernels do", () => {
    expect(place([0, 0, 1], [90, 0, 0], [0, 0, 0])[1]).toBeCloseTo(-1, 12);
    expect(place([0, 0, 1], [0, 90, 0], [0, 0, 0])[0]).toBeCloseTo(1, 12);
    const p = place([1, 0, 0], [0, 0, 90], [0, 0, 0]);
    expect(p[0]).toBeCloseTo(0, 12);
    expect(p[1]).toBeCloseTo(1, 12);
    const q = place([0, 0, 1], [90, 90, 0], [1, 2, 3]);
    // About x: (0, -1, 0); about y: unchanged; moved.
    expect(q.map((v, i) => v - [1, 2, 3][i]!)).toEqual([
      expect.closeTo(0, 12),
      expect.closeTo(-1, 12),
      expect.closeTo(0, 12),
    ]);
  });

  it("outlines each primitive within its extent, then places it", () => {
    const box = createLeaf(tree, "box", {
      params: { sizeX: 2, sizeY: 1, sizeZ: 0.5 },
      translate: [1, 0, 0],
    });
    const outline = outlineOf(box);
    // Two chains of four corners and a joined pair of points per vertical edge.
    expect(outline.positions.length / 3).toBe(16);
    expect(outline.indices.length / 2).toBe(12);
    const { lo, hi } = bounds(outline.positions);
    expect(lo).toEqual([0, -0.5, -0.25]);
    expect(hi).toEqual([2, 0.5, 0.25]);

    const cylinder = outlineOf(
      createLeaf(tree, "cylinder", { params: { radius: 0.5, height: 2 } }),
    );
    const c = bounds(cylinder.positions);
    expect(c.lo[2]).toBeCloseTo(-1, 6);
    expect(c.hi[2]).toBeCloseTo(1, 6);
    expect(c.hi[0]).toBeCloseTo(0.5, 6);

    const torus = bounds(
      outlineOf(
        createLeaf(tree, "torus", { params: { major: 1, minor: 0.25 } }),
      ).positions,
    );
    expect(torus.hi[0]).toBeCloseTo(1.25, 6);
    expect(torus.hi[2]).toBeCloseTo(0.25, 6);

    // A cone to a point has a zero circle that draws nothing, and every index is valid.
    const point = outlineOf(
      createLeaf(tree, "cone", {
        params: { radiusBase: 0.5, radiusTop: 0, height: 1 },
      }),
    );
    expect(Math.max(...point.indices)).toBeLessThan(point.positions.length / 3);
    const sphere = outlineOf(createLeaf(tree, "sphere"));
    expect(bounds(sphere.positions).hi[1]).toBeCloseTo(0.5, 6);
  });
});

describe("the edit scheduler", () => {
  const make = () => {
    vi.useFakeTimers();
    let now = 0;
    const runs: Array<[number, boolean]> = [];
    const scheduler = new EvaluationScheduler({
      run: (final) => runs.push([now, final]),
      throttleMs: 100,
      debounceMs: 200,
      now: () => now,
      setTimer: (cb, ms) =>
        setTimeout(() => {
          now += ms;
          cb();
        }, ms),
      clearTimer: (t) => clearTimeout(t as ReturnType<typeof setTimeout>),
    });
    const tick = (ms: number) => {
      vi.advanceTimersByTime(ms);
    };
    return { scheduler, runs, tick, at: (t: number) => (now = t) };
  };

  it("runs a drag's first move at once, then at most once per throttle, ending on the latest", () => {
    const { scheduler, runs, tick } = make();
    scheduler.drag();
    expect(runs).toEqual([[0, false]]);
    scheduler.drag();
    scheduler.drag();
    scheduler.drag();
    expect(runs.length).toBe(1);
    tick(100);
    expect(runs).toEqual([
      [0, false],
      [100, false],
    ]);
    scheduler.commit();
    expect(runs.at(-1)).toEqual([100, true]);
    vi.useRealTimers();
  });

  it("debounces discrete edits into one final evaluation, and a commit cancels the wait", () => {
    const { scheduler, runs, tick } = make();
    scheduler.edit();
    tick(150);
    scheduler.edit();
    tick(150);
    expect(runs).toEqual([]);
    tick(60);
    expect(runs.length).toBe(1);
    expect(runs[0]![1]).toBe(true);
    scheduler.edit();
    scheduler.commit();
    tick(500);
    // The commit ran now, and the debounced edit never fires after it.
    expect(runs.length).toBe(2);
    scheduler.drag();
    scheduler.drag();
    scheduler.stop();
    tick(500);
    // Right after the commit, the drag's run waits for the throttle; stopping drops it.
    expect(runs.length).toBe(2);
    vi.useRealTimers();
  });
});
