import {
  Cartesian3,
  defined,
  destroyObject,
  DeveloperError,
  VertexAttributeSemantic,
} from "@cesium/engine";
import Edge from "./Edge";
import Face from "./Face";
import HalfEdge from "./HalfEdge";
import Vertex from "./Vertex";
import TopologyOverlay from "./TopologyOverlay";
import Selection from "./Selection";

/** @import EditMode from "../Editor/EditMode"; */
/** @import MeshComponent from "./MeshComponent"; */
/** @import { Editable, GeometryAccessSession, GeometryAttributeDescriptor, Matrix4, Scene } from "@cesium/engine"; */

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
   * @param {object} [options]
   * @param {boolean} [options.buildOverlay=true] If true, a {@link TopologyOverlay} is constructed alongside the mesh, reusing the same session used to build the half-edge topology. If a `scene` is also provided, the overlay is added to it.
   * @param {Scene} [options.scene] Scene to add the topology overlay to. Only used when `buildOverlay` is true.
   * Supplies the underlying {@link GeometryAccessor} and world-space model matrix.
   */
  constructor(editable, options = {}) {
    const { buildOverlay = true } = options;

    this._editable = editable;
    this._geometryAccessor = editable.geometryAccessor;

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

    this._removeModelMatrixListener =
      editable.modelMatrixChanged.addEventListener((newModelMatrix) => {
        this._modelMatrix = newModelMatrix;
      });

    this.#buildMesh();

    if (buildOverlay) {
      this.#buildTopologyOverlay(options.scene, {
        vertices: this._vertices,
        edges: this._edges,
        faces: this._faces,
      });
    }
  }

  /**
   * The vertices of the mesh.
   * @type {Vertex[]}
   * @readonly
   */
  get vertices() {
    return this._vertices;
  }

  /**
   * The edges of the mesh.
   * @type {Edge[]}
   * @readonly
   */
  get edges() {
    return this._edges;
  }

  /**
   * The faces of the mesh.
   * @type {Face[]}
   * @readonly
   */
  get faces() {
    return this._faces;
  }

  /**
   * The current selection of mesh components.
   * @type {Selection}
   * @readonly
   */
  get selection() {
    return this._selection;
  }

  /**
   * The topology overlay used to visualize the mesh's components.
   * @type {TopologyOverlay}
   * @readonly
   */
  get topologyOverlay() {
    return this._topologyOverlay;
  }

  /**
   * The world-space model matrix of the mesh (from its underlying Editable).
   * @type {Matrix4}
   * @readonly
   */
  get modelMatrix() {
    return this._modelMatrix;
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
   * Adds a topology overlay to visualize the mesh's components. Callers
   * may specify subsets of components to visualize via the components object.
   *
   * @param {Scene} scene
   * @param {object} [components]
   * @param {Vertex[]} [components.vertices] Defaults to all of the mesh's vertices.
   * @param {Edge[]}   [components.edges] Defaults to all of the mesh's edges.
   * @param {Face[]}   [components.faces] Defaults to all of the mesh's faces.
   * @returns {TopologyOverlay}
   */
  addTopologyOverlay(scene, components = {}) {
    if (defined(this._topologyOverlay)) {
      console.warn("Topology overlay already exists for this mesh.");
      return this._topologyOverlay;
    }

    const {
      vertices = this._vertices,
      edges = this._edges,
      faces = this._faces,
    } = components;

    this.#buildTopologyOverlay(scene, { vertices, edges, faces });

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
   * Set the edit mode of the mesh. This affects which components of the overlay are renderable and pickable.
   * @param {EditMode} mode The edit mode.
   */
  setEditMode(mode) {
    this.topologyOverlay.setComponentMasks(
      mode.renderableComponents,
      mode.selectionLevel,
    );
    this._selection.setSelectionLevel(mode.selectionLevel);
  }

  /**
   * Get values for a set of vertices for a given attribute. Some wrappers for
   * common attributes (like position) are provided for convenience.
   *
   * @template T
   * @param {Iterable<Vertex>} vertices
   * @param {GeometryAttributeDescriptor} descriptor
   * @param {T[]} results Populated with one result per vertex in iteration order. Existing entries are reused as the destination for `unpack`; missing entries are appended. The array is truncated to the number of vertices iterated.
   * @param {function(number[], (T|undefined)): T} unpack Function to unpack the raw attribute array into the desired result type. Must return the unpacked value.
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
      results[i] = unpack(scratchComponents, results[i]);
      i++;
    }

    results.length = i;
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

    this._editSession.commit();
  }

  /**
   * Translate the currently selected components by some amount.
   * @param {Cartesian3} translation
   */
  translateSelected(translation) {
    const { get, set } = this._editSession.vertexAttributeAccessors({
      semantic: VertexAttributeSemantic.POSITION,
    });
    /** @type {function(number, number[]): void} */
    const updateTopologyOverlay = defined(this._topologyOverlay)
      ? (bufferIndex, position) =>
          this._topologyOverlay.updateVertexPosition(bufferIndex, position)
      : () => {};

    for (const vertex of this._selection.vertices) {
      get(vertex.bufferIndex, scratchComponents);
      scratchComponents[0] += translation.x;
      scratchComponents[1] += translation.y;
      scratchComponents[2] += translation.z;
      set(vertex.bufferIndex, scratchComponents);
      updateTopologyOverlay(vertex.bufferIndex, scratchComponents);
    }

    this._editSession.commit();
  }

  /**
   * Constructs the topology overlay using the provided session, which must
   * have read access to POSITION and topology. Caller is responsible for
   * adding the overlay to a scene.
   *
   * @param {Scene} scene Scene to add the overlay to.
   * @param {{ vertices: Vertex[], edges: Edge[], faces: Face[] }} components
   */
  #buildTopologyOverlay(scene, components) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(scene)) {
      throw new DeveloperError("Scene is required to add topology overlay.");
    }
    //>>includeEnd('debug');

    this._topologyOverlay = new TopologyOverlay({
      vertices: components.vertices,
      edges: components.edges,
      faces: components.faces,
      session: this._editSession,
      selection: this._selection,
      modelMatrix: this._editable.modelMatrix,
      modelMatrixChanged: this._editable.modelMatrixChanged,
    });

    this.topologyOverlay.addToScene(scene);
  }

  /**
   * Build the mesh topology from the raw geometry.
   */
  #buildMesh() {
    const session = this._editSession;

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

  /**
   * Destroy the mesh and release all resources. After calling this method, the mesh should not be used.
   */
  destroy() {
    this._vertices.length = 0;
    this._edges.length = 0;
    this._faces.length = 0;
    this._selection.clear();
    if (defined(this._topologyOverlay)) {
      this._topologyOverlay.removeFromScene();
      this._topologyOverlay = undefined;
    }

    this._editSession.destroy();

    if (defined(this._removeModelMatrixListener)) {
      this._removeModelMatrixListener();
      this._removeModelMatrixListener = undefined;
    }

    destroyObject(this);
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
