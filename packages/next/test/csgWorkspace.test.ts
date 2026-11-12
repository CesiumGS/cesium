// The CSG sample's workspace (plan §13.33, direct manipulation), without a
// kernel, a GPU or a page: dragging rows (the drops a tree accepts and
// refuses, what they mean, grouping for the booleans), the undo stack, the
// view math and the gizmo's hit tests and drags, the faces' geometry and the
// mapping from a pushed face to the parameter of the leaf that made it.
import { describe, expect, it } from "vitest";
import {
  faceNormalAt,
  planarFaces,
  planeOffset,
  surfaceDistance,
  type FaceForm,
} from "../examples/csg/faceGeometry.ts";
import {
  beginDrag,
  hitGizmo,
  solveDrag,
  gizmoSize,
} from "../examples/csg/gizmo.ts";
import { History } from "../examples/csg/history.ts";
import { pushPullFor, snapToPlanes } from "../examples/csg/pushPull.ts";
import {
  addChild,
  applyDrop,
  canWrap,
  cloneTree,
  createLeaf,
  createOp,
  createStepLeaf,
  defaultBracket,
  describeDrop,
  dissolveOp,
  dropRefusal,
  findNode,
  newTree,
  operandRole,
  parentOf,
  planDrop,
  recipeOf,
  wrapNodes,
  type CsgTree,
  type LeafNode,
  type OpNode,
  type TreeNode,
} from "../examples/csg/tree.ts";
import {
  anglesOf,
  axisAngle,
  closestOnLine,
  makeRig,
  multiply,
  pixelsPerMetre,
  project,
  rayAt,
  rayPlane,
  rotationOf,
  apply,
  type Rig,
  type V3,
} from "../examples/csg/viewMath.ts";
import { place } from "../examples/csg/preview.ts";

const named = (tree: CsgTree, name: string): TreeNode => {
  const found = [tree.root as TreeNode]
    .flatMap(function all(n): TreeNode[] {
      return n.type === "op" ? [n, ...n.children.flatMap(all)] : [n];
    })
    .find((n) => n.name === name);
  if (!found) {
    throw new Error(`no node called ${name}`);
  }
  return found;
};
const names = (op: TreeNode) =>
  op.type === "op" ? op.children.map((c) => c.name) : [];

/** A tree for the drops: Model(union) [A, Group(difference) [B, C, D], E]. */
function dropTree() {
  const tree = newTree();
  const a = createLeaf(tree, "box", { name: "A" });
  const group = createOp(tree, "difference", "Group");
  const b = createLeaf(tree, "box", { name: "B" });
  const c = createLeaf(tree, "cylinder", { name: "C" });
  const d = createLeaf(tree, "sphere", { name: "D" });
  const e = createLeaf(tree, "cone", { name: "E" });
  addChild(tree, tree.root.id, a);
  addChild(tree, tree.root.id, group);
  for (const leaf of [b, c, d]) {
    addChild(tree, group.id, leaf);
  }
  addChild(tree, tree.root.id, e);
  return { tree, a, group, b, c, d, e };
}

