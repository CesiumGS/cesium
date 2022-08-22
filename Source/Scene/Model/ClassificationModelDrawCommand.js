import BoundingSphere from "../../Core/BoundingSphere.js";
import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";
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

  this._useDebugWireframe = model._enableDebugWireframe && model.debugWireframe;

  this._commandListTerrain = [];
  this._commandList3DTiles = [];
  this._commandListIgnoreShow = []; // Used for inverted classification.
  this._commandListDebugWireframe = [];

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

  // If debug wireframe is enabled, don't derive any new commands.
  // Render normally in the opaque pass.
  if (drawCommand._useDebugWireframe) {
    command.pass = Pass.OPAQUE;

    drawCommand._commandListDebugWireframe = createBatchCommands(
      drawCommand,
      [command],
      drawCommand._commandListDebugWireframe
    );

    const commandList = drawCommand._commandListDebugWireframe;
    const length = commandList.length;
    for (let i = 0; i < length; i++) {
      // The lengths / offsets of the batches have to be adjusted for wireframe.
      // Only PrimitiveType.TRIANGLES is allowed for classification, so this
      // just requires doubling the values for the batches.
      const command = commandList[i];
      command.count *= 2;
      command.offset *= 2;
    }

    return;
  }

  if (drawCommand._classifiesTerrain) {
    const pass = Pass.TERRAIN_CLASSIFICATION;
    const stencilDepthCommand = deriveStencilDepthCommand(command, pass);
    const colorCommand = deriveColorCommand(command, pass);
    const terrainCommands = [stencilDepthCommand, colorCommand];

    drawCommand._commandListTerrain = createBatchCommands(
      drawCommand,
      terrainCommands,
      drawCommand._commandListTerrain
    );
  }

  if (drawCommand._classifies3DTiles) {
    const pass = Pass.CESIUM_3D_TILE_CLASSIFICATION;
    const stencilDepthCommand = deriveStencilDepthCommand(command, pass);
    const colorCommand = deriveColorCommand(command, pass);
    const tilesCommands = [stencilDepthCommand, colorCommand];

    drawCommand._commandList3DTiles = createBatchCommands(
      drawCommand,
      tilesCommands,
      drawCommand._commandList3DTiles
    );
  }
}

function createBatchCommands(drawCommand, derivedCommands, result) {
  const runtimePrimitive = drawCommand._runtimePrimitive;
  const batchLengths = runtimePrimitive.batchLengths;
  const batchOffsets = runtimePrimitive.batchOffsets;

  const numBatches = batchLengths.length;
  const numDerivedCommands = derivedCommands.length;
  for (let i = 0; i < numBatches; i++) {
    const batchLength = batchLengths[i];
    const batchOffset = batchOffsets[i];
    // For multiple derived commands (e.g. stencil and color commands),
    // they must be added in a certain order even within the batches.
    for (let j = 0; j < numDerivedCommands; j++) {
      const derivedCommand = derivedCommands[j];
      const batchCommand = DrawCommand.shallowClone(derivedCommand);
      batchCommand.count = batchLength;
      batchCommand.offset = batchOffset;
      result.push(batchCommand);
    }
  }

  return result;
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
   * The batch lengths used to generate multiple draw commands.
   *
   * @memberof ClassificationModelDrawCommand.prototype
   * @type {Number[]}
   *
   * @readonly
   * @private
   */
  batchLengths: {
    get: function () {
      return this._runtimePrimitive.batchLengths;
    },
  },

  /**
   * The batch offsets used to generate multiple draw commands.
   *
   * @memberof ClassificationModelDrawCommand.prototype
   * @type {Number[]}
   *
   * @readonly
   * @private
   */
  batchOffsets: {
    get: function () {
      return this._runtimePrimitive.batchOffsets;
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
  if (this._useDebugWireframe) {
    result.push.apply(result, this._commandListDebugWireframe);
    return;
  }

  if (this._classifiesTerrain) {
    result.push.apply(result, this._commandListTerrain);
  }

  if (this._classifies3DTiles) {
    result.push.apply(result, this._commandList3DTiles);
  }

  const useIgnoreShowCommands =
    frameState.invertClassification && this._classifies3DTiles;
  if (useIgnoreShowCommands) {
    if (this._commandListIgnoreShow.length === 0) {
      const pass = Pass.CESIUM_3D_TILE_CLASSIFICATION_IGNORE_SHOW;
      const command = deriveStencilDepthCommand(this._command, pass);
      this._commandListIgnoreShow = createBatchCommands(
        this,
        [command],
        this._commandListIgnoreShow
      );
    }

    result.push.apply(result, this._commandListIgnoreShow);
  }

  return result;
};

export default ClassificationModelDrawCommand;
