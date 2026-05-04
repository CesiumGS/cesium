import {
  BlendingState,
  Buffer,
  BufferUsage,
  Cartesian2,
  Color,
  ComponentDatatype,
  ContextLimits,
  DrawCommand,
  DynamicTexture,
  Matrix4,
  Pass,
  PixelDatatype,
  PixelFormat,
  PrimitiveType,
  RenderState,
  ShaderProgram,
  ShaderSource,
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
import TopologyComponents from "./TopologyComponents.js";

/** @import Vertex from "./Vertex.js"; */
/** @import Edge from "./Edge.js"; */
/** @import Face from "./Face.js"; */
/** @import MeshComponent from "./MeshComponent.js"; */
/** @import Selection from "./Selection.js"; */
/** @import { GeometryAccessSession, Scene, FrameState, Context, PickId } from "@cesium/engine"; */

/**
 * Overlay layer to help visualize an {@link EditableMesh}'s topology in
 * edit mode, plus enable picking of mesh components by participating in
 * picking passes.
 *
 * The overlay drives three instanced draws against a common
 * {@link DynamicTexture} mirroring the underlying mesh's POSITION buffer:
 * <ul>
 *   <li>Points: one instance per {@link Vertex} slot in the POSITION
 *       buffer; gl_InstanceID directly indexes the position texture.</li>
 *   <li>Edges: one instance per {@link Edge}; a RG32UI lookup texture
 *       supplies the two endpoint buffer-indices.</li>
 *   <li>Faces: one instance per triangle of each {@link Face}'s fan
 *       triangulation; a RGBA32UI lookup texture supplies the three
 *       vertex buffer-indices in RGB and the owning face index in the A channel
 *       (used for face-level picking).</li>
 * </ul>
 *
 * Why not create separate vertex buffers and index buffers for each
 * overlay type? Three reasons:
 *
 * 1. Whenever a mesh component's position changes, we would have to
 *    compute which derived components are affected.
 * 2. Memory and GPU update costs. To update vertex positions with
 *    individual overlay buffers, we'd have to update 4 mirrored buffers
 *    each frame during drags. As it stands, we have to do 2 uploads
 *    since this overlay mirrors the original POSITION buffer. Even this
 *    could be avoided with some clever tricks if WebGL2 supported
 *    either gl_PrimitiveID in indexed draws, or TBOs in this instanced
 *    approach.
 * 3. In a standard indexed draw (one vertex buffer, different index
 *    buffers per overlay component type), there's no way to distinguish shared
 *    vertices to assign them different pick IDs.
 *
 * GPU resources are created lazily on the first {@link TopologyOverlay#update}
 * since they require a {@link FrameState#context}. The constructor only
 * assembles the CPU-side typed arrays.
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
   * @param {Selection} options.selection Selection state to mirror onto the
   *   GPU as a per-component highlight texture. The overlay subscribes to
   *   {@link Selection#changed} for the lifetime of the overlay.
   * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] Optional model
   *   matrix applied at draw time.
   */
  constructor(options) {
    const {
      vertices,
      edges,
      faces,
      session,
      selection,
      modelMatrix = Matrix4.IDENTITY,
    } = options;

    this._modelMatrix = Matrix4.clone(modelMatrix, new Matrix4());

    this._positionTexture = buildPositionTexture(session);

    this._renderState = RenderState.fromCache({
      blending: BlendingState.ALPHA_BLEND,
      depthTest: { enabled: true },
      depthMask: true,
    });

    /**
     * Width in pixels of the screen-space quad used to draw each edge
     * instance. Like {@link BufferPolylineCollection}, edges are drawn as
     * pairs of triangles rather than GL_LINES so they can have a configurable
     * pixel width.
     * @type {number}
     */
    this.edgeWidth = 2.5;
    /**
     * Size in pixels of the pickable area around each edge. This should be
     * larger than {@link TopologyOverlay#edgeWidth} to make it easier to
     * pick thin edges.
     * @type {number}
     */
    this.pickEdgeWidth = 20.0;
    /**
     * Stroke color for the screen-space quads used to draw each edge
     * instance.
     * @type {Color}
     */
    this.edgeColor = Color.WHITE.clone();
    /**
     * Stroke color used in place of {@link TopologyOverlay#edgeColor} for
     * any selected edges.
     * @type {Color}
     */
    this.edgeSelectedColor = Color.YELLOW.clone();
    /**
     * Size in pixels of the GL_POINTS sprites used to draw each vertex
     * instance.
     * @type {number}
     */
    this.pointSize = 8.0;
    /**
     * Size in pixels of the pickable area around each vertex.
     * @type {number}
     */
    this.pickPointSize = 20.0;
    /**
     * Fill color for the round point sprites used to draw each vertex
     * instance.
     * @type {Color}
     */
    this.pointColor = Color.WHITE.clone();
    /**
     * Fill color used in place of {@link TopologyOverlay#pointColor} for
     * any selected vertices.
     * @type {Color}
     */
    this.pointSelectedColor = Color.YELLOW.clone();
    /**
     * Fill color for the triangles drawn for each {@link Face}. Defaults
     * to a mostly-transparent tint so the underlying mesh stays visible.
     * @type {Color}
     */
    this.faceColor = new Color(1.0, 1.0, 1.0, 0.0);
    /**
     * Fill color used in place of {@link TopologyOverlay#faceColor} for
     * any selected faces.
     * @type {Color}
     */
    this.faceSelectedColor = Color.YELLOW.clone();

    /**
     * Eye-space bias, in meters, applied to the overlay's vertex positions
     * before projection. Pulls the overlay toward the camera so it wins
     * the depth test against the mesh surface it sits on.
     * @type {number}
     */
    this.depthBias = 0.001;

    // Per-frame point size / edge width. Set at the top of update() based
    // on whether the current pass is render or pick, then read by the
    // per-component uniform-map closures.
    this._passPointSize = this.pointSize;
    this._passEdgeWidth = this.edgeWidth;
    this._passIsPick = false;

    // One per-type ComponentOverlay. Order is fixed (vertices, edges,
    // faces) so that command-list rebuilds can iterate predictably.
    /** @type {ComponentOverlay[]} */
    this._componentOverlays = [
      this.#buildPointsOverlay(vertices),
      this.#buildEdgesOverlay(edges),
      this.#buildFacesOverlay(faces),
    ];

    /**
     * Becomes true the first time {@link TopologyOverlay#update} runs and
     * lazily allocates GPU resources for every component overlay. Used to
     * trigger a one-time post-init command-list rebuild.
     * @type {boolean}
     */
    this._initialized = false;

    /** @type {TopologyComponents} */
    this._renderableMask = TopologyComponents.NONE;
    /** @type {TopologyComponents} */
    this._pickableMask = TopologyComponents.NONE;

    /** @type {DrawCommand[]} */
    this._renderCommands = [];
    /** @type {DrawCommand[]} */
    this._pickCommands = [];

    this._selection = selection;
    this._removeSelectionListener = selection.changed.addEventListener(
      this.#onSelectionChanged,
      this,
    );
    this.#onSelectionChanged(Array.from(selection.components), []);

    this.show = true;
  }

  get modelMatrix() {
    return this._modelMatrix;
  }

  set modelMatrix(matrix) {
    Matrix4.clone(matrix, this._modelMatrix);
    // Propagate to each draw command, if they have been built.
    // Otherwise the initial value is picked up by #initialize.
    if (this._initialized) {
      for (let i = 0; i < this._componentOverlays.length; i++) {
        Matrix4.clone(
          this._modelMatrix,
          this._componentOverlays[i].drawCommand.modelMatrix,
        );
      }
    }
  }

  /**
   * Set which mesh component types are drawn in the regular render pass and
   * which participate in the pick pass.
   *
   * @param {TopologyComponents} renderableMask
   * @param {TopologyComponents} pickableMask
   */
  setComponentMasks(renderableMask, pickableMask) {
    this._renderableMask = renderableMask;
    this._pickableMask = pickableMask;
    this.#rebuildCommandLists();
  }

  /**
   * Rebuild the prebaked render-pass and pick-pass command lists from the
   * current renderable / pickable component masks. Cheap; called on
   * mask changes and once after GPU init. Skips if GPU resources have
   * not been built yet - {@link TopologyOverlay#update} will call it
   * after creating them.
   */
  #rebuildCommandLists() {
    if (!this._initialized) {
      return;
    }
    this._renderCommands.length = 0;
    this._pickCommands.length = 0;
    for (const overlay of this._componentOverlays) {
      if (overlay.instanceCount === 0) {
        continue;
      }
      if (this._renderableMask & overlay.componentType) {
        this._renderCommands.push(overlay.drawCommand);
      }
      if (this._pickableMask & overlay.componentType) {
        this._pickCommands.push(overlay.drawCommand);
      }
    }
  }

  /**
   * Per-frame update hook. On first call lazily builds GPU resources for
   * each component overlay; on subsequent calls flushes any dirty
   * subranges of the shared position texture and per-component pick /
   * lookup textures, updates draw command modelMatrices, and pushes the
   * appropriate prebaked command list onto the frame's command list.
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
    this._passPointSize = passes.pick ? this.pickPointSize : this.pointSize;
    this._passEdgeWidth = passes.pick ? this.pickEdgeWidth : this.edgeWidth;
    this._passIsPick = !!passes.pick;

    this._positionTexture.update(context);

    for (let i = 0; i < this._componentOverlays.length; i++) {
      this._componentOverlays[i].update(context, this, this._renderState);
    }

    if (!this._initialized) {
      this._initialized = true;
      this.#rebuildCommandLists();
    }

    const commands = passes.pick ? this._pickCommands : this._renderCommands;
    const commandList = frameState.commandList;
    for (let i = 0; i < commands.length; i++) {
      commandList.push(commands[i]);
    }
  }

  /**
   * Update the mirrored position for a single vertex. Writes into the
   * CPU-side position texels and marks the corresponding slot dirty so
   * the affected rows of the position texture are re-uploaded on the
   * next update.
   *
   * @param {Vertex} vertex
   */
  updateVertexPosition(vertex) {
    const position = vertex.position;
    this._positionTexture.set(vertex.bufferIndex, [
      position.x,
      position.y,
      position.z,
      0,
    ]);
  }

  /**
   * Selection-changed handler. Dispatches each added / removed component
   * to whichever {@link ComponentOverlay} owns it; non-owners ignore.
   *
   * @param {MeshComponent[]} added
   * @param {MeshComponent[]} removed
   */
  #onSelectionChanged(added, removed) {
    for (const overlay of this._componentOverlays) {
      for (const component of added) {
        overlay.setSelected(component, true);
      }
      for (const component of removed) {
        overlay.setSelected(component, false);
      }
    }
  }

  /**
   * Build the points overlay: one instance per slot in the POSITION
   * buffer, no lookup texture (gl_InstanceID directly indexes the
   * shared position texture and pick-color texture).
   *
   * @param {Vertex[]} vertices
   * @returns {ComponentOverlay}
   */
  #buildPointsOverlay(vertices) {
    const positionTexture = this._positionTexture;
    return new ComponentOverlay({
      componentType: TopologyComponents.VERTICES,
      components: vertices,
      instanceCount: positionTexture.width * positionTexture.height,
      pickIndexForComponent: (vertex) =>
        /** @type {Vertex} */ (vertex).bufferIndex,
      pickTextureSize: {
        width: positionTexture.width,
        height: positionTexture.height,
      },
      verticesPerInstance: 1,
      primitiveType: PrimitiveType.POINTS,
      vertexShaderSources: [TopologyOverlayPointVS],
      fragmentShaderSource: TopologyOverlayPointFS,
      buildUniformMap: (self) => ({
        u_positionTexture: () => this._positionTexture.texture,
        u_pickColorTexture: () => self.pickColorTexture.texture,
        u_selectionTexture: () => self.selectionTexture.texture,
        u_textureSize: () => this._positionTexture.size,
        u_pointSize: () => this._passPointSize,
        u_pointColor: () => this.pointColor,
        u_pointSelectedColor: () => this.pointSelectedColor,
        u_depthBias: () => this.depthBias,
      }),
    });
  }

  /**
   * Build the edges overlay: one instance per edge, a RG32UI lookup
   * texture of (vA, vB) buffer-indices keyed by gl_InstanceID.
   * Pick-color texture is also keyed by gl_InstanceID.
   *
   * @param {Edge[]} edges
   * @returns {ComponentOverlay}
   */
  #buildEdgesOverlay(edges) {
    const instanceCount = edges.length;
    const { width, height } = chooseTextureSize(instanceCount);
    const texels = new Uint32Array(width * height * 2);
    for (let i = 0; i < instanceCount; i++) {
      const halfEdge = edges[i].halfEdge;
      texels[i * 2] = halfEdge.vertex.bufferIndex;
      texels[i * 2 + 1] = halfEdge.next.vertex.bufferIndex;
    }
    const lookupTexture = new DynamicTexture({
      texels,
      width,
      height,
      componentsPerTexel: 2,
      pixelFormat: PixelFormat.RG_INTEGER,
      pixelDatatype: PixelDatatype.UNSIGNED_INT,
    });

    return new ComponentOverlay({
      componentType: TopologyComponents.EDGES,
      components: edges,
      instanceCount,
      pickIndexForComponent: (_edge, i) => i,
      pickTextureSize: { width, height },
      verticesPerInstance: 4,
      primitiveType: PrimitiveType.TRIANGLE_STRIP,
      vertexShaderSources: [PolylineCommon, TopologyOverlayEdgeVS],
      fragmentShaderSource: TopologyOverlayEdgeFS,
      lookupTexture,
      buildUniformMap: (self) => ({
        u_positionTexture: () => this._positionTexture.texture,
        u_positionTextureSize: () => this._positionTexture.size,
        u_edgeEndpointTexture: () => self.lookupTexture.texture,
        u_edgeEndpointTextureSize: () => self.lookupTexture.size,
        u_pickColorTexture: () => self.pickColorTexture.texture,
        u_selectionTexture: () => self.selectionTexture.texture,
        u_edgeWidth: () => this._passEdgeWidth,
        u_edgeColor: () => this.edgeColor,
        u_edgeSelectedColor: () => this.edgeSelectedColor,
        u_depthBias: () => this.depthBias,
      }),
    });
  }

  /**
   * Build the faces overlay: one instance per triangle (after fan
   * triangulation), a RGBA32UI lookup texture keyed by gl_InstanceID
   * where RGB are the three vertex buffer-indices and A is the owning
   * face index. Pick-color texture is keyed by face index, sized to
   * faceCount.
   *
   * @param {Face[]} faces
   * @returns {ComponentOverlay}
   */
  #buildFacesOverlay(faces) {
    const faceCount = faces.length;
    const perFaceVertices = new Array(faceCount);
    const perFaceTriangleIndices = new Array(faceCount);
    let instanceCount = 0;
    for (let i = 0; i < faceCount; i++) {
      perFaceVertices[i] = faces[i].vertices();
      perFaceTriangleIndices[i] = faces[i].triangleIndices();
      instanceCount += perFaceTriangleIndices[i].length / 3;
    }

    const triangleSize = chooseTextureSize(instanceCount);
    const triangleTexels = new Uint32Array(
      triangleSize.width * triangleSize.height * 4,
    );
    let cursor = 0;
    for (let i = 0; i < faceCount; i++) {
      const faceVertices = perFaceVertices[i];
      const faceTriangles = perFaceTriangleIndices[i];
      for (let t = 0; t < faceTriangles.length; t += 3) {
        const dst = cursor * 4;
        triangleTexels[dst] = faceVertices[faceTriangles[t]].bufferIndex;
        triangleTexels[dst + 1] =
          faceVertices[faceTriangles[t + 1]].bufferIndex;
        triangleTexels[dst + 2] =
          faceVertices[faceTriangles[t + 2]].bufferIndex;
        triangleTexels[dst + 3] = i;
        cursor++;
      }
    }
    const lookupTexture = new DynamicTexture({
      texels: triangleTexels,
      width: triangleSize.width,
      height: triangleSize.height,
      componentsPerTexel: 4,
      pixelFormat: PixelFormat.RGBA_INTEGER,
      pixelDatatype: PixelDatatype.UNSIGNED_INT,
    });

    // Pick-color texture is keyed by face index, not gl_InstanceID, so
    // it is sized to faceCount rather than triangleCount.
    const pickTextureSize = chooseTextureSize(faceCount);

    return new ComponentOverlay({
      componentType: TopologyComponents.FACES,
      components: faces,
      instanceCount,
      pickIndexForComponent: (_face, i) => i,
      pickTextureSize,
      verticesPerInstance: 3,
      primitiveType: PrimitiveType.TRIANGLES,
      vertexShaderSources: [TopologyOverlayFaceVS],
      fragmentShaderSource: TopologyOverlayFaceFS,
      lookupTexture,
      buildUniformMap: (self) => ({
        u_positionTexture: () => this._positionTexture.texture,
        u_positionTextureSize: () => this._positionTexture.size,
        u_triangleIndexTexture: () => self.lookupTexture.texture,
        u_triangleIndexTextureSize: () => self.lookupTexture.size,
        u_pickColorTexture: () => self.pickColorTexture.texture,
        u_pickColorTextureSize: () =>
          new Cartesian2(self.pickTextureWidth, self.pickTextureHeight),
        u_selectionTexture: () => self.selectionTexture.texture,
        u_faceColor: () => this.faceColor,
        u_faceSelectedColor: () => this.faceSelectedColor,
        u_isPickPass: () => this._passIsPick,
        u_depthBias: () => this.depthBias,
      }),
    });
  }

  /**
   * Adds the overlay to the scene's primitive collection so it
   * participates in render and pick passes.
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
    this._removeSelectionListener();
    this._positionTexture.destroy();
    for (const overlay of this._componentOverlays) {
      overlay.destroy();
    }
    RenderState.removeFromCache(this._renderState);
    return destroyObject(this);
  }
}

/**
 * Bundles the per-component-type state and GPU resources that
 * {@link TopologyOverlay} replicates three times: once for vertices,
 * once for edges, and once for faces.
 *
 * Each instance owns:
 * <ul>
 *   <li>A pick-color {@link DynamicTexture}, indexed by a per-type
 *       index function (e.g. Vertex.bufferIndex for points,
 *       gl_InstanceID for edges, faceIdx for faces).</li>
 *   <li>An optional {@link ComponentOverlay#lookupTexture} of integer
 *       index data (e.g. edge endpoints, triangle vertex indices) that
 *       the VS uses to fetch from the shared position texture.</li>
 *   <li>A dummy per-vertex VAO whose only attribute is
 *       `a_localVertexId` (the index of the vertex within the
 *       instance), required to satisfy Cesium's VertexArray invariants.</li>
 *   <li>A {@link ShaderProgram} and a {@link DrawCommand}.</li>
 *   <li>A {@link PickId} per component, allocated against the owning
 *       overlay primitive.</li>
 * </ul>
 *
 * GPU resources are allocated lazily on the first
 * {@link ComponentOverlay#update}; the constructor only assembles the
 * configuration that won't change once the overlay is built.
 *
 * @private
 */
