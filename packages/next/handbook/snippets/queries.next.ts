declare const view: import("@cesium/next").View;
declare const pick: import("@cesium/next").CorePick;
declare const engine: import("@cesium/next").Engine;
declare const catalog: import("@cesium/next/frames").FrameCatalog;
declare const resolver: import("@cesium/next/frames").FramesResolver;
declare const content: import("@cesium/next/frames").Frame;
declare const camera: import("@cesium/next/frames").Frame;
// ---
import { accuracyAlong, measureIn, pointIn } from "@cesium/next";
import { graphOfFrames, pickIn } from "@cesium/next/frames";

// What a pick says is a point of the content, in the content's own node.
// "True" and "drawn" are two named nodes: where the content is, and where
// the view draws it. Neither is a layer.
const truth = pickIn(pick, "true", { view });
const drawn = pickIn(pick, "drawn", { view });
console.log(truth.position, drawn.position, truth.note);

// The frames' tree as a transform graph, to ask in any node.
const graph = graphOfFrames(catalog, resolver);
graph.sync();
const here = graph.node(content)!;
const there = graph.node(camera)!;

// Two points, measured in the content's node (a true distance) and in the
// camera's (a drawn one), in float64.
const points = [
  { node: here, position: [4_300_000, 600_000, 4_600_000] },
  { node: here, position: [4_300_400, 600_300, 4_600_000] },
];
export const trueDistance = measureIn(points, here).distance;
export const drawnDistance = measureIn(points, there, { view }).distance;

// A point carried to a node, with the route's Jacobian, its stretch
// [σ_min, σ_max] and what it can claim of its position.
const carried = pointIn({ ...points[0]!, sigma: 0.02 }, there, { view });
export const stretch = carried.stretch;

// Accuracy along the route: Σ_out = J Σ Jᵀ, plus each smooth node's own.
export const sigma = accuracyAlong(carried.route, points[0]!.position, 0.02, {
  affine: graph.accuracy(),
});
void engine;
// --- end
