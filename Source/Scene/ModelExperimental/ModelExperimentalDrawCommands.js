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
import StyleCommandsNeeded from "./StyleCommandsNeeded.js";

/**
 * A wrapper around the draw commands used to render a {@link ModelExperimentalPrimitive}.
 * This manages the derived commands and returns only the necessary commands depending
 * on the frameState.
 *
 * @param {Object} options An object containing the following options:
 * @param {DrawCommand} options.command The draw command from which to derive other commands from.
 * @param {PrimitiveRenderResources} options.primitiveRenderResources The render resources of the primitive associated with the command.
 * @param {BoundingSphere} options.primitiveBoundingSphere
 *
 * @alias ModelExperimentalDrawCommands
 * @constructor
 *
 * @private
 */
export default function ModelExperimentalDrawCommands(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const command = options.command;
  const renderResources = options.primitiveRenderResources;
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.command", command);
  Check.typeOf.object("options.primitiveRenderResources", renderResources);
  //Check.typeOf.object("options.primitiveBoundingSphere", boundingSphere);
  //>>includeEnd('debug');

  this._originalCommand = command;
  this._originalCommandTranslucent = command.pass === Pass.TRANSLUCENT;

  this._modelMatrix = Matrix4.clone(
    renderResources.model.modelMatrix,
    new Matrix4()
  );
  this._primitiveBoundingSphere =
    renderResources.runtimePrimitive.boundingSphere;
  this._modelMatrixDirty = false;

  this._commandList = [];
  this._commandList2D = [];

  const styleCommandsNeeded = renderResources.styleCommandsNeeded;

  // If the command was originally translucent then there's no need to derive
  // new commands. As of now, a style can't change an originally translucent
  // feature to opaque since the style's alpha is modulated, not a replacement.
  // When this changes, we need to derive new opaque commands in the constructor
  // of ModelExperimentalDrawCommands.
  if (defined(styleCommandsNeeded) && !this._originalCommandTranslucent) {
    const translucentCommand = deriveTranslucentCommand(command);
    switch (styleCommandsNeeded) {
      case StyleCommandsNeeded.ALL_TRANSLUCENT:
        this._commandList.push(translucentCommand);
        break;
      case styleCommandsNeeded.OPAQUE_AND_TRANSLUCENT:
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

Object.defineProperties(ModelExperimentalDrawCommands.prototype, {
  /**
   * The current model matrix applied to the draw commands. If there are
   * 2D draw commands, their model matrix will be derived from the 3D one.
   *
   * @memberof ModelExperimentalDrawCommands.prototype
   * @type {Matrix4}
   *
   * @private
   */
  modelMatrix: {
    get: function () {
      return this._modelMatrix;
    },
    set: function (value) {
      if (Matrix4.equals(this._modelMatrix, value)) {
        return;
      }

      this._modelMatrix = Matrix4.clone(value, this._modelMatrix);
      this._modelMatrixDirty = true;
    },
  },
});

const scratchMatrix2D = new Matrix4();

function updateModelMatrices(drawCommands, frameState) {
  const modelMatrix = drawCommands._modelMatrix;
  const boundingSphere = drawCommands._primitiveBoundingSphere;
  const commandList = drawCommands._commandList;
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
    CesiumMath.sign(drawCommands._modelMatrix[13]) *
    2.0 *
    CesiumMath.PI *
    frameState.mapProjection.ellipsoid.maximumRadius;
}

ModelExperimentalDrawCommands.prototype.getCommands = function (
  frameState,
  use2DCommands
) {
  /*if(use2DCommands && this._commandList2D.length === 0) {
    
  }*/

  if (this._modelMatrixDirty) {
    updateModelMatrices(this, frameState);
    this._modelMatrixDirty = false;
  }

  return this._commandList;
};

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

// If the model crosses the IDL in 2D, it will be drawn in one viewport, but part of it
// will be clipped by the viewport. We create a second command that translates the model
// model matrix to the opposite side of the map so the part that was clipped in one viewport
// is drawn in the other.
function derive2DCommand(command) {
  const derivedCommand = DrawCommand.shallowClone(command);
  derivedCommand.modelMatrix = new Matrix4();
  derivedCommand.boundingSphere = new BoundingSphere();
  return derivedCommand;
}
