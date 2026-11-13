// @ts-check

import {
  AxisAlignedBoundingBox,
  Cartesian3,
  Check,
  Color,
  ComponentDatatype,
  Matrix4,
  OrientedBoundingBox,
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
  DepthFunction,
  DrawCommand,
  Pass,
  RenderState,
  SceneMode,
  ShaderProgram,
  ShaderSource,
  StencilFunction,
  StencilOperation,
  VertexArray,
} from "@cesium/engine";
import { ComponentType } from "@cesium/mesh-editor";
import MeshEditorStyle from "./MeshEditorStyle.js";
import TopologyOverlayHooksFS from "../Shaders/TopologyOverlayHooksFS.js";
import TopologyOverlayHooksVS from "../Shaders/TopologyOverlayHooksVS.js";

/** @import { Context, FrameState, PickId } from "@cesium/engine"; */
/** @import { BufferLayout, ComponentMask, OverlayBufferView, OverlayKeyView, OverlayViews, ScalarType, ShaderSources } from "@cesium/mesh-editor"; */
/** @import MeshEditorModule from "./MeshEditorModule.js"; */

/**
 * The object that scene.pick returns for a picked overlay component.
 *
 * @typedef {object} OverlayPickObject
 * @property {object} primitive The renderer's mesh.
 * @property {ComponentType} componentType The component's type.
 * @property {bigint | undefined} id The component's stable ID in its mesh.
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
 * @property {Object<string, function(): *> | undefined} outlineUniforms The style uniforms to override to draw the outline. Undefined for faces, which aren't part of the outline.
 * @property {object} renderStateOptions The options of the component type's render state.
 * @property {RenderState} renderState The component type's render state, from the render state cache.
 * @property {"edges" | "triangles" | undefined} topologyViewName The overlay view with the component type's edges or triangles. Undefined for points.
 * @property {"verts" | "edges" | "faces"} componentName The name of a view into the overlay's selection and id arrays.
 * @property {boolean} shown Whether to draw the component type.
 * @property {boolean} pickable Whether to draw the component type in the pick pass, if shown.
 * @property {BufferTexture | undefined} topologyTexture The edges or triangles. Undefined for points.
 * @property {BufferTexture | undefined} selectionTexture The component type's selection.
 * @property {PickId[]} pickIds One pick ID per component.
 * @property {Uint8Array} pickColors Each pick ID's color, four bytes each. May have spare capacity.
 * @property {BufferTexture} pickColorTexture The pick colors, by component index.
 * @property {ShaderProgram | undefined} shaderProgram Created with the command.
 * @property {DrawCommand | undefined} command Created on the first upload.
 * @property {DrawCommand | undefined} outlineCommand Draws the component type's part of the outline. Created on the first upload, if it has outline uniforms.
 * @ignore
 */

// Points and edges are drawn larger in the pick pass, so they're easier to click.
const PICK_SIZE = 20.0;

// Points draw over edges, and edges over faces.
const POINT_DEPTH_BIAS = 0.002;
const EDGE_DEPTH_BIAS = 0.001;
const FACE_DEPTH_BIAS = 0.0;

// Declared by TopologyOverlayHooksVS.
const PICK_COLOR_UNIFORM = "u_pickColorTexture";

const scratchBoundsSize = new Cartesian3();
const scratchLocalBoxMatrix = new Matrix4();

/**
 * @type {TextureFormat}
 * @ignore
 */
const PICK_COLOR_FORMAT = {
  pixelFormat: PixelFormat.RGBA,
  pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
};

const FACE_RENDER_STATE = {
  blending: BlendingState.ALPHA_BLEND,
  depthTest: { enabled: true },
  depthMask: true,
};

// Points and edges fade out at their borders (antialiasing), which can draw over faces. So they don't write depth.
// The pick pass still writes depth.
//
// LEQUAL setting gets used for picking as well, which helps ensure the selected component is drawn on top.
const POINT_EDGE_RENDER_STATE = {
  blending: BlendingState.ALPHA_BLEND,
  depthTest: { enabled: true, func: DepthFunction.LESS_OR_EQUAL },
  depthMask: false,
};

