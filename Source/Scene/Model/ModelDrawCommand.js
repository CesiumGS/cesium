import BoundingSphere from "../../Core/BoundingSphere.js";
import Cartesian2 from "../../Core/Cartesian2.js";
import CesiumMath from "../../Core/Math.js";
import Check from "../../Core/Check.js";
import clone from "../../Core/clone.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";
import WebGLConstants from "../../Core/WebGLConstants.js";
import DrawCommand from "../../Renderer/DrawCommand.js";
import Pass from "../../Renderer/Pass.js";
import RenderState from "../../Renderer/RenderState.js";
import BlendingState from "../BlendingState.js";
import CullFace from "../CullFace.js";
import SceneMode from "../SceneMode.js";
import ShadowMode from "../ShadowMode.js";
import StencilConstants from "../StencilConstants.js";
import StencilFunction from "../StencilFunction.js";
import StencilOperation from "../StencilOperation.js";
import StyleCommandsNeeded from "./StyleCommandsNeeded.js";

/**
 * A wrapper around the draw commands used to render a {@link ModelRuntimePrimitive}.
 * This manages the derived commands and pushes only the necessary commands depending
 * on the given frame state.
 *
 * @param {Object} options An object containing the following options:
 * @param {DrawCommand} options.command The draw command from which to derive other commands from.
 * @param {PrimitiveRenderResources} options.primitiveRenderResources The render resources of the primitive associated with the command.
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

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.command", command);
  Check.typeOf.object("options.primitiveRenderResources", renderResources);
  //>>includeEnd('debug');

  const model = renderResources.model;
  this._model = model;

  const runtimePrimitive = renderResources.runtimePrimitive;
  this._runtimePrimitive = runtimePrimitive;

  // If the command is translucent, or if the primitive's material is
  // double-sided, then back-face culling is automatically disabled for
  // the command. The user value for back-face culling will be ignored.
  const isTranslucent = command.pass === Pass.TRANSLUCENT;
  const isDoubleSided = runtimePrimitive.primitive.material.doubleSided;
  const usesBackFaceCulling = !isDoubleSided && !isTranslucent;

  const hasOpaqueAndTranslucentFeatures =
    renderResources.styleCommandsNeeded ===
    StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT;

  // CPUStylingPipelineStage sets the pass to translucent if the style commands
  // needed are all translucent, so if the command was already translucent,
  // there's no need to derive a new command.
  //
  // As of now, a style can't change an originally translucent feature to opaque
  // since the style's alpha is modulated, not a replacement. When this changes,
  // we need to derive new opaque commands in initialize().
  const needsTranslucentCommand =
    hasOpaqueAndTranslucentFeatures && !isTranslucent;

  const needsSkipLevelOfDetailCommands =
    renderResources.hasSkipLevelOfDetail && !isTranslucent;

  const needsSilhouetteCommands = renderResources.hasSilhouette;

  this._command = command;

  // None of the derived commands (non-2D) use a different model matrix
  // or bounding volume than the original, so they all point to the
  // ModelDrawCommand's copy to save update time and memory.
  this._modelMatrix = Matrix4.clone(command.modelMatrix);
  this._boundingVolume = BoundingSphere.clone(command.boundingVolume);

  // The 2D model matrix depends on the frame state's map projection,
  // so it must be updated when the commands are handled in pushCommands.
  this._modelMatrix2D = new Matrix4();
  this._boundingVolume2D = new BoundingSphere();
  this._modelMatrix2DDirty = false;

  this._backFaceCulling = command.renderState.cull.enabled;
  this._cullFace = command.renderState.cull.face;
  this._shadows = model.shadows;
  this._debugShowBoundingVolume = command.debugShowBoundingVolume;

  this._usesBackFaceCulling = usesBackFaceCulling;
  this._needsTranslucentCommand = needsTranslucentCommand;
  this._needsSkipLevelOfDetailCommands = needsSkipLevelOfDetailCommands;
  this._needsSilhouetteCommands = needsSilhouetteCommands;

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

  initialize(this);
}

function ModelDerivedCommand(options) {
  // The DrawCommand managed by this derived command.
  this.command = options.command;

  // These control whether the derived command should update the
  // values of the DrawCommand for the corresponding properties.
  this.updateShadows = options.updateShadows;
  this.updateBackFaceCulling = options.updateBackFaceCulling;
  this.updateCullFace = options.updateCullFace;
  this.updateDebugShowBoundingVolume = options.updateDebugShowBoundingVolume;

  // Whether this ModelDerivedCommand is in 2D.
  this.is2D = defaultValue(options.is2D, false);

  // A ModelDerivedCommand that is the 2D version of this one.
  this.derivedCommand2D = undefined;
}

ModelDerivedCommand.clone = function (derivedCommand) {
  return new ModelDerivedCommand({
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
  command.modelMatrix = drawCommand._modelMatrix;
  command.boundingVolume = drawCommand._boundingVolume;

  const model = drawCommand._model;
  const usesBackFaceCulling = drawCommand._usesBackFaceCulling;
  const derivedCommands = drawCommand._derivedCommands;

  drawCommand._originalCommand = new ModelDerivedCommand({
    command: command,
    updateShadows: true,
    updateBackFaceCulling: usesBackFaceCulling,
    updateCullFace: usesBackFaceCulling,
    updateDebugShowBoundingVolume: true,
    is2D: false,
  });

  derivedCommands.push(drawCommand._originalCommand);

  if (drawCommand._needsTranslucentCommand) {
    drawCommand._translucentCommand = new ModelDerivedCommand({
      command: deriveTranslucentCommand(command),
      updateShadows: true,
      updateBackFaceCulling: false,
      updateCullFace: false,
      updateDebugShowBoundingVolume: true,
    });

    derivedCommands.push(drawCommand._translucentCommand);
  }

  if (drawCommand._needsSkipLevelOfDetailCommands) {
    drawCommand._skipLodBackfaceCommand = new ModelDerivedCommand({
      command: deriveSkipLodBackfaceCommand(command),
      updateShadows: false,
      updateBackFaceCulling: false,
      updateCullFace: usesBackFaceCulling,
      updateDebugShowBoundingVolume: false,
    });

    drawCommand._skipLodStencilCommand = new ModelDerivedCommand({
      command: deriveSkipLodStencilCommand(command, model),
      updateShadows: true,
      updateBackFaceCulling: usesBackFaceCulling,
      updateCullFace: usesBackFaceCulling,
      updateDebugShowBoundingVolume: true,
    });

    derivedCommands.push(drawCommand._skipLodBackfaceCommand);
    derivedCommands.push(drawCommand._skipLodStencilCommand);
  }

  if (drawCommand._needsSilhouetteCommands) {
    drawCommand._silhouetteModelCommand = new ModelDerivedCommand({
      command: deriveSilhouetteModelCommand(command, model),
      updateShadows: true,
      updateBackFaceCulling: usesBackFaceCulling,
      updateCullFace: usesBackFaceCulling,
      updateDebugShowBoundingVolume: true,
    });

    drawCommand._silhouetteColorCommand = new ModelDerivedCommand({
      command: deriveSilhouetteColorCommand(command, model),
      updateShadows: false,
      updateBackFaceCulling: false,
      updateCullFace: false,
      updateDebugShowBoundingVolume: false,
    });

    derivedCommands.push(drawCommand._silhouetteModelCommand);
    derivedCommands.push(drawCommand._silhouetteColorCommand);
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
   * The primitive type of the draw command.
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

      this._boundingVolume = BoundingSphere.transform(
        this.runtimePrimitive.boundingSphere,
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
   * @memberof ModelDrawCommand.prototype
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

function updateModelMatrix2D(drawCommand, frameState) {
  const modelMatrix = drawCommand._modelMatrix;
  drawCommand._modelMatrix2D = Matrix4.clone(
    modelMatrix,
    drawCommand._modelMatrix2D
  );

  // Change the translation's y-component so it appears on the opposite side
  // of the map.
  drawCommand._modelMatrix2D[13] -=
    CesiumMath.sign(modelMatrix[13]) *
    2.0 *
    CesiumMath.PI *
    frameState.mapProjection.ellipsoid.maximumRadius;

  drawCommand._boundingVolume2D = BoundingSphere.transform(
    drawCommand.runtimePrimitive.boundingSphere,
    drawCommand._modelMatrix2D,
    drawCommand._boundingVolume2D
  );
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
 * @param {Array<DrawCommand>} result The array to push the draw commands to.
 *
 * @private
 */