describe("dropping a row in the feature tree", () => {
  it("reorders among siblings, by the index once the node has left its place", () => {
    const { tree, a, e, group } = dropTree();
    // A after E: A goes last.
    expect(planDrop(tree, a.id, e.id, "after")).toEqual({
      parentId: tree.root.id,
      index: 2,
    });
    // E before A: E goes first.
    expect(planDrop(tree, e.id, a.id, "before")).toEqual({
      parentId: tree.root.id,
      index: 0,
    });
    expect(applyDrop(tree, e.id, planDrop(tree, e.id, a.id, "before")!)).toBe(
      true,
    );
    expect(names(tree.root)).toEqual(["E", "A", "Group"]);
    expect(group.children).toHaveLength(3);
  });

  it("refuses a drop that leaves the node where it is", () => {
    const { tree, a, group, e } = dropTree();
    expect(planDrop(tree, a.id, group.id, "before")).toBeUndefined();
    expect(planDrop(tree, group.id, a.id, "after")).toBeUndefined();
    expect(planDrop(tree, e.id, tree.root.id, "into")).toBeUndefined();
    expect(dropRefusal(tree, a.id, group.id, "before")).toBe("Already there");
  });

  it("reparents into an operation, last among its operands", () => {
    const { tree, a, group } = dropTree();
    const plan = planDrop(tree, a.id, group.id, "into")!;
    expect(plan).toEqual({ parentId: group.id, index: 3 });
    applyDrop(tree, a.id, plan);
    expect(names(group)).toEqual(["B", "C", "D", "A"]);
    expect(names(tree.root)).toEqual(["Group", "E"]);
    expect(parentOf(tree, a.id)).toBe(group);
  });

  it("reparents out of an operation, before or after a node of the one above", () => {
    const { tree, c, a } = dropTree();
    const plan = planDrop(tree, c.id, a.id, "after")!;
    applyDrop(tree, c.id, plan);
    expect(names(tree.root)).toEqual(["A", "C", "Group", "E"]);
  });

  it("refuses to drop a node into itself or anything under it, onto a leaf, or the root before or after", () => {
    const { tree, group, b, a } = dropTree();
    expect(planDrop(tree, group.id, group.id, "into")).toBeUndefined();
    expect(planDrop(tree, group.id, b.id, "before")).toBeUndefined();
    expect(dropRefusal(tree, group.id, b.id, "after")).toBe(
      "A node can't go inside itself",
    );
    expect(planDrop(tree, a.id, b.id, "into")).toBeUndefined();
    expect(dropRefusal(tree, a.id, b.id, "into")).toBe(
      "Only an operation can hold other nodes",
    );
    expect(planDrop(tree, a.id, tree.root.id, "before")).toBeUndefined();
    expect(dropRefusal(tree, a.id, tree.root.id, "after")).toMatch(
      /Nothing goes before or after the model/,
    );
    expect(planDrop(tree, tree.root.id, group.id, "into")).toBeUndefined();
    expect(applyDrop(tree, group.id, { parentId: b.id, index: 0 })).toBe(false);
  });

  it("keeps every node, once, whatever is dropped where", () => {
    const { tree } = dropTree();
    const all = (t: CsgTree) => {
      const out: number[] = [];
      const visit = (n: TreeNode) => {
        out.push(n.id);
        if (n.type === "op") {
          n.children.forEach(visit);
        }
      };
      visit(t.root);
      return out.sort((x, y) => x - y);
    };
    const before = all(tree);
    for (const drag of before) {
      for (const target of before) {
        for (const zone of ["before", "after", "into"] as const) {
          const copy = cloneTree(tree);
          const plan = planDrop(copy, drag, target, zone);
          if (plan) {
            expect(applyDrop(copy, drag, plan)).toBe(true);
            expect(all(copy)).toEqual(before);
            expect(planDrop(copy, drag, target, zone)).toBeUndefined();
          }
        }
      }
    }
  });
});

describe("operand order", () => {
  it("says a difference's first operand is the base and the rest are cutters", () => {
    const { group } = dropTree();
    expect(operandRole(group, 0)).toBe("base");
    expect(operandRole(group, 2)).toBe("cutter");
    const union = createOp(newTree(), "union");
    expect(operandRole(union, 0)).toBeUndefined();
  });

  it("describes what a drop does to the base", () => {
    const { tree, a, group, d } = dropTree();
    // A to the front of the difference: it becomes the base and B is cut from it.
    const first = planDrop(tree, a.id, group.children[0]!.id, "before")!;
    expect(describeDrop(tree, a.id, first)).toContain(
      '"A" becomes the base of Group',
    );
    expect(describeDrop(tree, a.id, first)).toContain('"B" is cut from it');
    // D last: cut from the base.
    const last = planDrop(tree, a.id, d.id, "after")!;
    expect(describeDrop(tree, a.id, last)).toContain("is cut from");
    // Out of the difference's base position into the union.
    const out = planDrop(tree, group.children[0]!.id, a.id, "before")!;
    expect(describeDrop(tree, group.children[0]!.id, out)).toContain(
      '"C" becomes the base of Group',
    );
  });

  it("changes what the recipe builds: reordering a difference's operands changes the base", () => {
    const { tree, group, b, c } = dropTree();
    const base = (t: CsgTree) => {
      const recipe = recipeOf(t.root)!;
      const diff = (
        recipe as { operands: Array<{ type: string; operands?: unknown[] }> }
      ).operands[1] as unknown as {
        operation: string;
        operands: Array<{ tag: number }>;
      };
      return diff.operands[0]!.tag;
    };
    expect(base(tree)).toBe(b.id);
    applyDrop(tree, c.id, planDrop(tree, c.id, b.id, "before")!);
    expect(base(tree)).toBe(c.id);
    expect(group.children[0]).toBe(c);
  });
});

describe("grouping the selection under a boolean", () => {
  it("puts the nodes under a new operation in the order chosen, in the first one's place", () => {
    const { tree, a, e } = dropTree();
    const group = wrapNodes(tree, [e.id, a.id], "difference")!;
    expect(group.operation).toBe("difference");
    expect(names(group)).toEqual(["E", "A"]);
    expect(names(tree.root)).toEqual(["Group", "Difference"]);
    expect(findNode(tree, group.id)).toBe(group);
  });

  it("refuses fewer than two nodes, the root, and a node together with one inside it", () => {
    const { tree, a, group, b } = dropTree();
    expect(canWrap(tree, [a.id])).toBe(false);
    expect(canWrap(tree, [a.id, tree.root.id])).toBe(false);
    expect(canWrap(tree, [group.id, b.id])).toBe(false);
    expect(wrapNodes(tree, [group.id, b.id], "union")).toBeUndefined();
    expect(canWrap(tree, [a.id, b.id])).toBe(true);
  });

  it("takes nodes from different operations and keeps the tree whole", () => {
    const { tree, a, c } = dropTree();
    const grouped = wrapNodes(tree, [c.id, a.id], "intersection")!;
    expect(names(grouped)).toEqual(["C", "A"]);
    expect(names(named(tree, "Group"))).toEqual(["B", "Intersection", "D"]);
    expect(parentOf(tree, grouped.id)).toBe(named(tree, "Group"));
  });

  it("dissolves an operation into its place", () => {
    const { tree, group } = dropTree();
    expect(dissolveOp(tree, group.id)).toBe(true);
    expect(names(tree.root)).toEqual(["A", "B", "C", "D", "E"]);
    expect(dissolveOp(tree, tree.root.id)).toBe(false);
  });
});

