// The frame tree at the clock's instant (Explore, the tree diagram): the
// built-in frames and what the scenario's evaluation added, the main
// thread's own frames attached so the walk can state them, Orion's node
// from the worker, and every node's composed accuracy (R8).
import type { Frame } from "../../src/frames/Frame.ts";
import { composedAccuracy, type PlacedNode } from "./composed.ts";
import type { PageCore } from "./page.ts";
import type { ComposedAccuracy, Reference } from "./panel/model.ts";
import type { OverlayGeometry, TrajectoryInfo } from "./protocol.ts";
import type { ScenarioEvaluation } from "./scenarios/evaluate.ts";
import { buildScenarioTree, buildTree, type TreeNode } from "./tree.ts";

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
  /** The tree and the walk's statements at the clock's instant. */
  rebuild(): void;
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
  let engineering: EngineeringNode | undefined;

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
    // Orion's statements from the worker's reply, while they're current.
    const info = deps.orion();
    const orion =
      info !== undefined && findNode(t, info.node.id) ? info : undefined;
    tree = t;
    treeNote = undefined;
    const own = composedAccuracy(t, frames, instant);
    composed = orion
      ? (Object.fromEntries(
          (Object.keys(own) as Reference[]).map((r) => [
            r,
            { ...own[r], [orion.node.id]: orion.composed[r] },
          ]),
        ) as ComposedAccuracy)
      : own;
    deps.updateKnown();
    invalidate();
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
    ids: () => nodeIds(tree),
    noteEngineering,
    dispose: () => {},
  };
}