class ComponentOverlay {
  /**
   * @param {object} options
   * @param {TopologyComponents} options.componentType Bitmask flag identifying
   *   this overlay in {@link TopologyOverlay}'s renderable / pickable masks.
   * @param {MeshComponent[]} options.components The components this
   *   overlay renders. Used to allocate one {@link PickId} per component.
   * @param {number} options.instanceCount Number of instances to draw
   *   (e.g. one per edge, or one per triangle for faces).
   * @param {(component: MeshComponent, i: number) => number} options.pickIndexForComponent
   *   Maps a component (and its position in `components`) to a texel
   *   index in the pick-color texture.
   * @param {{width: number, height: number}} options.pickTextureSize
   *   Width/height of the pick-color texture (must hold every index
   *   `pickIndexForComponent` can return).
   * @param {number} options.verticesPerInstance Number of vertices Cesium
   *   should issue per instance (e.g. 1 for POINTS, 4 for the edge
   *   TRIANGLE_STRIP quad, 3 for face triangles).
   * @param {PrimitiveType} options.primitiveType
   * @param {string[]} options.vertexShaderSources Concatenated to form
   *   the VS source. Allows callers to prepend shared snippets like
   *   PolylineCommon.
   * @param {string} options.fragmentShaderSource
   * @param {DynamicTexture} [options.lookupTexture] Optional per-instance
   *   index lookup texture (edge endpoints, triangle indices).
   * @param {(componentOverlay: ComponentOverlay) => Record<string, () => any>} options.buildUniformMap
   *   Builds the {@link DrawCommand#uniformMap}. Invoked once during
   *   the first {@link ComponentOverlay#update}.
   */
  constructor(options) {
    this.componentType = options.componentType;
    this.components = options.components;
    this.instanceCount = options.instanceCount;
    this._pickIndexForComponent = options.pickIndexForComponent;
    this._pickTextureSize = options.pickTextureSize;
    this._verticesPerInstance = options.verticesPerInstance;
    this._primitiveType = options.primitiveType;
    this._vertexShaderSources = options.vertexShaderSources;
    this._fragmentShaderSource = options.fragmentShaderSource;
    this._buildUniformMap = options.buildUniformMap;

    /**
     * Per-instance index lookup texture, if any.
     * @type {DynamicTexture | undefined}
     */
    this.lookupTexture = options.lookupTexture;
    /**
     * Pick-color texture, lazily created in {@link ComponentOverlay#update}.
     * @type {DynamicTexture | undefined}
     */
    this.pickColorTexture = undefined;
    /**
     * Per-component selection mask
     * @type {DynamicTexture}
     */
    this.selectionTexture = new DynamicTexture({
      texels: new Uint8Array(
        this._pickTextureSize.width * this._pickTextureSize.height,
      ),
      width: this._pickTextureSize.width,
      height: this._pickTextureSize.height,
      componentsPerTexel: 1,
      pixelFormat: PixelFormat.RED,
      pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
    });
    /**
     * Lookup from a {@link MeshComponent} this overlay owns to its texel index
     * @type {Map<MeshComponent, number>}
     */
    this._componentToTexelIndex = new Map();
    for (let i = 0; i < this.components.length; i++) {
      const component = this.components[i];
      this._componentToTexelIndex.set(
        component,
        this._pickIndexForComponent(component, i),
      );
    }
    /** @type {PickId[] | undefined} */
    this.pickIds = undefined;
    /** @type {VertexArray | undefined} */
    this._vertexArray = undefined;
    /** @type {ShaderProgram | undefined} */
    this._shaderProgram = undefined;
    /** @type {DrawCommand | undefined} */
    this.drawCommand = undefined;

    this._initialized = false;
  }

