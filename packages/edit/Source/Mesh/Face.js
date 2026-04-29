/** @import HalfEdge from "./HalfEdge"; */
/** @import MeshComponent from "./MeshComponent"; */
/** @import Vertex from "./Vertex"; */

/**
 * Face record for an EditableMesh.
 *
 * @implements MeshComponent
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Face {
  constructor() {
    /**
     * @type {HalfEdge | undefined}
     */
    this._halfEdge = undefined;
  }

  get halfEdge() {
    return this._halfEdge;
  }

  set halfEdge(halfEdge) {
    this._halfEdge = halfEdge;
  }

  /**
   * Iterates over each vertex of the face and executes a callback function.
   * @param {function(Vertex): void} callback - The function to execute for each vertex.
   */
  forEachVertex(callback) {
    let halfEdge = this._halfEdge;
    if (!halfEdge) {
      return;
    }

    do {
      callback(halfEdge.vertex);
      halfEdge = halfEdge.next;
    } while (halfEdge !== this._halfEdge);
  }

  /**
   * Returns the vertices that compose this component. For a face, this is all vertices that make up the face.
   * @returns {Vertex[]}
   */
  vertices() {
    /** @type {Vertex[]} */
    const vertices = [];
    this.forEachVertex((vertex) => vertices.push(vertex));
    return vertices;
  }
}

export default Face;