describe("undo and redo", () => {
  const snap = (tree: CsgTree, selection: number[] = []) => ({
    tree,
    selection,
  });

  it("steps back and forward through finished edits, with the selection that went with each", () => {
    const tree = dropTree().tree;
    const history = new History(snap(cloneTree(tree), [3]));
    expect(history.canUndo).toBe(false);
    const edited = cloneTree(tree);
    named(edited, "A").name = "Renamed";
    expect(history.record("Rename A", snap(edited, [4]))).toBe(true);
    expect(history.undoLabel).toBe("Rename A");
    const undone = history.undo()!;
    expect(named(undone.state.tree, "A")).toBeDefined();
    expect(undone.state.selection).toEqual([3]);
    expect(history.canRedo).toBe(true);
    expect(history.redoLabel).toBe("Rename A");
    const redone = history.redo()!;
    expect(named(redone.state.tree, "Renamed")).toBeDefined();
    expect(redone.state.selection).toEqual([4]);
    expect(history.canRedo).toBe(false);
  });

  it("is exact: a state is a copy that later edits don't reach", () => {
    const tree = dropTree().tree;
    const history = new History(snap(tree));
    const leaf = named(tree, "A") as LeafNode;
    leaf.translate[0] = 5;
    history.record("Move A", snap(tree));
    leaf.translate[0] = 9;
    const back = history.undo()!;
    expect((named(back.state.tree, "A") as LeafNode).translate[0]).toBe(0);
    expect(history.redo()!.state.tree).toEqual(
      expect.objectContaining({ nextId: tree.nextId }),
    );
    expect(
      (named(history.undo()!.state.tree, "A") as LeafNode).translate[0],
    ).toBe(0);
  });

  it("doesn't record an edit that changed nothing, but keeps the selection", () => {
    const tree = dropTree().tree;
    const history = new History(snap(tree, [1]));
    expect(history.record("Nothing", snap(tree, [2]))).toBe(false);
    expect(history.canUndo).toBe(false);
  });

  it("drops what could be redone when a new edit comes", () => {
    const tree = dropTree().tree;
    const history = new History(snap(cloneTree(tree)));
    const a = named(tree, "A");
    for (const name of ["One", "Two"]) {
      a.name = name;
      history.record(name, snap(tree));
    }
    history.undo();
    a.name = "Three";
    history.record("Three", snap(tree));
    expect(history.canRedo).toBe(false);
    expect(history.undoLabel).toBe("Three");
  });

  it("is bounded", () => {
    const tree = dropTree().tree;
    const history = new History(snap(cloneTree(tree)), 3);
    const a = named(tree, "A");
    for (let i = 0; i < 10; i++) {
      a.name = `A${i}`;
      history.record(`Edit ${i}`, snap(tree));
    }
    let steps = 0;
    while (history.undo()) {
      steps++;
    }
    expect(steps).toBe(2);
  });

  it("remembers STEP parts any state still refers to", () => {
    const tree = newTree();
    const step = createStepLeaf(tree, {
      key: 7,
      file: "a.stp",
      size: [1, 1, 1],
    });
    addChild(tree, tree.root.id, step);
    const history = new History(snap(cloneTree(tree)));
    const without = cloneTree(tree);
    without.root.children.length = 0;
    history.record("Delete", snap(without));
    expect([...history.stepKeys()]).toEqual([7]);
  });
});

// ------------------------------------------------------------ view math
/** Looking along +y from (0, -5, 0), z up, x right; a 60° field of view in an 800 × 600 view. */
const RIG: Rig = {
  eye: [0, -5, 0],
  forward: [0, 1, 0],
  right: [1, 0, 0],
  up: [0, 0, 1],
  tanX: (Math.tan(Math.PI / 6) * 800) / 600,
  tanY: Math.tan(Math.PI / 6),
  width: 800,
  height: 600,
};

