import BoundingRectangle from "../Core/BoundingRectangle.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import PixelFormat from "../Core/PixelFormat.js";
import ClearCommand from "../Renderer/ClearCommand.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Framebuffer from "../Renderer/Framebuffer.js";
import Pass from "../Renderer/Pass.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import RenderState from "../Renderer/RenderState.js";
import Sampler from "../Renderer/Sampler.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import Texture from "../Renderer/Texture.js";
import CompareAndPackTranslucentDepth from "../Shaders/CompareAndPackTranslucentDepth.js";
import CompositeTranslucentClassification from "../Shaders/PostProcessStages/CompositeTranslucentClassification.js";
import BlendingState from "./BlendingState.js";
import StencilConstants from "./StencilConstants.js";
import StencilFunction from "./StencilFunction.js";

var debugShowPackedDepth = false;

/**
 * Handles buffers, drawing, and deriving commands needed for classifying translucent 3D Tiles.
 * Uses a depth texture, so classification on translucent 3D Tiles is not available in Internet Explorer.
 *
 * @private
 */
function TranslucentTileClassification(context) {
  this._drawClassificationFBO = undefined;
  this._accumulationFBO = undefined;
  this._packFBO = undefined;

  this._opaqueDepthStencilTexture = undefined;

  this._colorTexture = undefined;
  this._accumulationTexture = undefined;

  // Reference to either colorTexture or accumulationTexture
  this._textureToComposite = undefined;

  this._translucentDepthStencilTexture = undefined;
  this._packedTranslucentDepth = undefined;

  this._packDepthCommand = undefined;
  this._accumulateCommand = undefined;
  this._compositeCommand = undefined;
  this._copyCommand = undefined;

  this._clearColorCommand = new ClearCommand({
    color: new Color(0.0, 0.0, 0.0, 0.0),
    owner: this,
  });

  this._clearDepthStencilCommand = new ClearCommand({
    depth: 1.0,
    stencil: 0,
    owner: this,
  });

  this._supported = context.depthTexture;

  this._viewport = new BoundingRectangle();
  this._rsDepth = undefined;
  this._rsAccumulate = undefined;
  this._rsComp = undefined;
  this._useScissorTest = undefined;
  this._scissorRectangle = undefined;

  this._hasTranslucentDepth = false;
  this._frustumsDrawn = 0;
}

Object.defineProperties(TranslucentTileClassification.prototype, {
  /**
   * Gets whether or not translucent depth was rendered.
   * @memberof TranslucentTileClassification.prototype
   *
   * @type {Boolean}
   * @readonly
   */
  hasTranslucentDepth: {
    get: function () {
      return this._hasTranslucentDepth;
    },
  },
});

function destroyTextures(transpClass) {
  transpClass._colorTexture =
    transpClass._colorTexture &&
    !transpClass._colorTexture.isDestroyed() &&
    transpClass._colorTexture.destroy();

  transpClass._accumulationTexture =
    transpClass._accumulationTexture &&
    !transpClass._accumulationTexture.isDestroyed() &&
    transpClass._accumulationTexture.destroy();
  transpClass._textureToComposite = undefined;

  transpClass._translucentDepthStencilTexture =
    transpClass._translucentDepthStencilTexture &&
    !transpClass._translucentDepthStencilTexture.isDestroyed() &&
    transpClass._translucentDepthStencilTexture.destroy();
  transpClass._packedTranslucentDepth =
    transpClass._packedTranslucentDepth &&
    !transpClass._packedTranslucentDepth.isDestroyed() &&
    transpClass._packedTranslucentDepth.destroy();
}

function destroyFramebuffers(transpClass) {
  transpClass._drawClassificationFBO =
    transpClass._drawClassificationFBO &&
    !transpClass._drawClassificationFBO.isDestroyed() &&
    transpClass._drawClassificationFBO.destroy();
  transpClass._accumulationFBO =
    transpClass._accumulationFBO &&
    !transpClass._accumulationFBO.isDestroyed() &&
    transpClass._accumulationFBO.destroy();

  transpClass._packFBO =
    transpClass._packFBO &&
    !transpClass._packFBO.isDestroyed() &&
    transpClass._packFBO.destroy();
}

function rgbaTexture(context, width, height) {
  return new Texture({
    context: context,
    width: width,
    height: height,
    pixelFormat: PixelFormat.RGBA,
    pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
    sampler: Sampler.NEAREST,
  });
}

