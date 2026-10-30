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
/** @import { BufferLayout, ComponentMask, OverlayBufferView, OverlayViews, ScalarType, ShaderSources } from "@cesium/mesh-editor"; */
/** @import MeshEditorModule from "./MeshEditorModule.js"; */

/**
 * The object that scene.pick returns for a picked overlay component.
 *
 * @typedef {object} OverlayPickObject
 * @property {object} primitive The renderer's mesh.
 * @property {ComponentType} componentType The component's type.
 * @property {number} index The component's index in its overlay buffer. For faces, the face index.
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
 * One component type's draw command, textures and pick IDs.
 *
 * @typedef {object} ComponentOverlay
 * @property {ComponentType} componentType The component type.
 * @property {PrimitiveType} primitiveType How each instance is drawn.
 * @property {number} verticesPerInstance The vertices in each instance.
 * @property {ShaderSources} shaderSources The component type's overlay shaders.
 * @property {Object<string, function(): *>} styleUniforms The component type's style uniforms.
 * @property {"edges" | "triangles" | undefined} topologyViewName The overlay view with the component type's edges or triangles. Undefined for points.
 * @property {"verts" | "edges" | "faces"} selectionViewName The component type's view in the overlay views' selection.
 * @property {boolean} shown Whether to draw the component type.
 * @property {BufferTexture | undefined} topologyTexture The edges or triangles. Undefined for points.
 * @property {BufferTexture | undefined} selectionTexture The component type's selection.
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
  #positionTexture;

  /** @type {ComponentOverlay} */
  #pointOverlay;

  /** @type {ComponentOverlay} */
  #edgeOverlay;

  /** @type {ComponentOverlay} */
  #faceOverlay;

  /**
   * In draw order, so where depths are equal, points win over edges and edges
   * over faces.
   *
   * @type {ComponentOverlay[]}
   */
  #componentOverlays;

  /**
   * The commands to add to each frame: those of the shown component types that have
   * instances to draw.
   *
   * @type {DrawCommand[]}
   */
  #commands = [];

  /** @type {Matrix4} */
  #modelMatrix = Matrix4.clone(Matrix4.IDENTITY);

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

    this.#pointOverlay = this.#createComponentOverlay({
      componentType: ComponentType.Vertex,
      primitiveType: PrimitiveType.TRIANGLE_STRIP,
      verticesPerInstance: 4,
      shaderSources: shaders.point,
      styleUniforms: {
        [depthBias]: () => POINT_DEPTH_BIAS,
        [point.size]: () => this.#getPixelSize(POINT_SIZE),
        [point.color]: () => POINT_COLOR,
        [point.selectedColor]: () => POINT_SELECTED_COLOR,
      },
      topologyViewName: undefined,
      selectionViewName: "verts",
    });

    this.#edgeOverlay = this.#createComponentOverlay({
      componentType: ComponentType.Edge,
      primitiveType: PrimitiveType.TRIANGLE_STRIP,
      verticesPerInstance: 4,
      shaderSources: shaders.edge,
      styleUniforms: {
        [depthBias]: () => EDGE_DEPTH_BIAS,
        [edge.width]: () => this.#getPixelSize(EDGE_WIDTH),
        [edge.color]: () => EDGE_COLOR,
        [edge.selectedColor]: () => EDGE_SELECTED_COLOR,
      },
      topologyViewName: "edges",
      selectionViewName: "edges",
    });

    this.#faceOverlay = this.#createComponentOverlay({
      componentType: ComponentType.Face,
      primitiveType: PrimitiveType.TRIANGLES,
      verticesPerInstance: 3,
      shaderSources: shaders.face,
      styleUniforms: {
        [depthBias]: () => FACE_DEPTH_BIAS,
        [face.color]: () => FACE_COLOR,
        [face.selectedColor]: () => FACE_SELECTED_COLOR,
        [face.isPickPass]: () => this.#isPickPass,
      },
      // Faces draw one instance per triangle, but select by face.
      topologyViewName: "triangles",
      selectionViewName: "faces",
    });

    this.#componentOverlays = [
      this.#pointOverlay,
      this.#edgeOverlay,
      this.#faceOverlay,
    ];

    /**
     * Whether to draw the overlay. Overlay views passed to update are uploaded
     * either way.
     *
     * @type {boolean}
     * @default true
     */
    this.show = true;
  }

  /**
   * The mesh's local-to-world transform, shared by the draw commands. The
   * identity by default. Write into it to move the overlay, e.g. with
   * Matrix4.clone(matrix, renderer.modelMatrix).
   *
   * @type {Matrix4}
   * @readonly
   */
  get modelMatrix() {
    return this.#modelMatrix;
  }

  /**
   * Sets which component types to draw. All are drawn by default.
   *
   * @param {ComponentMask} components The component types to draw.
   */
  setShownComponents(components) {
    for (const componentOverlay of this.#componentOverlays) {
      const componentBit = 1 << componentOverlay.componentType;
      componentOverlay.shown = (components & componentBit) !== 0;
    }

    this.#updateCommands();
  }

  /**
   * Uploads the changed overlay views, if any, then adds the overlay's draw
   * commands to the frame. Draws nothing until overlay views are first passed,
   * or while show is false.
   *
   * @param {FrameState} frameState The frame state.
   * @param {OverlayViews} [overlayViews] The mesh's overlay views. Pass them only when wasm reports that the overlay changed, right after reading them, with no calls into wasm in between: those invalidate the views.
   */
  update(frameState, overlayViews) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("frameState", frameState);
    //>>includeEnd('debug');

    if (defined(overlayViews)) {
      this.#upload(frameState.context, overlayViews);
    }

    if (!this.show || frameState.mode !== SceneMode.SCENE3D) {
      return;
    }

    // The uniform callbacks run when the commands execute, during this pass.
    this.#isPickPass = frameState.passes.pick;
    this.#pixelRatio = frameState.pixelRatio;

    for (const command of this.#commands) {
      frameState.commandList.push(command);
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
    const { fullRefresh, positions } = overlayViews;

    // Every component type's shaders read the positions, so upload them first.
    this.#positionTexture ??= this.#createBufferTexture(positions.layout);
    this.#uploadView(context, this.#positionTexture, positions, fullRefresh);

    for (const componentOverlay of this.#componentOverlays) {
      const { topologyViewName, selectionViewName } = componentOverlay;

      const topologyView = defined(topologyViewName)
        ? overlayViews[topologyViewName]
        : undefined;

      if (defined(topologyView)) {
        componentOverlay.topologyTexture ??= this.#createBufferTexture(
          topologyView.layout,
        );
        this.#uploadView(
          context,
          componentOverlay.topologyTexture,
          topologyView,
          fullRefresh,
        );
      }

      const selectionView = overlayViews.selection[selectionViewName];
      componentOverlay.selectionTexture ??= this.#createBufferTexture(
        selectionView.layout,
      );

      this.#uploadView(
        context,
        componentOverlay.selectionTexture,
        selectionView,
        fullRefresh,
      );

      // One instance per edge or triangle, or for points, per position.
      const instanceCount = (topologyView ?? positions).elementCount;
      componentOverlay.command ??= this.#createCommand(
        context,
        componentOverlay,
      );
      componentOverlay.command.instanceCount = instanceCount;

      this.#addPickIds(context, componentOverlay, selectionView.elementCount);
    }

    this.#updateCommands();
  }

  /**
   * Collects the commands of the shown component types that have instances to draw.
   *
   * @ignore
   */
  #updateCommands() {
    this.#commands = [];
    for (const { shown, command } of this.#componentOverlays) {
      // An instance count of zero would draw the command once, not instanced.
      if (!shown || !defined(command) || command.instanceCount === 0) {
        continue;
      }

      this.#commands.push(command);
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
    this.#positionTexture?.texture.destroy();

    for (const componentOverlay of this.#componentOverlays) {
      componentOverlay.topologyTexture?.texture.destroy();
      componentOverlay.selectionTexture?.texture.destroy();
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
   * @param {object} options
   * @param {ComponentType} options.componentType The component type.
   * @param {PrimitiveType} options.primitiveType How each instance is drawn.
   * @param {number} options.verticesPerInstance The vertices in each instance.
   * @param {ShaderSources} options.shaderSources The component type's overlay shaders.
   * @param {Object<string, function(): *>} options.styleUniforms The component type's style uniforms.
   * @param {"edges" | "triangles" | undefined} options.topologyViewName The overlay view with the component type's edges or triangles. Undefined for points.
   * @param {"verts" | "edges" | "faces"} options.selectionViewName The component type's view in the overlay views' selection.
   * @returns {ComponentOverlay}
   * @ignore
   */
  #createComponentOverlay(options) {
    return {
      ...options,
      shown: true,
      topologyTexture: undefined,
      selectionTexture: undefined,
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
   * @param {BufferLayout} layout An overlay view's layout.
   * @returns {BufferTexture} A texture for the view's buffer.
   * @ignore
   */
  #createBufferTexture(layout) {
    return {
      texture: new DataTexture(this.#getTextureFormat(layout)),
      uniformName: layout.uniformName,
    };
  }

  /**
   * Uploads an overlay view's changed elements: all of them on a full refresh,
   * otherwise its dirty range, if any.
   *
   * @param {Context} context The context that owns the texture.
   * @param {BufferTexture} bufferTexture The view's texture.
   * @param {OverlayBufferView} view The overlay view.
   * @param {boolean} fullRefresh Whether every element changed.
   * @ignore
   */
  #uploadView(context, bufferTexture, view, fullRefresh) {
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
   * @param {ComponentOverlay} componentOverlay The component type's overlay.
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
   * @param {ComponentOverlay} componentOverlay The component type's overlay.
   * @returns {DrawCommand} The component type's draw command.
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
   * @param {ComponentOverlay} componentOverlay The component type's overlay.
   * @returns {Object<string, function(): *>} The component overlay's uniform map.
   * @ignore
   */
  #createUniformMap(componentOverlay) {
    /** @type {Object<string, function(): *>} */
    const uniformMap = { ...componentOverlay.styleUniforms };

    for (const bufferTexture of [
      this.#positionTexture,
      componentOverlay.topologyTexture,
      componentOverlay.selectionTexture,
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
