import { DeveloperError } from "@cesium/engine";

/** @import { GeometryAccessor, GeometryAccessSession } from "@cesium/engine"; */
/** @import Vertex from "./Vertex"; */
/** @import Edge from "./Edge"; */
/** @import Face from "./Face"; */
/** @import HalfEdge from "./HalfEdge"; */
/** @import MeshComponent from "./MeshComponent"; */
/** @import { Cartesian3 } from "@cesium/engine"; */

/**
 * Editable half-edge mesh backed by a render-side GeometryAccessor.
 *
 * EditableMesh owns the CPU-side topology and communicates changes to the render-side geometry via the GeometryAccessor.
 * This class exposes higher level operations for editing the mesh, such as splitting edges, collapsing edges, and extruding faces. These
 * operations only affect the internal data structures and are not reflected in the render layer until commit() is called, which gives flexibility to batch multiple edits together before syncing with the GPU.
 * For even more flexibility, openEditSession() and closeEditSession() can be used to keep resources alive across multiple commits, which is especially useful for asynchronous edit operations such as user interactions.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class EditableMesh {
  /**
   * @param {GeometryAccessor} geometryAccessor
   */
  constructor(geometryAccessor) {
    this._geometryAccessor = geometryAccessor;
    /** @type {GeometryAccessSession|null} */
    this._editSession = null;

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
    /**
     * @type {HalfEdge[]}
     */
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
   * Commit any mesh changes to the underlying render layer, without closing the edit session.
   * This method must be called in order for changes to be reflected on screen.
   *
   * If there is no active edit session, this method will create one automatically and destroy it after.
   */
  commit() {}

  /**
   * Opens an edit session which persists until closed. This is most useful for asynchronous edit operations (e.g. user interactions)
   * where it is desirable to keep certain resources alive across multiple commits as performance optimization.
   *
   * If you just want to batch many changes synchronously, just call commit() after making all your changes.
   */
  openEditSession() {}

  /**
   * Closes an edit session opened by openEditSession(). If there are no open edit sessions, this method does nothing.
   */
  closeEditSession() {}

  /**
   * Move a mesh component by a given translation. For edges and faces, all connected vertices move by the translation.
   *
   * @param {MeshComponent} component
   * @param {Cartesian3} translation
   */
  translateMeshComponent(component, translation) {
    component.move(translation);
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
