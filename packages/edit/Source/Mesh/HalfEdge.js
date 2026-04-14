/**
 * Half-edge record for an EditableMesh.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class HalfEdge {
  constructor(vertex, face) {
    this._vertex = vertex;
    this._face = face;
    this._next = undefined;
    this._twin = undefined;
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
}

export default HalfEdge;
