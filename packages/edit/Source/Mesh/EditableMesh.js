import { DeveloperError } from "@cesium/engine";

/** @import { Editable, GeometryAccessor, GeometryAccessSession } from "@cesium/engine"; */
/** @import Vertex from "./Vertex"; */
/** @import Edge from "./Edge"; */
/** @import Face from "./Face"; */
/** @import HalfEdge from "./HalfEdge"; */
/** @import MeshComponent from "./MeshComponent"; */

/**
 * Editable half-edge mesh backed by a render-side GeometryAccessor.
 *
 * EditableMesh owns the CPU-side topology and communicates changes to the render-side geometry via the GeometryAccessor.
 * This class exposes higher level operations for editing the mesh, such as splitting edges, collapsing edges, and extruding faces.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class EditableMesh {
  /**
   * @param {Editable} editable An object implementing the {@link Editable} interface.
   * Supplies the underlying {@link GeometryAccessor} and world-space model matrix.
   */
  constructor(editable) {
    this._editable = editable;

    const geometryAccessor = editable.geometryAccessor;
    const availableAttributes = new Set(
      geometryAccessor.getAvailableAttributes(),
    );
    const scopes = {
      read: {
        attributes: availableAttributes,
        topology: true,
      },
      write: {
        attributes: availableAttributes,
        topology: true,
      },
    };

    /** @type {GeometryAccessSession} */
    this._editSession = geometryAccessor.openSession(scopes);
    /**
     * @type {Vertex[]}
     */
    this._vertices = [];
    /**
     * @type {Edge[]}
     */
    this._edges = [];
    /**
     * @type {Face[]}
     */
    this._faces = [];

    this.#buildMesh(this._editable.geometryAccessor);
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

  /**
   * Get a vertex by index.
   * @param {number} index
   * @returns {Vertex}
   */
  getVertex(index) {
    return getElement(this._vertices, index);
  }

  /**
   * Get an edge by index.
   * @param {number} index
   * @returns {Edge}
   */
  getEdge(index) {
    return getElement(this._edges, index);
  }

  /**
   * Get a face by index.
   * @param {number} index
   * @returns {Face}
   */
  getFace(index) {
    return getElement(this._faces, index);
  }

  /**
   * Build the mesh topology from the geometry accessor.
   * @param {GeometryAccessor} geometryAccessor
   */
  #buildMesh(geometryAccessor) {}
}

/**
 * @template {MeshComponent} T
 * @param {T[]} elements
 * @param {number} index
 * @returns {T}
 * @private
 */
function getElement(elements, index) {
  //>>includeStart('debug', pragmas.debug);
  if (index < 0 || index >= elements.length) {
    throw new DeveloperError(
      `Index ${index} is out of bounds for elements array of length ${elements.length}.`,
    );
  }
  //>>includeEnd('debug');

  return elements[index];
}

export default EditableMesh;