describe("the view math", () => {
  it("projects a point to its pixel and the pixel's ray back through it", () => {
    const at = project(RIG, [0.5, 0, 0.25])!;
    const ray = rayAt(RIG, at.x, at.y);
    const t = (0 - ray.origin[1]) / ray.direction[1];
    expect(ray.origin[0] + ray.direction[0] * t).toBeCloseTo(0.5, 9);
    expect(ray.origin[2] + ray.direction[2] * t).toBeCloseTo(0.25, 9);
    expect(project(RIG, [0, 0, 0])).toMatchObject({ x: 400, y: 300 });
    expect(project(RIG, [0, -6, 0])).toBeUndefined();
    expect(pixelsPerMetre(RIG, [0, 0, 0])).toBeCloseTo(
      600 / (2 * Math.tan(Math.PI / 6) * 5),
      9,
    );
  });

  it("makes a rig from an Earth-fixed camera in the sample's frame", () => {
    // Earth-fixed axes: the frame's east, north and up are (0,1,0), (0,0,1), (1,0,0).
    const rig = makeRig(
      {
        position: [10 + 0, 0 + 0, 0],
        direction: [-1, 0, 0],
        up: [0, 0, 1],
        right: [0, 1, 0],
      },
      Math.PI / 3,
      800,
      600,
      [5, 0, 0],
      [
        [0, 1, 0],
        [0, 0, 1],
        [1, 0, 0],
      ],
    );
    // The camera sits 5 m up from the origin, looking down: down is -z of the frame.
    expect(rig.eye).toEqual([0, 0, 5]);
    expect(rig.forward).toEqual([0, 0, -1]);
    expect(project(rig, [0, 0, 0])).toMatchObject({ x: 400, y: 300 });
  });

  it("finds where along an axis a ray comes closest, and where it meets a plane", () => {
    const ray = rayAt(RIG, 400 + 104, 300);
    const t = closestOnLine([0, 0, 0], [1, 0, 0], ray)!;
    expect(t).toBeCloseTo(104 / pixelsPerMetre(RIG, [0, 0, 0]), 6);
    expect(
      closestOnLine([0, 0, 0], [0, 1, 0], rayAt(RIG, 400, 300)),
    ).toBeUndefined();
    const hit = rayPlane(rayAt(RIG, 450, 250), [0, 0, 0], [0, 1, 0])!;
    expect(hit[1]).toBeCloseTo(0, 9);
    expect(rayPlane(rayAt(RIG, 450, 250), [0, 0, 0], [1, 0, 0])).toBeDefined();
    expect(rayPlane(rayAt(RIG, 450, 250), [0, 0, 0], [0, 0, 1])).toBeDefined();
    expect(
      rayPlane(rayAt(RIG, 450, 250), [0, -10, 0], [0, 1, 0]),
    ).toBeUndefined();
  });

  it("turns placement angles into a rotation and back", () => {
    for (const angles of [
      [0, 0, 0],
      [30, 0, 0],
      [0, 45, 0],
      [0, 0, 120],
      [20, -35, 70],
      [-170, 12, 99],
    ] as V3[]) {
      const back = anglesOf(rotationOf(angles));
      const a = rotationOf(angles);
      const b = rotationOf(back);
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          expect(b[i]![j]).toBeCloseTo(a[i]![j]!, 9);
        }
      }
    }
    // The gimbal: y at 90° has no one answer for x and z, and the rotation is kept.
    const gimbal = rotationOf([25, 90, 40]);
    const b = rotationOf(anglesOf(gimbal));
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(b[i]![j]).toBeCloseTo(gimbal[i]![j]!, 9);
      }
    }
  });

  it("agrees with the preview's placement", () => {
    const rotate: V3 = [20, -35, 70];
    const p: V3 = [0.3, -0.2, 0.9];
    const viaMatrix = apply(rotationOf(rotate), p);
    const viaPlace = place(p, rotate, [0, 0, 0]);
    for (let i = 0; i < 3; i++) {
      expect(viaMatrix[i]).toBeCloseTo(viaPlace[i]!, 9);
    }
  });

  it("composes a turn about a world axis with the placement it had", () => {
    const start: V3 = [0, 0, 30];
    const turned = anglesOf(
      multiply(axisAngle([0, 0, 1], Math.PI / 6), rotationOf(start)),
    );
    expect(turned[2]).toBeCloseTo(60, 9);
    expect(turned[0]).toBeCloseTo(0, 9);
    const about = anglesOf(
      multiply(axisAngle([1, 0, 0], Math.PI / 2), rotationOf([0, 0, 90])),
    );
    const v = apply(rotationOf(about), [1, 0, 0]);
    // x turned to y by the z turn, then y to z about x.
    expect(v[0]).toBeCloseTo(0, 9);
    expect(v[1]).toBeCloseTo(0, 9);
    expect(v[2]).toBeCloseTo(1, 9);
  });
});

