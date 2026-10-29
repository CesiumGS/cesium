// @ts-check

import {
  Check,
  Color,
  ComponentDatatype,
  Matrix4,
  PixelDatatype,
  PixelFormat,
  PrimitiveType,
  defined,
  destroyObject,
} from "@cesium/core";
import {
  BlendingState,
  Buffer,
  BufferUsage,
  DataTexture,
  DrawCommand,
  Pass,
  RenderState,
  SceneMode,
  ShaderProgram,
  ShaderSource,
  VertexArray,
} from "@cesium/engine";
import { ComponentType } from "@cesium/mesh-editor";
import TopologyOverlayHooksFS from "../Shaders/TopologyOverlayHooksFS.js";
import TopologyOverlayHooksVS from "../Shaders/TopologyOverlayHooksVS.js";

/** @import { Context, FrameState, PickId } from "@cesium/engine"; */
/** @import { BufferLayout, OverlayBufferView, OverlayViews, ScalarType, ShaderSources } from "@cesium/mesh-editor"; */
/** @import MeshEditorModule from "./MeshEditorModule.js"; */

/**
 * The object that scene.pick returns for a picked overlay component.
 *
 * @typedef {object} OverlayPickObject
 * @property {object} primitive The renderer's mesh.
 * @property {ComponentType} componentType The kind of component.
 * @property {number} index The component's index in its overlay buffer. For faces, the face index.
 * @private
 */

/**
 * What to upload and draw this frame.
 *
 * @typedef {object} OverlayUpdateOptions
 * @property {OverlayViews} [overlayViews] The mesh's overlay views.
 * @property {Matrix4} modelMatrix The mesh's local-to-world transform.
 * @property {boolean} showPoints Whether to draw vertices.
 * @property {boolean} showEdges Whether to draw edges.
 * @property {boolean} showFaces Whether to draw faces.
 * @private
 */

/**
 * A texture's format, as the options of a {@link DataTexture}.
 *
 * @typedef {object} TextureFormat
 * @property {PixelFormat} pixelFormat The format of each texel.
 * @property {PixelDatatype} pixelDatatype The type of each value.
 * @ignore
 */

/**
 * How one wasm scalar type is stored in Cesium textures.
 *
 * @typedef {object} ScalarTypeFormat
 * @property {PixelFormat[]} pixelFormatsByComponentCount The pixel format for 1 to 4 components, at index count - 1.
 * @property {PixelDatatype} pixelDatatype The type of each value.
 * @ignore
 */

/**
 * An overlay buffer's texture, and the shader uniform that reads it.
 *
 * @typedef {object} BufferTexture
 * @property {DataTexture} texture The texture.
 * @property {string} uniformName The uniform's name.
 * @ignore
 */

/**
 * One kind of component: its draw command, buffers and pick IDs.
 *
 * @typedef {object} ComponentOverlay
 * @property {ComponentType} componentType The kind of component.
 * @property {PrimitiveType} primitiveType How each instance is drawn.
 * @property {number} verticesPerInstance The vertices in each instance.
 * @property {ShaderSources} shaderSources The kind's overlay shaders.
 * @property {Object<string, function(): *>} styleUniforms The kind's style uniforms.
 * @property {BufferTexture | undefined} topology The edge or triangle buffer. Undefined for points.
 * @property {BufferTexture | undefined} selection The kind's selection buffer.
 * @property {PickId[]} pickIds One pick ID per component.
 * @property {Uint8Array} pickColors Each pick ID's color, four bytes each. May have spare capacity.
 * @property {BufferTexture} pickColorTexture The pick colors, by component index.
 * @property {ShaderProgram | undefined} shaderProgram Created with the command.
 * @property {DrawCommand | undefined} command Created on the first upload.
 * @ignore
 */

const POINT_SIZE = 8.0;
const EDGE_WIDTH = 2.5;
// Points and edges are drawn larger in the pick pass, so they're easier to click.
const PICK_SIZE = 20.0;

