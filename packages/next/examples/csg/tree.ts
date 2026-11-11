import {
  recipeLeaves,
  type BooleanOperation,
  type Placement,
  type Primitive,
  type SolidRecipe,
} from "../../src/brep/kernelProtocol.ts";

/**
 * The CSG sample's model (plan §13.33): a tree whose leaves are primitives
 * with parameters and a placement, and whose nodes are booleans. It is plain
 * data, so it round-trips through JSON, and it becomes the worker's recipe
 * (`SolidRecipe`) for evaluation, which carries each leaf's id as the tag its
 * faces keep through every boolean. Nothing here touches a kernel or the
 * engine.
 *
 * Primitives are centred on the origin before their placement turns them
 * about the world's x, then y, then z axes and moves them: a box by its
 * middle, a cylinder or cone by the middle of its axis, up z.
 */

export type Vec3 = [number, number, number];
export type PrimitiveKind = "box" | "cylinder" | "sphere" | "cone" | "torus";
export const PRIMITIVE_KINDS: readonly PrimitiveKind[] = [
  "box",
  "cylinder",
  "sphere",
  "cone",
  "torus",
];
export const OPERATIONS: readonly BooleanOperation[] = [
  "union",
  "difference",
  "intersection",
];

/** A parameter's slider: its range, step and default (m). */
export interface ParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
}

const length = (
  key: string,
  label: string,
  value: number,
  max = 3,
  min = 0.02,
): ParamSpec => ({ key, label, min, max, step: 0.01, value });

export const PRIMITIVE_SPECS: Record<
  PrimitiveKind,
  { label: string; params: readonly ParamSpec[] }
> = {
  box: {
    label: "Box",
    params: [
      length("sizeX", "Size x", 1),
      length("sizeY", "Size y", 1),
      length("sizeZ", "Size z", 1),
    ],
  },
  cylinder: {
    label: "Cylinder",
    params: [length("radius", "Radius", 0.4, 2), length("height", "Height", 1)],
  },
  sphere: { label: "Sphere", params: [length("radius", "Radius", 0.5, 2)] },
  cone: {
    label: "Cone",
    params: [
      length("radiusBase", "Base radius", 0.5, 2),
      // A top radius of 0 is a point.
      length("radiusTop", "Top radius", 0.1, 2, 0),
      length("height", "Height", 1),
    ],
  },
  torus: {
    label: "Torus",
    params: [
      length("major", "Major radius", 0.6, 2),
      length("minor", "Minor radius", 0.2, 1),
    ],
  },
};

export interface LeafNode {
  type: "leaf";
  /** Positive and unique in its tree: the tag its faces carry. */
  id: number;
  name: string;
  /** A disabled node is left out of the recipe. */
  enabled: boolean;
  kind: PrimitiveKind;
  params: Record<string, number>;
  /** Degrees: about the world's x, then y, then z through the origin. */
  rotate: Vec3;
  /** Where its middle goes, m. */
  translate: Vec3;
}

export interface OpNode {
  type: "op";
  id: number;
  name: string;
  enabled: boolean;
  operation: BooleanOperation;
  /** Folded left to right: a union or intersection of all, or the first minus the rest. */
  children: TreeNode[];
}

export type TreeNode = LeafNode | OpNode;

export interface CsgTree {
  root: OpNode;
  nextId: number;
}

export const OPERATION_LABELS: Record<BooleanOperation, string> = {
  union: "Union",
  difference: "Difference",
  intersection: "Intersection",
};

/** A fresh tree: one empty union. */
export function newTree(): CsgTree {
  return {
    root: {
      type: "op",
      id: 1,
      name: "Model",
      enabled: true,
      operation: "union",
      children: [],
    },
    nextId: 2,
  };
}

export function defaultParams(kind: PrimitiveKind): Record<string, number> {
  return Object.fromEntries(
    PRIMITIVE_SPECS[kind].params.map((spec) => [spec.key, spec.value]),
  );
}

function makeLeaf(
  id: number,
  kind: PrimitiveKind,
  init: Partial<Omit<LeafNode, "type" | "id" | "kind">> = {},
): LeafNode {
  return {
    type: "leaf",
    id,
    name: init.name ?? PRIMITIVE_SPECS[kind].label,
    enabled: init.enabled ?? true,
    kind,
    params: { ...defaultParams(kind), ...init.params },
    rotate: init.rotate ?? [0, 0, 0],
    translate: init.translate ?? [0, 0, 0],
  };
}

