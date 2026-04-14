/**
 * Vertex record for an EditableMesh.
 *
 * @implements MeshComponent
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Vertex {
  constructor(position) {
    this._halfEdge = undefined;
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

  move(newPosition) {}
}

export default Vertex;
