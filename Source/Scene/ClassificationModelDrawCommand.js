import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
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
 * @param {ClassificationModelExperimental} options.model The classification model that the draw command belongs to.
 *
 * @alias ClassificationModelDrawCommand
 * @constructor
 *
 * @private
 */
function ClassificationModelDrawCommand(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const command = options.command;
  const model = options.model;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.command", command);
  Check.typeOf.object("options.model", model);
  //>>includeEnd('debug');

  this._command = command;
  this._model = model;
  this._debugWireframe = model._debugWireframe;

  const type = model.classificationType;
  this._classificationType = type;

  // ClassificationType has three values:
  // terrain only, 3D tiles only, and both.
  // To check if it classifies terrain, thhe simplest check is to make
  // sure it doesn't classify 3D tiles only. same vice versa
  this._classifiesTerrain = type !== ClassificationType.CESIUM_3D_TILE;
  this._classifies3DTiles = type !== ClassificationType.TERRAIN;

  this._commandList = [];

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

  // If in debug mode, ignore deriving commands.
  if (drawCommand._debugWireframe) {
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
    pass === Pass.TERRAIN ? StencilFunction.ALWAYS : StencilFunction.EQUAL;
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
});

const scratchCommands = [];

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
  const commands = scratchCommands;
  commands.length = 0;

  const passes = frameState.passes;
  if (passes.render) {
    if (this._classifiesTerrain) {
      commands.push.apply(commands, this._commandListTerrain);
    }

    if (this._classifies3DTiles) {
      commands.push.apply(commands, this._commandList3DTiles);
    }
  }

  return commands;
};