/** A leaf, not yet in the tree (`addChild` puts it there). */
export function createLeaf(
  tree: CsgTree,
  kind: PrimitiveKind,
  init: Partial<Omit<LeafNode, "type" | "id" | "kind">> = {},
): LeafNode {
  return makeLeaf(tree.nextId++, kind, init);
}

export function createOp(
  tree: CsgTree,
  operation: BooleanOperation,
  name = OPERATION_LABELS[operation],
  children: TreeNode[] = [],
): OpNode {
  return {
    type: "op",
    id: tree.nextId++,
    name,
    enabled: true,
    operation,
    children,
  };
}

/** The primitive a leaf makes, centred on the origin, m. */
export function primitiveOf(leaf: LeafNode): Primitive {
  const p = leaf.params;
  switch (leaf.kind) {
    case "box":
      return {
        kind: "box",
        origin: [-p.sizeX! / 2, -p.sizeY! / 2, -p.sizeZ! / 2],
        size: [p.sizeX!, p.sizeY!, p.sizeZ!],
      };
    case "cylinder":
      return {
        kind: "cylinder",
        base: [0, 0, -p.height! / 2],
        radius: p.radius!,
        height: p.height!,
      };
    case "sphere":
      return { kind: "sphere", centre: [0, 0, 0], radius: p.radius! };
    case "cone":
      return {
        kind: "cone",
        base: [0, 0, -p.height! / 2],
        radiusBase: p.radiusBase!,
        radiusTop: p.radiusTop!,
        height: p.height!,
      };
    case "torus":
      return {
        kind: "torus",
        centre: [0, 0, 0],
        major: p.major!,
        minor: p.minor!,
      };
  }
}

/** A leaf's placement, or none when it stays at the origin, upright. */
export function placementOf(leaf: LeafNode): Placement | undefined {
  const turned = leaf.rotate.some((a) => a !== 0);
  const moved = leaf.translate.some((t) => t !== 0);
  if (!turned && !moved) {
    return undefined;
  }
  return {
    ...(turned ? { rotate: [...leaf.rotate] as Vec3 } : {}),
    ...(moved ? { translate: [...leaf.translate] as Vec3 } : {}),
  };
}

/**
 * The worker's recipe for a node: disabled nodes and nodes with nothing
 * enabled under them are left out; undefined when nothing is left.
 */
export function recipeOf(node: TreeNode): SolidRecipe | undefined {
  if (!node.enabled) {
    return undefined;
  }
  if (node.type === "leaf") {
    const placement = placementOf(node);
    return {
      type: "primitive",
      tag: node.id,
      primitive: primitiveOf(node),
      ...(placement ? { placement } : {}),
    };
  }
  const operands = node.children
    .map(recipeOf)
    .filter((operand): operand is SolidRecipe => operand !== undefined);
  return operands.length === 0
    ? undefined
    : { type: "boolean", operation: node.operation, operands };
}

/** A leaf from a primitive in the convention `primitiveOf` makes (centred on the origin). */
function leafOfPrimitive(
  recipe: Extract<SolidRecipe, { type: "primitive" }>,
): LeafNode {
  const { primitive: p, placement } = recipe;
  const placed = {
    rotate: placement?.rotate ? ([...placement.rotate] as Vec3) : undefined,
    translate: placement?.translate
      ? ([...placement.translate] as Vec3)
      : undefined,
  };
  const init = (params: Record<string, number>) => ({
    params,
    ...(placed.rotate ? { rotate: placed.rotate } : {}),
    ...(placed.translate ? { translate: placed.translate } : {}),
  });
  switch (p.kind) {
    case "box":
      return makeLeaf(
        recipe.tag,
        "box",
        init({ sizeX: p.size[0], sizeY: p.size[1], sizeZ: p.size[2] }),
      );
    case "cylinder":
      return makeLeaf(
        recipe.tag,
        "cylinder",
        init({ radius: p.radius, height: p.height }),
      );
    case "sphere":
      return makeLeaf(recipe.tag, "sphere", init({ radius: p.radius }));
    case "cone":
      return makeLeaf(
        recipe.tag,
        "cone",
        init({
          radiusBase: p.radiusBase,
          radiusTop: p.radiusTop,
          height: p.height,
        }),
      );
    case "torus":
      return makeLeaf(
        recipe.tag,
        "torus",
        init({ major: p.major, minor: p.minor }),
      );
  }
}

