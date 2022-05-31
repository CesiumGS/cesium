import BlendingState from "../BlendingState.js";
import BoundingSphere from "../../Core/BoundingSphere.js";
import CesiumMath from "../../Core/Math.js";
import Check from "../../Core/Check.js";
import clone from "../../Core/clone.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import DrawCommand from "../../Renderer/DrawCommand.js";
import Matrix4 from "../../Core/Matrix4.js";
import Pass from "../../Renderer/Pass.js";
import RenderState from "../../Renderer/RenderState.js";
import RuntimeError from "../../Core/RuntimeError.js";
import ShadowMode from "../ShadowMode.js";
import StyleCommandsNeeded from "./StyleCommandsNeeded.js";

/**
 * A wrapper around the draw commands used to render a {@link ModelExperimentalPrimitive}.
 * This manages the derived commands and returns only the necessary commands depending
 * on the frameState.
 *
 * @param {Object} options An object containing the following options:
 * @param {DrawCommand} options.command The draw command from which to derive other commands from.
 * @param {PrimitiveRenderResources} options.primitiveRenderResources The render resources of the primitive associated with the command.
 *
 * @alias ModelExperimentalDrawCommand
 * @constructor
 *
 * @private
 */
export default function ModelExperimentalDrawCommand(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const command = options.command;
  const renderResources = options.primitiveRenderResources;
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.command", command);
  Check.typeOf.object("options.primitiveRenderResources", renderResources);
  //>>includeEnd('debug');

  this._command = command;
  this._translucentCommand = undefined;

  this._command2D = undefined;
  this._translucentCommand2D = undefined;

  this._runtimePrimitive = renderResources.runtimePrimitive;
  this._model = this._runtimePrimitive.model;

  this._modelMatrix = Matrix4.clone(this._command.modelMatrix, new Matrix4());
  this._modelMatrixDirty = false;

  this._backFaceCulling = command.renderState.cull.enabled;
  this._shadows = renderResources.model.shadows;
  this._debugShowBoundingVolume = command.debugShowBoundingVolume;

  this._commandList = [];
  this._commandList2D = [];

  const styleCommandsNeeded = renderResources.styleCommandsNeeded;

  // If the command was originally translucent then there's no need to derive
  // new commands. As of now, a style can't change an originally translucent
  // feature to opaque since the style's alpha is modulated, not a replacement.
  // When this changes, we need to derive new opaque commands in the constructor
  // of ModelExperimentalDrawCommand.
  if (defined(styleCommandsNeeded) && command.pass !== Pass.TRANSLUCENT) {
    const translucentCommand = deriveTranslucentCommand(command);
    this._translucentCommand = translucentCommand;
    switch (styleCommandsNeeded) {
      case StyleCommandsNeeded.ALL_OPAQUE:
        this._commandList.push(command);
        break;
      case StyleCommandsNeeded.ALL_TRANSLUCENT:
        this._commandList.push(translucentCommand);
        break;
      case StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT:
        this._commandList.push(command);
        this._commandList.push(translucentCommand);
        break;
      //>>includeStart('debug', pragmas.debug);
      default:
        throw new RuntimeError("styleCommandsNeeded is not a valid value.");
      //>>includeEnd('debug');
    }
  } else {
    this._commandList.push(command);
  }

  const derive2DCommands = defaultValue(options.derive2DCommands, false);
  if (derive2DCommands) {
    const length = this._commands.length;
    for (let i = 0; i < length; i++) {
      const command2D = derive2DCommand(this._commands[i]);
      this._commands2D.push(command2D);
    }
  }
}

Object.defineProperties(ModelExperimentalDrawCommand.prototype, {
  /**
   * The main draw command that the other draw commands are derived from.
   *
   * @memberof ModelExperimentalDrawCommand.prototype
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
   * The current model matrix applied to the draw commands. If there are
   * 2D draw commands, their model matrix will be derived from the 3D one.
   *
   * @memberof ModelExperimentalDrawCommand.prototype
   * @type {Matrix4}
   *
   * @private
   */
  modelMatrix: {
    get: function () {
      return this._modelMatrix;
    },
    set: function (value) {
      this._modelMatrix = Matrix4.clone(value, this._modelMatrix);
      this._modelMatrixDirty = true;
    },
  },

  /**
   * Whether the geometry casts or receives shadows from light sources.
   *
   * @memberof ModelExperimentalDrawCommand.prototype
   * @type {ShadowMode}
   *
   * @private
   */
  shadows: {
    get: function () {
      return this._shadows;
    },
    set: function (value) {
      this._shadows = value;
      updateShadows(this);
    },
  },

  /**
   * Whether to cull back-facing geometry. When true, back face culling is
   * determined by the material's doubleSided property; when false, back face
   * culling is disabled. Back faces are not culled if the model's color is
   * translucent, or if the command is drawing translucent geometry.
   *
   * @memberof ModelExperimentalDrawCommand.prototype
   * @type {Boolean}
   *
   * @private
   */
  backFaceCulling: {
    get: function () {
      return this._backFaceCulling;
    },
    set: function (value) {
      const doubleSided = this._runtimePrimitive.primitive.material.doubleSided;
      const translucent =
        defined(this._model.color) && this._model.color.alpha < 1.0;

      const backFaceCulling = value && !doubleSided && !translucent;
      this._backFaceCulling = backFaceCulling;
      updateBackFaceCulling(this);
    },
  },

  /**
   * Whether to draw the bounding sphere associated with this draw command.
   *
   * @memberof ModelExperimentalDrawCommand.prototype
   * @type {Boolean}
   *
   * @private
   */
  debugShowBoundingVolume: {
    get: function () {
      return this._debugShowBoundingVolume;
    },
    set: function (value) {
      this._debugShowBoundingVolume = value;
      updateShowBoundingVolume(this);
    },
  },
});

