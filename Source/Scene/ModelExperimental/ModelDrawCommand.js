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
import SceneMode from "../SceneMode.js";
import ShadowMode from "../ShadowMode.js";
import StyleCommandsNeeded from "./StyleCommandsNeeded.js";
import WebGLConstants from "../../Core/WebGLConstants.js";
import CullFace from "./CullFace.js";
import Cartesian2 from "../../Core/Cartesian2.js";
import StencilConstants from "../StencilConstants.js";
import StencilFunction from "../StencilFunction.js";
import StencilOperation from "../StencilOperation.js";

/**
 * A wrapper around the draw commands used to render a {@link ModelRuntimePrimitive}.
 * This manages the derived commands and pushes only the necessary commands depending
 * on the given frame state.
 *
 * @param {Object} options An object containing the following options:
 * @param {DrawCommand} options.command The draw command from which to derive other commands from.
 * @param {PrimitiveRenderResources} options.primitiveRenderResources The render resources of the primitive associated with the command.
 * @param {FrameState} options.frameState The frame state at the time the command is created.
 *
 * @alias ModelDrawCommand
 * @constructor
 *
 * @private
 */
function ModelDrawCommand(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const command = options.command;
  const renderResources = options.primitiveRenderResources;
  const frameState = options.frameState;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.command", command);
  Check.typeOf.object("options.primitiveRenderResources", renderResources);
  Check.typeOf.object("options.frameState", frameState);
  //>>includeEnd('debug');

  const model = renderResources.model;
  const translucent = command.pass === Pass.TRANSLUCENT;
  const doubleSided = command.runtimePrimitive.primitive.material.doubleSided;
  const usesBackFaceCulling = !doubleSided && !translucent;
  const hasOpaqueAndTranslucentFeatures =
    renderResources.styleCommandsNeeded ===
    StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT;

  // If the command was originally translucent then there's no need to derive
  // new commands. As of now, a style can't change an originally translucent
  // feature to opaque since the style's alpha is modulated, not a replacement.
  // When this changes, we need to derive new opaque commands in the constructor
  // of ModelExperimentalDrawCommand.
  const needsTranslucentCommand =
    hasOpaqueAndTranslucentFeatures && !translucent;

  const needsSkipLevelOfDetailCommands =
    model.hasSkipLevelOfDetail(options.frameState) && !translucent;

  const needsSilhouetteCommands = model.hasSilhouette(options.frameState);

  this._command = command;

  // Derived commands
  this._originalCommand = undefined;
  this._translucentCommand = undefined;
  this._skipLodBackfaceCommand = undefined;
  this._skipLodStencilCommand = undefined;
  this._silhouetteModelCommand = undefined;
  this._silhouetteColorCommand = undefined;

  // All derived commands (including 2D commands)
  this._derivedCommands = [];
  this._has2DCommands = false;

  this._modelMatrix = Matrix4.clone(command.modelMatrix, new Matrix4());

  // The 2D projection of the model matrix depends on the frame state's
  // map projection, so it must be updated when the commands are being
  // retrieved in getCommands.
  this._modelMatrix2DDirty = false;

  this._backFaceCulling = command.renderState.cull.enabled;
  this._cullFace = command.renderState.cull.face;
  this._shadows = renderResources.model.shadows;
  this._debugShowBoundingVolume = command.debugShowBoundingVolume;

  this._usesBackFaceCulling = usesBackFaceCulling;
  this._needsTranslucentCommand = needsTranslucentCommand;
  this._needsSkipLevelOfDetailCommands = needsSkipLevelOfDetailCommands;
  this._needsSilhouetteCommands = needsSilhouetteCommands;
  this._runtimePrimitive = renderResources.runtimePrimitive;
  this._model = renderResources.model;

  initialize(this);
}

function ModelExperimentalDerivedCommand(options) {
  this.command = options.command;
  this.updateShadows = options.updateShadows;
  this.updateBackFaceCulling = options.updateBackFaceCulling;
  this.updateCullFace = options.updateCullFace;
  this.updateDebugShowBoundingVolume = options.updateDebugShowBoundingVolume;
  this.is2D = false;
  this.derivedCommand2D = undefined;
}

ModelExperimentalDerivedCommand.clone = function (derivedCommand) {
  return new ModelExperimentalDerivedCommand({
    command: derivedCommand.command,
    updateShadows: derivedCommand.updateShadows,
    updateBackFaceCulling: derivedCommand.updateBackFaceCulling,
    updateCullFace: derivedCommand.updateCullFace,
    updateDebugShowBoundingVolume: derivedCommand.updateDebugShowBoundingVolume,
    is2D: derivedCommand.is2D,
    derivedCommand2D: derivedCommand.derivedCommand2D,
  });
};

