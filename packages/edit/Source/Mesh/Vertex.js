/** @import { Cartesian3 } from "@cesium/engine"; */
/** @import HalfEdge from "./HalfEdge"; */
/** @import MeshComponent from "./MeshComponent"; */

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
   * Move the vertex to a new position.
   * @param {Cartesian3} newPosition
   */
  move(newPosition) {}
}

export default Vertex;
