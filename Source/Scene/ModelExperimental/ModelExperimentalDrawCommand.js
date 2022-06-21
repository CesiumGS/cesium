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
import SceneMode from "../SceneMode.js";
import ShadowMode from "../ShadowMode.js";
import StyleCommandsNeeded from "./StyleCommandsNeeded.js";
import WebGLConstants from "../../Core/WebGLConstants.js";

/**
 * A wrapper around the draw commands used to render a {@link ModelExperimentalPrimitive}.
 * This manages the derived commands and returns only the necessary commands depending
 * on the given frame state.
 *
 * @param {Object} options An object containing the following options:
 * @param {DrawCommand} options.command The draw command from which to derive other commands from.
 * @param {PrimitiveRenderResources} options.primitiveRenderResources The render resources of the primitive associated with the command.
 * @param {Boolean} [options.useSilhouetteCommands=false] Whether the model has a silhouette and needs to derive silhouette commands.
 * @alias ModelExperimentalDrawCommand
 * @constructor
 *
 * @private
 */
function ModelExperimentalDrawCommand(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const command = options.command;
  const renderResources = options.primitiveRenderResources;
  const useSilhouetteCommands = defaultValue(
    options.useSilhouetteCommands,
    false
  );

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.command", command);
  Check.typeOf.object("options.primitiveRenderResources", renderResources);
  //>>includeEnd('debug');

  this._command = command;

  // Only derived if the original command wasn't translucent and the model's style
  // has translucency.
  this._translucentCommand = undefined;

  this._modelMatrix = Matrix4.clone(command.modelMatrix, new Matrix4());

  // The 2D projection of the model matrix depends on the frame state's
  // map projection, so it must be updated when the commands are being
  // retrieved in getCommands.
  this._modelMatrix2DDirty = false;

  this._styleCommandsNeeded = renderResources.styleCommandsNeeded;
  this._backFaceCulling = command.renderState.cull.enabled;
  this._cullFace = command.renderState.cull.face;
  this._shadows = renderResources.model.shadows;
  this._debugShowBoundingVolume = command.debugShowBoundingVolume;
  this._useSilhouetteCommands = useSilhouetteCommands;

  this._commandList = [];
  this._commandList2D = [];

  this._runtimePrimitive = renderResources.runtimePrimitive;
  this._model = renderResources.model;

  initialize(this);
}

function initialize(drawCommand) {
  const command = drawCommand._command;
  const styleCommandsNeeded = drawCommand._styleCommandsNeeded;

  // If the command was originally translucent then there's no need to derive
  // new commands. As of now, a style can't change an originally translucent
  // feature to opaque since the style's alpha is modulated, not a replacement.
  // When this changes, we need to derive new opaque commands in the constructor
  // of ModelExperimentalDrawCommand.
  if (defined(styleCommandsNeeded) && command.pass !== Pass.TRANSLUCENT) {
    const translucentCommand = deriveTranslucentCommand(command);
    switch (styleCommandsNeeded) {
      case StyleCommandsNeeded.ALL_OPAQUE:
        break;
      case StyleCommandsNeeded.ALL_TRANSLUCENT:
      case StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT:
        drawCommand._translucentCommand = translucentCommand;
        break;
      //>>includeStart('debug', pragmas.debug);
      default:
        throw new RuntimeError("styleCommandsNeeded is not a valid value.");
      //>>includeEnd('debug');
    }
  }

  buildCommandList(drawCommand);
}

Object.defineProperties(ModelExperimentalDrawCommand.prototype, {
  /**
   * The main draw command that the other commands are derived from.
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
   * The runtime primitive that the draw command belongs to.
   *
   * @memberof ModelExperimentalDrawCommand.prototype
   * @type {ModelExperimentalPrimitive}
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
   * @memberof ModelExperimentalDrawCommand.prototype
   * @type {ModelExperimental}
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
   * The primitive type of the main draw command.
   *
   * @memberof ModelExperimentalDrawCommand.prototype
   * @type {PrimitiveType}
   *
   * @readonly
   * @private
   */
  primitiveType: {
    get: function () {
      return this._command.primitiveType;
    },
  },

  /**
   * The current model matrix applied to the draw commands. If there are
   * 2D draw commands, their model matrix will be derived from the 3D one.
   *
   * @memberof ModelExperimentalDrawCommand.prototype
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
      this._modelMatrix2DDirty = true;
      updateModelMatrix(this);
    },
  },

  /**
   * The bounding volume of the main draw command. This is equivalent
   * to the the primitive's bounding sphere transformed by the draw
   * command's model matrix.
   *
   * @memberof ModelExperimentalDrawCommand.prototype
   * @type {BoundingSphere}
   *
   * @readonly
   * @private
   */
  boundingVolume: {
    get: function () {
      return this._command.boundingVolume;
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
   * translucent, if the command is drawing translucent geometry, or if the
   * model is being drawn with a silhouette.
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
      if (this._backFaceCulling === value) {
        return;
      }

      this._backFaceCulling = value;
      updateBackFaceCulling(this);
    },
  },

  /**
   * Determines which faces to cull, if culling is enabled.
   *
   * @memberof ModelExperimentalDrawCommand.prototype
   * @type {CullFace}
   *
   * @private
   */
  cullFace: {
    get: function () {
      return this._cullFace;
    },
    set: function (value) {
      if (this._cullFace === value) {
        return;
      }

      this._cullFace = value;
      updateCullFace(this);
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
      if (this._debugShowBoundingVolume === value) {
        return;
      }

      this._debugShowBoundingVolume = value;
      updateShowBoundingVolume(this);
    },
  },
});