describe("the gizmo", () => {
  const centre: V3 = [0, 0, 0];
  const size = gizmoSize(RIG, centre);
  const px = (p: V3) => project(RIG, p)!;

  it("keeps its size on screen", () => {
    expect(size * pixelsPerMetre(RIG, centre)).toBeCloseTo(110, 6);
    const far = { ...RIG, eye: [0, -50, 0] as V3 };
    expect(gizmoSize(far, centre) * pixelsPerMetre(far, centre)).toBeCloseTo(
      110,
      6,
    );
  });

  it("finds the handle under a pixel: arrows, squares, rings, and nothing away from them", () => {
    const xArrow = px([size * 0.8, 0, 0]);
    expect(hitGizmo(RIG, centre, xArrow.x, xArrow.y)).toEqual({
      kind: "axis",
      axis: 0,
    });
    const zArrow = px([0, 0, size * 0.85]);
    expect(hitGizmo(RIG, centre, zArrow.x, zArrow.y)).toEqual({
      kind: "axis",
      axis: 2,
    });
    // The square between x and z (normal y), seen face on.
    const square = px([size * 0.33, 0, size * 0.33]);
    expect(hitGizmo(RIG, centre, square.x, square.y)).toEqual({
      kind: "plane",
      axis: 1,
    });
    // The ring about y, a circle of 0.62 of the size, away from both arrows.
    const r = size * 0.62;
    const ring = px([r * Math.SQRT1_2, 0, r * Math.SQRT1_2]);
    expect(hitGizmo(RIG, centre, ring.x, ring.y)).toEqual({
      kind: "ring",
      axis: 1,
    });
    expect(hitGizmo(RIG, centre, 20, 20)).toBeUndefined();
  });

  it("drags along an axis to where the pointer's ray comes closest, snapped to the grid", () => {
    const from = px([size * 0.8, 0, 0]);
    const handle = hitGizmo(RIG, centre, from.x, from.y)!;
    const start = beginDrag(RIG, handle, centre, from.x, from.y)!;
    const to = px([size * 0.8 + 0.5, 0, 0]);
    const free = solveDrag(RIG, start, to.x, to.y, { grid: 0, angleStep: 0 })!;
    expect(free.kind).toBe("move");
    if (free.kind === "move") {
      expect(free.centre[0]).toBeCloseTo(0.5, 6);
      expect(free.centre[1]).toBe(0);
      expect(free.centre[2]).toBe(0);
    }
    const snapped = solveDrag(
      RIG,
      start,
      px([size * 0.8 + 0.43, 0, 0]).x,
      to.y,
      {
        grid: 0.25,
        angleStep: 0,
      },
    )!;
    if (snapped.kind === "move") {
      expect(snapped.centre[0]).toBeCloseTo(0.5, 9);
    }
  });

  it("drags in a plane, the pointer's ray met with the plane", () => {
    const from = px([size * 0.33, 0, size * 0.33]);
    const handle = hitGizmo(RIG, centre, from.x, from.y)!;
    const start = beginDrag(RIG, handle, centre, from.x, from.y)!;
    const to = px([size * 0.33 + 0.4, 0, size * 0.33 - 0.3]);
    const result = solveDrag(RIG, start, to.x, to.y, {
      grid: 0,
      angleStep: 0,
    })!;
    expect(result.kind).toBe("move");
    if (result.kind === "move") {
      expect(result.centre[0]).toBeCloseTo(0.4, 6);
      expect(result.centre[1]).toBeCloseTo(0, 9);
      expect(result.centre[2]).toBeCloseTo(-0.3, 6);
    }
  });

  it("turns about a ring by the angle the pointer sweeps, snapped to steps", () => {
    const r = size * 0.62;
    const at = (degrees: number) =>
      px([
        r * Math.sin((degrees * Math.PI) / 180),
        0,
        r * Math.cos((degrees * Math.PI) / 180),
      ]);
    const from = at(40);
    const handle = hitGizmo(RIG, centre, from.x, from.y)!;
    expect(handle).toEqual({ kind: "ring", axis: 1 });
    const start = beginDrag(RIG, handle, centre, from.x, from.y)!;
    const free = solveDrag(RIG, start, at(70).x, at(70).y, {
      grid: 0,
      angleStep: 0,
    })!;
    expect(free.kind).toBe("turn");
    if (free.kind === "turn") {
      expect(free.axis).toBe(1);
      expect((free.angle * 180) / Math.PI).toBeCloseTo(30, 3);
    }
    const snapped = solveDrag(RIG, start, at(80).x, at(80).y, {
      grid: 0,
      angleStep: 15,
    })!;
    if (snapped.kind === "turn") {
      expect((snapped.angle * 180) / Math.PI).toBeCloseTo(45, 6);
    }
  });
});

// ------------------------------------------------------------- the faces
/** A form of the given surfaces, with a face on each. */
function formOf(
  surfaces: Array<{
    identity: number;
    origin?: V3;
    x?: V3;
    y?: V3;
    params?: [number, number];
    reversed?: boolean;
  }>,
): FaceForm {
  const frame = new Float64Array(surfaces.length * 9);
  const params = new Float64Array(surfaces.length * 2);
  surfaces.forEach((s, i) => {
    frame.set(
      [
        ...(s.origin ?? [0, 0, 0]),
        ...(s.x ?? [1, 0, 0]),
        ...(s.y ?? [0, 1, 0]),
      ],
      i * 9,
    );
    params.set(s.params ?? [0, 0], i * 2);
  });
  return {
    faceSurface: Uint32Array.from(surfaces.map((_, i) => i)),
    faceReversed: Uint8Array.from(surfaces.map((s) => (s.reversed ? 1 : 0))),
    surfaceIdentity: Uint8Array.from(surfaces.map((s) => s.identity)),
    surfaceFrame: frame,
    surfaceParams: params,
  };
}

