// The transform graph (plan section 13.37): a tree of nodes, each placed in
// its parent by an affine matrix, a smooth function, or a switch that picks
// one of those per view. Content, cameras and lights sit at nodes; a route
// between two nodes (route.ts) is what warps them. No geo knowledge here.

/** A view's key, for a switch's choices and per-view parameter values: a name, a number, or the engine's own view object. */
export type ViewId = string | number | object;

/** A smooth function's parameter values: explicit scalars, never closures. */
export type Params = Readonly<Record<string, number>>;

/**
 * A smooth node's function, in float64. `forward` maps a point of the node
 * to its parent, writing the result to `out` and, when `jacobian` is given
 * and the function knows its derivative, the 3×3 Jacobian to it
 * (column-major). A function that leaves `jacobian` untouched gets central
 * differences. It must be a pure function of `p` and `params`, with no
 * free variables but `Math`: the IR parser reads its source.
 */
export type SmoothForward = (
  p: ArrayLike<number>,
  params: Params,
  out: Float64Array,
  jacobian?: Float64Array,
) => void;

/** The inverse of a smooth function: a point of the parent back to the node. */
export type SmoothInverse = (
  q: ArrayLike<number>,
  params: Params,
  out: Float64Array,
) => void;

export interface SmoothSpec {
  forward: SmoothForward;
  /** Left out, the route solves by Newton with the Jacobian. */
  inverse?: SmoothInverse;
  /** The parameters' names and their starting values. */
  params: Params;
  /** What the function is, in a route's `shapeKey`; the node's name when left out. */
  id?: string;
  /** 1σ in metres, kept for accuracy propagation (a later task). */
  accuracy?: number;
  /**
   * The function as restricted-JS text, for the compiler's IR (`parseTransform`),
   * where `forward` is not itself parseable (a built-in with a closed-form Jacobian).
   */
  source?: string;
  /** The parameters the output is affine in (displacement ∝ parameter): uniforms in a GPU residual, with no per-frame work. */
  separable?: readonly string[];
  /**
   * The values of separable parameters at which the function is the
   * identity (an exaggeration's factor 1, an offset's 0). A warp's strength
   * `s` (a slider) draws the function at `identity + s · (value − identity)`
   * for each, which is `p + s · (f(p) − p)`; a spec without them can't be
   * scaled that way.
   */
  identity?: Params;
}

/** An edge placed by a constant matrix, or by one that depends on time. */
export interface AffineEdge {
  readonly kind: "affine";
  /** Child to parent, column-major float64; the node's own copy. */
  readonly matrix: Float64Array | undefined;
  readonly at: ((seconds: number, out: Float64Array) => void) | undefined;
}

export interface SmoothEdge {
  readonly kind: "smooth";
  readonly spec: SmoothSpec;
}

/** What a switch may choose between: not another switch. */
export type PlainEdge = AffineEdge | SmoothEdge;

/** A transform chosen per view, like a variant set: every view still sees a tree. */
export interface SwitchEdge {
  readonly kind: "switch";
  readonly byView: ReadonlyMap<ViewId, PlainEdge>;
  readonly default: PlainEdge | undefined;
}

export type Edge = PlainEdge | SwitchEdge;

/** A constant child-to-parent matrix, or `at(seconds, out)` writing one that varies with time. */
export function affine(
  spec:
    | { matrix: ArrayLike<number>; at?: undefined }
    | { at: (seconds: number, out: Float64Array) => void; matrix?: undefined },
): AffineEdge {
  if (spec.at) {
    return { kind: "affine", matrix: undefined, at: spec.at };
  }
  if (spec.matrix?.length !== 16) {
    throw new RangeError("affine: a matrix has 16 elements");
  }
  return {
    kind: "affine",
    matrix: Float64Array.from(spec.matrix),
    at: undefined,
  };
}

export function smooth(spec: SmoothSpec): SmoothEdge {
  return { kind: "smooth", spec };
}

export function switchEdge(spec: {
  byView: ReadonlyMap<ViewId, PlainEdge>;
  default?: PlainEdge;
}): SwitchEdge {
  return { kind: "switch", byView: spec.byView, default: spec.default };
}

/** An edge resolved for one view, with which of a switch's alternatives it was. */
export interface ChosenEdge {
  readonly edge: PlainEdge;
  /** The index among the switch's alternatives (`byView`'s distinct values, then the default); undefined off a switch. */
  readonly choice: number | undefined;
}

export class TransformNode {
  /** Goes up whenever the node's edge or parameters change. */
  revision = 0;
  /** The number of nodes above this one. */
  readonly depth: number;

  constructor(
    readonly graph: TransformGraph,
    readonly name: string,
    readonly parent: TransformNode | undefined,
    readonly edge: Edge | undefined,
  ) {
    this.depth = parent ? parent.depth + 1 : 0;
  }
}