// Every outlined mesh's faces mark their pixels with the same stencil value, so
// overlapping meshes share one outline around their union.
const OUTLINE_STENCIL_REFERENCE = 1;

// The face render state, also marking the faces' pixels in the stencil.
const STENCIL_FACE_RENDER_STATE = {
  ...FACE_RENDER_STATE,
  stencilTest: {
    enabled: true,
    frontFunction: StencilFunction.ALWAYS,
    backFunction: StencilFunction.ALWAYS,
    reference: OUTLINE_STENCIL_REFERENCE,
    mask: ~0,
    frontOperation: {
      fail: StencilOperation.KEEP,
      zFail: StencilOperation.KEEP,
      zPass: StencilOperation.REPLACE,
    },
    backOperation: {
      fail: StencilOperation.KEEP,
      zFail: StencilOperation.KEEP,
      zPass: StencilOperation.REPLACE,
    },
  },
};

// The point and edge render state, but drawn only where faces didn't mark the
// stencil. Writes depth, so what's drawn later behind the outline doesn't cover it.
const OUTLINE_RENDER_STATE = {
  ...POINT_EDGE_RENDER_STATE,
  depthMask: true,
  stencilTest: {
    enabled: true,
    frontFunction: StencilFunction.NOT_EQUAL,
    backFunction: StencilFunction.NOT_EQUAL,
    reference: OUTLINE_STENCIL_REFERENCE,
    mask: ~0,
    frontOperation: {
      fail: StencilOperation.KEEP,
      zFail: StencilOperation.KEEP,
      zPass: StencilOperation.KEEP,
    },
    backOperation: {
      fail: StencilOperation.KEEP,
      zFail: StencilOperation.KEEP,
      zPass: StencilOperation.KEEP,
    },
  },
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
   * In draw order: faces, then edges, then points, so the faded borders of
   * edges and points blend over what's beneath them.
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

  /**
   * The commands to add to each pick pass: those of #commands whose component
   * types are pickable.
   *
   * @type {DrawCommand[]}
   */
  #pickCommands = [];

  /** @type {Matrix4} */
  #modelMatrix = new Matrix4();

  /** @type {AxisAlignedBoundingBox | undefined} */
  #localBounds;

  /**
   * Shared by all the commands, and updated in place.
   *
   * @type {OrientedBoundingBox}
   */
  #boundingVolume = new OrientedBoundingBox();

  /** @type {VertexArray | undefined} */
  #vertexArray;

  #isPickPass = false;

  #pixelRatio = 1.0;

  /**
   * The face command's render state while outlined, which also marks the
   * faces' pixels in the stencil, so the outline isn't drawn over them.
   *
   * @type {RenderState}
   */
  #stencilFaceRenderState = RenderState.fromCache(STENCIL_FACE_RENDER_STATE);

  /** @type {RenderState} */
  #outlineRenderState = RenderState.fromCache(OUTLINE_RENDER_STATE);

  /**
   * @param {object} options
   * @param {MeshEditorModule} options.module The loaded module, for its shaders and memory.
   * @param {object} options.mesh The mesh whose overlay this draws. Pick objects return it as their primitive.
   * @param {MeshEditorStyle} [options.style] Style object for the overlay overlay.
   * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The mesh's local-to-world transform.
   */
  constructor(options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("options", options);
    Check.typeOf.object("options.module", options.module);
    Check.typeOf.object("options.mesh", options.mesh);
    //>>includeEnd('debug');

    this.#module = options.module;
    this.#mesh = options.mesh;
    Matrix4.clone(options.modelMatrix ?? Matrix4.IDENTITY, this.#modelMatrix);
    const style = options.style ?? new MeshEditorStyle();

    const { shaders } = this.#module;
    const { depthBias, point, edge, face } = shaders.uniforms;

    // Outline edges and points are centered on the silhouette, and the mesh
    // covers about half of each, so they're twice the outline's width.
    const getOutlineSize = () => this.#getPixelSize(2.0 * style.outlineWidth);
    const getOutlineColor = () => style.outlineColor;

    this.#pointOverlay = this.#createComponentOverlay({
      componentType: ComponentType.Vertex,
      primitiveType: PrimitiveType.TRIANGLE_STRIP,
      verticesPerInstance: 4,
      shaderSources: shaders.point,
      styleUniforms: {
        [depthBias]: () => POINT_DEPTH_BIAS,
        [point.size]: () => this.#getPixelSize(style.pointSize),
        [point.color]: () => style.pointColor,
        [point.selectedColor]: () => style.selectedPointColor,
      },
      // Round points fill the notches between edges at the outline's corners.
      outlineUniforms: {
        [point.size]: getOutlineSize,
        [point.color]: getOutlineColor,
        [point.selectedColor]: getOutlineColor,
      },
      renderStateOptions: POINT_EDGE_RENDER_STATE,
      topologyViewName: undefined,
      componentName: "verts",
    });

    this.#edgeOverlay = this.#createComponentOverlay({
      componentType: ComponentType.Edge,
      primitiveType: PrimitiveType.TRIANGLE_STRIP,
      verticesPerInstance: 4,
      shaderSources: shaders.edge,
      styleUniforms: {
        [depthBias]: () => EDGE_DEPTH_BIAS,
        [edge.width]: () => this.#getPixelSize(style.edgeWidth),
        [edge.color]: () => style.edgeColor,
        [edge.selectedColor]: () => style.selectedEdgeColor,
      },
      outlineUniforms: {
        [edge.width]: getOutlineSize,
        [edge.color]: getOutlineColor,
        [edge.selectedColor]: getOutlineColor,
      },
      renderStateOptions: POINT_EDGE_RENDER_STATE,
      topologyViewName: "edges",
      componentName: "edges",
    });

    this.#faceOverlay = this.#createComponentOverlay({
      componentType: ComponentType.Face,
      primitiveType: PrimitiveType.TRIANGLES,
      verticesPerInstance: 3,
      shaderSources: shaders.face,
      styleUniforms: {
        [depthBias]: () => FACE_DEPTH_BIAS,
        [face.color]: () => style.faceColor,
        [face.selectedColor]: () => style.selectedFaceColor,
        [face.isPickPass]: () => this.#isPickPass,
      },
      outlineUniforms: undefined,
      renderStateOptions: FACE_RENDER_STATE,
      // Faces draw one instance per triangle, but select by face.
      topologyViewName: "triangles",
      componentName: "faces",
    });

    this.#componentOverlays = [
      this.#faceOverlay,
      this.#edgeOverlay,
      this.#pointOverlay,
    ];

    /**
     * Whether to draw the overlay. Overlay views passed to update are uploaded
     * either way.
     *
     * @type {boolean}
     * @default true
     */
    this.show = true;

    /**
     * Whether to outline the mesh. The outline is drawn by
     * {@link OverlayRenderer#pushOutlineCommands}.
     *
     * @type {boolean}
     * @default false
     */
    this.outlined = false;
  }

  /**
   * The mesh's local-to-world transform. The identity by default. Use
   * {@link OverlayRenderer#setModelMatrix} to change it.
   *
   * @type {Matrix4}
   * @readonly
   */
  get modelMatrix() {
    return this.#modelMatrix;
  }

  /**
   * The world-space bounding volume of the draw commands, or undefined without
   * local bounds.
   *
   * @type {OrientedBoundingBox | undefined}
   * @readonly
   */
  get boundingVolume() {
    return defined(this.#localBounds) ? this.#boundingVolume : undefined;
  }

  /**
   * Sets the mesh's local-to-world transform.
   *
   * @param {Matrix4} matrix The transform.
   */
  setModelMatrix(matrix) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("matrix", matrix);
    //>>includeEnd('debug');

    Matrix4.clone(matrix, this.#modelMatrix);
    this.#updateBoundingVolume();
  }

  /**
   * Sets the mesh's local-space bounds. Undefined for a mesh without vertices.
   *
   * @param {AxisAlignedBoundingBox | undefined} bounds The bounds.
   */
  setLocalBounds(bounds) {
    this.#localBounds = defined(bounds)
      ? AxisAlignedBoundingBox.clone(bounds, this.#localBounds)
      : undefined;

    this.#updateBoundingVolume();
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
   * Sets which component types to draw in the pick pass, of those shown. All
   * are pickable by default. A component type that isn't pickable can't be
   * picked, and doesn't hide what's behind it from picking.
   *
   * @param {ComponentMask} components The component types to pick.
   */
  setPickableComponents(components) {
    for (const componentOverlay of this.#componentOverlays) {
      const componentBit = 1 << componentOverlay.componentType;
      componentOverlay.pickable = (components & componentBit) !== 0;
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

    // While outlined, faces also mark their pixels in the stencil, so the
    // outline isn't drawn over them.
    const faceCommand = this.#faceOverlay.command;
    if (defined(faceCommand)) {
      faceCommand.renderState = this.outlined
        ? this.#stencilFaceRenderState
        : this.#faceOverlay.renderState;
    }

    const commands = this.#isPickPass ? this.#pickCommands : this.#commands;
    for (const command of commands) {
      frameState.commandList.push(command);
    }
  }

  /**
   * Adds the outline's draw commands to the frame, if outlined. This has to be
   * called after ALL mesh's have submitted regular draw commands, in {@link OverlayRenderer#update},
   * so one mesh's outline doesn't draw over another mesh's faces or vice versa. No outline commands are
   * added in the pick pass, while show is false, outside 3D, or while faces aren't drawn.
   *
   * @param {FrameState} frameState The frame state.
   */
  pushOutlineCommands(frameState) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("frameState", frameState);
    //>>includeEnd('debug');

    if (
      !this.outlined ||
      !this.show ||
      frameState.mode !== SceneMode.SCENE3D ||
      frameState.passes.pick ||
      // Without faces, nothing marks the stencil, so the outline would cover the mesh.
      !this.#commands.includes(this.#faceOverlay.command)
    ) {
      return;
    }

    for (const { outlineCommand } of this.#componentOverlays) {
      // An instance count of zero would draw the command once, not instanced.
      if (defined(outlineCommand) && outlineCommand.instanceCount > 0) {
        frameState.commandList.push(outlineCommand);
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
    const { fullRefresh, positions } = overlayViews;

    // Every component type's shaders read the positions, so upload them first.
    this.#positionTexture ??= this.#createBufferTexture(positions.layout);
    this.#uploadView(context, this.#positionTexture, positions, fullRefresh);

    for (const componentOverlay of this.#componentOverlays) {
      const { topologyViewName, componentName } = componentOverlay;

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

      const selectionView = overlayViews.selection[componentName];
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

      if (defined(componentOverlay.outlineUniforms)) {
        componentOverlay.outlineCommand ??=
          this.#createOutlineCommand(componentOverlay);
        componentOverlay.outlineCommand.instanceCount = instanceCount;
      }

      if (fullRefresh) {
        this.#updatePickIds(
          context,
          componentOverlay,
          overlayViews.componentKeys[componentName],
        );
      }
    }

    this.#updateCommands();
  }

  /**
   * Fits #boundingVolume to #localBounds transformed by #modelMatrix, and sets
   * boundingVolume on the existing commands.
   *
   * @ignore
   */
  #updateBoundingVolume() {
    const localBounds = this.#localBounds;
    if (defined(localBounds)) {
      const size = Cartesian3.subtract(
        localBounds.maximum,
        localBounds.minimum,
        scratchBoundsSize,
      );

      const localBox = Matrix4.fromScale(size, scratchLocalBoxMatrix);
      Matrix4.setTranslation(localBox, localBounds.center, localBox);
      Matrix4.multiplyTransformation(this.#modelMatrix, localBox, localBox);

      OrientedBoundingBox.fromTransformation(localBox, this.#boundingVolume);
    }

    const { boundingVolume } = this;
    for (const { command, outlineCommand } of this.#componentOverlays) {
      if (defined(command)) {
        command.boundingVolume = boundingVolume;
      }

      if (defined(outlineCommand)) {
        outlineCommand.boundingVolume = boundingVolume;
      }
    }
  }

  /**
   * Collects the commands of the shown component types that have instances to
   * draw, and of those, the pickable ones.
   *
   * @ignore
   */
  #updateCommands() {
    this.#commands = [];
    this.#pickCommands = [];
    for (const { shown, pickable, command } of this.#componentOverlays) {
      // An instance count of zero would draw the command once, not instanced.
      if (!shown || !defined(command) || command.instanceCount === 0) {
        continue;
      }

      this.#commands.push(command);
      if (pickable) {
        this.#pickCommands.push(command);
      }
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
    for (const { renderStateOptions } of this.#componentOverlays) {
      RenderState.removeFromCache(renderStateOptions);
    }
    RenderState.removeFromCache(STENCIL_FACE_RENDER_STATE);
    RenderState.removeFromCache(OUTLINE_RENDER_STATE);

    return destroyObject(this);
  }

  /**
   * @param {object} options
   * @param {ComponentType} options.componentType The component type.
   * @param {PrimitiveType} options.primitiveType How each instance is drawn.
   * @param {number} options.verticesPerInstance The vertices in each instance.
   * @param {ShaderSources} options.shaderSources The component type's overlay shaders.
   * @param {Object<string, function(): *>} options.styleUniforms The component type's style uniforms.
   * @param {Object<string, function(): *> | undefined} options.outlineUniforms The style uniforms to override to draw the outline. Undefined for faces.
   * @param {object} options.renderStateOptions The options of the component type's render state.
   * @param {"edges" | "triangles" | undefined} options.topologyViewName The overlay view with the component type's edges or triangles. Undefined for points.
   * @param {"verts" | "edges" | "faces"} options.componentName The name of a view into the overlay's selection and id arrays.
   * @returns {ComponentOverlay}
   * @ignore
   */
  #createComponentOverlay(options) {
    return {
      ...options,
      renderState: RenderState.fromCache(options.renderStateOptions),
      shown: true,
      pickable: true,
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
      outlineCommand: undefined,
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
   * @param {ComponentOverlay} componentOverlay The component type's overlay, with its command and outline uniforms.
   * @returns {DrawCommand} A copy of the component type's command that draws its part of the outline.
   * @ignore
   */
  #createOutlineCommand(componentOverlay) {
    const { command, outlineUniforms } = componentOverlay;
    const outlineCommand = DrawCommand.shallowClone(command);
    outlineCommand.renderState = this.#outlineRenderState;
    outlineCommand.uniformMap = { ...command.uniformMap, ...outlineUniforms };
    return outlineCommand;
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
   * Pick IDs belong to buffer slots and keep their colors, so they're only
   * ever added. Topology edits change which component is in a slot, so call
   * this on a full refresh.
   *
   * @param {Context} context The context that owns the pick IDs.
   * @param {ComponentOverlay} componentOverlay The component type's overlay.
   * @param {OverlayKeyView} idView The component type's stable IDs.
   * @ignore
   */
  #updatePickIds(context, componentOverlay, idView) {
    const ids = new BigUint64Array(
      this.#module.memory.buffer,
      idView.address,
      idView.elementCount,
    );

    const count = ids.length;
    const oldCount = componentOverlay.pickIds.length;

    // Pick IDs past the count aren't drawn, so their outdated IDs can't be picked.
    for (let index = 0; index < Math.min(oldCount, count); index++) {
      const pickObject = /** @type {OverlayPickObject} */ (
        componentOverlay.pickIds[index].object
      );

      pickObject.id = ids[index];
    }

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
      const pickObject = {
        primitive: this.#mesh,
        componentType,
        id: ids[index],
      };

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
      renderState: componentOverlay.renderState,
      uniformMap: this.#createUniformMap(componentOverlay),
      primitiveType: componentOverlay.primitiveType,
      count: componentOverlay.verticesPerInstance,
      modelMatrix: this.#modelMatrix,
      pass: Pass.OPAQUE,
      pickId: "v_pickColor",
      owner: this,
      boundingVolume: this.boundingVolume,
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
