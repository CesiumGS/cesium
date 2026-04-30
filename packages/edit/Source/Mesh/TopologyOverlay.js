import {
  BlendingState,
  Buffer,
  BufferUsage,
  Cartesian2,
  Color,
  ComponentDatatype,
  ContextLimits,
  DrawCommand,
  Matrix4,
  Pass,
  PixelDatatype,
  PixelFormat,
  PrimitiveType,
  RenderState,
  Sampler,
  ShaderProgram,
  ShaderSource,
  Texture,
  TextureMagnificationFilter,
  TextureMinificationFilter,
  VertexArray,
  VertexAttributeSemantic,
  destroyObject,
  _shadersPolylineCommon as PolylineCommon,
} from "@cesium/engine";

import TopologyOverlayPointVS from "../Shaders/TopologyOverlayPointVS.js";
import TopologyOverlayPointFS from "../Shaders/TopologyOverlayPointFS.js";
import TopologyOverlayEdgeVS from "../Shaders/TopologyOverlayEdgeVS.js";
import TopologyOverlayEdgeFS from "../Shaders/TopologyOverlayEdgeFS.js";
import TopologyOverlayFaceVS from "../Shaders/TopologyOverlayFaceVS.js";
import TopologyOverlayFaceFS from "../Shaders/TopologyOverlayFaceFS.js";