function getAllCommands(drawCommand) {
  const commandList = [];
  commandList.push.apply(commandList, drawCommand._commandList);
  commandList.push.apply(commandList, drawCommand._commandList2D);
  return commandList;
}

const scratchMatrix2D = new Matrix4();

function updateModelMatrix(drawCommand, frameState) {
  const modelMatrix = drawCommand._modelMatrix;
  const boundingSphere = drawCommand._runtimePrimitive.boundingSphere;
  const commandList = drawCommand._commandList;
  const commandLength = commandList.length;

  for (let i = 0; i < commandLength; i++) {
    const command = commandList[i];
    command.modelMatrix = Matrix4.clone(modelMatrix, command.modelMatrix);
    command.boundingVolume = BoundingSphere.transform(
      boundingSphere,
      command.modelMatrix,
      command.boundingVolume
    );
  }

  const modelMatrix2D = Matrix4.clone(modelMatrix, scratchMatrix2D);
  modelMatrix2D[13] -=
    CesiumMath.sign(drawCommand._modelMatrix[13]) *
    2.0 *
    CesiumMath.PI *
    frameState.mapProjection.ellipsoid.maximumRadius;
}

function updateShadows(drawCommand) {
  const shadows = drawCommand._shadows;
  const castShadows = ShadowMode.castShadows(shadows);
  const receiveShadows = ShadowMode.receiveShadows(shadows);

  const commandList = getAllCommands(drawCommand);
  const commandLength = commandList.length;
  for (let i = 0; i < commandLength; i++) {
    const command = commandList[i];
    command.castShadows = castShadows;
    command.receiveShadows = receiveShadows;
  }
}

function updateBackFaceCulling(drawCommand) {
  const backFaceCulling = drawCommand._backFaceCulling;
  const commandList = getAllCommands(drawCommand);
  const commandLength = commandList.length;

  for (let i = 0; i < commandLength; i++) {
    const command = commandList[i];

    // Back-face culling should stay disabled if the command
    // is drawing translucent geometry.
    if (command.pass === Pass.TRANSLUCENT) {
      continue;
    }
    const renderState = clone(command.renderState, true);
    renderState.cull.enabled = backFaceCulling;
    command.renderState = RenderState.fromCache(renderState);
  }
}

function updateShowBoundingVolume(drawCommand) {
  const debugShowBoundingVolume = drawCommand._debugShowBoundingVolume;

  const commandList = getAllCommands(drawCommand);
  const commandLength = commandList.length;
  for (let i = 0; i < commandLength; i++) {
    const command = commandList[i];
    command.debugShowBoundingVolume = debugShowBoundingVolume;
  }
}

/**
 * Returns an array of the draw commands necessary to render the primitive.
 *
 * @param {FrameState} frameState The frame state.
 *
 * @returns {DrawCommand[]} The draw commands.
 *
 * @private
 */
ModelExperimentalDrawCommand.prototype.getCommands = function (
  frameState,
  use2DCommands
) {
  /**
  if (use2DCommands && this._commandList2D.length === 0) {
    // derive commands
  }*/

  if (this._modelMatrixDirty) {
    updateModelMatrix(this, frameState);
    this._modelMatrixDirty = false;
  }

  const commands = [];
  commands.push.apply(commands, this._commandList);

  if (use2DCommands) {
    commands.push.apply(commands, this._commandList2D);
  }

  return commands;
};

/**
 * @private
 */
function deriveTranslucentCommand(command) {
  const derivedCommand = DrawCommand.shallowClone(command);
  derivedCommand.pass = Pass.TRANSLUCENT;
  const rs = clone(command.renderState, true);
  rs.cull.enabled = false;
  rs.depthTest.enabled = true;
  rs.depthMask = false;
  rs.blending = BlendingState.ALPHA_BLEND;
  derivedCommand.renderState = RenderState.fromCache(rs);

  return derivedCommand;
}

/**
 * If the model crosses the IDL in 2D, it will be drawn in one viewport but get
 * clipped by the other viewport. We create a second command that translates
 * the model matrix to the opposite side of the map so the part that was clipped
 * in one viewport is drawn in the other.
 *
 * @private
 */
function derive2DCommand(command) {
  const derivedCommand = DrawCommand.shallowClone(command);

  // These will be computed in updateModelMatrix()
  derivedCommand.modelMatrix = new Matrix4();
  derivedCommand.boundingSphere = new BoundingSphere();

  return derivedCommand;
}
