import BoundingSphere from "../../Core/BoundingSphere.js";
import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";
import DrawCommand from "../../Renderer/DrawCommand.js";
import Pass from "../../Renderer/Pass.js";
import RenderState from "../../Renderer/RenderState.js";
import BlendingState from "../BlendingState.js";
import ClassificationType from "../ClassificationType.js";
import DepthFunction from "../DepthFunction.js";
import StencilConstants from "../StencilConstants.js";
import StencilFunction from "../StencilFunction.js";
import StencilOperation from "../StencilOperation.js";

/**
 * A wrapper around the draw commands used to render a classification model,
 * i.e. a {@link Model} that classifies another asset. This manages the
 * derived commands and returns only the necessary commands depending on the
 * given frame state.
 *
 * @param {Object} options An object containing the following options:
 * @param {DrawCommand} options.command The draw command from which to derive other commands from.
 * @param {PrimitiveRenderResources} options.primitiveRenderResources The render resources of the primitive associated with the command.
 *
 * @alias ClassificationModelDrawCommand
 * @constructor
 *
 * @private
 */
function ClassificationModelDrawCommand(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const command = options.command;
  const renderResources = options.primitiveRenderResources;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.command", command);
  Check.typeOf.object("options.primitiveRenderResources", renderResources);
  //>>includeEnd('debug');

  const model = renderResources.model;

  this._command = command;
  this._model = model;
  this._runtimePrimitive = renderResources.runtimePrimitive;

  // Classification models aren't supported in 2D mode, so there's no need to
  // duplicate the model matrix for each derived command.
  this._modelMatrix = command.modelMatrix;
  this._boundingVolume = command.boundingVolume;
  this._cullFace = command.renderState.cull.face;

  const type = model.classificationType;
  this._classificationType = type;

  // ClassificationType has three values: terrain only, 3D Tiles only, or both.
  this._classifiesTerrain = type !== ClassificationType.CESIUM_3D_TILE;
  this._classifies3DTiles = type !== ClassificationType.TERRAIN;

  this._commandList = [];

  this._commandsTerrain = [];
  this._commands3DTiles = [];
  this._commandsIgnoreShow = []; // Used for inverted classification.
  this._commandsWireframe = [];

  this._ignoreShowCommand = undefined;

  initialize(this);
}

function getStencilDepthRenderState(stencilFunction) {
  return {
    colorMask: {
      red: false,
      green: false,
      blue: false,
      alpha: false,
    },
    stencilTest: {
      enabled: true,
      frontFunction: stencilFunction,
      frontOperation: {
        fail: StencilOperation.KEEP,
        zFail: StencilOperation.DECREMENT_WRAP,
        zPass: StencilOperation.KEEP,
      },
      backFunction: stencilFunction,
      backOperation: {
        fail: StencilOperation.KEEP,
        zFail: StencilOperation.INCREMENT_WRAP,
        zPass: StencilOperation.KEEP,
      },
      reference: StencilConstants.CESIUM_3D_TILE_MASK,
      mask: StencilConstants.CESIUM_3D_TILE_MASK,
    },
    stencilMask: StencilConstants.CLASSIFICATION_MASK,
    depthTest: {
      enabled: true,
      func: DepthFunction.LESS_OR_EQUAL,
    },
    depthMask: false,
  };
}

const colorRenderState = {
  stencilTest: {
    enabled: true,
    frontFunction: StencilFunction.NOT_EQUAL,
    frontOperation: {
      fail: StencilOperation.ZERO,
      zFail: StencilOperation.ZERO,
      zPass: StencilOperation.ZERO,
    },
    backFunction: StencilFunction.NOT_EQUAL,
    backOperation: {
      fail: StencilOperation.ZERO,
      zFail: StencilOperation.ZERO,
      zPass: StencilOperation.ZERO,
    },
    reference: 0,
    mask: StencilConstants.CLASSIFICATION_MASK,
  },
  stencilMask: StencilConstants.CLASSIFICATION_MASK,
  depthTest: {
    enabled: false,
  },
  depthMask: false,
  blending: BlendingState.PRE_MULTIPLIED_ALPHA_BLEND,
};

function initialize(drawCommand) {
  const command = drawCommand._command;
  const commandList = drawCommand._commandList;

  //const runtimePrimitive = drawCommand._runtimePrimitive;
  //const batchLengths = runtimePrimitive.batchLengths;
  //const batchOffsets = runtimePrimitive.batchOFfsets;

  const model = drawCommand._model;

  const useDebugWireframe = model._enableDebugWireframe && model.debugWireframe;

  // If debug wireframe is enabled, don't derive any new commands.
  // Render as normal.
  if (useDebugWireframe) {
    command.pass = Pass.OPAQUE;
    commandList.push(command);

    return;
  }

  if (drawCommand._classifiesTerrain) {
    const pass = Pass.TERRAIN_CLASSIFICATION;

    const stencilDepthCommand = deriveStencilDepthCommand(command, pass);
    commandList.push(stencilDepthCommand);

    const colorCommand = deriveColorCommand(command, pass);
    commandList.push(colorCommand);
  }

  if (drawCommand._classifies3DTiles) {
    const pass = Pass.CESIUM_3D_TILE_CLASSIFICATION;

    const stencilDepthCommand = deriveStencilDepthCommand(command, pass);
    commandList.push(stencilDepthCommand);

    const colorCommand = deriveColorCommand(command, pass);
    commandList.push(colorCommand);
  }
}