  get pickTextureWidth() {
    return this._pickTextureSize.width;
  }

  get pickTextureHeight() {
    return this._pickTextureSize.height;
  }

  /**
   * On first call, allocates GPU resources (textures, shader, VAO, pick
   * ids, draw command). On subsequent calls, flushes any dirty ranges
   * on owned textures.
   *
   * @param {Context} context
   * @param {TopologyOverlay} owner The owning primitive. Required for
   *   pick-id allocation and to seed draw command modelMatrix / owner.
   * @param {RenderState} renderState Shared across all overlays.
   */
  update(context, owner, renderState) {
    if (!this._initialized) {
      this.#initialize(context, owner, renderState);
      this._initialized = true;
    }

    if (this.lookupTexture !== undefined) {
      this.lookupTexture.update(context);
    }

    this.pickColorTexture.update(context);
    this.selectionTexture.update(context);
  }

  /**
   * Mark a component as selected or unselected. No-op if `component` is
   * not owned by this overlay.
   *
   * @param {MeshComponent} component
   * @param {boolean} selected
   */
  setSelected(component, selected) {
    const index = this._componentToTexelIndex.get(component);
    if (index === undefined) {
      return;
    }
    this.selectionTexture.set(index, [selected ? 255 : 0]);
  }

  /**
   * One-time GPU resource creation: pick ids + pick-color texture,
   * lookup texture upload, VAO, shader program, draw command.
   *
   * @param {Context} context
   * @param {TopologyOverlay} owner
   * @param {RenderState} renderState
   */
  #initialize(context, owner, renderState) {
    this.#allocatePickIds(context, owner);

