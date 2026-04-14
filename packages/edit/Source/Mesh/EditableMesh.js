/**
 * Editable half-edge mesh backed by a render-side GeometryAccessor.
 *
 * EditableMesh owns the CPU-side topology with a loose coupling to the render-side geometry
 * via a mapping of topological vertex IDs to render vertex IDs.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class EditableMesh {
  constructor(geometryAccessor) {
    this._geometryAccessor = geometryAccessor;
    this._vertices = [];
    this._edges = [];
    this._faces = [];
    this._halfEdges = [];

    this.#buildMesh(geometryAccessor);
  }

  get vertices() {
    return this._vertices;
  }

  get edges() {
    return this._edges;
  }

  get faces() {
    return this._faces;
  }

  getVertex(index) {
    return getElement(this._vertices, index);
  }

  getEdge(index) {
    return getElement(this._edges, index);
  }

  getFace(index) {
    return getElement(this._faces, index);
  }

  #buildMesh(geometryAccessor) {}
}

function getElement(elements, index) {
  if (index === undefined) {
    return undefined;
  }

  return elements[index];
}

export default EditableMesh;