function initialize(drawCommand) {
  const command = drawCommand._command;
  const model = drawCommand._model;
  const usesBackFaceCulling = drawCommand._usesBackFaceCulling;

  drawCommand._originalCommand = new ModelExperimentalDerivedCommand({
    command: command,
    updateShadows: true,
    updateBackFaceCulling: usesBackFaceCulling,
    updateCullFace: usesBackFaceCulling,
    updateDebugShowBoundingVolume: true,
    is2D: false,
  });

  drawCommand._derivedCommands.push(drawCommand._originalCommand);

  if (drawCommand._needsTranslucentCommand) {
    drawCommand._translucentCommand = new ModelExperimentalDerivedCommand({
      command: deriveTranslucentCommand(command),
      updateShadows: true,
      updateBackFaceCulling: false,
      updateCullFace: false,
      updateDebugShowBoundingVolume: true,
    });
    drawCommand._derivedCommands.push(drawCommand._translucentCommand);
  }

  if (drawCommand._needsSkipLevelOfDetailCommands) {
    drawCommand._skipLodBackfaceCommand = new ModelExperimentalDerivedCommand({
      command: deriveSkipLodBackfaceCommand(command),
      updateShadows: false,
      updateBackFaceCulling: false,
      updateCullFace: usesBackFaceCulling,
      updateDebugShowBoundingVolume: false,
    });
    drawCommand._derivedCommands.push(drawCommand._skipLodBackfaceCommand);

    drawCommand._skipLodStencilCommand = new ModelExperimentalDerivedCommand({
      command: deriveSkipLodStencilCommand(command, model),
      updateShadows: true,
      updateBackFaceCulling: usesBackFaceCulling,
      updateCullFace: usesBackFaceCulling,
      updateDebugShowBoundingVolume: true,
    });
    drawCommand._derivedCommands.push(drawCommand._skipLodStencilCommand);
  }

  if (drawCommand._needsSilhouetteCommands) {
    drawCommand._silhouetteModelCommand = new ModelExperimentalDerivedCommand({
      command: deriveSilhouetteModelCommand(command, model),
      updateShadows: true,
      updateBackFaceCulling: usesBackFaceCulling,
      updateCullFace: usesBackFaceCulling,
      updateDebugShowBoundingVolume: true,
    });
    drawCommand._derivedCommands.push(drawCommand._silhouetteModelCommand);

    drawCommand._silhouetteColorCommand = new ModelExperimentalDerivedCommand({
      command: deriveSilhouetteColorCommand(command, model),
      updateShadows: false,
      updateBackFaceCulling: false,
      updateCullFace: false,
      updateDebugShowBoundingVolume: false,
    });
    drawCommand._derivedCommands.push(drawCommand._silhouetteColorCommand);
  }
}