    this._vertexArray = createInstancedVertexArray(
      context,
      this._verticesPerInstance,
    );

    this._shaderProgram = ShaderProgram.fromCache({
      context,
      vertexShaderSource: new ShaderSource({
        sources: this._vertexShaderSources,
      }),
      fragmentShaderSource: new ShaderSource({
        sources: [this._fragmentShaderSource],
      }),
      attributeLocations: { a_localVertexId: 0 },
    });

    this.drawCommand = new DrawCommand({
      vertexArray: this._vertexArray,
      shaderProgram: this._shaderProgram,
      renderState,
      uniformMap: this._buildUniformMap(this),
      primitiveType: this._primitiveType,
      count: this._verticesPerInstance,
      instanceCount: this.instanceCount,
      pass: Pass.OPAQUE,
      pickId: "v_pickColor",
      modelMatrix: Matrix4.clone(owner.modelMatrix, new Matrix4()),
      owner,
    });
  }

  /**
   * Allocate one pick id per component and pack their colors into a
   * fresh pick-color {@link DynamicTexture}, indexed by
   * {@link ComponentOverlay#_pickIndexForComponent}.
   *
   * @param {Context} context
   * @param {TopologyOverlay} owner
   */
  #allocatePickIds(context, owner) {
    const pickTexelCount =
      this._pickTextureSize.width * this._pickTextureSize.height;
    const pickColors = new Uint8Array(pickTexelCount * 4);
    const pickIds = new Array(this.components.length);

    for (let i = 0; i < this.components.length; i++) {
      const component = this.components[i];
      const pickId = context.createPickId({
        primitive: owner,
        id: component,
      });
      pickIds[i] = pickId;
      const dst = this._pickIndexForComponent(component, i) * 4;
      pickColors[dst] = Color.floatToByte(pickId.color.red);
      pickColors[dst + 1] = Color.floatToByte(pickId.color.green);
      pickColors[dst + 2] = Color.floatToByte(pickId.color.blue);
      pickColors[dst + 3] = Color.floatToByte(pickId.color.alpha);
    }

    this.pickIds = pickIds;

    this.pickColorTexture = new DynamicTexture({
      texels: pickColors,
      width: this._pickTextureSize.width,
      height: this._pickTextureSize.height,
      componentsPerTexel: 4,
      pixelFormat: PixelFormat.RGBA,
      pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
    });
  }

  destroy() {
    if (this.lookupTexture !== undefined) {
      this.lookupTexture.destroy();
    }
    if (this.pickColorTexture !== undefined) {
      this.pickColorTexture.destroy();
    }
    this.selectionTexture.destroy();
    if (this._vertexArray !== undefined) {
      this._vertexArray.destroy();
    }
    if (this._shaderProgram !== undefined) {
      this._shaderProgram.destroy();
    }
    if (this.pickIds !== undefined) {
      for (const pickId of this.pickIds) {
        pickId.destroy();
      }
    }
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
 * Build the shared mirrored POSITION-buffer texture: one RGBA32F texel
 * per slot in the underlying POSITION buffer. Indexed by
 * Vertex.bufferIndex. Sized to session.vertexCount() so unreferenced
 * slots are also represented; this keeps bufferIndex a valid texture
 * coordinate without remapping. The 4th channel is unused padding.
 *
 * @param {GeometryAccessSession} session
 * @returns {DynamicTexture}
 * @private
 */
function buildPositionTexture(session) {
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
  return new DynamicTexture({
    texels,
    width,
    height,
    componentsPerTexel: 4,
    pixelFormat: PixelFormat.RGBA,
    pixelDatatype: PixelDatatype.FLOAT,
  });
}

/**
 * Create a tiny per-vertex dummy VBO with an `a_localVertexId` attribute
 * equal to its array index. Required because Cesium's VertexArray needs
 * at least one attribute at index 0 with `instanceDivisor === 0`. The
 * shader uses this value to know which vertex of the instance it is
 * rendering.
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