function updateTextures(transpClass, context, width, height) {
  destroyTextures(transpClass);

  transpClass._colorTexture = rgbaTexture(context, width, height);
  transpClass._accumulationTexture = rgbaTexture(context, width, height);

  transpClass._translucentDepthStencilTexture = new Texture({
    context: context,
    width: width,
    height: height,
    pixelFormat: PixelFormat.DEPTH_STENCIL,
    pixelDatatype: PixelDatatype.UNSIGNED_INT_24_8,
    sampler: Sampler.NEAREST,
  });

  transpClass._packedTranslucentDepth = new Texture({
    context: context,
    width: width,
    height: height,
    pixelFormat: PixelFormat.RGBA,
    pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
    sampler: Sampler.NEAREST,
  });
}

function updateFramebuffers(transpClass, context) {
  destroyFramebuffers(transpClass);

  transpClass._drawClassificationFBO = new Framebuffer({
    context: context,
    colorTextures: [transpClass._colorTexture],
    depthStencilTexture: transpClass._translucentDepthStencilTexture,
    destroyAttachments: false,
  });

  transpClass._accumulationFBO = new Framebuffer({
    context: context,
    colorTextures: [transpClass._accumulationTexture],
    depthStencilTexture: transpClass._translucentDepthStencilTexture,
    destroyAttachments: false,
  });

  transpClass._packFBO = new Framebuffer({
    context: context,
    colorTextures: [transpClass._packedTranslucentDepth],
    destroyAttachments: false,
  });
}

