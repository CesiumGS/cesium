// The frame tree at the clock's instant (Explore, the tree diagram): the
// built-in frames and what the scenario's evaluation added, the main
// thread's own frames attached so the walk can state them, Orion's node
// from the worker, and every node's composed accuracy (R8).
//
// Its shape and its values are kept apart (Task 4d). The shape (which
// frames, under which parents) is built when the frame data, the scene's
// own frames or the frames the evaluation added change (`rebuild`). The
// values that drift with time, the Earth-orientation sigma on the ITRF edge
// and the composed accuracy, are updated in place while the clock plays
// (`refresh`), as are an evaluation's new accuracies for the same frames:
// only a node whose value changed is new, with its path to the root, and
// every other node keeps its identity, so the diagram's unchanged pills
// and edges don't render again.
import type { Frame } from "../../src/frames/Frame.ts";
import { composedAccuracy, type PlacedNode } from "./composed.ts";
import type { PageCore } from "./page.ts";
import type { ComposedAccuracy, Reference } from "./panel/model.ts";
import type { OverlayGeometry, TrajectoryInfo } from "./protocol.ts";
import type { ScenarioEvaluation } from "./scenarios/evaluate.ts";
import { sameData, share } from "./share.ts";
import {
  buildScenarioTree,
  buildTree,
  driftingAccuracies,
  type AddedFrameSpec,
  type EdgeAccuracy,
  type TreeNode,
} from "./tree.ts";

export function findNode(root: TreeNode, id: string): TreeNode | undefined {
  if (root.id === id) {
    return root;
  }
  for (const c of root.children) {
    const f = findNode(c, id);
    if (f) {
      return f;
    }
  }
  return undefined;
}

/** Every node's id. */
export function nodeIds(tree: TreeNode | undefined): Set<string> {
  const out = new Set<string>();
  const walk = (n: TreeNode) => {
    out.add(n.id);
    n.children.forEach(walk);
  };
  if (tree) {
    walk(tree);
  }
  return out;
}

/**
 * `tree` with `id`'s edge stating `accuracy`: the same tree when it already
 * does; otherwise new objects for that node and its ancestors only.
 */
export function withAccuracy(
  tree: TreeNode,
  id: string,
  accuracy: EdgeAccuracy,
): TreeNode {
  if (tree.id === id) {
    return sameData(tree.edge.accuracy, accuracy)
      ? tree
      : { ...tree, edge: { ...tree.edge, accuracy } };
  }
  let changed = false;
  const children = tree.children.map((c) => {
    const next = withAccuracy(c, id, accuracy);
    changed ||= next !== c;
    return next;
  });
  return changed ? { ...tree, children } : tree;
}

/** What an evaluation's added frames are, without the accuracies that change between replies. */
const addedShape = (added: readonly AddedFrameSpec[]): string =>
  JSON.stringify(
    added.map((a) => [a.id, a.label, a.parentId, a.edge.kind, a.edge.detail]),
  );

/** The engineering frame the worker placed (known from its operation). */
export interface EngineeringNode {
  node: TreeNode;
  placed: PlacedNode;
}

export interface TreeState {
  tree(): TreeNode | undefined;
  /** Why there's no tree yet, if there isn't. */
  note(): string | undefined;
  /** The frame data didn't load: the tree can't draw. */
  fail(note: string): void;
  composed(): ComposedAccuracy;
  engineering(): EngineeringNode | undefined;
  /** Builds the tree's shape again (the frame data, the scene's frames or the evaluation's changed), with its values at the clock's instant. */
  rebuild(): void;
  /**
   * The values that drift with time, at the clock's instant (the ITRF
   * edge's Earth-orientation sigma, the composed accuracy), updated in
   * place; the shape is built again only if it changed. The panel is told
   * only when something did.
   */
  refresh(): void;
  /** The evaluation is a new one: its frames' values in place, or a rebuild if its frames differ. */
  evaluationChanged(): void;
  /** Orion's statements came or went: its composed accuracy, merged in. */
  orionChanged(): void;
  ids(): Set<string>;
  /** The design grid's operation names the engineering frame, once. */
  noteEngineering(g: OverlayGeometry, center: ArrayLike<number>): void;
  dispose(): void;
}