function buildCommandList(drawCommand) {
  const commandList = drawCommand._commandList;
  const commandList2D = drawCommand._commandList2D;
  commandList.length = 0;
  commandList2D.length = 0;

  // Add opaque and translucent commands depending on the style commands needed.
  const styleCommandsNeeded = drawCommand._styleCommandsNeeded;
  const originalCommand = drawCommand._command;
  const translucentCommand = drawCommand._translucentCommand;
  if (defined(styleCommandsNeeded) && defined(translucentCommand)) {
    switch (styleCommandsNeeded) {
      case StyleCommandsNeeded.ALL_OPAQUE:
        commandList.push(originalCommand);
        break;
      case StyleCommandsNeeded.ALL_TRANSLUCENT:
        commandList.push(translucentCommand);
        break;
      case StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT:
        commandList.push(originalCommand, translucentCommand);
        break;
      //>>includeStart('debug', pragmas.debug);
      default:
        throw new RuntimeError("styleCommandsNeeded is not a valid value.");
      //>>includeEnd('debug');
    }
  } else {
    commandList.push(originalCommand);
  }

  // Derive silhouette commands from the active commands.
  if (drawCommand._useSilhouetteCommands) {
    const length = commandList.length;
    const silhouetteCommands = [];
    const model = drawCommand._model;
    for (let i = 0; i < length; i++) {
      const command = commandList[i];
      const silhouetteModelCommand = deriveSilhouetteModelCommand(
        command,
        model
      );
      const silhouetteColorCommand = deriveSilhouetteColorCommand(
        command,
        model
      );
      silhouetteCommands.push(silhouetteModelCommand);
      silhouetteCommands.push(silhouetteColorCommand);
    }

    // Replace the original command list.
    commandList.length = 0;
    commandList.push.apply(commandList, silhouetteCommands);
  }
}

function getAllCommands(drawCommand) {
  const commandList = [];
  commandList.push.apply(commandList, drawCommand._commandList);
  commandList.push.apply(commandList, drawCommand._commandList2D);
  return commandList;
}

const scratchMatrix2D = new Matrix4();