describe("a face's geometry", () => {
  it("gives a plane's normal, flipped when the face is reversed, and a point's offset from it", () => {
    const form = formOf([
      { identity: 0, origin: [0, 0, 1] },
      { identity: 0, origin: [0, 0, 1], reversed: true },
    ]);
    expect(faceNormalAt(form, 0, [3, 4, 1])).toEqual([0, 0, 1]);
    expect(faceNormalAt(form, 1, [3, 4, 1])!.map((v) => v + 0)).toEqual([
      0, 0, -1,
    ]);
    expect(planeOffset(form, 0, [0, 0, 1.5])).toBeCloseTo(0.5, 12);
    expect(planeOffset(form, 1, [0, 0, 1.5])).toBeCloseTo(-0.5, 12);
    expect(surfaceDistance(form, 0, [0, 0, 1.5])).toBeCloseTo(0.5, 12);
    expect(
      planarFaces(form).map((p) => [
        p.face,
        p.normal.map((v) => v + 0),
        p.offset,
      ]),
    ).toEqual([
      [0, [0, 0, 1], 1],
      [1, [0, 0, -1], -1],
    ]);
  });

  it("gives round faces' normals outward, and their distance from the surface", () => {
    const form = formOf([
      { identity: 1, params: [0.4, 0] },
      { identity: 3, params: [0.5, 0] },
      { identity: 4, params: [0.6, 0.2] },
      { identity: 2, params: [0.5, Math.atan(-0.2)] },
      { identity: 1, params: [0.4, 0], reversed: true },
    ]);
    expect(faceNormalAt(form, 0, [0, 0.4, 0.3])).toEqual([0, 1, 0]);
    expect(faceNormalAt(form, 4, [0, 0.4, 0.3])!.map((v) => v + 0)).toEqual([
      0, -1, 0,
    ]);
    const sphere = faceNormalAt(form, 1, [0, 0, 0.5])!;
    expect(sphere[2]).toBeCloseTo(1, 12);
    const torusSide = faceNormalAt(form, 2, [0.8, 0, 0])!;
    expect(torusSide[0]).toBeCloseTo(1, 9);
    const torusTop = faceNormalAt(form, 2, [0.6, 0, 0.2])!;
    expect(torusTop[2]).toBeCloseTo(1, 9);
    // A cone that narrows upward: its normal tilts up.
    const cone = faceNormalAt(form, 3, [0.5, 0, 0])!;
    expect(cone[0]).toBeGreaterThan(0.9);
    expect(cone[2]).toBeGreaterThan(0.1);
    expect(surfaceDistance(form, 0, [0.5, 0, 0.7])).toBeCloseTo(0.1, 12);
    expect(surfaceDistance(form, 1, [0.5, 0, 0])).toBeCloseTo(0, 12);
    expect(surfaceDistance(form, 2, [0.6, 0, 0])).toBeCloseTo(0.2, 12);
    expect(surfaceDistance(form, 3, [0.5, 0, 0])).toBeCloseTo(0, 12);
  });

  it("answers nothing for a free-form face", () => {
    const form = formOf([{ identity: 5 }]);
    expect(faceNormalAt(form, 0, [0, 0, 0])).toBeUndefined();
    expect(surfaceDistance(form, 0, [0, 0, 0])).toBeUndefined();
    expect(planeOffset(form, 0, [0, 0, 0])).toBeUndefined();
  });
});

// ----------------------------------------------------------- push-pull
const leafOf = (
  kind: Parameters<typeof createLeaf>[1],
  init: Parameters<typeof createLeaf>[2],
) => createLeaf(newTree(), kind, init);

