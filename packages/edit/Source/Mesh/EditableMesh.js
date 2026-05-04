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

/** @import { Editable, Scene } from "@cesium/engine"; */
/** @import EditMode from "../Editor/EditMode"; */
/** @import MeshComponent from "./MeshComponent"; */

const scratchPositionArray = [0, 0, 0];

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
   * @param {object} [options]
   * @param {boolean} [options.buildOverlay=true] If true, a {@link TopologyOverlay} is constructed alongside the mesh, reusing the same session used to build the half-edge topology. If a `scene` is also provided, the overlay is added to it.
   * @param {Scene} [options.scene] Scene to add the topology overlay to. Only used when `buildOverlay` is true.
   * Supplies the underlying {@link GeometryAccessor} and world-space model matrix.
   */
  constructor(editable, options = {}) {
    this._editable = editable;
    const geometryAccessor = editable.geometryAccessor;
    const {
      buildOverlay = true,
      scene,
    } = options;

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

    /**
     * Map from canonical attribute variable name (see VertexAttributeSemantic.getVariableName) to
     * the descriptor and set of dirty vertices for that attribute.
     *
     * Pre-populated in the constructor with one entry per attribute reported by the
     * GeometryAccessor's session class (see GeometryAccessor.getAvailableAttributes), so that
     * #markVerticesDirty - which is on the hot edit path - can skip any existence check.
     * commit() and #flushDirty clear the per-attribute vertex sets but leave the entries in place.
     *
     * Topology changes are not yet tracked - that will be added when topology-editing operations
     * (e.g. edge split, face extrude) are implemented.
     *
     * @type {Map<string, { descriptor: { semantic: VertexAttributeSemantic, setIndex?: number }, vertices: Set<Vertex> }>}
     */
    this._dirtyAttributes = new Map();
    const availableAttributes = geometryAccessor.getAvailableAttributes();
    for (let i = 0; i < availableAttributes.length; i++) {
      const descriptor = availableAttributes[i];
      this._dirtyAttributes.set(
        VertexAttributeSemantic.getVariableName(
          descriptor.semantic,
          descriptor.setIndex,
        ),
        { descriptor, vertices: new Set() },
      );
    }

    const buildMeshScopes = {
      read: {
        attributes: new Set([{ semantic: VertexAttributeSemantic.POSITION }]),
        topology: true,
      },
    };

    geometryAccessor.withSession(buildMeshScopes, (session) => {
      this.#buildMesh(session);
      if (buildOverlay) {
        this.#buildTopologyOverlay(session, scene);
      }
    });
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
      this._topologyOverlay.modelMatrix = matrix;
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

    // The overlay needs a one-time bulk read of the underlying POSITION buffer
    // to populate its position-shadow texture.
    const overlayScopes = {
      read: {
        attributes: new Set([{ semantic: VertexAttributeSemantic.POSITION }]),
        topology: true,
      },
    };

    this._geometryAccessor.withSession(overlayScopes, (session) => {
      this.#buildTopologyOverlay(session, scene);
    });

    return this._topologyOverlay;
  }

  /**
   * Set the edit mode of the mesh. This affects which components of the overlay are renderable and pickable.
   * @param {EditMode} mode The edit mode.
   */
  setEditMode(mode) {
    this.topologyOverlay.setComponentMasks(
      mode.renderableComponents,
      mode.pickableComponents,
    );
  }

  /**
   * Constructs the topology overlay using the provided session, which must
   * have read access to POSITION and topology. Caller is responsible for
   * adding the overlay to a scene.
   *
   * @param {GeometryAccessSession} session
   * @param {Scene} scene Scene to add the overlay to.
   */
  #buildTopologyOverlay(session, scene) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(scene)) {
      throw new DeveloperError("Scene is required to add topology overlay.");
    }
    //>>includeEnd('debug');

    this._topologyOverlay = new TopologyOverlay({
      vertices: this._vertices,
      edges: this._edges,
      faces: this._faces,
      session,
      modelMatrix: this._modelMatrix,
    });

    this.topologyOverlay.addToScene(scene);
  }

  /**
   * Commit any mesh changes to the underlying render layer, without closing the edit session.
   * This method must be called in order for changes to be reflected on screen.
   *
   * If there is no active edit session, this method will create one automatically and destroy it after.
   */
  commit() {
    if (defined(this._editSession)) {
      this.#flushDirty(this._editSession);
      this._editSession.commit();
      return;
    }

    const commitScopes = {
      write: {
        attributes: new Set(
          [...this._dirtyAttributes.values()].map((entry) => entry.descriptor),
        ),
      },
    };

    this._geometryAccessor.withSession(commitScopes, (session) => {
      this.#flushDirty(session);
      session.commit();
    });
  }

  /**
   * Opens an edit session which persists until closed. This is most useful for asynchronous edit operations (e.g. user interactions)
   * where it is desirable to keep certain resources alive across multiple commits as performance optimization.
   * If an edit session is already open, it will be closed without committing and a new one will be opened.
   *
   * The session is opened with the broadest possible scopes - all attributes reported by the underlying
   * GeometryAccessor are requested for both read and write, and topology read/write is requested as well.
   *
   * If you just want to batch many changes synchronously, just call commit() after making all your changes.
   */
  openEditSession() {
    if (defined(this._editSession)) {
      this.closeEditSession();
    }

    const allAttributes = new Set(
      [...this._dirtyAttributes.values()].map((entry) => entry.descriptor),
    );
    const editSessionScopes = {
      read: {
        attributes: allAttributes,
        topology: true,
      },
      write: {
        attributes: allAttributes,
        topology: true,
      },
    };

    this._editSession = this._geometryAccessor.openSession(editSessionScopes);
  }

  /**
   * Closes an edit session opened by openEditSession(). If there are no open edit sessions, this method does nothing.
   *
   * Note: any uncommitted changes will be lost when the session is destroyed, so be sure to call commit() before this if you want to keep them.
   * @param {boolean} [commitChanges=true] If true, commit changes before closing the session. If false, discard changes and just destroy the session.
   */
  closeEditSession(commitChanges = true) {
    if (!defined(this._editSession)) {
      return;
    }

    if (commitChanges) {
      this._editSession.commit();
    }

    this._editSession.destroy();
    this._editSession = undefined;
  }

  /**
   * Translate the currently selected components by some amount.
   * @param {Cartesian3} translation
   */
  translateSelected(translation) {
    for (const vertex of this._selection.vertexClosure()) {
      vertex.move(translation);
    }

    this.#markVerticesDirty(this._selection.vertexClosure(), {
      semantic: VertexAttributeSemantic.POSITION,
    });
  }

  /**
   * Mark the given vertices as dirty for the given attribute, so that the next commit() will write them
   * to the underlying geometry. The dirty entry for the attribute is expected to have been pre-populated
   * in the constructor from the GeometryAccessor's available attributes; passing a descriptor for an
   * unsupported attribute will throw.
   *
   * @param {Iterable<Vertex>} vertices
   * @param {{ semantic: VertexAttributeSemantic, setIndex?: number }} descriptor
   */
  /* eslint-disable-next-line no-unused-private-class-members */
  #markVerticesDirty(vertices, descriptor) {
    const key = VertexAttributeSemantic.getVariableName(
      descriptor.semantic,
      descriptor.setIndex,
    );

    const entry = this._dirtyAttributes.get(key);

    for (const vertex of vertices) {
      entry.vertices.add(vertex);
    }
  }

  /**
   * Write all currently-dirty vertex attributes to the underlying geometry via the given session,
   * then clear the dirty state. The caller is responsible for committing the session.
   *
   * Note: today every editable attribute is fed by Vertex.position. When more attribute types become
   * editable, Vertex (or a parallel store) will need to expose the value for each dirty attribute.
   *
   * @param {GeometryAccessSession} session
   */
  #flushDirty(session) {
    // First explicitly update vertex positions in the topology overlay
    const positionKey = VertexAttributeSemantic.getVariableName(
      VertexAttributeSemantic.POSITION,
    );
    const dirtyPositions = this._dirtyAttributes.get(positionKey);
    if (defined(this._topologyOverlay) && defined(dirtyPositions)) {
      for (const vertex of dirtyPositions.vertices) {
        this._topologyOverlay.updateVertexPosition(vertex);
      }
    }

    for (const entry of this._dirtyAttributes.values()) {
      const accessors = session.vertexAttributeAccessors(entry.descriptor);
      for (const vertex of entry.vertices) {
        Cartesian3.pack(vertex.position, scratchPositionArray, 0);
        accessors.set(vertex.bufferIndex, scratchPositionArray);
      }
      entry.vertices.clear();
    }
  }

  /**
   * Build the mesh topology (half-edge structure) from the underlying render data (typically vertex + index buffers).
   *
   * Note: When a vertex shared by two or more faces requires different vertex attribute values for each face (e.g. different normals or UVs),
   * it will be duplicated in the vertex buffer for each face, each with different index buffer values. This creates an ambiguity - are two vertices
   * with the same position but different indices the same logical vertex, duplicated for attribute splitting, or actual distinct vertices that happen to be colocated?
   * Currently, we treat them as the latter - distinct vertices. This means there could be unintended seams in the final mesh. In the future, we could consider an option to merge
   * by position (within tolerance, and potentially consider attribute values) as a user preference. This could also be done as a post-processing step by the user.
   * @param {GeometryAccessSession} session
   *
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
    const scratchVertexPosition = new Array(3);

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
            vertex: new Vertex(
              positionAccessors.get(startVertexIndex, scratchVertexPosition),
              startVertexIndex,
            ),
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
