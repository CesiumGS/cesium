/**
 * Edge record for an EditableMesh.
 * Unlike a HalfEdge, an Edge is purely topological - containing data specific to the edge itself, not its relationship to other components.
 * For example, an Edge may contain selection state or a crease flag. This pertains to both HalfEdges in the pair, so it makes sense to have a single Edge record for both.
 *
 * @implements MeshComponent
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Edge {
  // Accepts a canonical half-edge from the pair of half-edges that make up this edge.
  constructor(halfEdge) {
    this._halfEdge = halfEdge;
  }

  get halfEdge() {
    return this._halfEdge;
  }

  move(newPosition) {}
}

export default Edge;
