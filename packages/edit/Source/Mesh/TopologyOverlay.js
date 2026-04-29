// @ts-check

import {
  ContextLimits,
  Matrix4,
  VertexAttributeSemantic,
  destroyObject,
} from "@cesium/engine";

/** @import Vertex from "./Vertex"; */
/** @import Edge from "./Edge"; */
/** @import Face from "./Face"; */
/** @import { GeometryAccessSession, Texture, Scene, FrameState } from "@cesium/engine"; */

/**
 * Compute a 2D texture size that can hold at least `elementCount` texels,
 * laid out row-major. Width is capped at the context's max texture size.
 *
 * @param {number} elementCount
 * @returns {{width: number, height: number}}
 * @private
 */
function chooseTextureSize(elementCount) {
  if (elementCount <= 0) {
    return { width: 1, height: 1 };
  }
  const maxWidth = ContextLimits.maximumTextureSize;
  const width = Math.min(elementCount, maxWidth);
  const height = Math.max(1, Math.ceil(elementCount / maxWidth));
  return { width, height };
}

/**
 * Build mirrored POSITION-buffer texels: one RGBA32F texel per slot in the
 * underlying POSITION buffer. Indexed by Vertex.bufferIndex (which is always
 * an index into this same buffer). Sized to session.vertexCount() so
 * unreferenced slots are also represented; this keeps bufferIndex a valid
 * texture coordinate without remapping. The 4th channel is unused padding.
 *
 * @param {GeometryAccessSession} session
 * @returns {{texels: Float32Array, width: number, height: number, vertexCount: number}}
 * @private
 */
function buildMirroredPositions(session) {
  const vertexCount = session.vertexCount();
  const { width, height } = chooseTextureSize(vertexCount);
  const texels = new Float32Array(width * height * 4);
  const positionAccessors = session.vertexAttributeAccessors({
    semantic: VertexAttributeSemantic.POSITION,
  });
  const scratch = [0, 0, 0];
  for (let i = 0; i < vertexCount; i++) {
    positionAccessors.get(i, scratch);
    texels[i * 4] = scratch[0];
    texels[i * 4 + 1] = scratch[1];
    texels[i * 4 + 2] = scratch[2];
    // texel.a left at 0
  }
  return { texels, width, height, vertexCount };
}

/**
 * Build per-instance endpoint buffer-indices for the edges overlay (RG32UI).
 *
 * @param {Edge[]} edges
 * @returns {{texels: Uint32Array, width: number, height: number, instanceCount: number}}
 * @private
 */
function buildEdgeEndpoints(edges) {
  const instanceCount = edges.length;
  const { width, height } = chooseTextureSize(instanceCount);
  const texels = new Uint32Array(width * height * 2);
  for (let i = 0; i < instanceCount; i++) {
    const halfEdge = edges[i].halfEdge;
    texels[i * 2] = halfEdge.vertex.bufferIndex;
    texels[i * 2 + 1] = halfEdge.next.vertex.bufferIndex;
  }
  return { texels, width, height, instanceCount };
}

/**
 * Build per-triangle index data for the triangles overlay: a single RGBA32UI
 * texture indexed by gl_InstanceID, where RGB are the three vertex
 * buffer-indices for the triangle and A is the index of the {@link Face}
 * the triangle belongs to (used for face-level picking).
 *
 * @param {Face[]} faces
 * @returns {{texels: Uint32Array, width: number, height: number, instanceCount: number}}
 * @private
 */
function buildTriangleIndices(faces) {
  const faceCount = faces.length;
  const perFaceVertices = new Array(faceCount);
  const perFaceTriangleIndices = new Array(faceCount);
  let instanceCount = 0;
  for (let i = 0; i < faceCount; i++) {
    const faceVertices = faces[i].vertices();
    const faceTriangles = faces[i].triangleIndices();
    perFaceVertices[i] = faceVertices;
    perFaceTriangleIndices[i] = faceTriangles;
    instanceCount += faceTriangles.length / 3;
  }

  const { width, height } = chooseTextureSize(instanceCount);
  const texels = new Uint32Array(width * height * 4);
  let cursor = 0;
  for (let i = 0; i < faceCount; i++) {
    const faceVertices = perFaceVertices[i];
    const faceTriangles = perFaceTriangleIndices[i];
    for (let t = 0; t < faceTriangles.length; t += 3) {
      const dst = cursor * 4;
      texels[dst] = faceVertices[faceTriangles[t]].bufferIndex;
      texels[dst + 1] = faceVertices[faceTriangles[t + 1]].bufferIndex;
      texels[dst + 2] = faceVertices[faceTriangles[t + 2]].bufferIndex;
      texels[dst + 3] = i;
      cursor++;
    }
  }
  return { texels, width, height, instanceCount };
}