const POINT_COLOR = Color.BLACK;
const POINT_SELECTED_COLOR = new Color(1.0, 0.48, 0.0, 1.0);
const EDGE_COLOR = Color.BLACK;
const EDGE_SELECTED_COLOR = new Color(0.0, 0.78, 1.0, 1.0);
const FACE_COLOR = new Color(0.8, 0.8, 0.8, 1.0);
const FACE_SELECTED_COLOR = new Color(1.0, 0.16, 0.58, 1.0);

// Points draw over edges, and edges over faces.
const POINT_DEPTH_BIAS = 0.002;
const EDGE_DEPTH_BIAS = 0.001;
const FACE_DEPTH_BIAS = 0.0;

// Declared by TopologyOverlayHooksVS.
const PICK_COLOR_UNIFORM = "u_pickColorTexture";

/**
 * @type {TextureFormat}
 * @ignore
 */
const PICK_COLOR_FORMAT = {
  pixelFormat: PixelFormat.RGBA,
  pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
};

const RENDER_STATE = {
  blending: BlendingState.ALPHA_BLEND,
  depthTest: { enabled: true },
  depthMask: true,
};

/**
 * Draws one mesh's topology overlay (vertices, edges and faces) and makes its
 * components pickable. Owns the GPU resources for that mesh.
 *
 * @private
 */
class OverlayRenderer {
  /** @type {MeshEditorModule} */
  #module;

  /** @type {object} */
  #mesh;

  /** @type {BufferTexture | undefined} */
  #positions;

  /** @type {ComponentOverlay[]} */
  #componentOverlays;

  /**
   * Each kind's command, if it has instances to draw.
   *
   * @type {Array<DrawCommand | undefined>}
   */
  #commands = [];

  /**
   * Shared by every command.
   *
   * @type {Matrix4}
   */
  #modelMatrix = new Matrix4();

  /** @type {VertexArray | undefined} */
  #vertexArray;

  /** @type {RenderState} */
  #renderState;

  #isPickPass = false;

  #pixelRatio = 1.0;

  /**
   * @param {object} options
   * @param {MeshEditorModule} options.module The loaded module, for its shaders and memory.
   * @param {object} options.mesh The mesh whose overlay this draws. Pick objects return it as their primitive.
   */
  constructor(options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("options", options);
    Check.typeOf.object("options.module", options.module);
    Check.typeOf.object("options.mesh", options.mesh);
    //>>includeEnd('debug');

    this.#module = options.module;
    this.#mesh = options.mesh;
    this.#renderState = RenderState.fromCache(RENDER_STATE);

    const { shaders } = this.#module;
    const { depthBias, point, edge, face } = shaders.uniforms;

    this.#componentOverlays = [
      this.#createComponentOverlay(
        ComponentType.Vertex,
        PrimitiveType.TRIANGLE_STRIP,
        4,
        shaders.point,
        {
          [depthBias]: () => POINT_DEPTH_BIAS,
          [point.size]: () => this.#getPixelSize(POINT_SIZE),
          [point.color]: () => POINT_COLOR,
          [point.selectedColor]: () => POINT_SELECTED_COLOR,
        },
      ),