export function createTreeState(deps: {
  core: Pick<PageCore, "frames" | "instantNow" | "invalidate">;
  /** The scene's own frames on the main thread (the lunar site, Sacramento). */
  local(): readonly Frame[];
  /** The current scenario's evaluation, if the host has one. */
  evaluation(): ScenarioEvaluation | undefined;
  /** Orion's statements while they're current (no failure since). */
  orion(): TrajectoryInfo | undefined;
  /** The tree changed: the links' known frames follow (R15). */
  updateKnown(): void;
}): TreeState {
  const { frames: framesNow, instantNow, invalidate } = deps.core;
  let tree: TreeNode | undefined;
  let treeNote: string | undefined =
    "The frame tree draws once frame data is in.";
  let composed: ComposedAccuracy = { ITRF: {}, GCRF: {}, ICRF: {} };
  /** The tree's own composed accuracy, before Orion's statements are merged in. */
  let own: ComposedAccuracy | undefined;
  let engineering: EngineeringNode | undefined;
  /** What the shape was built from: the frame data, the scene's frames, the added frames. */
  let built:
    { frames: unknown; local: readonly Frame[]; added: string } | undefined;

  const shapeChanged = (): boolean => {
    const local = deps.local();
    return (
      built === undefined ||
      built.frames !== framesNow() ||
      built.local.length !== local.length ||
      built.local.some((f, i) => f !== local[i]) ||
      built.added !== addedShape(deps.evaluation()?.added ?? [])
    );
  };

  /** Orion's composed accuracy merged into the tree's own, while its node is in the tree. */
  function merged(t: TreeNode, mine: ComposedAccuracy): ComposedAccuracy {
    const info = deps.orion();
    const orion =
      info !== undefined && findNode(t, info.node.id) ? info : undefined;
    return orion
      ? (Object.fromEntries(
          (Object.keys(mine) as Reference[]).map((r) => [
            r,
            { ...mine[r], [orion.node.id]: orion.composed[r] },
          ]),
        ) as ComposedAccuracy)
      : mine;
  }

  /** Takes `t` and `mine` as the current values; true if anything the panel shows changed. */
  function apply(t: TreeNode, mine: ComposedAccuracy): boolean {
    const next = share(composed, merged(t, mine));
    const changed = t !== tree || next !== composed;
    tree = t;
    own = mine;
    composed = next;
    return changed;
  }

  function rebuild(): void {
    const frames = framesNow();
    const instant = instantNow();
    if (!frames || !instant) {
      return;
    }
    // The scenario's tree: the built-in frames and what its evaluation
    // added (buildScenarioTree), the main thread's own frames attached to
    // their nodes so the walk can state them.
    const e = deps.evaluation();
    const t = buildScenarioTree(buildTree(frames, {}, instant), e?.added ?? []);
    const local = deps.local();
    const attach = (n: TreeNode) => {
      const f = local.find((l) => l.name === n.id);
      if (f) {
        n.frame = f;
      }
      n.children.forEach(attach);
    };
    attach(t);
    built = {
      frames,
      local: [...local],
      added: addedShape(e?.added ?? []),
    };
    // Nodes equal to the last tree's keep their identity (share).
    const next = share(tree, t);
    treeNote = undefined;
    apply(next, share(own, composedAccuracy(next, frames, instant)));
    deps.updateKnown();
    invalidate();
  }

  function refresh(): void {
    const frames = framesNow();
    const instant = instantNow();
    if (!frames || !instant) {
      return;
    }
    if (!tree || shapeChanged()) {
      rebuild();
      return;
    }
    // The same frames: only the values that drift, and the evaluation's.
    let t = tree;
    for (const [id, a] of Object.entries(driftingAccuracies(frames, instant))) {
      t = withAccuracy(t, id, a);
    }
    for (const a of deps.evaluation()?.added ?? []) {
      t = withAccuracy(t, a.id, a.edge.accuracy);
    }
    const mine = share(own, composedAccuracy(t, frames, instant));
    if (apply(t, mine)) {
      invalidate();
    }
  }

  function orionChanged(): void {
    if (!tree || !own) {
      refresh();
      return;
    }
    if (apply(tree, own)) {
      invalidate();
    }
  }

  function noteEngineering(
    g: OverlayGeometry,
    center: ArrayLike<number>,
  ): void {
    if (engineering || !g.operation) {
      return;
    }
    const op = g.operation;
    const known = !op.ballpark && op.accuracy !== undefined;
    engineering = {
      node: {
        id: "engineering:California zone 3",
        label: "California zone 3",
        edge: {
          kind: "proj-operation",
          detail: op.pipeline,
          accuracy: known
            ? {
                meters: op.accuracy!,
                note: "PROJ's stated accuracy for the recorded operation",
              }
            : { note: "PROJ states no accuracy for the recorded operation" },
        },
        children: [],
      },
      placed: {
        itrf: center,
        projection: {
          source: "projection",
          meters: known ? op.accuracy : undefined,
          note: `engineering frame "California zone 3": PROJ operation (${op.grids.join(", ") || "no grids"})`,
        },
      },
    };
    rebuild();
  }

  return {
    tree: () => tree,
    note: () => treeNote,
    fail: (note) => {
      treeNote = note;
    },
    composed: () => composed,
    engineering: () => engineering,
    rebuild,
    refresh,
    evaluationChanged: refresh,
    orionChanged,
    ids: () => nodeIds(tree),
    noteEngineering,
    dispose: () => {},
  };
}