/**
 * Overlay layer to help visualize an {@link EditableMesh}'s topology in edit
 * mode, plus enable picking of mesh components by participating in picking
 * passes.
 *
 * The overlay renders three instanced draws against a shared shadow copy of
 * the underlying mesh's POSITION buffer:
 * <ul>
 *   <li>Points pass: one instance per {@link Vertex}; the per-instance
 *       buffer-index is fetched from a R32UI texture and used to look up the
 *       position from a RGBA32F position texture.</li>
 *   <li>Lines pass: one instance per {@link Edge}; the two endpoint
 *       buffer-indices are fetched from a RG32UI texture.</li>
 *   <li>Triangles pass: one instance per triangle in each {@link Face}'s fan
 *       triangulation; one RGBA32UI texel per triangle stores the three
 *       vertex buffer-indices in RGB and the owning {@link Face}'s index in
 *       A (used for face picking).</li>
 * </ul>
 *
 * Why not create separate vertex buffers and index buffers for each overlay type?
 *
 * It comes down to memory and GPU update costs. To update vertex positions with individual overlay buffers,
 * we'd have to update 4 mirrored buffers each frame during drags. As it stands, we have to do 2 uploads since this overlay
 * mirrors the original POSITION buffer. Even this could be avoided with some clever tricks if WebGL2 supported either gl_PrimitiveID in
 * indexed draws, or TBOs in this instanced approach.
 *
 * GPU resources (textures, vertex arrays, shaders, draw commands) are created
 * lazily during {@link TopologyOverlay#update} since they require a
 * {@link FrameState#context}. The constructor only assembles the CPU-side
 * typed arrays that will be uploaded.
 *
 * @private
 * @experimental This feature is not final and is subject to change without
 *   Cesium's standard deprecation policy.
 */
class TopologyOverlay {
  /**
   * @param {object} options
   * @param {Vertex[]} options.vertices
   * @param {Edge[]} options.edges
   * @param {Face[]} options.faces
   * @param {GeometryAccessSession} options.session A read-scoped session over
   *   the underlying geometry. Used to bulk-read the POSITION buffer into the mirrored texture.
   * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] Optional model
   *   matrix applied at draw time.
   */
  constructor(options) {
    const {
      vertices,
      edges,
      faces,
      session,
      modelMatrix = Matrix4.IDENTITY,
    } = options;

    this._modelMatrix = Matrix4.clone(modelMatrix, new Matrix4());

    const mirroredPositions = buildMirroredPositions(session);
    this._positionTexels = mirroredPositions.texels;
    this._positionTextureWidth = mirroredPositions.width;
    this._positionTextureHeight = mirroredPositions.height;
    this._positionVertexCount = mirroredPositions.vertexCount;

    // Points overlay: no per-instance lookup texture needed - gl_InstanceID
    // directly indexes the position texture, since the points pass simply
    // renders one instance per slot in the underlying POSITION buffer.
    this._pointInstanceCount = mirroredPositions.vertexCount;

    const edgeEndpoints = buildEdgeEndpoints(edges);
    this._edgeEndpointTexels = edgeEndpoints.texels;
    this._edgeEndpointTextureWidth = edgeEndpoints.width;
    this._edgeEndpointTextureHeight = edgeEndpoints.height;
    this._edgeInstanceCount = edgeEndpoints.instanceCount;

    const triangleIndices = buildTriangleIndices(faces);
    this._triangleIndexTexels = triangleIndices.texels;
    this._triangleIndexTextureWidth = triangleIndices.width;
    this._triangleIndexTextureHeight = triangleIndices.height;
    this._triangleInstanceCount = triangleIndices.instanceCount;

    // GPU-side resources, lazily built in update(frameState). Kept on the
    // overlay so subsequent frames reuse them and so destroy() can release
    // them.
    /** @type {Texture | undefined} */
    this._positionTexture = undefined;
    /** @type {Texture | undefined} */
    this._edgeEndpointTexture = undefined;
    /** @type {Texture | undefined} */
    this._triangleIndexTexture = undefined;

    // Per-component pick IDs (Vertex, Edge, Face). Allocated lazily during
    // update() once we have a Context. Stored in arrays parallel to
    // _vertices/_edges/_faces so we can release them in destroy().
    this._vertices = vertices;
    this._edges = edges;
    this._faces = faces;
    /** @type {object[] | undefined} */
    this._vertexPickIds = undefined;
    /** @type {object[] | undefined} */
    this._edgePickIds = undefined;
    /** @type {object[] | undefined} */
    this._facePickIds = undefined;

    this.show = true;
  }

  get modelMatrix() {
    return this._modelMatrix;
  }

  set modelMatrix(matrix) {
    Matrix4.clone(matrix, this._modelMatrix);
  }

  /**
   * Per-frame update hook. Lazily allocates GPU resources and pushes draw
   * commands for the points / edges / triangles overlays. Currently a stub:
   * the constructor has built all CPU-side data but the GPU side and shader
   * pipeline are not yet wired up.
   *
   * @param {FrameState} frameState
   */
  update(frameState) {
    // TODO: build textures, vertex arrays, shaders, and DrawCommands; push
    // commands into frameState.commandList; re-upload position-texture dirty
    // ranges in response to commit().
  }

  /**
   * Adds the overlay to the scene's primitive collection so it participates
   * in render and pick passes.
   *
   * @param {Scene} scene
   */
  addToScene(scene) {
    scene.primitives.add(this);
  }

  /**
   * Removes the overlay from the scene's primitive collection without
   * destroying it.
   *
   * @param {Scene} scene
   */
  removeFromScene(scene) {
    scene.primitives.remove(this);
  }

  isDestroyed() {
    return false;
  }

  /**
   * Releases any GPU resources held by the overlay.
   */
  destroy() {
    if (this._positionTexture !== undefined) {
      this._positionTexture.destroy();
    }
    if (this._edgeEndpointTexture !== undefined) {
      this._edgeEndpointTexture.destroy();
    }
    if (this._triangleIndexTexture !== undefined) {
      this._triangleIndexTexture.destroy();
    }
    return destroyObject(this);
  }
}

export default TopologyOverlay;
