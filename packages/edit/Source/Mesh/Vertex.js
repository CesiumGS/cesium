/** @import { Cartesian3 } from "@cesium/engine"; */
/** @import HalfEdge from "./HalfEdge"; */
/** @import Edge from "./Edge"; */
/** @import Face from "./Face"; */

import MeshComponent from "./MeshComponent";
import { defined, DeveloperError } from "@cesium/engine";

/**
 * Vertex record for an EditableMesh.
 *
 * @extends MeshComponent
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Vertex extends MeshComponent {
  /**
   * @param {Cartesian3} position
   */
  constructor(position) {
    super();

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
   * Vertices have no sub-components; <code>result</code> is returned
   * unchanged.
   * @param {MeshComponent[]} result Destination array.
   * @returns {MeshComponent[]}
   */
  lower(result) {
    return result;
  }

  /**
   * Returns the edges incident to this vertex. Equivalent to
   * {@link Vertex#edges}.
   * @param {Edge[]} result Destination array.
   * @returns {Edge[]}
   */
  upper(result) {
    return this.edges(result);
  }

  /**
   * Returns the edges that are incident to this vertex.
   * @param {Edge[]} result Destination array.
   * @returns {Edge[]}
   */
  edges(result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(this._halfEdge)) {
      throw new DeveloperError("Vertex must have a half-edge.");
    }
    //>>includeEnd('debug');

    let currentHalfEdge = this._halfEdge;
    do {
      result.push(currentHalfEdge.edge);
      currentHalfEdge = currentHalfEdge.twin.next;
    } while (currentHalfEdge !== this._halfEdge);

    return result;
  }

  /**
   * Returns the faces that are incident to this vertex.
   * @param {Face[]} result Destination array.
   * @returns {Face[]}
   */
  faces(result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(this._halfEdge)) {
      throw new DeveloperError("Vertex must have a half-edge.");
    }
    //>>includeEnd('debug');

    let currentHalfEdge = this._halfEdge;
    do {
      result.push(currentHalfEdge.face);
      currentHalfEdge = currentHalfEdge.twin.next;
    } while (currentHalfEdge !== this._halfEdge);

    return result;
  }

  /**
   * Returns the vertices that are connected to this vertex by an edge.
   * @param {Vertex[]} result Destination array
   * @returns {Vertex[]} The vertices that are connected to this vertex by an edge.
   */
  neighbors(result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(this._halfEdge)) {
      throw new DeveloperError("Vertex must have a half-edge.");
    }
    //>>includeEnd('debug');

    let currentHalfEdge = this._halfEdge;
    do {
      result.push(currentHalfEdge.twin.vertex);
      currentHalfEdge = currentHalfEdge.twin.next;
    } while (currentHalfEdge !== this._halfEdge);

    return result;
  }
}

export default Vertex;