function deriveStencilDepthCommand(command, pass) {
  const stencilDepthCommand = DrawCommand.shallowClone(command);
  stencilDepthCommand.cull = false;
  stencilDepthCommand.pass = pass;

  const stencilFunction =
    pass === Pass.TERRAIN_CLASSIFICATION
      ? StencilFunction.ALWAYS
      : StencilFunction.EQUAL;
  const renderState = getStencilDepthRenderState(stencilFunction);
  stencilDepthCommand.renderState = RenderState.fromCache(renderState);

  return stencilDepthCommand;
}

function deriveColorCommand(command, pass) {
  const colorCommand = DrawCommand.shallowClone(command);
  colorCommand.cull = false;
  colorCommand.pass = pass;

  colorCommand.renderState = RenderState.fromCache(colorRenderState);

  return colorCommand;
}

Object.defineProperties(ClassificationModelDrawCommand.prototype, {
  /**
   * The main draw command that the other commands are derived from.
   *
   * @memberof ClassificationModelDrawCommand.prototype
   * @type {DrawCommand}
   *
   * @readonly
   * @private
   */
  command: {
    get: function () {
      return this._command;
    },
  },

  /**
   * The runtime primitive that the draw command belongs to.
   *
   * @memberof ClassificationModelDrawCommand.prototype
   * @type {ModelRuntimePrimitive}
   *
   * @readonly
   * @private
   */
  runtimePrimitive: {
    get: function () {
      return this._runtimePrimitive;
    },
  },

  /**
   * The model that the draw command belongs to.
   *
   * @memberof ClassificationModelDrawCommand.prototype
   * @type {Model}
   *
   * @readonly
   * @private
   */
  model: {
    get: function () {
      return this._model;
    },
  },

  /**
   * The classification type of the model that this draw command belongs to.
   *
   * @memberof ClassificationModelDrawCommand.prototype
   * @type {ClassificationType}
   *
   * @readonly
   * @private
   */
  classificationType: {
    get: function () {
      return this._classificationType;
    },
  },

  /**
   * The current model matrix applied to the draw commands.
   *
   * @memberof ClassificationModelDrawCommand.prototype
   * @type {Matrix4}
   *
   * @readonly
   * @private
   */
  modelMatrix: {
    get: function () {
      return this._modelMatrix;
    },
    set: function (value) {
      this._modelMatrix = Matrix4.clone(value, this._modelMatrix);
      const boundingSphere = this._runtimePrimitive.boundingSphere;
      this._boundingVolume = BoundingSphere.transform(
        boundingSphere,
        this._modelMatrix,
        this._boundingVolume
      );
    },
  },

  /**
   * The bounding volume of the main draw command. This is equivalent
   * to the primitive's bounding sphere transformed by the draw
   * command's model matrix.
   *
   * @memberof ClassificationModelDrawCommand.prototype
   * @type {BoundingSphere}
   *
   * @readonly
   * @private
   */
  boundingVolume: {
    get: function () {
      return this._boundingVolume;
    },
  },

  /**
   * Culling is disabled for classification models, so this has no effect on
   * how the model renders. This only exists to match the interface of
   * {@link ModelDrawCommand}.
   *
   * @memberof ClassificationModelDrawCommand.prototype
   * @type {CullFace}
   *
   * @private
   */
  cullFace: {
    get: function () {
      return this._cullFace;
    },
    set: function (value) {
      this._cullFace = value;
    },
  },
});

/**
 * Pushes the draw commands necessary to render the primitive.
 *
 * @param {FrameState} frameState The frame state.
 * @param {DrawCommand[]} result The array to push the draw commands to.
 *
 * @returns {DrawCommand[]} The modified result parameter.
 *
 * @private
 */
ClassificationModelDrawCommand.prototype.pushCommands = function (
  frameState,
  result
) {
  // Derive the command for inverted classification if necessary.
  const deriveIgnoreShowCommand =
    frameState.invertClassification &&
    this._classifies3DTiles &&
    !defined(this._ignoreShowCommand);

  if (deriveIgnoreShowCommand) {
    const pass = Pass.CESIUM_3D_TILE_CLASSIFICATION_IGNORE_SHOW;
    const command = deriveStencilDepthCommand(this._command, pass);
    this._ignoreShowCommand = command;
    this._commandList.push(command);
  }

  result.push.apply(result, this._commandList);

  return result;
};

export default ClassificationModelDrawCommand;