function updateResources(
  transpClass,
  context,
  passState,
  globeDepthFramebuffer
) {
  if (!transpClass.isSupported()) {
    return;
  }

  transpClass._opaqueDepthStencilTexture =
    globeDepthFramebuffer.depthStencilTexture;

  var width = transpClass._opaqueDepthStencilTexture.width;
  var height = transpClass._opaqueDepthStencilTexture.height;

  var colorTexture = transpClass._colorTexture;
  var textureChanged =
    !defined(colorTexture) ||
    colorTexture.width !== width ||
    colorTexture.height !== height;
  if (textureChanged) {
    updateTextures(transpClass, context, width, height);
  }

  if (!defined(transpClass._drawClassificationFBO) || textureChanged) {
    updateFramebuffers(transpClass, context);
  }

  var fs;
  var uniformMap;

  if (!defined(transpClass._packDepthCommand)) {
    fs = new ShaderSource({
      sources: [CompareAndPackTranslucentDepth],
    });

    uniformMap = {
      u_opaqueDepthTexture: function () {
        return transpClass._opaqueDepthStencilTexture;
      },
      u_translucentDepthTexture: function () {
        return transpClass._translucentDepthStencilTexture;
      },
    };

    transpClass._packDepthCommand = context.createViewportQuadCommand(fs, {
      uniformMap: uniformMap,
      owner: transpClass,
    });
  }

  if (!defined(transpClass._compositeCommand)) {
    fs = new ShaderSource({
      sources: [CompositeTranslucentClassification],
    });

    uniformMap = {
      colorTexture: function () {
        return transpClass._textureToComposite;
      },
    };

    if (debugShowPackedDepth) {
      fs.defines = ["DEBUG_SHOW_DEPTH"];
      uniformMap.u_packedTranslucentDepth = function () {
        return transpClass._packedTranslucentDepth;
      };
    }

    transpClass._compositeCommand = context.createViewportQuadCommand(fs, {
      uniformMap: uniformMap,
      owner: transpClass,
    });

    var compositeCommand = transpClass._compositeCommand;
    var compositeProgram = compositeCommand.shaderProgram;
    var compositePickProgram = context.shaderCache.createDerivedShaderProgram(
      compositeProgram,
      "pick",
      {
        vertexShaderSource: compositeProgram.vertexShaderSource,
        fragmentShaderSource: new ShaderSource({
          sources: fs.sources,
          defines: ["PICK"],
        }),
        attributeLocations: compositeProgram._attributeLocations,
      }
    );
    var compositePickCommand = DrawCommand.shallowClone(compositeCommand);
    compositePickCommand.shaderProgram = compositePickProgram;
    compositeCommand.derivedCommands.pick = compositePickCommand;
  }

  if (!defined(transpClass._copyCommand)) {
    fs = new ShaderSource({
      sources: [CompositeTranslucentClassification],
    });

    uniformMap = {
      colorTexture: function () {
        return transpClass._colorTexture;
      },
    };

    transpClass._copyCommand = context.createViewportQuadCommand(fs, {
      uniformMap: uniformMap,
      owner: transpClass,
    });
  }

  if (!defined(transpClass._accumulateCommand)) {
    fs = new ShaderSource({
      sources: [CompositeTranslucentClassification],
    });

    uniformMap = {
      colorTexture: function () {
        return transpClass._colorTexture;
      },
    };

    transpClass._accumulateCommand = context.createViewportQuadCommand(fs, {
      uniformMap: uniformMap,
      owner: transpClass,
    });
  }

  transpClass._viewport.width = width;
  transpClass._viewport.height = height;

  var useScissorTest = !BoundingRectangle.equals(
    transpClass._viewport,
    passState.viewport
  );
  var updateScissor = useScissorTest !== transpClass._useScissorTest;
  transpClass._useScissorTest = useScissorTest;

  if (
    !BoundingRectangle.equals(transpClass._scissorRectangle, passState.viewport)
  ) {
    transpClass._scissorRectangle = BoundingRectangle.clone(
      passState.viewport,
      transpClass._scissorRectangle
    );
    updateScissor = true;
  }

  if (
    !defined(transpClass._rsDepth) ||
    !BoundingRectangle.equals(
      transpClass._viewport,
      transpClass._rsDepth.viewport
    ) ||
    updateScissor
  ) {
    transpClass._rsDepth = RenderState.fromCache({
      viewport: transpClass._viewport,
      scissorTest: {
        enabled: transpClass._useScissorTest,
        rectangle: transpClass._scissorRectangle,
      },
    });
  }

  if (defined(transpClass._packDepthCommand)) {
    transpClass._packDepthCommand.renderState = transpClass._rsDepth;
  }

  if (
    !defined(transpClass._rsAccumulate) ||
    !BoundingRectangle.equals(
      transpClass._viewport,
      transpClass._rsAccumulate.viewport
    ) ||
    updateScissor
  ) {
    transpClass._rsAccumulate = RenderState.fromCache({
      viewport: transpClass._viewport,
      scissorTest: {
        enabled: transpClass._useScissorTest,
        rectangle: transpClass._scissorRectangle,
      },
      stencilTest: {
        enabled: true,
        frontFunction: StencilFunction.EQUAL,
        reference: StencilConstants.CESIUM_3D_TILE_MASK,
      },
    });
  }

  if (defined(transpClass._accumulateCommand)) {
    transpClass._accumulateCommand.renderState = transpClass._rsAccumulate;
  }

  if (
    !defined(transpClass._rsComp) ||
    !BoundingRectangle.equals(
      transpClass._viewport,
      transpClass._rsComp.viewport
    ) ||
    updateScissor
  ) {
    transpClass._rsComp = RenderState.fromCache({
      viewport: transpClass._viewport,
      scissorTest: {
        enabled: transpClass._useScissorTest,
        rectangle: transpClass._scissorRectangle,
      },
      blending: BlendingState.ALPHA_BLEND,
    });
  }

  if (defined(transpClass._compositeCommand)) {
    transpClass._compositeCommand.renderState = transpClass._rsComp;
    transpClass._compositeCommand.derivedCommands.pick.renderState =
      transpClass._rsComp;
  }
}

TranslucentTileClassification.prototype.executeTranslucentCommands = function (
  scene,
  executeCommand,
  passState,
  commands,
  globeDepthFramebuffer
) {
  // Check for translucent commands that should be classified
  var length = commands.length;
  var command;
  var i;

  var useLogDepth = scene.frameState.useLogDepth;
  var context = scene.context;
  var framebuffer = passState.framebuffer;

  for (i = 0; i < length; ++i) {
    command = commands[i];
    command = useLogDepth ? command.derivedCommands.logDepth.command : command;

    if (command.depthForTranslucentClassification) {
      this._hasTranslucentDepth = true;
      break;
    }
  }

  if (!this._hasTranslucentDepth) {
    return;
  }

  updateResources(this, context, passState, globeDepthFramebuffer);

  // Get translucent depth
  passState.framebuffer = this._drawClassificationFBO;

  // Clear depth for multifrustum
  this._clearDepthStencilCommand.execute(context, passState);

  for (i = 0; i < length; ++i) {
    command = commands[i];
    command = useLogDepth ? command.derivedCommands.logDepth.command : command;

    if (!command.depthForTranslucentClassification) {
      continue;
    }

    // Depth-only commands are created for all translucent 3D Tiles commands
    var depthOnlyCommand = command.derivedCommands.depth.depthOnlyCommand;
    executeCommand(depthOnlyCommand, scene, context, passState);
  }

  this._frustumsDrawn += this._hasTranslucentDepth ? 1 : 0;

  // Pack depth if any translucent depth commands were performed
  if (this._hasTranslucentDepth) {
    passState.framebuffer = this._packFBO;
    this._packDepthCommand.execute(context, passState);
  }

  passState.framebuffer = framebuffer;
};