      this.#createComponentOverlay(
        ComponentType.Edge,
        PrimitiveType.TRIANGLE_STRIP,
        4,
        shaders.edge,
        {
          [depthBias]: () => EDGE_DEPTH_BIAS,
          [edge.width]: () => this.#getPixelSize(EDGE_WIDTH),
          [edge.color]: () => EDGE_COLOR,
          [edge.selectedColor]: () => EDGE_SELECTED_COLOR,
        },
      ),

      this.#createComponentOverlay(
        ComponentType.Face,
        PrimitiveType.TRIANGLES,
        3,
        shaders.face,
        {
          [depthBias]: () => FACE_DEPTH_BIAS,
          [face.color]: () => FACE_COLOR,
          [face.selectedColor]: () => FACE_SELECTED_COLOR,
          [face.isPickPass]: () => this.#isPickPass,
        },
      ),
    ];
  }

  /**
   * Uploads the changed overlay views, if any, then adds the overlay's draw
   * commands to the frame. Draws nothing until overlay views are first passed.
   *
   * @param {FrameState} frameState The frame state.
   * @param {OverlayUpdateOptions} options What to upload and draw.
   */
  update(frameState, options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("frameState", frameState);
    Check.typeOf.object("options", options);
    Check.typeOf.object("options.modelMatrix", options.modelMatrix);
    //>>includeEnd('debug');

    if (defined(options.overlayViews)) {
      this.#upload(frameState.context, options.overlayViews);
    }

    if (frameState.mode !== SceneMode.SCENE3D) {
      return;
    }

    // The uniform callbacks run when the commands execute, during this pass.
    this.#isPickPass = frameState.passes.pick;
    this.#pixelRatio = frameState.pixelRatio;
    Matrix4.clone(options.modelMatrix, this.#modelMatrix);

    const shows = [options.showPoints, options.showEdges, options.showFaces];
    for (let i = 0; i < this.#commands.length; i++) {
      const command = this.#commands[i];
      if (shows[i] && defined(command)) {
        frameState.commandList.push(command);
      }
    }
  }

  /**
   * Uploads each overlay buffer: all of it on a full refresh, otherwise its
   * dirty range, if any.
   *
   * @param {Context} context The context to create textures in.
   * @param {OverlayViews} overlayViews The mesh's overlay views.
   * @ignore
   */
  #upload(context, overlayViews) {
    const { fullRefresh, positions, edges, triangles, selection } =
      overlayViews;
    const [, edgeOverlay, faceOverlay] = this.#componentOverlays;

    this.#positions = this.#uploadBuffer(
      context,
      this.#positions,
      positions,
      fullRefresh,
    );

    edgeOverlay.topology = this.#uploadBuffer(
      context,
      edgeOverlay.topology,
      edges,
      fullRefresh,
    );

    faceOverlay.topology = this.#uploadBuffer(
      context,
      faceOverlay.topology,
      triangles,
      fullRefresh,
    );

    const selections = [selection.verts, selection.edges, selection.faces];
    const instanceCounts = [
      positions.elementCount,
      edges.elementCount,
      triangles.elementCount,
    ];

    for (let i = 0; i < this.#componentOverlays.length; i++) {
      const componentOverlay = this.#componentOverlays[i];

      componentOverlay.selection = this.#uploadBuffer(
        context,
        componentOverlay.selection,
        selections[i],
        fullRefresh,
      );

      componentOverlay.command =
        componentOverlay.command ??
        this.#createCommand(context, componentOverlay);
      componentOverlay.command.instanceCount = instanceCounts[i];

      // An instance count of zero would draw the command once, not instanced.
      this.#commands[i] =
        instanceCounts[i] > 0 ? componentOverlay.command : undefined;
      this.#addPickIds(context, componentOverlay, selections[i].elementCount);
    }
  }

  /**
   * @returns {boolean} True if this object was destroyed; otherwise, false.
   */
  isDestroyed() {
    return false;
  }

  /**
   * Destroys the GPU resources. The object can't be used afterwards.
   *
   * @returns {void}
   */
  destroy() {
    this.#positions?.texture.destroy();

    for (const componentOverlay of this.#componentOverlays) {
      componentOverlay.topology?.texture.destroy();
      componentOverlay.selection?.texture.destroy();
      componentOverlay.pickColorTexture.texture.destroy();

      for (const pickId of componentOverlay.pickIds) {
        pickId.destroy();
      }

      componentOverlay.shaderProgram?.destroy();
    }

    this.#vertexArray?.destroy();
    RenderState.removeFromCache(RENDER_STATE);

    return destroyObject(this);
  }

  /**
   * @param {ComponentType} componentType The kind of component.
   * @param {PrimitiveType} primitiveType How each instance is drawn.
   * @param {number} verticesPerInstance The vertices in each instance.
   * @param {ShaderSources} shaderSources The kind's overlay shaders.
   * @param {Object<string, function(): *>} styleUniforms The kind's style uniforms.
   * @returns {ComponentOverlay}
   * @ignore
   */
  #createComponentOverlay(
    componentType,
    primitiveType,
    verticesPerInstance,
    shaderSources,
    styleUniforms,
  ) {
    return {
      componentType,
      primitiveType,
      verticesPerInstance,
      shaderSources,
      styleUniforms,
      topology: undefined,
      selection: undefined,
      pickIds: [],
      pickColors: new Uint8Array(0),
      pickColorTexture: {
        texture: new DataTexture(PICK_COLOR_FORMAT),
        uniformName: PICK_COLOR_UNIFORM,
      },
      shaderProgram: undefined,
      command: undefined,
    };
  }

  /**
   * @param {number} size A size in CSS pixels.
   * @returns {number} The size in drawing buffer pixels, enlarged in the pick pass.
   * @ignore
   */
  #getPixelSize(size) {
    return (this.#isPickPass ? PICK_SIZE : size) * this.#pixelRatio;
  }

  /**
   * Uploads one overlay buffer, creating its texture on first use.
   *
   * @param {Context} context The context to create textures in.
   * @param {BufferTexture | undefined} bufferTexture The buffer's texture, if created.
   * @param {OverlayBufferView} view The buffer's view.
   * @param {boolean} fullRefresh Whether to upload the whole buffer.
   * @returns {BufferTexture} The buffer's texture.
   * @ignore
   */
  #uploadBuffer(context, bufferTexture, view, fullRefresh) {
    if (!defined(bufferTexture)) {
      bufferTexture = {
        texture: new DataTexture(this.#getTextureFormat(view.layout)),
        uniformName: view.layout.uniformName,
      };
    }

    const range = fullRefresh
      ? { start: 0, end: view.elementCount }
      : view.dirtyRange;

    if (defined(range)) {
      bufferTexture.texture.upload(
        context,
        this.#createTypedArray(view),
        range.start,
        range.end,
      );
    }

    return bufferTexture;
  }

  /**
   * @param {BufferLayout} layout An overlay buffer's layout.
   * @returns {TextureFormat} The format of a texture for the buffer.
   * @ignore
   */
  #getTextureFormat(layout) {
    const { pixelFormatsByComponentCount, pixelDatatype } =
      OverlayRenderer.#scalarTypeFormats[layout.scalarType];

    return {
      pixelFormat: pixelFormatsByComponentCount[layout.components - 1],
      pixelDatatype,
    };
  }

  /**
   * Translates the overlay's scalar types to Cesium's.
   *
   * @type {Record<ScalarType, ScalarTypeFormat>}
   * @ignore
   */
  static #scalarTypeFormats = {
    float32: {
      pixelFormatsByComponentCount: [
        PixelFormat.RED,
        PixelFormat.RG,
        PixelFormat.RGB,
        PixelFormat.RGBA,
      ],
      pixelDatatype: PixelDatatype.FLOAT,
    },
    uint32: {
      pixelFormatsByComponentCount: [
        PixelFormat.RED_INTEGER,
        PixelFormat.RG_INTEGER,
        PixelFormat.RGB_INTEGER,
        PixelFormat.RGBA_INTEGER,
      ],
      pixelDatatype: PixelDatatype.UNSIGNED_INT,
    },
    unorm8: {
      pixelFormatsByComponentCount: [
        PixelFormat.RED,
        PixelFormat.RG,
        PixelFormat.RGB,
        PixelFormat.RGBA,
      ],
      pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
    },
  };

  /**
   * Creates a view into wasm memory. This should be used immediately / not stored.
   *
   * @param {OverlayBufferView} view An overlay buffer's view.
   * @returns {Float32Array | Uint32Array | Uint8Array} The buffer's values.
   * @ignore
   */
  #createTypedArray(view) {
    const { layout } = view;
    const { pixelDatatype } =
      OverlayRenderer.#scalarTypeFormats[layout.scalarType];

    // Core's types omit functions on enums, like PixelDatatype's.
    const TypedArray = /** @type {any} */ (
      PixelDatatype
    ).getTypedArrayConstructor(pixelDatatype);

    return new TypedArray(
      this.#module.memory.buffer,
      view.address,
      view.elementCount * layout.components,
    );
  }

  /**
   * Creates pick IDs for components that don't have one yet. A pick ID's
   * index never changes meaning, so pick IDs are only ever added.
   *
   * @param {Context} context The context that owns the pick IDs.
   * @param {ComponentOverlay} componentOverlay The kind of component.
   * @param {number} count The number of components.
   * @ignore
   */
  #addPickIds(context, componentOverlay, count) {
    const oldCount = componentOverlay.pickIds.length;
    if (count <= oldCount) {
      return;
    }

    if (componentOverlay.pickColors.length < count * 4) {
      const pickColors = new Uint8Array(Math.max(count, oldCount * 2) * 4);
      pickColors.set(componentOverlay.pickColors);
      componentOverlay.pickColors = pickColors;
    }

    const { pickColors, componentType } = componentOverlay;
    for (let index = oldCount; index < count; index++) {
      /** @type {OverlayPickObject} */
      const pickObject = { primitive: this.#mesh, componentType, index };
      const pickId = context.createPickId(pickObject);
      componentOverlay.pickIds.push(pickId);

      const { color } = pickId;
      pickColors[index * 4] = Color.floatToByte(color.red);
      pickColors[index * 4 + 1] = Color.floatToByte(color.green);
      pickColors[index * 4 + 2] = Color.floatToByte(color.blue);
      pickColors[index * 4 + 3] = Color.floatToByte(color.alpha);
    }

    componentOverlay.pickColorTexture.texture.upload(
      context,
      pickColors.subarray(0, count * 4),
      oldCount,
      count,
    );
  }

  /**
   * @param {Context} context The context to create GPU resources in.
   * @param {ComponentOverlay} componentOverlay The kind of component.
   * @returns {DrawCommand} The kind's draw command.
   * @ignore
   */
  #createCommand(context, componentOverlay) {
    this.#vertexArray = this.#vertexArray ?? this.#createVertexArray(context);

    componentOverlay.shaderProgram = ShaderProgram.fromCache({
      context,
      vertexShaderSource: new ShaderSource({
        sources: [
          componentOverlay.shaderSources.vertex,
          TopologyOverlayHooksVS,
        ],
      }),
      fragmentShaderSource: new ShaderSource({
        sources: [
          componentOverlay.shaderSources.fragment,
          TopologyOverlayHooksFS,
        ],
      }),
      attributeLocations: { a_unused: 0 },
    });

    return new DrawCommand({
      vertexArray: this.#vertexArray,
      shaderProgram: componentOverlay.shaderProgram,
      renderState: this.#renderState,
      uniformMap: this.#createUniformMap(componentOverlay),
      primitiveType: componentOverlay.primitiveType,
      count: componentOverlay.verticesPerInstance,
      modelMatrix: this.#modelMatrix,
      pass: Pass.OPAQUE,
      pickId: "v_pickColor",
      owner: this,
    });
  }

  /**
   * @param {ComponentOverlay} componentOverlay The kind of component.
   * @returns {Object<string, function(): *>} The component overlay's uniform map.
   * @ignore
   */
  #createUniformMap(componentOverlay) {
    /** @type {Object<string, function(): *>} */
    const uniformMap = { ...componentOverlay.styleUniforms };

    for (const bufferTexture of [
      this.#positions,
      componentOverlay.topology,
      componentOverlay.selection,
      componentOverlay.pickColorTexture,
    ]) {
      if (!defined(bufferTexture)) {
        continue;
      }

      uniformMap[bufferTexture.uniformName] = () =>
        bufferTexture.texture.texture;
    }

    return uniformMap;
  }

  /**
   * The shaders have no vertex attributes, but a draw command needs a vertex
   * array, so this one has a single unused attribute.
   *
   * @param {Context} context The context to create the vertex array in.
   * @returns {VertexArray} The vertex array.
   * @ignore
   */
  #createVertexArray(context) {
    return new VertexArray({
      context,
      attributes: [
        {
          index: 0,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 1,
          vertexBuffer: Buffer.createVertexBuffer({
            context,
            typedArray: new Float32Array(4),
            usage: BufferUsage.STATIC_DRAW,
          }),
        },
      ],
    });
  }
}

export default OverlayRenderer;
