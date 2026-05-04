/** @import HalfEdge from "./HalfEdge"; */
/** @import MeshComponent from "./MeshComponent"; */
/** @import Edge from "./Edge"; */

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
   * Returns the edges that compose this face.
   * @returns {Edge[]}
   */
  lower() {
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
   * Returns the components that this one participates in. For faces, this is empty.
   * @returns {MeshComponent[]}
   */
  upper() {
    return [];
  }
}

export default Face;
