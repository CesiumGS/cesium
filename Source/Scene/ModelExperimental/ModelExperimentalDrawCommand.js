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
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import StyleCommandsNeeded from "./StyleCommandsNeeded.js";
import WebGLConstants from "../../Core/WebGLConstants.js";

/**
 * A wrapper around the draw commands used to render a {@link ModelExperimentalPrimitive}.
 * This manages the derived commands and returns only the necessary commands depending
 * on the frameState.
 *
 * @param {Object} options An object containing the following options:
 * @param {DrawCommand} options.command The draw command from which to derive other commands from.
 * @param {PrimitiveRenderResources} options.primitiveRenderResources The render resources of the primitive associated with the command.
 * @param {FrameState} options.frameState
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

  this._originalCommand = command;
  this._originalCommandTranslucent = command.pass === Pass.TRANSLUCENT;

  this._modelMatrix = Matrix4.clone(
    renderResources.model.modelMatrix,
    new Matrix4()
  );
  this._primitiveBoundingSphere =
    renderResources.runtimePrimitive.boundingSphere;
  this._modelMatrixDirty = false;

  this._shadows = renderResources.model.shadows;
  this._shadowsDirty = false;

  this._commandList = [];
  this._commandList2D = [];

  const styleCommandsNeeded = renderResources.styleCommandsNeeded;

  // If the command was originally translucent then there's no need to derive
  // new commands. As of now, a style can't change an originally translucent
  // feature to opaque since the style's alpha is modulated, not a replacement.
  // When this changes, we need to derive new opaque commands in the constructor
  // of ModelExperimentalDrawCommand.
  if (defined(styleCommandsNeeded) && !this._originalCommandTranslucent) {
    const translucentCommand = deriveTranslucentCommand(command);
    switch (styleCommandsNeeded) {
      case StyleCommandsNeeded.ALL_OPAQUE:
        this._commandList.push(command);
        break;
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
    // this._commandList.push(command);
  }

  const derive2DCommands = defaultValue(options.derive2DCommands, false);
  if (derive2DCommands) {
    const length = this._commands.length;
    for (let i = 0; i < length; i++) {
      const command2D = derive2DCommand(this._commands[i]);
      this._commands2D.push(command2D);
    }
  }

  // need silhouette color and silhouette model commands
  this._commandList.push(deriveSilhouetteModelCommand(command));
  this._commandList.push(
    deriveSilhouetteColorCommand(command, renderResources, options.frameState)
  );
}

Object.defineProperties(ModelExperimentalDrawCommand.prototype, {
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
      if (Matrix4.equals(this._modelMatrix, value)) {
        return;
      }

      this._modelMatrix = Matrix4.clone(value, this._modelMatrix);
      this._modelMatrixDirty = true;
    },
  },

  /**
   * The shadowmode
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
      if (this._shadows === value) {
        return;
      }

      this._shadowsDirty = true;
    },
  },
});

const scratchMatrix2D = new Matrix4();

function updateModelMatrices(drawCommand, frameState) {
  const modelMatrix = drawCommand._modelMatrix;
  const boundingSphere = drawCommand._primitiveBoundingSphere;
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

ModelExperimentalDrawCommand.prototype.getCommands = function (
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

let silhouettesLength = 0;

function deriveSilhouetteModelCommand(command) {
  // Wrap around after exceeding the 8-bit stencil limit.
  // The reference is unique to each model until this point.
  const stencilReference = ++silhouettesLength % 255;
  const silhouetteModelCommand = DrawCommand.shallowClone(command);
  let renderState = clone(command.renderState);

  // Write the reference value into the stencil buffer.
  renderState.stencilTest = {
    enabled: true,
    frontFunction: WebGLConstants.ALWAYS,
    backFunction: WebGLConstants.ALWAYS,
    reference: stencilReference,
    mask: ~0,
    frontOperation: {
      fail: WebGLConstants.KEEP,
      zFail: WebGLConstants.KEEP,
      zPass: WebGLConstants.REPLACE,
    },
    backOperation: {
      fail: WebGLConstants.KEEP,
      zFail: WebGLConstants.KEEP,
      zPass: WebGLConstants.REPLACE,
    },
  };

  renderState = RenderState.fromCache(renderState);
  silhouetteModelCommand.renderState = renderState;

  return silhouetteModelCommand;
}

function deriveSilhouetteColorCommand(command, renderResources, frameState) {
  // Wrap around after exceeding the 8-bit stencil limit.
  // The reference is unique to each model until this point.
  const silhouetteColorCommand = DrawCommand.shallowClone(command);
  let renderState = clone(command.renderState, true);
  renderState.depthTest.enabled = true;
  renderState.cull.enabled = false;

  // Only render silhouette if the value in the stencil buffer equals the reference
  renderState.stencilTest = {
    enabled: true,
    frontFunction: WebGLConstants.NOTEQUAL,
    backFunction: WebGLConstants.NOTEQUAL,
    reference: silhouettesLength,
    mask: ~0,
    frontOperation: {
      fail: WebGLConstants.KEEP,
      zFail: WebGLConstants.KEEP,
      zPass: WebGLConstants.KEEP,
    },
    backOperation: {
      fail: WebGLConstants.KEEP,
      zFail: WebGLConstants.KEEP,
      zPass: WebGLConstants.KEEP,
    },
  };
  renderState = RenderState.fromCache(renderState);

  silhouetteColorCommand.renderState = renderState;

  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine("HAS_SILHOUETTE", undefined, ShaderDestination.BOTH);

  const silhouetteProgram = shaderBuilder.buildShaderProgram(
    frameState.context
  );
  renderResources.model._resources.push(silhouetteProgram);

  silhouetteColorCommand.shaderProgram = silhouetteProgram;
  silhouetteColorCommand.castShadows = false;
  silhouetteColorCommand.receiveShadows = false;

  return silhouetteColorCommand;
}