ModelDrawCommand.prototype.pushCommands = function (frameState, result) {
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
    pushCommand(result, this._translucentCommand, use2D);
    // Don't return here; the main command still needs to be pushed.
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
      pushCommand(result, this._skipLodStencilCommand, use2D);
      return;
    }
  }

  if (this._needsSilhouetteCommands) {
    pushCommand(result, this._silhouetteModelCommand, use2D);
    return;
  }

  pushCommand(result, this._originalCommand, use2D);
};

/**
 * Pushes the draw commands necessary to render the silhouette. These should
 * be added to the command list after the draw commands of all primitives
 * in the model have been added. This way, the silhouette won't render on
 * top of the model.
 *
 * This should only be called after pushCommands() has been invoked for
 * the ModelDrawCommand this frame. Otherwise, the silhouette commands may
 * not have been derived for 2D. The model matrix will also not have been
 * updated for 2D commands.
 *
 * @param {FrameState} frameState The frame state.
 * @param {Array<DrawCommand>} result The array to push the silhouette commands to.
 *
 * @private
 */
ModelDrawCommand.prototype.pushSilhouetteCommands = function (
  frameState,
  result
) {
  const use2D = shouldUse2DCommands(this, frameState);
  pushCommand(result, this._silhouetteColorCommand, use2D);
};