/**
 * A tree from a recipe `recipeOf` made (leaf tags become ids and the nodes
 * get the ids after them; names are the kinds' and operations'). A lone
 * primitive goes under a union, since the root is an operation.
 */
export function treeFromRecipe(recipe: SolidRecipe): CsgTree {
  const tree = newTree();
  tree.nextId = Math.max(0, ...recipeLeaves(recipe).map((l) => l.tag)) + 1;
  const make = (node: SolidRecipe): TreeNode =>
    node.type === "primitive"
      ? leafOfPrimitive(node)
      : createOp(tree, node.operation, undefined, node.operands.map(make));
  const root = make(recipe);
  tree.root =
    root.type === "op" ? root : createOp(tree, "union", "Model", [root]);
  return tree;
}

// ---------------------------------------------------------------- queries

export function leavesOf(node: TreeNode): LeafNode[] {
  return node.type === "leaf" ? [node] : node.children.flatMap(leavesOf);
}

export function findNode(tree: CsgTree, id: number): TreeNode | undefined {
  const visit = (node: TreeNode): TreeNode | undefined => {
    if (node.id === id) {
      return node;
    }
    if (node.type === "op") {
      for (const child of node.children) {
        const found = visit(child);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  };
  return visit(tree.root);
}

/** The nodes from the root down to the node with this id, or [] if there is none. */
export function pathTo(tree: CsgTree, id: number): TreeNode[] {
  const visit = (node: TreeNode): TreeNode[] => {
    if (node.id === id) {
      return [node];
    }
    if (node.type === "op") {
      for (const child of node.children) {
        const below = visit(child);
        if (below.length > 0) {
          return [node, ...below];
        }
      }
    }
    return [];
  };
  return visit(tree.root);
}

export function parentOf(tree: CsgTree, id: number): OpNode | undefined {
  const path = pathTo(tree, id);
  const parent = path[path.length - 2];
  return parent?.type === "op" ? parent : undefined;
}

// ----------------------------------------------------------------- edits

/** Puts `node` under the op `parentId`, at `index` (the end by default). */
export function addChild(
  tree: CsgTree,
  parentId: number,
  node: TreeNode,
  index?: number,
): void {
  const parent = findNode(tree, parentId);
  if (parent?.type !== "op") {
    throw new Error(`node ${parentId} is not an operation`);
  }
  parent.children.splice(index ?? parent.children.length, 0, node);
}

/** Removes a node and everything under it; the root stays. Returns whether one was removed. */
export function removeNode(tree: CsgTree, id: number): boolean {
  const parent = parentOf(tree, id);
  if (!parent) {
    return false;
  }
  parent.children.splice(
    parent.children.findIndex((child) => child.id === id),
    1,
  );
  return true;
}

/** Moves a node earlier (-1) or later (+1) among its siblings. */
export function moveNode(tree: CsgTree, id: number, delta: -1 | 1): boolean {
  const parent = parentOf(tree, id);
  if (!parent) {
    return false;
  }
  const at = parent.children.findIndex((child) => child.id === id);
  const to = at + delta;
  if (to < 0 || to >= parent.children.length) {
    return false;
  }
  const [node] = parent.children.splice(at, 1);
  parent.children.splice(to, 0, node!);
  return true;
}

/** Moves a node into the operation before it (as its last operand), when that is one. */
export function indentNode(tree: CsgTree, id: number): boolean {
  const parent = parentOf(tree, id);
  if (!parent) {
    return false;
  }
  const at = parent.children.findIndex((child) => child.id === id);
  const before = parent.children[at - 1];
  if (before?.type !== "op") {
    return false;
  }
  const [node] = parent.children.splice(at, 1);
  before.children.push(node!);
  return true;
}

/** Moves a node out of its operation, to just after it in the one above. */
export function outdentNode(tree: CsgTree, id: number): boolean {
  const parent = parentOf(tree, id);
  const grand = parent ? parentOf(tree, parent.id) : undefined;
  if (!parent || !grand) {
    return false;
  }
  const [node] = parent.children.splice(
    parent.children.findIndex((child) => child.id === id),
    1,
  );
  grand.children.splice(
    grand.children.findIndex((child) => child.id === parent.id) + 1,
    0,
    node!,
  );
  return true;
}

/** A copy of a node with fresh ids, just after the original. Returns it. */
export function duplicateNode(tree: CsgTree, id: number): TreeNode | undefined {
  const parent = parentOf(tree, id);
  const node = findNode(tree, id);
  if (!parent || !node) {
    return undefined;
  }
  const copy = (source: TreeNode): TreeNode =>
    source.type === "leaf"
      ? {
          ...source,
          id: tree.nextId++,
          params: { ...source.params },
          rotate: [...source.rotate],
          translate: [...source.translate],
        }
      : {
          ...source,
          id: tree.nextId++,
          children: source.children.map(copy),
        };
  const duplicate = copy(node);
  parent.children.splice(
    parent.children.findIndex((child) => child.id === id) + 1,
    0,
    duplicate,
  );
  return duplicate;
}

// ------------------------------------------------------------ provenance

/** The leaf each face came from, by the kernel's face tags (a tag is a leaf's id; undefined where the kernel gave none). */
export function facesToLeaves(
  tree: CsgTree,
  faceTags: ArrayLike<number>,
): Array<LeafNode | undefined> {
  const byId = new Map(leavesOf(tree.root).map((leaf) => [leaf.id, leaf]));
  return Array.from(faceTags, (tag) => byId.get(tag));
}

/** The faces a node made: those that came from any leaf at or under it. */
export function facesOfNode(
  node: TreeNode,
  faceTags: ArrayLike<number>,
): number[] {
  const ids = new Set(leavesOf(node).map((leaf) => leaf.id));
  const faces: number[] = [];
  for (let face = 0; face < faceTags.length; face++) {
    if (ids.has(faceTags[face]!)) {
      faces.push(face);
    }
  }
  return faces;
}

// ----------------------------------------------------------------- data

const isVec3 = (v: unknown): v is Vec3 =>
  Array.isArray(v) &&
  v.length === 3 &&
  v.every((x) => typeof x === "number" && Number.isFinite(x));

/** What a JSON node may claim to be, before `parseTree` has checked it. */
interface RawNode {
  id?: number;
  type?: string;
  name?: unknown;
  enabled?: unknown;
  kind?: string;
  params?: Record<string, unknown>;
  rotate?: unknown;
  translate?: unknown;
  operation?: string;
  children?: unknown;
}

/** A tree from JSON data (`JSON.parse` of a tree), checked: throws a message naming what's wrong. */
export function parseTree(data: unknown): CsgTree {
  const seen = new Set<number>();
  const vec3 = (value: unknown, where: string): Vec3 => {
    if (value === undefined) {
      return [0, 0, 0];
    }
    if (!isVec3(value)) {
      throw new Error(`${where}'s placement is not three numbers`);
    }
    return [...value];
  };
  const node = (value: unknown, where: string): TreeNode => {
    const n = value as RawNode | null;
    if (!n || typeof n !== "object") {
      throw new Error(`${where} is not a node`);
    }
    const id = n.id;
    if (!Number.isInteger(id) || id! < 1 || seen.has(id!)) {
      throw new Error(`${where} has a missing or repeated id`);
    }
    seen.add(id!);
    const common = {
      id: id!,
      name: typeof n.name === "string" ? n.name : `Node ${id}`,
      enabled: n.enabled !== false,
    };
    if (n.type === "leaf") {
      if (!PRIMITIVE_KINDS.includes(n.kind as PrimitiveKind)) {
        throw new Error(`${where} has an unknown primitive "${n.kind}"`);
      }
      const kind = n.kind as PrimitiveKind;
      const params = defaultParams(kind);
      for (const spec of PRIMITIVE_SPECS[kind].params) {
        const value = n.params?.[spec.key];
        if (value !== undefined) {
          if (typeof value !== "number" || !Number.isFinite(value)) {
            throw new Error(`${where}'s ${spec.key} is not a number`);
          }
          params[spec.key] = value;
        }
      }
      return {
        ...common,
        type: "leaf",
        kind,
        params,
        rotate: vec3(n.rotate, where),
        translate: vec3(n.translate, where),
      };
    }
    if (n.type === "op") {
      if (!OPERATIONS.includes(n.operation as BooleanOperation)) {
        throw new Error(`${where} has an unknown operation "${n.operation}"`);
      }
      if (!Array.isArray(n.children)) {
        throw new Error(`${where} has no children`);
      }
      return {
        ...common,
        type: "op",
        operation: n.operation as BooleanOperation,
        children: n.children.map((child, i) =>
          node(child, `${common.name}'s child ${i + 1}`),
        ),
      };
    }
    throw new Error(`${where} is neither a leaf nor an operation`);
  };
  const tree = data as Partial<CsgTree> | null;
  if (!tree || typeof tree !== "object") {
    throw new Error("the tree is not an object");
  }
  const root = node(tree.root, "the root");
  if (root.type !== "op") {
    throw new Error("the root must be an operation");
  }
  return {
    root,
    nextId: Math.max(
      Math.max(...seen) + 1,
      Number.isInteger(tree.nextId) ? tree.nextId! : 0,
    ),
  };
}

// ---------------------------------------------------------- the default

/**
 * A bracket, in metres, standing on the ground: a base plate and an upright
 * joined by a concave fillet (a block with a cylinder cut from its outside
 * corner), with two countersunk holes in the base and one through the
 * upright. It has every way a boolean goes: unions, nested differences, a
 * difference of many, cylinders turned about two axes and cones.
 */
export function defaultBracket(): CsgTree {
  const tree = newTree();
  const root = tree.root;
  root.name = "Bracket";
  root.operation = "difference";

  const body = createOp(tree, "union", "Body");
  addChild(tree, root.id, body);
  addChild(
    tree,
    body.id,
    createLeaf(tree, "box", {
      name: "Base plate",
      params: { sizeX: 2.4, sizeY: 1.5, sizeZ: 0.2 },
      translate: [0, -0.05, 0.1],
    }),
  );
  addChild(
    tree,
    body.id,
    createLeaf(tree, "box", {
      name: "Upright",
      params: { sizeX: 2.2, sizeY: 0.2, sizeZ: 1.2 },
      translate: [0, -0.6, 0.7],
    }),
  );
  // The gusset's outside corner is cut away by a cylinder along x, which
  // leaves a fillet where the plate meets the upright. Its radius runs a hair
  // past the plate's top and the upright's face: crossing them, not tangent.
  const fillet = createOp(tree, "difference", "Fillet");
  addChild(tree, body.id, fillet);
  addChild(
    tree,
    fillet.id,
    createLeaf(tree, "box", {
      name: "Gusset",
      params: { sizeX: 2, sizeY: 0.6, sizeZ: 0.6 },
      translate: [0, -0.3, 0.4],
    }),
  );
  addChild(
    tree,
    fillet.id,
    createLeaf(tree, "cylinder", {
      name: "Fillet cutter",
      params: { radius: 0.52, height: 2.8 },
      rotate: [0, 90, 0],
      translate: [0, 0, 0.7],
    }),
  );

  for (const [side, x] of [
    ["A", -0.8],
    ["B", 0.8],
  ] as const) {
    addChild(
      tree,
      root.id,
      createLeaf(tree, "cylinder", {
        name: `Hole ${side}`,
        params: { radius: 0.14, height: 0.5 },
        translate: [x, 0.4, 0.1],
      }),
    );
    addChild(
      tree,
      root.id,
      createLeaf(tree, "cone", {
        name: `Countersink ${side}`,
        params: { radiusBase: 0.1, radiusTop: 0.3, height: 0.2 },
        translate: [x, 0.4, 0.2],
      }),
    );
  }
  addChild(
    tree,
    root.id,
    createLeaf(tree, "cylinder", {
      name: "Upright hole",
      params: { radius: 0.2, height: 0.6 },
      rotate: [90, 0, 0],
      translate: [0, -0.6, 0.95],
    }),
  );
  return tree;
}
