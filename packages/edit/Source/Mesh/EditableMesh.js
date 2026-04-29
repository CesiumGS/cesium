import {
  Cartesian3,
  defined,
  DeveloperError,
  VertexAttributeSemantic,
} from "@cesium/engine";
import Edge from "./Edge";
import Face from "./Face";
import HalfEdge from "./HalfEdge";
import Vertex from "./Vertex";
import TopologyOverlay from "./TopologyOverlay";
import Selection from "./Selection";

/** @import MeshComponent from "./MeshComponent"; */
/** @import { Editable, GeometryAccessor, GeometryAccessSession, GeometryAttributeDescriptor, Matrix4, Scene } from "@cesium/engine"; */

/**
 * Scratch array for packing and unpacking attribute values. Reused across calls to avoid unnecessary allocations.
 * @type {number[]}
 */
const scratchComponents = [];

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
    /**
     * @type {Selection}
     */
    this._selection = new Selection();
    /**
     * @type {TopologyOverlay}
     */
    this._topologyOverlay = undefined;
    /**
     * @type {Matrix4}
     */
    this._modelMatrix = editable.modelMatrix;

    this.#buildMesh();
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

  get selection() {
    return this._selection;
  }

  get topologyOverlay() {
    return this._topologyOverlay;
  }

  get modelMatrix() {
    return this._modelMatrix;
  }

  set modelMatrix(matrix) {
    this._modelMatrix = matrix;
    if (defined(this._topologyOverlay)) {
      this._topologyOverlay._points.modelMatrix = matrix;
      this._topologyOverlay._polylines.modelMatrix = matrix;
      this._topologyOverlay._polygons.modelMatrix = matrix;
    }
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
   * Adds a topology overlay to visualize the mesh's vertices, edges, and faces. If a topology overlay already exists, the existing one will be returned.
   * @param {Scene} scene
   * @returns {TopologyOverlay}
   */
  addTopologyOverlay(scene) {
    if (defined(this._topologyOverlay)) {
      return this._topologyOverlay;
    }

    this._topologyOverlay = new TopologyOverlay(
      this._vertices,
      this._edges,
      this._faces,
      this._modelMatrix,
    );

    this._topologyOverlay.addToScene(scene);
    return this._topologyOverlay;
  }

  /**
   * Get vertex positions for a set of vertices.
   * To translate vertices, call {@link EditableMesh#translateSelected}
   * @param {Iterable<Vertex>} vertices
   * @param {Cartesian3[]} results
   * @returns {Cartesian3[]} Array of vertex positions for the input vertices, in iteration order.
   */
  getVertexPositions(vertices, results) {
    return this.getVertexValues(
      vertices,
      { semantic: VertexAttributeSemantic.POSITION },
      results,
      (src, dst) => Cartesian3.unpack(src, 0, dst),
    );
  }

  /**
   * Get values for a set of vertices for a given attribute. Some wrappers for
   * common attributes (like position) are provided for convenience.
   *
   * @template T
   * @param {Iterable<Vertex>} vertices
   * @param {GeometryAttributeDescriptor} descriptor
   * @param {T[]} results One result per vertex, in iteration order.
   * @param {function(number[], T): void} unpack Function to unpack the raw attribute array into the desired result type.
   *
   * @returns {T[]} `results`, populated.
   * @private
   */
  getVertexValues(vertices, descriptor, results, unpack) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(results)) {
      throw new DeveloperError("results array is required.");
    }
    //>>includeEnd('debug');

    const { get } = this._editSession.vertexAttributeAccessors(descriptor);
    let i = 0;
    for (const vertex of vertices) {
      get(vertex.bufferIndex, scratchComponents);
      unpack(scratchComponents, results[i]);
      i++;
    }
    return results;
  }

  /**
   * Set values for a set of vertices for a given attribute. Note that certain operations (like translating vertices)
   * should be performed via dedicated methods (to ensure certain side effects are handled properly).
   *
   * @template T
   * @param {Iterable<Vertex>} vertices
   * @param {GeometryAttributeDescriptor} descriptor
   * @param {Iterable<T>} values
   * @param {function(T, number[]): void} pack Function to pack the value into the raw attribute array.
   */
  setVertexValues(vertices, descriptor, values, pack) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(values)) {
      throw new DeveloperError("values iterable is required.");
    }
    //>>includeEnd('debug');

    const { set } = this._editSession.vertexAttributeAccessors(descriptor);
    const valueIter = values[Symbol.iterator]();
    for (const vertex of vertices) {
      pack(valueIter.next().value, scratchComponents);
      set(vertex.bufferIndex, scratchComponents);
    }
  }

  /**
   * Build the mesh topology from the raw geometry.
   */
  #buildMesh() {
    const session = this._editSession;
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

    const primitiveVertexCount = session.primitiveVertexCount();
    const scratchVertexIndices = new Array(primitiveVertexCount);
    const halfEdges = new Array(primitiveVertexCount);

    for (let i = 0; i < primitiveCount; i++) {
      const vertexIndices = session.getPrimitive(i, scratchVertexIndices);
      const face = new Face();

      for (let j = 0; j < vertexIndices.length; j++) {
        const startVertexIndex = vertexIndices[j];
        const endVertexIndex = vertexIndices[(j + 1) % vertexIndices.length];
        let startVertexEntry = vertexEntries[startVertexIndex];
        const endVertexEntry = vertexEntries[endVertexIndex];

        if (!defined(startVertexEntry)) {
          startVertexEntry = {
            vertex: new Vertex(startVertexIndex),
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
          halfEdge.edge = twinHalfEdge.edge;
        } else {
          const edge = new Edge(halfEdge);
          halfEdge.edge = edge;
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

    const boundaryHalfEdges = [];
    for (let i = 0; i < this._edges.length; i++) {
      const edge = this._edges[i];
      const halfEdge = edge.halfEdge;
      if (defined(halfEdge.twin)) {
        continue;
      }

      const boundaryHalfEdge = new HalfEdge(halfEdge.next.vertex, undefined);
      boundaryHalfEdge.twin = halfEdge;
      boundaryHalfEdge.edge = edge;
      halfEdge.twin = boundaryHalfEdge;
      boundaryHalfEdges.push(boundaryHalfEdge);
    }

    for (let i = 0; i < boundaryHalfEdges.length; i++) {
      const boundaryHalfEdge = boundaryHalfEdges[i];
      let previousHalfEdge = boundaryHalfEdge.twin.next.next;
      while (defined(previousHalfEdge.twin.face)) {
        previousHalfEdge = previousHalfEdge.twin.next.next;
      }
      boundaryHalfEdge.next = previousHalfEdge.twin;
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