function pushCommand(commandList, derivedCommand, use2D) {
  commandList.push(derivedCommand.command);
  if (use2D) {
    commandList.push(derivedCommand.derivedCommand2D.command);
  }
}

function shouldUse2DCommands(drawCommand, frameState) {
  if (frameState.mode !== SceneMode.SCENE2D || drawCommand.model._projectTo2D) {
    return false;
  }

  // The draw command's bounding sphere might cause primitives not to render
  // over the IDL, even if they are part of the same model. Use the scene graph's
  // bounding sphere instead.
  const model = drawCommand.model;
  const boundingSphere = model.sceneGraph._boundingSphere2D;

  const left = boundingSphere.center.y - boundingSphere.radius;
  const right = boundingSphere.center.y + boundingSphere.radius;
  const idl2D =
    frameState.mapProjection.ellipsoid.maximumRadius * CesiumMath.PI;

  return (left < idl2D && right > idl2D) || (left < -idl2D && right > -idl2D);
}

function derive2DCommand(drawCommand, derivedCommand) {
  if (!defined(derivedCommand)) {
    return;
  }

  // If the model crosses the IDL in 2D, it will be drawn in one viewport but get
  // clipped by the other viewport. We create a second command that translates
  // the model matrix to the opposite side of the map so the part that was clipped
  // in one viewport is drawn in the other.
  const derivedCommand2D = ModelDerivedCommand.clone(derivedCommand);

  const command2D = DrawCommand.shallowClone(derivedCommand.command);
  command2D.modelMatrix = drawCommand._modelMatrix2D;
  command2D.boundingVolume = drawCommand._boundingVolume2D;

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

  if (model.isInvisible()) {
    renderState.colorMask = {
      red: false,
      green: false,
      blue: false,
      alpha: false,
    };
  }

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

  // Render the silhouette in the translucent pass if either the command
  // pass or the silhouette color is translucent. This will account for
  // translucent model color, since ModelColorPipelineStage sets the pass
  // to translucent.
  const silhouetteTranslucent =
    command.pass === Pass.TRANSLUCENT || model.silhouetteColor.alpha < 1.0;
  if (silhouetteTranslucent) {
    silhouetteColorCommand.pass = Pass.TRANSLUCENT;
    renderState.depthMask = false;
    renderState.blending = BlendingState.ALPHA_BLEND;
  }

  // Only render the pixels of the silhouette that don't conflict with
  // the stencil buffer. This way, the silhouette doesn't render over
  // the original model.
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
  // Write just backface depth of unresolved tiles so resolved stenciled tiles
  // do not appear in front.
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