interface NodeValues {
  base: Record<string, number>;
  views: Map<ViewId, Record<string, number>>;
}

export class TransformGraph {
  private readonly held = new Map<TransformNode, NodeValues>();

  /** A node with no parent: a graph may hold several trees, but a route stays in one. */
  root(name: string): TransformNode {
    return new TransformNode(this, name, undefined, undefined);
  }

  /** A child of `parent` placed by `edge`. */
  add(name: string, parent: TransformNode, edge: Edge): TransformNode {
    this.own(parent);
    return new TransformNode(this, name, parent, ownEdge(edge));
  }

  /** Replaces a constant affine node's matrix. */
  setMatrix(node: TransformNode, matrix: ArrayLike<number>): void {
    this.own(node);
    const edge = node.edge;
    if (edge?.kind !== "affine" || !edge.matrix) {
      throw new Error(
        `setMatrix: "${node.name}" is not a constant affine node`,
      );
    }
    edge.matrix.set(matrix);
    node.revision++;
  }

  /** Says a node's edge changed in a way its own inputs don't show (a time-varying matrix's data). */
  invalidate(node: TransformNode): void {
    this.own(node);
    node.revision++;
  }

  /**
   * Sets parameters held by the graph for `node`, for every view, or with
   * `view` for that view only (which overrides). A name no alternative of
   * the node declares throws.
   */
  setParams(
    node: TransformNode,
    patch: Readonly<Record<string, number>>,
    view?: ViewId,
  ): void {
    this.own(node);
    const declared = new Set(
      smoothSpecs(node).flatMap((s) => Object.keys(s.params)),
    );
    for (const name of Object.keys(patch)) {
      if (!declared.has(name)) {
        throw new Error(`setParams: "${node.name}" has no parameter "${name}"`);
      }
    }
    let state = this.held.get(node);
    if (!state) {
      state = { base: {}, views: new Map() };
      this.held.set(node, state);
    }
    let target = state.base;
    if (view !== undefined) {
      target = state.views.get(view) ?? {};
      state.views.set(view, target);
    }
    Object.assign(target, patch);
    node.revision++;
  }

  /**
   * The parameter values `node`'s smooth edge has for `view`: its declared
   * starting values, then what the graph holds, then the view's override.
   */
  values(node: TransformNode, view?: ViewId): Params {
    const chosen = this.edgeFor(node, view).edge;
    if (chosen.kind !== "smooth") {
      return {};
    }
    const declared = chosen.spec.params;
    const state = this.held.get(node);
    const out: Record<string, number> = { ...declared };
    const layers = [
      state?.base,
      view === undefined ? undefined : state?.views.get(view),
    ];
    for (const layer of layers) {
      for (const name of Object.keys(layer ?? {})) {
        if (name in declared) {
          out[name] = layer![name]!;
        }
      }
    }
    return out;
  }

  /** The edge `node` has for `view`: a switch resolved, or the edge itself. */
  edgeFor(node: TransformNode, view?: ViewId): ChosenEdge {
    const edge = node.edge;
    if (!edge) {
      throw new Error(`"${node.name}" is a root: it has no edge`);
    }
    if (edge.kind !== "switch") {
      return { edge, choice: undefined };
    }
    const alternatives = [
      ...new Set([
        ...edge.byView.values(),
        ...(edge.default ? [edge.default] : []),
      ]),
    ];
    const picked =
      (view !== undefined ? edge.byView.get(view) : undefined) ?? edge.default;
    if (!picked) {
      throw new Error(
        `switch "${node.name}" has no choice for view ${String(view)} and no default`,
      );
    }
    return { edge: picked, choice: alternatives.indexOf(picked) };
  }

  private own(node: TransformNode): void {
    if (node.graph !== this) {
      throw new Error(`"${node.name}" belongs to another graph`);
    }
  }
}

function smoothSpecs(node: TransformNode): SmoothSpec[] {
  const edge = node.edge;
  if (!edge) {
    return [];
  }
  const all =
    edge.kind === "switch" ? [...edge.byView.values(), edge.default] : [edge];
  return all.flatMap((e) => (e?.kind === "smooth" ? [e.spec] : []));
}

/** A copy of an edge, so a node's matrix is its own; a switch's shared alternatives stay shared. */
function ownEdge(edge: Edge): Edge {
  const copies = new Map<PlainEdge, PlainEdge>();
  const own = (e: PlainEdge): PlainEdge => {
    let copy = copies.get(e);
    if (!copy) {
      copy = e.kind === "affine" && e.matrix ? affine({ matrix: e.matrix }) : e;
      copies.set(e, copy);
    }
    return copy;
  };
  if (edge.kind !== "switch") {
    return own(edge);
  }
  return {
    kind: "switch",
    byView: new Map([...edge.byView].map(([view, e]) => [view, own(e)])),
    default: edge.default && own(edge.default),
  };
}
