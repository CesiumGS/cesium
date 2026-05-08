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
   * Returns the endpoint vertices of this edge. Equivalent to
   * {@link Edge#vertices}.
   * @param {Vertex[]} result Destination array.
   * @returns {Vertex[]}
   */
  lower(result) {
    return this.vertices(result);
  }

  /**
   * Returns the faces incident to this edge. Equivalent to
   * {@link Edge#faces}.
   * @param {Face[]} result Destination array.
   * @returns {Face[]}
   */
  upper(result) {
    return this.faces(result);
  }

  /**
   * Returns the vertices that compose this edge.
   * @param {Vertex[]} result Destination array.
   * @returns {Vertex[]}
   */
  vertices(result) {
    result.push(this._halfEdge.vertex);
    result.push(this._halfEdge.next.vertex);
    return result;
  }

  /**
   * Returns the faces that are incident to this edge.
   * @param {Face[]} result Destination array.
   * @returns {Face[]}
   */
  faces(result) {
    if (this._halfEdge.face) {
      result.push(this._halfEdge.face);
    }
    if (this._halfEdge.twin.face) {
      result.push(this._halfEdge.twin.face);
    }
    return result;
  }
}

export default Edge;