/** @import Vertex from "./Vertex"; */
/** @import Edge from "./Edge"; */
/** @import Face from "./Face"; */
/** @import MeshComponent from "./MeshComponent"; */
/** @import { GeometryAccessSession, Scene, FrameState, Context, PickId } from "@cesium/engine"; */

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
 * Why not create separate vertex buffers and index buffers for each overlay type? Two reasons:
 *
 * 1. Whenever a mesh component's position changes, we would have to compute which derived components are affected.
 * 2. Memory and GPU update costs. To update vertex positions with individual overlay buffers,
 *    we'd have to update 4 mirrored buffers each frame during drags. As it stands, we have to do 2 uploads since this overlay
 *    mirrors the original POSITION buffer. Even this could be avoided with some clever tricks if WebGL2 supported either gl_PrimitiveID in
 *    indexed draws, or TBOs in this instanced approach.
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
    /** @type {Texture | undefined} */
    this._pointPickColorTexture = undefined;
    /** @type {Texture | undefined} */
    this._edgePickColorTexture = undefined;
    /** @type {Texture | undefined} */
    this._facePickColorTexture = undefined;

    /** @type {VertexArray | undefined} */
    this._pointVertexArray = undefined;
    /** @type {VertexArray | undefined} */
    this._edgeVertexArray = undefined;
    /** @type {VertexArray | undefined} */
    this._faceVertexArray = undefined;

    /** @type {ShaderProgram | undefined} */
    this._pointShaderProgram = undefined;
    /** @type {ShaderProgram | undefined} */
    this._edgeShaderProgram = undefined;
    /** @type {ShaderProgram | undefined} */
    this._faceShaderProgram = undefined;

    /** @type {RenderState | undefined} */
    this._renderState = undefined;

    /** @type {DrawCommand | undefined} */
    this._pointDrawCommand = undefined;
    /** @type {DrawCommand | undefined} */
    this._edgeDrawCommand = undefined;
    /** @type {DrawCommand | undefined} */
    this._faceDrawCommand = undefined;

    /**
     * Width in pixels of the screen-space quad used to draw each edge
     * instance. Like {@link BufferPolylineCollection}, edges are drawn as
     * pairs of triangles rather than GL_LINES so they can have a configurable
     * pixel width.
     * @type {number}
     */
    this.edgeWidth = 2.0;

    /**
     * Stroke color for the screen-space quads used to draw each edge
     * instance.
     * @type {Color}
     */
    this.edgeColor = Color.WHITE.clone();

    /**
     * Fill color for the triangles drawn for each {@link Face}. Defaults to a
     * mostly-transparent tint so the underlying mesh stays visible.
     * @type {Color}
     */
    this.faceColor = new Color(1.0, 1.0, 1.0, 0.15);

    /**
     * Size in pixels of the GL_POINTS sprites used to draw each vertex
     * instance.
     * @type {number}
     */
    this.pointSize = 6.0;

    /**
     * Fill color for the round point sprites used to draw each vertex
     * instance.
     * @type {Color}
     */
    this.pointColor = Color.WHITE.clone();

    // Per-component pick IDs (Vertex, Edge, Face). Allocated lazily during
    // update() once we have a Context. Stored in arrays parallel to
    // _vertices/_edges/_faces so we can release them in destroy().
    this._vertices = vertices;
    this._edges = edges;
    this._faces = faces;
    /** @type {PickId[] | undefined} */
    this._vertexPickIds = undefined;
    /** @type {PickId[] | undefined} */
    this._edgePickIds = undefined;
    /** @type {PickId[] | undefined} */
    this._facePickIds = undefined;

    // True when the position texture's CPU-side texels have been mutated and
    // need to be re-uploaded to the GPU. Currently re-uploads the entire
    // texture; a dirty-range optimization can be added later.
    this._positionsDirty = false;

    /**
     * If true, the per-face triangles are drawn during the regular render
     * pass. When false, faces are only rendered to the pick framebuffer so
     * face picking continues to work.
     * @type {boolean}
     */
    this.showFaces = false;

    this.show = true;
  }

  get modelMatrix() {
    return this._modelMatrix;
  }

  set modelMatrix(matrix) {
    Matrix4.clone(matrix, this._modelMatrix);
  }

  /**
   * Per-frame update hook. Lazily allocates GPU resources on first call and
   * pushes draw commands for the points / edges / triangles overlays.
   * Re-uploads the position texture when {@link #markPositionsDirty} has been
   * called since the last update.
   *
   * @param {FrameState} frameState
   */
  update(frameState) {
    if (!this.show) {
      return;
    }

    const passes = frameState.passes;
    if (!passes.render && !passes.pick) {
      return;
    }

    const context = frameState.context;

    if (this._positionTexture === undefined) {
      this.#initializeGpuResources(context);
    } else if (this._positionsDirty) {
      this._positionTexture.copyFrom({
        source: {
          width: this._positionTextureWidth,
          height: this._positionTextureHeight,
          arrayBufferView: this._positionTexels,
        },
      });
      this._positionsDirty = false;
    }

    Matrix4.clone(this._modelMatrix, this._pointDrawCommand.modelMatrix);
    Matrix4.clone(this._modelMatrix, this._edgeDrawCommand.modelMatrix);
    Matrix4.clone(this._modelMatrix, this._faceDrawCommand.modelMatrix);

    if (this._triangleInstanceCount > 0) {
      const includeFace = passes.pick || this.showFaces;
      if (includeFace) {
        frameState.commandList.push(this._faceDrawCommand);
      }
    }
    if (this._edgeInstanceCount > 0) {
      frameState.commandList.push(this._edgeDrawCommand);
    }
    if (this._pointInstanceCount > 0) {
      frameState.commandList.push(this._pointDrawCommand);
    }
  }

  /**
   * Mark the position texture as needing a re-upload on the next update. Call
   * after writing into the {@link #_positionTexels} typed array (e.g. from
   * the parent {@link EditableMesh}'s commit path).
   */
  markPositionsDirty() {
    this._positionsDirty = true;
  }

  /**
   * Build all GPU resources (textures, vertex arrays, shaders, render state,
   * pick ids, draw commands) on first frame.
   *
   * @param {Context} context
   */
  #initializeGpuResources(context) {
    const sampler = nearestSampler();

    // Position texture: RGBA32F mirror of the underlying POSITION buffer,
    // indexed by Vertex.bufferIndex.
    this._positionTexture = new Texture({
      context,
      width: this._positionTextureWidth,
      height: this._positionTextureHeight,
      pixelFormat: PixelFormat.RGBA,
      pixelDatatype: PixelDatatype.FLOAT,
      sampler,
      source: {
        width: this._positionTextureWidth,
        height: this._positionTextureHeight,
        arrayBufferView: this._positionTexels,
      },
    });

    // Edge endpoint texture: RG32UI of (vA, vB) buffer-indices, one per edge.
    this._edgeEndpointTexture = new Texture({
      context,
      width: this._edgeEndpointTextureWidth,
      height: this._edgeEndpointTextureHeight,
      pixelFormat: PixelFormat.RG_INTEGER,
      pixelDatatype: PixelDatatype.UNSIGNED_INT,
      sampler,
      source: {
        width: this._edgeEndpointTextureWidth,
        height: this._edgeEndpointTextureHeight,
        arrayBufferView: this._edgeEndpointTexels,
      },
    });

    // Triangle index texture: RGBA32UI of (vA, vB, vC, faceIdx).
    this._triangleIndexTexture = new Texture({
      context,
      width: this._triangleIndexTextureWidth,
      height: this._triangleIndexTextureHeight,
      pixelFormat: PixelFormat.RGBA_INTEGER,
      pixelDatatype: PixelDatatype.UNSIGNED_INT,
      sampler,
      source: {
        width: this._triangleIndexTextureWidth,
        height: this._triangleIndexTextureHeight,
        arrayBufferView: this._triangleIndexTexels,
      },
    });

    // Pick id allocations + RGBA8 pick-color textures.
    // PERFORMANCE_IDEA: rather than relying on the standard Cesium pick pass, where _everything_ gets rendered into the pick buffer,
    // we could implement a pick-pass just for this overlay. This has two main benefits:
    // 1. Fewer things to render when we only want to pick mesh components = faster render time.
    // 2. We no longer need these pick textures at all. The pick pass can render the component ID directly to the framebuffer rather than needing
    //    to translate through the global pick ID space first.
    const pointPick = allocatePickIdsForComponents(
      context,
      this._vertices,
      this._positionVertexCount,
      (v) => /** @type {Vertex} */ (v).bufferIndex,
    );
    this._vertexPickIds = pointPick.pickIds;
    this._pointPickColorTexture = new Texture({
      context,
      width: this._positionTextureWidth,
      height: this._positionTextureHeight,
      pixelFormat: PixelFormat.RGBA,
      pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      sampler,
      source: {
        width: this._positionTextureWidth,
        height: this._positionTextureHeight,
        arrayBufferView: pointPick.colors,
      },
    });

    // Edges: keyed by gl_InstanceID directly, slot count = edge count.
    const edgePick = allocatePickIdsForComponents(
      context,
      this._edges,
      this._edgeInstanceCount,
      (_e, i) => i,
    );
    this._edgePickIds = edgePick.pickIds;
    this._edgePickColorTexture = new Texture({
      context,
      width: this._edgeEndpointTextureWidth,
      height: this._edgeEndpointTextureHeight,
      pixelFormat: PixelFormat.RGBA,
      pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      sampler,
      source: {
        width: this._edgeEndpointTextureWidth,
        height: this._edgeEndpointTextureHeight,
        arrayBufferView: edgePick.colors,
      },
    });

    // Faces: keyed by face index (the .a channel of the triangle texture);
    // slot count = face count. The triangles VS reads faceIdx and uses it to
    // look up the face's pick color.
    const faceCount = this._faces.length;
    const facePickTexSize = chooseTextureSize(faceCount);
    const facePick = allocatePickIdsForComponents(
      context,
      this._faces,
      facePickTexSize.width * facePickTexSize.height,
      (_f, i) => i,
    );
    this._facePickIds = facePick.pickIds;
    this._facePickColorTexture = new Texture({
      context,
      width: facePickTexSize.width,
      height: facePickTexSize.height,
      pixelFormat: PixelFormat.RGBA,
      pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      sampler,
      source: {
        width: facePickTexSize.width,
        height: facePickTexSize.height,
        arrayBufferView: facePick.colors,
      },
    });

    // Render state: depth test on, alpha blending on so overlay shaders can
    // anti-alias their edges by writing fractional alpha.
    this._renderState = RenderState.fromCache({
      blending: BlendingState.ALPHA_BLEND,
      depthTest: { enabled: true },
      depthMask: true,
    });

    // Dummy per-vertex VAOs - one per overlay because vertices-per-instance
    // differs. Edges are drawn as a screen-space quad (4 verts via
    // TRIANGLE_STRIP) per BufferPolylineCollection's pattern, so they can
    // have a configurable pixel width.
    this._pointVertexArray = createInstancedVertexArray(context, 1);
    this._edgeVertexArray = createInstancedVertexArray(context, 4);
    this._faceVertexArray = createInstancedVertexArray(context, 3);

    const attributeLocations = { a_localVertexId: 0 };

    // Shader programs. Pick versions are derived automatically by Cesium's
    // pick pipeline using the `pickId: "v_pickColor"` snippet on the
    // DrawCommand.
    this._pointShaderProgram = ShaderProgram.fromCache({
      context,
      vertexShaderSource: new ShaderSource({
        sources: [TopologyOverlayPointVS],
      }),
      fragmentShaderSource: new ShaderSource({
        sources: [TopologyOverlayPointFS],
      }),
      attributeLocations,
    });
    this._edgeShaderProgram = ShaderProgram.fromCache({
      context,
      vertexShaderSource: new ShaderSource({
        sources: [PolylineCommon, TopologyOverlayEdgeVS],
      }),
      fragmentShaderSource: new ShaderSource({
        sources: [TopologyOverlayEdgeFS],
      }),
      attributeLocations,
    });
    this._faceShaderProgram = ShaderProgram.fromCache({
      context,
      vertexShaderSource: new ShaderSource({
        sources: [TopologyOverlayFaceVS],
      }),
      fragmentShaderSource: new ShaderSource({
        sources: [TopologyOverlayFaceFS],
      }),
      attributeLocations,
    });

    const overlay = this;
    const pointUniformMap = {
      u_positionTexture: () => overlay._positionTexture,
      u_pickColorTexture: () => overlay._pointPickColorTexture,
      u_textureSize: () =>
        new Cartesian2(
          overlay._positionTextureWidth,
          overlay._positionTextureHeight,
        ),
      u_pointSize: () => overlay.pointSize,
      u_pointColor: () => overlay.pointColor,
    };
    const edgeUniformMap = {
      u_positionTexture: () => overlay._positionTexture,
      u_positionTextureSize: () =>
        new Cartesian2(
          overlay._positionTextureWidth,
          overlay._positionTextureHeight,
        ),
      u_edgeEndpointTexture: () => overlay._edgeEndpointTexture,
      u_edgeEndpointTextureSize: () =>
        new Cartesian2(
          overlay._edgeEndpointTextureWidth,
          overlay._edgeEndpointTextureHeight,
        ),
      u_pickColorTexture: () => overlay._edgePickColorTexture,
      u_edgeWidth: () => overlay.edgeWidth,
      u_edgeColor: () => overlay.edgeColor,
    };
    const faceUniformMap = {
      u_positionTexture: () => overlay._positionTexture,
      u_positionTextureSize: () =>
        new Cartesian2(
          overlay._positionTextureWidth,
          overlay._positionTextureHeight,
        ),
      u_triangleIndexTexture: () => overlay._triangleIndexTexture,
      u_triangleIndexTextureSize: () =>
        new Cartesian2(
          overlay._triangleIndexTextureWidth,
          overlay._triangleIndexTextureHeight,
        ),
      u_pickColorTexture: () => overlay._facePickColorTexture,
      u_pickColorTextureSize: () =>
        new Cartesian2(facePickTexSize.width, facePickTexSize.height),
      u_faceColor: () => overlay.faceColor,
    };

    this._pointDrawCommand = new DrawCommand({
      vertexArray: this._pointVertexArray,
      shaderProgram: this._pointShaderProgram,
      renderState: this._renderState,
      uniformMap: pointUniformMap,
      primitiveType: PrimitiveType.POINTS,
      count: 1,
      instanceCount: this._pointInstanceCount,
      pass: Pass.OPAQUE,
      pickId: "v_pickColor",
      modelMatrix: Matrix4.clone(this._modelMatrix, new Matrix4()),
      owner: this,
    });

    this._edgeDrawCommand = new DrawCommand({
      vertexArray: this._edgeVertexArray,
      shaderProgram: this._edgeShaderProgram,
      renderState: this._renderState,
      uniformMap: edgeUniformMap,
      primitiveType: PrimitiveType.TRIANGLE_STRIP,
      count: 4,
      instanceCount: this._edgeInstanceCount,
      pass: Pass.OPAQUE,
      pickId: "v_pickColor",
      modelMatrix: Matrix4.clone(this._modelMatrix, new Matrix4()),
      owner: this,
    });

    this._faceDrawCommand = new DrawCommand({
      vertexArray: this._faceVertexArray,
      shaderProgram: this._faceShaderProgram,
      renderState: this._renderState,
      uniformMap: faceUniformMap,
      primitiveType: PrimitiveType.TRIANGLES,
      count: 3,
      instanceCount: this._triangleInstanceCount,
      pass: Pass.OPAQUE,
      pickId: "v_pickColor",
      modelMatrix: Matrix4.clone(this._modelMatrix, new Matrix4()),
      owner: this,
    });
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
    if (this._pointPickColorTexture !== undefined) {
      this._pointPickColorTexture.destroy();
    }
    if (this._edgePickColorTexture !== undefined) {
      this._edgePickColorTexture.destroy();
    }
    if (this._facePickColorTexture !== undefined) {
      this._facePickColorTexture.destroy();
    }
    if (this._pointVertexArray !== undefined) {
      this._pointVertexArray.destroy();
    }
    if (this._edgeVertexArray !== undefined) {
      this._edgeVertexArray.destroy();
    }
    if (this._faceVertexArray !== undefined) {
      this._faceVertexArray.destroy();
    }
    if (this._pointShaderProgram !== undefined) {
      this._pointShaderProgram.destroy();
    }
    if (this._edgeShaderProgram !== undefined) {
      this._edgeShaderProgram.destroy();
    }
    if (this._faceShaderProgram !== undefined) {
      this._faceShaderProgram.destroy();
    }
    if (this._renderState !== undefined) {
      RenderState.removeFromCache(this._renderState);
    }
    if (this._vertexPickIds !== undefined) {
      for (const pickId of this._vertexPickIds) {
        pickId.destroy();
      }
    }
    if (this._edgePickIds !== undefined) {
      for (const pickId of this._edgePickIds) {
        pickId.destroy();
      }
    }
    if (this._facePickIds !== undefined) {
      for (const pickId of this._facePickIds) {
        pickId.destroy();
      }
    }
    return destroyObject(this);
  }
}

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
 * Build a {@link Sampler} suitable for the overlay's lookup textures: NEAREST
 * filtering, no mipmaps. Wrap mode irrelevant since the shader uses
 * texelFetch.
 *
 * @returns {Sampler}
 * @private
 */
