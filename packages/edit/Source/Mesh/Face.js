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
   * @returns {Vertex[]}
   */
  vertices() {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(this._halfEdge)) {
      throw new DeveloperError("Face must have a half-edge.");
    }
    //>>includeEnd('debug');

    const vertices = [];
    let currentHalfEdge = this._halfEdge;

    do {
      vertices.push(currentHalfEdge.vertex);
      currentHalfEdge = currentHalfEdge.next;
    } while (currentHalfEdge !== this._halfEdge);

    return vertices;
  }

  /**
   * Returns the edges that compose this face.
   * @returns {Edge[]}
   */
  edges() {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(this._halfEdge)) {
      throw new DeveloperError("Face must have a half-edge.");
    }
    //>>includeEnd('debug');

    const edges = [];
    let currentHalfEdge = this._halfEdge;

    do {
      edges.push(currentHalfEdge.edge);
      currentHalfEdge = currentHalfEdge.next;
    } while (currentHalfEdge !== this._halfEdge);

    return edges;
  }

  /**
   * MeshComponent method to return the faces that are part of this component. For a face, this is just itself.
   * @returns {Face[]}
   */
  faces() {
    return [this];
  }
}

export default Face;
