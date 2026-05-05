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
   * MeshComponent method to return the faces that are part of this component. For a face, this is just itself.
   * @param {Face[]} [result] Destination array.
   * @returns {Face[]}
   */
  faces(result) {
    result.push(this);
    return result;
  }
}

export default Face;