function nearestSampler() {
  return new Sampler({
    minificationFilter: TextureMinificationFilter.NEAREST,
    magnificationFilter: TextureMagnificationFilter.NEAREST,
  });
}

/**
 * Allocate one pick id per component, taking its color and packing it into a
 * RGBA8 typed array sized for a texture lookup. The `indexOf` callback maps
 * a component to its slot in the output array.
 *
 * @param {Context} context
 * @param {MeshComponent[]} components
 * @param {number} slotCount The number of texels in the output array.
 * @param {(component: MeshComponent, i: number) => number} indexOf
 * @returns {{ pickIds: PickId[], colors: Uint8Array }}
 * @private
 */
function allocatePickIdsForComponents(context, components, slotCount, indexOf) {
  const pickIds = new Array(components.length);
  const colors = new Uint8Array(slotCount * 4);
  for (let i = 0; i < components.length; i++) {
    const component = components[i];
    const pickId = context.createPickId(component);
    pickIds[i] = pickId;
    const slot = indexOf(component, i);
    const dst = slot * 4;
    colors[dst] = Color.floatToByte(pickId.color.red);
    colors[dst + 1] = Color.floatToByte(pickId.color.green);
    colors[dst + 2] = Color.floatToByte(pickId.color.blue);
    colors[dst + 3] = Color.floatToByte(pickId.color.alpha);
  }
  return { pickIds, colors };
}

/**
 * Create a tiny per-vertex dummy VBO with an `a_localVertexId` attribute
 * equal to its array index. Required because Cesium's VertexArray needs at
 * least one attribute at index 0 with `instanceDivisor === 0`. The shader
 * uses this value to know which vertex of the instance it is rendering.
 *
 * @param {Context} context
 * @param {number} verticesPerInstance
 * @returns {VertexArray}
 * @private
 */
function createInstancedVertexArray(context, verticesPerInstance) {
  const localIds = new Float32Array(verticesPerInstance);
  for (let i = 0; i < verticesPerInstance; i++) {
    localIds[i] = i;
  }

  return new VertexArray({
    context,
    attributes: [
      {
        index: 0,
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 1,
        vertexBuffer: Buffer.createVertexBuffer({
          context,
          typedArray: localIds,
          usage: BufferUsage.STATIC_DRAW,
        }),
      },
    ],
  });
}

export default TopologyOverlay;