Object.defineProperties(ModelDrawCommand.prototype, {
  /**
   * The main draw command that the other commands are derived from.
   *
   * @memberof ModelDrawCommand.prototype
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
   * @memberof ModelDrawCommand.prototype
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
   * @memberof ModelDrawCommand.prototype
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
   * @memberof ModelDrawCommand.prototype
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
      this._modelMatrix2DDirty = true;
      updateModelMatrix(this);
    },
  },

  /**
   * The bounding volume of the main draw command. This is equivalent
   * to the the primitive's bounding sphere transformed by the draw
   * command's model matrix.
   *
   * @memberof ModelDrawCommand.prototype
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
   * @memberof ModelDrawCommand.prototype
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
   * culling is disabled. Back faces are not culled if the command is
   * translucent.
   *
   * @memberof ModelDrawCommand.prototype
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
   * @memberof ModelDrawCommand.prototype
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
   * @memberof ModelDrawCommand.prototype
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
      updateDebugShowBoundingVolume(this);
    },
  },
});

const scratchMatrix2D = new Matrix4();
const scratchBoundingSphere = new BoundingSphere();

function updateCommandMatrix(derivedCommand, modelMatrix, boundingSphere) {
  const command = derivedCommand.command;
  command.modelMatrix = Matrix4.clone(modelMatrix, command.modelMatrix);
  command.boundingVolume = BoundingSphere.clone(
    boundingSphere,
    command.boundingVolume
  );
}

function updateModelMatrix(drawCommand) {
  const modelMatrix = drawCommand.modelMatrix;

  const boundingSphere = BoundingSphere.transform(
    drawCommand.runtimePrimitive.boundingSphere,
    modelMatrix,
    scratchBoundingSphere
  );

  const derivedCommands = drawCommand._derivedCommands;
  const length = derivedCommands.length;

  for (let i = 0; i < length; ++i) {
    const derivedCommand = derivedCommands[i];
    if (!derivedCommand.is2D) {
      updateCommandMatrix(derivedCommand, modelMatrix, boundingSphere);
    }
  }
}

function updateModelMatrix2D(drawCommand, frameState) {
  const modelMatrix = drawCommand.modelMatrix;

  const modelMatrix2D = Matrix4.clone(modelMatrix, scratchMatrix2D);

  // Change the translation's y-component so it appears on the opposite side
  // of the map.
  modelMatrix2D[13] -=
    CesiumMath.sign(modelMatrix[13]) *
    2.0 *
    CesiumMath.PI *
    frameState.mapProjection.ellipsoid.maximumRadius;

  const boundingSphere2D = BoundingSphere.transform(
    drawCommand.runtimePrimitive.boundingSphere,
    modelMatrix2D,
    scratchBoundingSphere
  );

  const derivedCommands = drawCommand._derivedCommands;
  const length = derivedCommands.length;

  for (let i = 0; i < length; ++i) {
    const derivedCommand = derivedCommands[i];
    if (derivedCommand.is2D) {
      updateCommandMatrix(derivedCommand, modelMatrix2D, boundingSphere2D);
    }
  }
}

function updateShadows(drawCommand) {
  const shadows = drawCommand.shadows;
  const castShadows = ShadowMode.castShadows(shadows);
  const receiveShadows = ShadowMode.receiveShadows(shadows);

  const derivedCommands = drawCommand._derivedCommands;
  const length = derivedCommands.length;

  for (let i = 0; i < length; ++i) {
    const derivedCommand = derivedCommands[i];
    if (derivedCommand.updateShadows) {
      const command = derivedCommand.command;
      command.castShadows = castShadows;
      command.receiveShadows = receiveShadows;
    }
  }
}

function updateBackFaceCulling(drawCommand) {
  const backFaceCulling = drawCommand.backFaceCulling;

  const derivedCommands = drawCommand._derivedCommands;
  const length = derivedCommands.length;

  for (let i = 0; i < length; ++i) {
    const derivedCommand = derivedCommands[i];
    if (derivedCommand.updateBackFaceCulling) {
      const command = derivedCommand.command;
      const renderState = clone(command.renderState, true);
      renderState.cull.enabled = backFaceCulling;
      command.renderState = RenderState.fromCache(renderState);
    }
  }
}

function updateCullFace(drawCommand) {
  const cullFace = drawCommand.cullFace;

  const derivedCommands = drawCommand._derivedCommands;
  const length = derivedCommands.length;

  for (let i = 0; i < length; ++i) {
    const derivedCommand = derivedCommands[i];
    if (derivedCommand.updateCullFace) {
      const command = derivedCommand.command;
      const renderState = clone(command.renderState, true);
      renderState.cull.face = cullFace;
      command.renderState = RenderState.fromCache(renderState);
    }
  }
}

function updateDebugShowBoundingVolume(drawCommand) {
  const debugShowBoundingVolume = drawCommand.debugShowBoundingVolume;

  const derivedCommands = drawCommand._derivedCommands;
  const length = derivedCommands.length;

  for (let i = 0; i < length; ++i) {
    const derivedCommand = derivedCommands[i];
    if (derivedCommand.updateDebugShowBoundingVolume) {
      const command = derivedCommand.command;
      command.debugShowBoundingVolume = debugShowBoundingVolume;
    }
  }
}

/**
 * Pushes draw commands necessary to render the primitive.
 * This does not include the draw commands that render its silhouette.
 *
 * @param {FrameState} frameState The frame state.
 *
 * @private
 */
ModelDrawCommand.prototype.pushCommands = function (frameState) {
  const use2D = shouldUse2DCommands(this, frameState);

  if (use2D && !this._has2DCommands) {
    derive2DCommands(this);
    this._has2DCommands = true;
    this._modelMatrix2DDirty = true;
  }

  if (this._modelMatrix2DDirty) {
    updateModelMatrix2D(this, frameState);
    this._modelMatrix2DDirty = false;
  }

  if (this._needsTranslucentCommand) {
    pushCommand(frameState.commandList, this._translucentCommand, use2D);
    // Don't return early... still need to push the main command
  }

  if (this._needsSkipLevelOfDetailCommands) {
    const content = this._model.content;
    const tileset = content.tileset;
    const tile = content.tile;

    const hasMixedContent = tileset._hasMixedContent;
    const finalResolution = tile._finalResolution;

    if (hasMixedContent) {
      if (!finalResolution) {
        pushCommand(
          tileset._backFaceCommands,
          this._skipLodBackfaceCommand,
          use2D
        );
      }

      updateSkipLodStencilCommand(this, tile, use2D);
      pushCommand(frameState.commandList, this._skipLodStencilCommand, use2D);
      return;
    }
  }

  if (this._needsSilhouetteCommands) {
    pushCommand(frameState.commandList, this._silhouetteModelCommand, use2D);
    return;
  }

  pushCommand(frameState.commandList, this._originalCommand, use2D);
};

function pushCommand(commandList, derivedCommand, use2D) {
  commandList.push(derivedCommand.command);
  if (use2D) {
    commandList.push(derivedCommand.derivedCommand2D.command);
  }
}

/**
 * Pushes draw commands necessary to render the silhouette.
 * These should be added to the command list after the draw commands of all
 * primitives in the model have been added. This way, the silhouette won't
 * render on top of the model.
 *
 * This should only be called after pushCommands() has been invoked for
 * the ModelDrawCommand this frame. Otherwise, the silhouette commands
 * may not have been derived for 2D. The model matrix will also not
 * have been updated for 2D commands.
 *
 * @param {FrameState} frameState The frame state.
 *
 * @private
 */
ModelDrawCommand.prototype.pushSilhouetteCommands = function (frameState) {
  const use2D = shouldUse2DCommands(this, frameState);
  pushCommand(frameState.commandList, this._silhouetteColorCommand, use2D);
};

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

function derive2DCommand(drawCommand, derivedCommand) {
  if (defined(derivedCommand)) {
    return;
  }

  // If the model crosses the IDL in 2D, it will be drawn in one viewport but get
  // clipped by the other viewport. We create a second command that translates
  // the model matrix to the opposite side of the map so the part that was clipped
  // in one viewport is drawn in the other.
  const derivedCommand2D = ModelExperimentalDerivedCommand.clone(
    derivedCommand
  );

  const command2D = DrawCommand.shallowClone(derivedCommand.command);

  // These will be computed in updateModelMatrix2D()
  command2D.modelMatrix = new Matrix4();
  command2D.boundingVolume = new BoundingSphere();

  derivedCommand2D.command = command2D;
  derivedCommand2D.updateShadows = false; // Shadows are disabled for 2D
  derivedCommand2D.is2D = true;

  derivedCommand.derivedCommand2D = derivedCommand2D;
  drawCommand._derivedCommands.push(derivedCommand2D);

  return derivedCommand2D;
}

function derive2DCommands(drawCommand) {
  derive2DCommand(drawCommand, drawCommand._originalCommand);
  derive2DCommand(drawCommand, drawCommand._translucentCommand);
  derive2DCommand(drawCommand, drawCommand._skipLodBackfaceCommand);
  derive2DCommand(drawCommand, drawCommand._skipLodStencilCommand);
  derive2DCommand(drawCommand, drawCommand._silhouetteModelCommand);
  derive2DCommand(drawCommand, drawCommand._silhouetteColorCommand);
}

function deriveTranslucentCommand(command) {
  const derivedCommand = DrawCommand.shallowClone(command);
  derivedCommand.pass = Pass.TRANSLUCENT;
  const rs = clone(command.renderState, true);
  rs.cull.enabled = false;
  rs.depthMask = false;
  rs.blending = BlendingState.ALPHA_BLEND;
  derivedCommand.renderState = RenderState.fromCache(rs);

  return derivedCommand;
}

function deriveSilhouetteModelCommand(command, model) {
  // Wrap around after exceeding the 8-bit stencil limit.
  // The reference is unique to each model until this point.
  const stencilReference = model._silhouetteId % 255;
  const silhouetteModelCommand = DrawCommand.shallowClone(command);
  const renderState = clone(command.renderState, true);

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

  silhouetteModelCommand.renderState = RenderState.fromCache(renderState);

  return silhouetteModelCommand;
}

function deriveSilhouetteColorCommand(command, model) {
  // Wrap around after exceeding the 8-bit stencil limit.
  // The reference is unique to each model until this point.
  const stencilReference = model._silhouetteId % 255;
  const silhouetteColorCommand = DrawCommand.shallowClone(command);
  const renderState = clone(command.renderState, true);
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

  const uniformMap = clone(command.uniformMap);
  uniformMap.model_silhouettePass = function () {
    return true;
  };

  silhouetteColorCommand.renderState = RenderState.fromCache(renderState);
  silhouetteColorCommand.uniformMap = uniformMap;
  silhouetteColorCommand.castShadows = false;
  silhouetteColorCommand.receiveShadows = false;

  return silhouetteColorCommand;
}

function updateSkipLodStencilCommand(drawCommand, tile, use2D) {
  const skipLodStencilCommand = drawCommand._skipLodStencilCommand;

  const selectionDepth = tile._selectionDepth;
  const lastSelectionDepth = getLastSelectionDepth(skipLodStencilCommand);

  if (selectionDepth !== lastSelectionDepth) {
    const skipLodStencilReference = getStencilReference(selectionDepth);
    const renderState = clone(skipLodStencilCommand.renderState, true);
    renderState.stencilTest.reference = skipLodStencilReference;
    skipLodStencilCommand.renderState = RenderState.fromCache(renderState);

    if (use2D) {
      skipLodStencilCommand.derivedCommand2D.renderState = renderState;
    }
  }
}

function getLastSelectionDepth(stencilCommand) {
  // Isolate the selection depth from the stencil reference.
  const reference = stencilCommand.renderState.stencilTest.reference;
  return (
    (reference & StencilConstants.SKIP_LOD_MASK) >>>
    StencilConstants.SKIP_LOD_BIT_SHIFT
  );
}

function getStencilReference(selectionDepth) {
  return (
    StencilConstants.CESIUM_3D_TILE_MASK |
    (selectionDepth << StencilConstants.SKIP_LOD_BIT_SHIFT)
  );
}

function deriveSkipLodBackfaceCommand(command) {
  // Write just backface depth of unresolved tiles so resolved stenciled tiles do not appear in front
  const backfaceCommand = DrawCommand.shallowClone(command);
  const renderState = clone(command.renderState, true);
  renderState.cull.enabled = true;
  renderState.cull.face = CullFace.FRONT;
  // Back faces do not need to write color.
  renderState.colorMask = {
    red: false,
    green: false,
    blue: false,
    alpha: false,
  };
  // Push back face depth away from the camera so it is less likely that back faces and front faces of the same tile
  // intersect and overlap. This helps avoid flickering for very thin double-sided walls.
  renderState.polygonOffset = {
    enabled: true,
    factor: 5.0,
    units: 5.0,
  };

  const uniformMap = clone(backfaceCommand.uniformMap);
  const polygonOffset = new Cartesian2(5.0, 5.0);

  uniformMap.u_polygonOffset = function () {
    return polygonOffset;
  };

  backfaceCommand.renderState = RenderState.fromCache(renderState);
  backfaceCommand.uniformMap = uniformMap;
  backfaceCommand.castShadows = false;
  backfaceCommand.receiveShadows = false;

  return backfaceCommand;
}

function deriveSkipLodStencilCommand(command) {
  // Tiles only draw if their selection depth is >= the tile drawn already. They write their
  // selection depth to the stencil buffer to prevent ancestor tiles from drawing on top
  const stencilCommand = DrawCommand.shallowClone(command);
  const renderState = clone(command.renderState, true);
  // Stencil test is masked to the most significant 3 bits so the reference is shifted. Writes 0 for the terrain bit
  // The reference is updated dynamically. See updateSkipLodStencilCommand.
  renderState.stencilTest.enabled = true;
  renderState.stencilTest.mask = StencilConstants.SKIP_LOD_MASK;
  renderState.stencilTest.reference = StencilConstants.CESIUM_3D_TILE_MASK;
  renderState.stencilTest.frontFunction = StencilFunction.GREATER_OR_EQUAL;
  renderState.stencilTest.frontOperation.zPass = StencilOperation.REPLACE;
  renderState.stencilTest.backFunction = StencilFunction.GREATER_OR_EQUAL;
  renderState.stencilTest.backOperation.zPass = StencilOperation.REPLACE;
  renderState.stencilMask =
    StencilConstants.CESIUM_3D_TILE_MASK | StencilConstants.SKIP_LOD_MASK;

  stencilCommand.renderState = RenderState.fromCache(renderState);

  return stencilCommand;
}

export default ModelDrawCommand;
