/** @import HalfEdge from "./HalfEdge"; */
/** @import MeshComponent from "./MeshComponent"; */
/** @import Face from "./Face"; */
/** @import Vertex from "./Vertex"; */

/**
 * Edge record for an EditableMesh.
 * Unlike a HalfEdge, an Edge is purely topological - containing data specific to the edge itself, not its relationship to other components.
 * For example, an Edge may contain selection state or a crease flag. This pertains to both HalfEdges in the pair, so it makes sense to have a single Edge record for both.
 *
 * @implements MeshComponent
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Edge {
  /**
   * Accepts a canonical half-edge from the pair of half-edges that make up this edge.
   * @param {HalfEdge} halfEdge
   */
  constructor(halfEdge) {
    this._halfEdge = halfEdge;
  }

  get halfEdge() {
    return this._halfEdge;
  }

  /**
   * Returns the vertices that compose this edge.
   * @returns {Vertex[]}
   */
  vertices() {
    return [this._halfEdge.vertex, this._halfEdge.next.vertex];
  }

  /**
   * MeshComponent method to return the edges that are part of this component. For an edge, this is just itself.
   * @returns {Edge[]}
   */
  edges() {
    return [this];
  }

  /**
   * Returns the faces that are incident to this edge.
   * @returns {Face[]}
   */
  faces() {
    const faces = [];
    if (this._halfEdge.face) {
      faces.push(this._halfEdge.face);
    }
    if (this._halfEdge.twin.face) {
      faces.push(this._halfEdge.twin.face);
    }
    return faces;
  }
}

export default Edge;
