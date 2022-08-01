import BoundingSphere from "../Core/BoundingSphere.js";
import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import Matrix4 from "../Core/Matrix4.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import BlendingState from "./BlendingState.js";
import ClassificationType from "./ClassificationType.js";
import DepthFunction from "./DepthFunction.js";
import StencilConstants from "./StencilConstants.js";
import StencilFunction from "./StencilFunction.js";
import StencilOperation from "./StencilOperation.js";

/**
 * A wrapper around the draw commands used to render a
 * {@link ClassificationModelExperimental}. This manages the derived commands
 * and returns only the necessary commands depending on the given frame state.
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

  this._command = command;

  const model = renderResources.model;
  this._model = model;
  this._modelMatrix = Matrix4.clone(command.modelMatrix, new Matrix4());
  this._debugWireframe = model._debugWireframe;

  const type = model._classificationType;
  this._classificationType = type;
  this._runtimePrimitive = renderResources.runtimePrimitive;
  this._cullFace = command.renderState.cull.face;

  this._commandList = [];

  // ClassificationType has three values:
  // terrain only, 3D tiles only, and both.
  // To check if it classifies terrain, thhe simplest check is to make
  // sure it doesn't classify 3D tiles only. same vice versa
  this._classifiesTerrain = type !== ClassificationType.CESIUM_3D_TILE;
  this._classifies3DTiles = type !== ClassificationType.TERRAIN;

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
  command.castShadows = false;
  command.receiveShadows = false;

  const commandList = drawCommand._commandList;

  // If in debug mode, ignore deriving commands.
  if (drawCommand._debugWireframe) {
    command.pass = Pass.OPAQUE;
    commandList.push(command);
    return;
  }

  // These show up when Pass = translucent....
  // why don't they show up under the classification passes?
  if (drawCommand._classifiesTerrain) {
    const pass = Pass.TERRAIN_CLASSIFICATION;

    const stencilDepthCommand = deriveStencilDepthCommand(command, pass);
    commandList.push(stencilDepthCommand);

    const colorCommand = deriveColorCommand(command, pass);
    commandList.push(colorCommand);
  }

  if (drawCommand._classifies3DTiles) {
    const stencilPass = Pass.CESIUM_3D_TILE_CLASSIFICATION_IGNORE_SHOW;
    const stencilDepthCommand = deriveStencilDepthCommand(command, stencilPass);
    commandList.push(stencilDepthCommand);

    const colorPass = Pass.CESIUM_3D_TILE_CLASSIFICATION;
    const stencilDepthCommand2 = deriveStencilDepthCommand(command, colorPass);
    commandList.push(stencilDepthCommand2);

    const colorCommand = deriveColorCommand(command, colorPass);
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

// why are pick commands separate ? should they be?

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
   * The model that the draw command belongs to.
   *
   * @memberof ClassificationModelDrawCommand.prototype
   * @type {ClassificationModelExperimental}
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
      return this.classificationType;
    },
  },
  /**
   * The current model matrix applied to the draw commands. If there are
   * 2D draw commands, their model matrix will be derived from the 3D one.
   *
   * @memberof ModelDrawCommand.prototype
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
      updateModelMatrix(this);
    },
  },
});

function updateModelMatrix(drawCommand) {
  const modelMatrix = drawCommand.modelMatrix;
  const boundingSphere = drawCommand._runtimePrimitive.boundingSphere;
  const commandList = drawCommand._commandList;
  const length = commandList.length;

  for (let i = 0; i < length; i++) {
    const command = commandList[i];
    command.modelMatrix = Matrix4.clone(modelMatrix, command.modelMatrix);
    command.boundingVolume = BoundingSphere.transform(
      boundingSphere,
      command.modelMatrix,
      command.boundingVolume
    );
  }
}

//const scratchNoCommands = [];

/**
 * Returns an array of the draw commands necessary to render the primitive.
 * This does not include the draw commands that render its silhouette.
 *
 * @param {FrameState} frameState The frame state.
 *
 * @returns {DrawCommand[]} The draw commands.
 *
 * @private
 */
ClassificationModelDrawCommand.prototype.getCommands = function (frameState) {
  /*

  const passes = frameState.passes;
  if (passes.render) {
    
  }*/

  // returning this._command works... so something is wrong
  // with the commands being generated.
  //return [this._command];
  return this._commandList;
};

export default ClassificationModelDrawCommand;