describe("push-pull's mapping from a face to a parameter", () => {
  it("moves a box's side, and the middle by half, so the opposite face stays", () => {
    const box = leafOf("box", {
      params: { sizeX: 1, sizeY: 2, sizeZ: 3 },
      translate: [10, 0, 0],
    });
    const target = pushPullFor(box, [10.5, 0.3, 0.2], [1, 0, 0])!;
    expect(target.label).toBe("Size x");
    expect(target.value).toBe(1);
    const out = target.apply(0.25);
    expect(out.params.sizeX).toBeCloseTo(1.25, 12);
    expect(out.translate[0]).toBeCloseTo(10.125, 12);
    expect(out.translate[0]! - out.params.sizeX! / 2).toBeCloseTo(9.5, 12);
    expect(out.moved).toBeCloseTo(0.25, 12);
    // The other parameters aren't touched, and pulling in the other way shrinks it.
    expect(out.params.sizeY).toBe(2);
    expect(target.apply(-0.5).params.sizeX).toBeCloseTo(0.5, 12);
  });

  it("moves the opposite side for the opposite face", () => {
    const box = leafOf("box", { params: { sizeX: 1, sizeY: 2, sizeZ: 3 } });
    const target = pushPullFor(box, [-0.5, 0, 0], [-1, 0, 0])!;
    const out = target.apply(0.4);
    expect(out.params.sizeX).toBeCloseTo(1.4, 12);
    expect(out.translate[0]).toBeCloseTo(-0.2, 12);
    expect(out.translate[0]! + out.params.sizeX! / 2).toBeCloseTo(0.5, 12);
  });

  it("follows the leaf's rotation", () => {
    const box = leafOf("box", {
      params: { sizeX: 1, sizeY: 2, sizeZ: 3 },
      rotate: [0, 0, 90],
      translate: [10, 0, 0],
    });
    // The box's x side now faces north (+y), 0.5 from its middle.
    const target = pushPullFor(box, [10, 0.5, 0], [0, 1, 0])!;
    expect(target.label).toBe("Size x");
    const out = target.apply(0.25);
    expect(out.params.sizeX).toBeCloseTo(1.25, 12);
    expect(out.translate[0]).toBeCloseTo(10, 12);
    expect(out.translate[1]).toBeCloseTo(0.125, 12);
  });

  it("moves the leaf from where it was when the drag began, however the leaf changes during it", () => {
    const box = leafOf("box", {
      params: { sizeX: 1, sizeY: 2, sizeZ: 3 },
      translate: [10, 0, 0],
    });
    const target = pushPullFor(box, [10.5, 0, 0], [1, 0, 0])!;
    for (const distance of [0.1, 0.4, 0.25]) {
      const out = target.apply(distance);
      // The manipulator writes each step into the leaf itself.
      Object.assign(box.params, out.params);
      box.translate = [...out.translate];
    }
    expect(box.params.sizeX).toBeCloseTo(1.25, 12);
    expect(box.translate[0]).toBeCloseTo(10.125, 12);
  });

  it("maps a cylinder's caps to its height and its side to its radius", () => {
    const cylinder = leafOf("cylinder", {
      params: { radius: 0.4, height: 1 },
      translate: [0, 0, 0.6],
    });
    const top = pushPullFor(cylinder, [0.1, 0, 1.1], [0, 0, 1])!;
    expect(top.label).toBe("Height");
    const grown = top.apply(0.2);
    expect(grown.params.height).toBeCloseTo(1.2, 12);
    expect(grown.translate[2]).toBeCloseTo(0.7, 12);
    const bottom = pushPullFor(cylinder, [0.1, 0, 0.1], [0, 0, -1])!;
    const down = bottom.apply(0.2);
    expect(down.params.height).toBeCloseTo(1.2, 12);
    expect(down.translate[2]).toBeCloseTo(0.5, 12);
    const side = pushPullFor(cylinder, [0, 0.4, 0.6], [0, 1, 0])!;
    expect(side.label).toBe("Radius");
    const wider = side.apply(0.1);
    expect(wider.params.radius).toBeCloseTo(0.5, 12);
    expect(wider.translate).toEqual([0, 0, 0.6]);
  });

  it("pulls a cutter's face the way the solid sees it: out of the solid is a smaller cutter", () => {
    const hole = leafOf("cylinder", { params: { radius: 0.4, height: 1 } });
    // In the solid the hole's wall faces the axis.
    const wall = pushPullFor(hole, [0.4, 0, 0], [-1, 0, 0])!;
    const out = wall.apply(0.1);
    expect(out.params.radius).toBeCloseTo(0.3, 12);
    expect(out.moved).toBeCloseTo(0.1, 12);
    expect(wall.apply(-0.1).params.radius).toBeCloseTo(0.5, 12);
    // A cutter box's face that faces into the material.
    const cutter = leafOf("box", { params: { sizeX: 1, sizeY: 1, sizeZ: 1 } });
    const face = pushPullFor(cutter, [0, 0, 0.5], [0, 0, -1])!;
    const cut = face.apply(0.2);
    expect(cut.params.sizeZ).toBeCloseTo(0.8, 12);
    expect(cut.translate[2]).toBeCloseTo(-0.1, 12);
  });

  it("maps a sphere to its radius, a cone's cap to its height and its side to both radii, a torus to its tube", () => {
    const sphere = leafOf("sphere", { params: { radius: 0.5 } });
    expect(
      pushPullFor(sphere, [0, 0.5, 0], [0, 1, 0])!.apply(0.1).params.radius,
    ).toBeCloseTo(0.6, 12);
    const cone = leafOf("cone", {
      params: { radiusBase: 0.5, radiusTop: 0.1, height: 1 },
    });
    const cap = pushPullFor(cone, [0, 0, 0.5], [0, 0, 1])!;
    expect(cap.label).toBe("Height");
    expect(cap.apply(0.3).params.height).toBeCloseTo(1.3, 12);
    const side = pushPullFor(cone, [0.3, 0, 0], [0.97, 0, 0.24])!;
    const out = side.apply(0.1);
    expect(out.params.radiusBase).toBeCloseTo(0.6, 12);
    expect(out.params.radiusTop).toBeCloseTo(0.2, 12);
    expect(side.apply(-1).params.radiusTop).toBe(0);
    const torus = leafOf("torus", { params: { major: 0.6, minor: 0.2 } });
    const tube = pushPullFor(torus, [0.8, 0, 0], [1, 0, 0])!;
    expect(tube.label).toBe("Tube radius");
    expect(tube.apply(0.05).params.minor).toBeCloseTo(0.25, 12);
    expect(tube.apply(0.05).params.major).toBe(0.6);
  });

  it("stops at the smallest a parameter may be, and reports the travel it allowed", () => {
    const box = leafOf("box", { params: { sizeX: 1, sizeY: 1, sizeZ: 1 } });
    const out = pushPullFor(box, [0.5, 0, 0], [1, 0, 0])!.apply(-5);
    expect(out.params.sizeX).toBeCloseTo(0.02, 12);
    expect(out.moved).toBeCloseTo(-0.98, 12);
    expect(out.translate[0]).toBeCloseTo(-0.49, 12);
  });

  it("has no mapping for a point no surface of the leaf explains, or for a STEP part", () => {
    const box = leafOf("box", { params: { sizeX: 1, sizeY: 1, sizeZ: 1 } });
    expect(pushPullFor(box, [0, 0, 0], [1, 0, 0])).toBeUndefined();
    expect(pushPullFor(box, [0.5, 0, 0], [0.7, 0.7, 0])).toBeUndefined();
    const cylinder = leafOf("cylinder", { params: { radius: 0.4, height: 1 } });
    expect(pushPullFor(cylinder, [0.2, 0, 0.2], [0, 0, 1])).toBeUndefined();
    const step = createStepLeaf(newTree(), {
      key: 1,
      file: "x.stp",
      size: [1, 1, 1],
    });
    expect(pushPullFor(step, [0.5, 0, 0], [1, 0, 0])).toBeUndefined();
  });

  it("writes back to a leaf whose faces the bracket's tree explains", () => {
    const tree = defaultBracket();
    const hole = named(tree, "Upright hole") as LeafNode;
    expect(hole.kind).toBe("cylinder");
    // The upright's hole runs along y (turned 90° about x), 0.2 m in radius: its wall at x = 0.2.
    const wall = pushPullFor(hole, [0.2, -0.6, 0.95], [-1, 0, 0])!;
    expect(wall.label).toBe("Radius");
    expect(wall.apply(-0.05).params.radius).toBeCloseTo(0.25, 12);
  });
});

