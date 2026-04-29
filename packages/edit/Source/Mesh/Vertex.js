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
   * Returns the vertices that compose this component. For a vertex, this is just itself.
   * @returns {Vertex[]}
   */
  vertices() {
    return [this];
  }

  /**
   * Move the vertex by a given translation.
   * @param {Cartesian3} translation
   */
  move(translation) {}
}

export default Vertex;
