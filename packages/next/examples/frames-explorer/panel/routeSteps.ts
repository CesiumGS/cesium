// The route spelled out under the tree (the owner's tree design, fix 1):
// one numbered step per edge of the answer's path, plus its start and end,
// each with what it does physically and its accuracy. Pure, from the tree
// and `branchPath`'s result, so the steps are the lit edges, in order
// (test/framesExplorerRouteSteps.test.ts).
import type { EdgeAccuracy, TreeNode } from "../tree.ts";
import { edgeAccuracyText } from "./families.ts";

export interface RouteStep {
  kind: "start" | "edge" | "end";
  /** "EME2000 to EARTH_ICRF"; the start's and end's own titles. */
  title: string;
  /** What it does, in plain words. */
  does: string;
  accuracy?: { text: string; unknown: boolean };
  /** An edge step: its edge, named by its child node (the diagram's edge id). */
  edge?: string;
  /** A route in two legs (`legs`): the end whose path to the ancestor it is on. */
  leg?: "start" | "end";
}

/** What each built-in edge does physically, by its child frame. */
const DOES: Readonly<Record<string, string>> = {
  HCRS: "the Sun's position (DE440)",
  EARTH_ICRF: "the Earth's position (DE440)",
  GCRF: "the Earth's position, with the relativistic scale of IERS 2010 (DE440)",
  EME2000: "the frame bias: a fixed rotation (IAU 2006)",
  ITRF: "the Earth's rotation (IAU 2006/2000A and EOP)",
  MOON_ICRF: "the Moon's position (DE440)",
  MOON_ME: "the Moon's orientation (DE440)",
  MOON_PA: "the Moon's principal axes: a fixed rotation (DE440)",
};

/** `id`'s node, with its parent. */
function locate(
  tree: TreeNode,
  id: string,
): { node: TreeNode; parent?: TreeNode } | undefined {
  const walk = (
    n: TreeNode,
    parent: TreeNode | undefined,
  ): { node: TreeNode; parent?: TreeNode } | undefined => {
    if (n.id === id) {
      return { node: n, ...(parent && { parent }) };
    }
    for (const c of n.children) {
      const f = walk(c, n);
      if (f) {
        return f;
      }
    }
    return undefined;
  };
  return walk(tree, undefined);
}

/**
 * The steps of `path` through `tree`: `start`, then each edge in the
 * route's order (up from the start to the common ancestor, then down), then
 * `end`. An edge walked up is "<child> to <parent>", down "<parent> to
 * <child>". An added frame's edge says its own detail.
 *
 * With `legs`, the route is two legs that meet at the ancestor: `start` and
 * its edges up, then `end` and its edges up (the down edges reversed), each
 * step marked with its leg.
 */
export function routeSteps(
  tree: TreeNode,
  path: {
    up: readonly string[];
    ancestor: string;
    down: readonly string[];
  },
  start: { title: string; does: string; accuracy?: EdgeAccuracy },
  end: { title: string; does: string },
  legs?: { start: string; end: string },
): RouteStep[] {
  const edge = (childId: string, up: boolean): RouteStep | undefined => {
    const found = locate(tree, childId);
    if (!found?.parent) {
      return undefined;
    }
    const { node, parent } = found;
    return {
      kind: "edge",
      title: up
        ? `${node.label} to ${parent.label}`
        : `${parent.label} to ${node.label}`,
      does: DOES[node.id] ?? node.edge.detail,
      accuracy: edgeAccuracyText(node.edge.kind, node.edge.accuracy),
      edge: node.id,
    };
  };
  const steps: RouteStep[] = [
    {
      kind: "start",
      title: start.title,
      does: start.does,
      ...(start.accuracy && {
        accuracy: edgeAccuracyText("constant", start.accuracy),
      }),
    },
  ];
  for (const id of path.up) {
    const s = edge(id, true);
    if (s) {
      steps.push(s);
    }
  }
  if (legs) {
    const ends: RouteStep[] = [
      { kind: "end", title: end.title, does: end.does },
    ];
    for (const id of [...path.down].reverse()) {
      const s = edge(id, true);
      if (s) {
        ends.push(s);
      }
    }
    return [
      ...steps.map((s) => ({ ...s, leg: "start" as const })),
      ...ends.map((s) => ({ ...s, leg: "end" as const })),
    ];
  }
  for (const id of path.down) {
    const s = edge(id, false);
    if (s) {
      steps.push(s);
    }
  }
  steps.push({ kind: "end", title: end.title, does: end.does });
  return steps;
}