describe("snapping a dragged face to another face's plane", () => {
  const planes = [
    { face: 1, normal: [0, 0, 1] as V3, offset: 1 },
    { face: 2, normal: [0, 0, -1] as V3, offset: -0.2 },
    { face: 3, normal: [1, 0, 0] as V3, offset: 0.7 },
  ];

  it("takes the nearest parallel plane within reach, facing either way", () => {
    // A face at z = 0.5 pulled up: it comes to z = 1 (the top plane) near 0.5, and to 0.2 (the other) near -0.3.
    expect(snapToPlanes(planes, 0.5, [0, 0, 1], 0.48, 0.05)).toEqual({
      distance: 0.5,
      face: 1,
    });
    expect(snapToPlanes(planes, 0.5, [0, 0, 1], -0.29, 0.05)).toEqual({
      distance: -0.3,
      face: 2,
    });
    expect(snapToPlanes(planes, 0.5, [0, 0, 1], 0.2, 0.05)).toBeUndefined();
  });

  it("ignores planes at an angle and the face being dragged", () => {
    expect(snapToPlanes(planes, 0.5, [0, 0, 1], 0.2, 5, 1)?.face).toBe(2);
    expect(snapToPlanes(planes, 0, [1, 0, 0], 0.69, 0.05)).toEqual({
      distance: 0.7,
      face: 3,
    });
    expect(snapToPlanes(planes, 0, [0, 1, 0], 0.7, 5)).toBeUndefined();
  });
});

describe("the bracket under the new operations", () => {
  it("groups and ungroups without changing what it builds", () => {
    const tree = defaultBracket();
    const before = JSON.stringify(recipeOf(tree.root));
    const body = named(tree, "Body") as OpNode;
    const [plate, upright] = body.children;
    const group = wrapNodes(tree, [plate!.id, upright!.id], "union")!;
    expect(JSON.stringify(recipeOf(tree.root))).not.toBe(before);
    expect(dissolveOp(tree, group.id)).toBe(true);
    expect(JSON.stringify(recipeOf(tree.root))).toBe(before);
  });
});
