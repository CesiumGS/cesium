/** @import { Cartesian3 } from "@cesium/engine"; */
/** @import HalfEdge from "./HalfEdge"; */
/** @import MeshComponent from "./MeshComponent"; */
/** @import Edge from "./Edge"; */

import { defined, DeveloperError } from "@cesium/engine";

/**
 * Vertex record for an EditableMesh.
 *
 * @implements MeshComponent
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Vertex {
  /**
   * @param {Cartesian3} position
   */
  constructor(position) {
    /**
     * @type {HalfEdge | undefined}
     */
    this._halfEdge = undefined;

    /**
     * @type {Cartesian3}
     */
    this._position = position;
  }

  get halfEdge() {
    return this._halfEdge;
  }

  set halfEdge(halfEdge) {
    this._halfEdge = halfEdge;
  }

  get position() {
    return this._position;
  }

  set position(position) {
    this._position = position;
  }

  /**
   * Returns the constituent MeshComponents that compose this component. For a vertex, this is empty.
   * @returns {MeshComponent[]}
   */
  lower() {
    return [];
  }

  /**
   * Returns the edges that are incident to this vertex.
   * @returns {Edge[]}
   */
  upper() {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(this._halfEdge)) {
      throw new DeveloperError("Vertex must have a half-edge.");
    }
    //>>includeEnd('debug');

    /** @type {Edge[]} */
    const edges = [];

    let currentHalfEdge = this._halfEdge;
    do {
      edges.push(currentHalfEdge.edge);
      currentHalfEdge = currentHalfEdge.twin.next;
    } while (currentHalfEdge !== this._halfEdge);

    return edges;
  }

  /**
   * Move the vertex by a given translation.
   * @param {Cartesian3} translation
   */
  move(translation) {}
}

export default Vertex;
