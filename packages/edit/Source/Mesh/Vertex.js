/** @import HalfEdge from "./HalfEdge"; */
/** @import Edge from "./Edge"; */
/** @import Face from "./Face"; */

import { defined, DeveloperError } from "@cesium/engine";
import MeshComponent from "./MeshComponent";

/**
 * Vertex record for an EditableMesh.
 *
 * @extends MeshComponent
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Vertex extends MeshComponent {
  /**
   * @param {number} bufferIndex The index of this vertex in the underlying geometry buffer at the time the mesh was built.
   */
  constructor(bufferIndex) {
    super();

    /**
     * @type {HalfEdge | undefined}
     */
    this._halfEdge = undefined;

    /**
     * Index of this vertex in the underlying geometry buffer.
     * Currently treated as fixed for the lifetime of the vertex; once the GeometryAccessor exposes
     * a mapping from original to edited indices, this will be updated to track that mapping.
     * @type {number}
     */
    this._bufferIndex = bufferIndex;
  }

  get halfEdge() {
    return this._halfEdge;
  }

  set halfEdge(halfEdge) {
    this._halfEdge = halfEdge;
  }

  get bufferIndex() {
    return this._bufferIndex;
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
      // Boundary half-edges have no face; skip them.
      if (defined(currentHalfEdge.face)) {
        result.push(currentHalfEdge.face);
      }
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