function updateModelMatrix(drawCommand) {
  const modelMatrix = drawCommand.modelMatrix;
  const boundingSphere = drawCommand.runtimePrimitive.boundingSphere;
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

function updateModelMatrix2D(drawCommand, frameState) {
  const modelMatrix = drawCommand.modelMatrix;
  const boundingSphere = drawCommand.runtimePrimitive.boundingSphere;
  const commandList2D = drawCommand._commandList2D;
  const length2D = commandList2D.length;
  if (length2D === 0) {
    return;
  }

  const modelMatrix2D = Matrix4.clone(modelMatrix, scratchMatrix2D);

  // Change the translation's y-component so it appears on the opposite side
  // of the map.
  modelMatrix2D[13] -=
    CesiumMath.sign(modelMatrix[13]) *
    2.0 *
    CesiumMath.PI *
    frameState.mapProjection.ellipsoid.maximumRadius;

  for (let i = 0; i < length2D; i++) {
    const command = commandList2D[i];
    command.modelMatrix = Matrix4.clone(modelMatrix2D, command.modelMatrix);
    command.boundingVolume = BoundingSphere.transform(
      boundingSphere,
      command.modelMatrix,
      command.boundingVolume
    );
  }
}

function updateShadows(drawCommand) {
  const shadows = drawCommand.shadows;
  const castShadows = ShadowMode.castShadows(shadows);
  const receiveShadows = ShadowMode.receiveShadows(shadows);

  const commandList = getAllCommands(drawCommand);
  const commandLength = commandList.length;
  for (let i = 0; i < commandLength; i++) {
    const command = commandList[i];

    // Shadows should stay disabled for the silhouette color command.
    const model_silhouettePass = command.uniformMap.model_silhouettePass;
    if (defined(model_silhouettePass) && model_silhouettePass() > 0.0) {
      continue;
    }

    command.castShadows = castShadows;
    command.receiveShadows = receiveShadows;
  }
}

function updateBackFaceCulling(drawCommand) {
  let backFaceCulling = drawCommand.backFaceCulling;
  const doubleSided =
    drawCommand.runtimePrimitive.primitive.material.doubleSided;
  const translucent = drawCommand._model.isTranslucent();
  const useSilhouetteCommands = drawCommand._useSilhouetteCommands;
  backFaceCulling =
    backFaceCulling && !doubleSided && !translucent && !useSilhouetteCommands;

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

function updateCullFace(drawCommand) {
  const cullFace = drawCommand.cullFace;
  const commandList = getAllCommands(drawCommand);
  const commandLength = commandList.length;

  for (let i = 0; i < commandLength; i++) {
    const command = commandList[i];
    const renderState = clone(command.renderState, true);
    renderState.cull.face = cullFace;
    command.renderState = RenderState.fromCache(renderState);
  }
}

function updateShowBoundingVolume(drawCommand) {
  const debugShowBoundingVolume = drawCommand.debugShowBoundingVolume;

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
ModelExperimentalDrawCommand.prototype.getCommands = function (frameState) {
  const commandList = this._commandList;
  const commandList2D = this._commandList2D;

  const use2D = shouldUse2DCommands(this, frameState);

  if (use2D && commandList2D.length === 0) {
    const length = commandList.length;
    for (let i = 0; i < length; i++) {
      const command2D = derive2DCommand(commandList[i]);
      commandList2D.push(command2D);
    }

    this._modelMatrix2DDirty = true;
  }

  if (this._modelMatrix2DDirty) {
    updateModelMatrix2D(this, frameState);
    this._modelMatrix2DDirty = false;
  }

  const commands = [];
  commands.push.apply(commands, commandList);

  if (use2D) {
    commands.push.apply(commands, commandList2D);
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
 * @param {DrawCommand} command The original draw command.
 *
 * @returns {DrawCommand} The derived command for rendering across the IDL in 2D.
 *
 * @private
 */
function derive2DCommand(command) {
  const derivedCommand = DrawCommand.shallowClone(command);

  // These will be computed in updateModelMatrix2D()
  derivedCommand.modelMatrix = new Matrix4();
  derivedCommand.boundingVolume = new BoundingSphere();

  return derivedCommand;
}

/**
 * Tracks how many silhouettes have been created. This value is used to
 * assign a reference number to the stencil.
 *
 * @type {Number}
 * @private
 */
ModelExperimentalDrawCommand.silhouettesLength = 0;

function deriveSilhouetteModelCommand(command, model) {
  // Wrap around after exceeding the 8-bit stencil limit.
  // The reference is unique to each model until this point.
  const stencilReference =
    ++ModelExperimentalDrawCommand.silhouettesLength % 255;
  const silhouetteModelCommand = DrawCommand.shallowClone(command);
  let renderState = clone(command.renderState, true);

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

  if (model.isInvisible()) {
    // When the model is invisible, disable color and depth writes,
    // but still write into the stencil buffer.
    renderState.colorMask = {
      red: false,
      green: false,
      blue: false,
      alpha: false,
    };
    renderState.depthMask = false;
  }

  renderState = RenderState.fromCache(renderState);
  silhouetteModelCommand.renderState = renderState;

  return silhouetteModelCommand;
}

function deriveSilhouetteColorCommand(command, model) {
  // Wrap around after exceeding the 8-bit stencil limit.
  // The reference is unique to each model until this point.
  const stencilReference = ModelExperimentalDrawCommand.silhouettesLength % 255;
  const silhouetteColorCommand = DrawCommand.shallowClone(command);
  let renderState = clone(command.renderState, true);
  renderState.depthTest.enabled = true;
  renderState.cull.enabled = false;

  // Render the silhouette in the translucent pass if the command is translucent
  // or if the silhouette color is translucent. This accounts for translucent
  // model color, since ModelColorPipelineStage sets the pass to translucent.
  const silhouetteTranslucent =
    command.pass === Pass.TRANSLUCENT || model.silhouetteColor.alpha < 1.0;
  if (silhouetteTranslucent) {
    silhouetteColorCommand.pass = Pass.TRANSLUCENT;
    renderState.depthMask = false;
    renderState.blending = BlendingState.ALPHA_BLEND;
  }

  // Only render the pixels of the silhouette that don't conflict with the stencil buffer.
  // This way, the silhouette doesn't render over the original model.
  renderState.stencilTest = {
    enabled: true,
    frontFunction: WebGLConstants.NOTEQUAL,
    backFunction: WebGLConstants.NOTEQUAL,
    reference: stencilReference,
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

  const uniformMap = clone(command.uniformMap);
  uniformMap.model_silhouettePass = function () {
    return true;
  };

  silhouetteColorCommand.renderState = renderState;
  silhouetteColorCommand.uniformMap = uniformMap;
  silhouetteColorCommand.castShadows = false;
  silhouetteColorCommand.receiveShadows = false;

  return silhouetteColorCommand;
}

function shouldUse2DCommands(drawCommand, frameState) {
  if (frameState.mode !== SceneMode.SCENE2D || drawCommand.model._projectTo2D) {
    return false;
  }

  const idl2D =
    frameState.mapProjection.ellipsoid.maximumRadius * CesiumMath.PI;

  // Using the draw command's bounding sphere might cause primitives to not render
  // over the IDL, even if they are part of the same model.
  const model = drawCommand.model;
  const boundingSphere = model.sceneGraph._boundingSphere2D;
  const left = boundingSphere.center.y - boundingSphere.radius;
  const right = boundingSphere.center.y + boundingSphere.radius;

  return (left < idl2D && right > idl2D) || (left < -idl2D && right > -idl2D);
}

export default ModelExperimentalDrawCommand;
