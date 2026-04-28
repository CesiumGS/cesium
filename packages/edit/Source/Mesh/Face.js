/** @import HalfEdge from "./HalfEdge"; */
/** @import MeshComponent from "./MeshComponent"; */
/** @import Edge from "./Edge"; */
/** @import Vertex from "./Vertex"; */

import { defined, DeveloperError } from "@cesium/engine";

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
   * Returns the boundary edges of this face. Equivalent to
   * {@link Face#edges}.
   * @param {Edge[]} result Destination array.
   * @returns {Edge[]}
   */
  lower(result) {
    return this.edges(result);
  }

  /**
   * Faces have no super-components; <code>result</code> is returned
   * unchanged.
   * @param {MeshComponent[]} result Destination array.
   * @returns {MeshComponent[]}
   */
  upper(result) {
    return result;
  }

  /**
   * Returns the vertices that compose this face.
   * @param {Vertex[]} [result] Destination array.
   * @returns {Vertex[]}
   */
  vertices(result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(this._halfEdge)) {
      throw new DeveloperError("Face must have a half-edge.");
    }
    //>>includeEnd('debug');

    let currentHalfEdge = this._halfEdge;
    do {
      result.push(currentHalfEdge.vertex);
      currentHalfEdge = currentHalfEdge.next;
    } while (currentHalfEdge !== this._halfEdge);

    return result;
  }

  /**
   * Returns the edges that compose this face.
   * @param {Edge[]} [result] Destination array.
   * @returns {Edge[]}
   */
  edges(result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(this._halfEdge)) {
      throw new DeveloperError("Face must have a half-edge.");
    }
    //>>includeEnd('debug');

    let currentHalfEdge = this._halfEdge;
    do {
      result.push(currentHalfEdge.edge);
      currentHalfEdge = currentHalfEdge.next;
    } while (currentHalfEdge !== this._halfEdge);

    return result;
  }

  /**
   * Triangulation of this face as a flat array of vertex indices into the
   * face's vertex ring, with three indices per triangle.
   *
   * The current implementation is a simple fan triangulation rooted at the
   * first vertex. We could do better with earcut or other algorithms, but for now,
   * this suffices until we have a need for more complex triangulation. This is also faster.
   *
   * @returns {Uint32Array} Vertex indices, of length <code>(n - 2) * 3</code>
   *   for an n-vertex face.
   */
  triangleIndices() {
    const triangleCount = Math.max(0, this.vertices().length - 2);
    const indices = new Uint32Array(triangleCount * 3);
    for (let i = 0; i < triangleCount; i++) {
      indices[i * 3] = 0;
      indices[i * 3 + 1] = i + 1;
      indices[i * 3 + 2] = i + 2;
    }
    return indices;
  }
}

export default Face;
