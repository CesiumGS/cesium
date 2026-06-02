/** @import Vertex from "./Vertex"; */
/** @import Face from "./Face"; */
/** @import Edge from "./Edge"; */

/**
 * Half-edge record for an EditableMesh.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class HalfEdge {
  /**
   * @param {Vertex} vertex
   * @param {Face} face
   */
  constructor(vertex, face) {
    /**
     * @type {Vertex}
     */
    this._vertex = vertex;
    /**
     * @type {Face}
     */
    this._face = face;
    /**
     * @type {HalfEdge | undefined}
     */
    this._next = undefined;
    /**
     * @type {HalfEdge | undefined}
     */
    this._twin = undefined;
    /**
     * @type {Edge | undefined}
     */
    this._edge = undefined;
  }

  get next() {
    return this._next;
  }

  set next(halfEdge) {
    this._next = halfEdge;
  }

  get twin() {
    return this._twin;
  }

  set twin(halfEdge) {
    this._twin = halfEdge;
  }

  get vertex() {
    return this._vertex;
  }

  get face() {
    return this._face;
  }

  get edge() {
    return this._edge;
  }

  set edge(edge) {
    this._edge = edge;
  }
}

export default HalfEdge;
