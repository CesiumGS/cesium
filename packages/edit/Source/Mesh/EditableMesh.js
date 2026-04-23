import {
  defined,
  DeveloperError,
  VertexAttributeSemantic,
} from "@cesium/engine";
import Edge from "./Edge";
import Face from "./Face";
import HalfEdge from "./HalfEdge";
import Vertex from "./Vertex";

/** @import { Editable } from "@cesium/engine"; */
/** @import MeshComponent from "./MeshComponent"; */

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
   * @param {Editable} editable An object implementing the {@link Editable} interface.
   * Supplies the underlying {@link GeometryAccessor} and world-space model matrix.
   */
  constructor(editable) {
    this._editable = editable;

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

    const buildMeshScopes = {
      read: {
        attributes: new Set([{ semantic: VertexAttributeSemantic.POSITION }]),
        topology: true,
      },
    };

    this._editable.geometryAccessor.withSession(buildMeshScopes, (session) =>
      this.#buildMesh(session),
    );
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
   * Build the mesh topology from the geometry accessor.
   * @param {GeometryAccessor} geometryAccessor
   */
  #buildMesh(session) {
    const isGeometryTriangleBased = session.primitiveVertexCount() === 3;
    if (!isGeometryTriangleBased) {
      // TODO: need to communicate this to the consumer somehow (e.g. a status, event, or otherwise).
      console.warn(
        "Only triangle-based geometries are currently supported by EditableMesh. The returned EditableMesh will be empty and further operations will not have any effect.",
      );
      return;
    }

    const primitiveCount = session.primitiveCount();
    const vertexEntries = new Array(session.vertexCount());
    const positionAccessors = session.vertexAttributeAccessors({
      semantic: VertexAttributeSemantic.POSITION,
    });
    const scratchVertexIndices = new Array(3);

    for (let i = 0; i < primitiveCount; i++) {
      const vertexIndices = session.getPrimitive(i, scratchVertexIndices);
      const face = new Face();
      const halfEdges = new Array(vertexIndices.length);

      for (let j = 0; j < vertexIndices.length; j++) {
        const startVertexIndex = vertexIndices[j];
        const endVertexIndex = vertexIndices[(j + 1) % vertexIndices.length];
        let startVertexEntry = vertexEntries[startVertexIndex];
        const endVertexEntry = vertexEntries[endVertexIndex];

        if (!defined(startVertexEntry)) {
          startVertexEntry = {
            vertex: new Vertex(positionAccessors.get(startVertexIndex)),
            outgoingHalfEdges: new Map(),
          };
          vertexEntries[startVertexIndex] = startVertexEntry;
          this._vertices.push(startVertexEntry.vertex);
        }

        const vertex = startVertexEntry.vertex;
        const halfEdge = new HalfEdge(vertex, face);

        const twinHalfEdge =
          endVertexEntry?.outgoingHalfEdges.get(startVertexIndex);
        if (defined(twinHalfEdge)) {
          halfEdge.twin = twinHalfEdge;
          twinHalfEdge.twin = halfEdge;
        } else {
          const edge = new Edge(halfEdge);
          this._edges.push(edge);
        }

        startVertexEntry.outgoingHalfEdges.set(endVertexIndex, halfEdge);
        vertex.halfEdge = halfEdge; // This will be overwritten if a vertex has multiple outgoing half-edges. That's fine as long as it's deterministic.

        halfEdges[j] = halfEdge;
      }

      // Connect together the half edges into a loop and link them to the face.
      for (let j = 0; j < halfEdges.length; j++) {
        halfEdges[j].next = halfEdges[(j + 1) % halfEdges.length];
      }

      face.halfEdge = halfEdges[0];
      this._faces.push(face);
    }
  }
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