TranslucentTileClassification.prototype.executeClassificationCommands = function (
  scene,
  executeCommand,
  passState,
  frustumCommands
) {
  if (!this._hasTranslucentDepth) {
    return;
  }

  var context = scene.context;
  var us = context.uniformState;
  var framebuffer = passState.framebuffer;

  if (this._frustumsDrawn === 2) {
    // copy classification from first frustum
    passState.framebuffer = this._accumulationFBO;
    this._copyCommand.execute(context, passState);
  }

  passState.framebuffer = this._drawClassificationFBO;
  if (this._frustumsDrawn > 1) {
    this._clearColorCommand.execute(context, passState);
  }

  us.updatePass(Pass.CESIUM_3D_TILE_CLASSIFICATION);
  var swapGlobeDepth = us.globeDepthTexture;
  us.globeDepthTexture = this._packedTranslucentDepth;
  var commands = frustumCommands.commands[Pass.CESIUM_3D_TILE_CLASSIFICATION];
  var length = frustumCommands.indices[Pass.CESIUM_3D_TILE_CLASSIFICATION];
  for (var i = 0; i < length; ++i) {
    executeCommand(commands[i], scene, context, passState);
  }

  us.globeDepthTexture = swapGlobeDepth;
  passState.framebuffer = framebuffer;

  if (this._frustumsDrawn === 1) {
    return;
  }

  passState.framebuffer = this._accumulationFBO;
  this._accumulateCommand.execute(context, passState);

  passState.framebuffer = framebuffer;
};

TranslucentTileClassification.prototype.execute = function (scene, passState) {
  if (!this._hasTranslucentDepth) {
    return;
  }
  if (this._frustumsDrawn === 1) {
    this._textureToComposite = this._colorTexture;
  } else {
    this._textureToComposite = this._accumulationTexture;
  }

  var command = scene.frameState.passes.pick
    ? this._compositeCommand.derivedCommands.pick
    : this._compositeCommand;
  command.execute(scene.context, passState);

  clear(this, scene, passState);
};

function clear(translucentTileClassification, scene, passState) {
  if (!translucentTileClassification._hasTranslucentDepth) {
    return;
  }

  var framebuffer = passState.framebuffer;

  passState.framebuffer = translucentTileClassification._drawClassificationFBO;
  translucentTileClassification._clearColorCommand.execute(
    scene._context,
    passState
  );

  passState.framebuffer = framebuffer;

  if (translucentTileClassification._frustumsDrawn > 1) {
    passState.framebuffer = translucentTileClassification._accumulationFBO;
    translucentTileClassification._clearColorCommand.execute(
      scene._context,
      passState
    );
  }

  translucentTileClassification._hasTranslucentDepth = false;
  translucentTileClassification._frustumsDrawn = 0;
}

TranslucentTileClassification.prototype.isSupported = function () {
  return this._supported;
};

TranslucentTileClassification.prototype.isDestroyed = function () {
  return false;
};

TranslucentTileClassification.prototype.destroy = function () {
  destroyTextures(this);
  destroyFramebuffers(this);

  if (defined(this._compositeCommand)) {
    this._compositeCommand.shaderProgram =
      this._compositeCommand.shaderProgram &&
      this._compositeCommand.shaderProgram.destroy();
  }

  if (defined(this._packDepthCommand)) {
    this._packDepthCommand.shaderProgram =
      this._packDepthCommand.shaderProgram &&
      this._packDepthCommand.shaderProgram.destroy();
  }
  return destroyObject(this);
};

export default TranslucentTileClassification;
