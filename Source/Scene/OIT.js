import BoundingRectangle from "../Core/BoundingRectangle.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import PixelFormat from "../Core/PixelFormat.js";
import WebGLConstants from "../Core/WebGLConstants.js";
import ClearCommand from "../Renderer/ClearCommand.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import FramebufferManager from "../Renderer/FramebufferManager.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import Texture from "../Renderer/Texture.js";
import AdjustTranslucentFS from "../Shaders/AdjustTranslucentFS.js";
import CompositeOITFS from "../Shaders/CompositeOITFS.js";
import BlendEquation from "./BlendEquation.js";
import BlendFunction from "./BlendFunction.js";

/**
 * @private
 */
function OIT(context) {
  this._numSamples = 1;
  // We support multipass for the Chrome D3D9 backend and ES 2.0 on mobile.
  this._translucentMultipassSupport = false;
  this._translucentMRTSupport = false;

  var extensionsSupported = context.colorBufferFloat && context.depthTexture;
  this._translucentMRTSupport = context.drawBuffers && extensionsSupported;
  this._translucentMultipassSupport =
    !this._translucentMRTSupport && extensionsSupported;

  this._opaqueFBO = undefined;
  this._opaqueTexture = undefined;
  this._depthStencilTexture = undefined;

  this._accumulationTexture = undefined;

  this._translucentFBO = new FramebufferManager({
    colorAttachmentsLength: this._translucentMRTSupport ? 2 : 1,
    createColorAttachments: false,
    createDepthAttachments: false,
  });
  this._alphaFBO = new FramebufferManager({
    createColorAttachments: false,
    createDepthAttachments: false,
  });

  this._adjustTranslucentFBO = new FramebufferManager({
    colorAttachmentsLength: this._translucentMRTSupport ? 2 : 1,
    createColorAttachments: false,
  });
  this._adjustAlphaFBO = new FramebufferManager({
    createColorAttachments: false,
  });

  this._opaqueClearCommand = new ClearCommand({
    color: new Color(0.0, 0.0, 0.0, 0.0),
    owner: this,
  });
  this._translucentMRTClearCommand = new ClearCommand({
    color: new Color(0.0, 0.0, 0.0, 1.0),
    owner: this,
  });
  this._translucentMultipassClearCommand = new ClearCommand({
    color: new Color(0.0, 0.0, 0.0, 0.0),
    owner: this,
  });
  this._alphaClearCommand = new ClearCommand({
    color: new Color(1.0, 1.0, 1.0, 1.0),
    owner: this,
  });

  this._translucentRenderStateCache = {};
  this._alphaRenderStateCache = {};

  this._compositeCommand = undefined;
  this._adjustTranslucentCommand = undefined;
  this._adjustAlphaCommand = undefined;

  this._viewport = new BoundingRectangle();
  this._rs = undefined;

  this._useScissorTest = false;
  this._scissorRectangle = undefined;

  this._useHDR = false;
}

function destroyTextures(oit) {
  oit._accumulationTexture =
    oit._accumulationTexture &&
    !oit._accumulationTexture.isDestroyed() &&
    oit._accumulationTexture.destroy();
  oit._revealageTexture =
    oit._revealageTexture &&
    !oit._revealageTexture.isDestroyed() &&
    oit._revealageTexture.destroy();
}

function destroyFramebuffers(oit) {
  oit._translucentFBO.destroy();
  oit._alphaFBO.destroy();
  oit._adjustTranslucentFBO.destroy();
  oit._adjustAlphaFBO.destroy();
}

function destroyResources(oit) {
  destroyTextures(oit);
  destroyFramebuffers(oit);
}

function updateTextures(oit, context, width, height) {
  destroyTextures(oit);

  oit._accumulationTexture = new Texture({
    context: context,
    width: width,
    height: height,
    pixelFormat: PixelFormat.RGBA,
    pixelDatatype: PixelDatatype.FLOAT,
  });

  // Use zeroed arraybuffer instead of null to initialize texture
  // to workaround Firefox. Only needed for the second color attachment.
  var source = new Float32Array(width * height * 4);
  oit._revealageTexture = new Texture({
    context: context,
    pixelFormat: PixelFormat.RGBA,
    pixelDatatype: PixelDatatype.FLOAT,
    source: {
      arrayBufferView: source,
      width: width,
      height: height,
    },
    flipY: false,
  });
}

function updateFramebuffers(oit, context) {
  destroyFramebuffers(oit);

  var completeFBO = WebGLConstants.FRAMEBUFFER_COMPLETE;
  var supported = true;

  var width = oit._accumulationTexture.width;
  var height = oit._accumulationTexture.height;

  // if MRT is supported, attempt to make an FBO with multiple color attachments
  if (oit._translucentMRTSupport) {
    oit._translucentFBO.setColorTexture(oit._accumulationTexture, 0);
    oit._translucentFBO.setColorTexture(oit._revealageTexture, 1);
    oit._translucentFBO.setDepthStencilTexture(oit._depthStencilTexture);
    oit._translucentFBO.update(context, width, height);

    oit._adjustTranslucentFBO.setColorTexture(oit._accumulationTexture, 0);
    oit._adjustTranslucentFBO.setColorTexture(oit._revealageTexture, 1);
    oit._adjustTranslucentFBO.update(context, width, height);

    if (
      oit._translucentFBO.status !== completeFBO ||
      oit._adjustTranslucentFBO.status !== completeFBO
    ) {
      destroyFramebuffers(oit);
      oit._translucentMRTSupport = false;
    }
  }

  // either MRT isn't supported or FBO creation failed, attempt multipass
  if (!oit._translucentMRTSupport) {
    oit._translucentFBO.setColorTexture(oit._accumulationTexture);
    oit._translucentFBO.setDepthStencilTexture(oit._depthStencilTexture);
    oit._translucentFBO.update(context, width, height);

    oit._alphaFBO.setColorTexture(oit._revealageTexture);
    oit._alphaFBO.setDepthStencilTexture(oit._depthStencilTexture);
    oit._alphaFBO.update(context, width, height);

    oit._adjustTranslucentFBO.setColorTexture(oit._accumulationTexture);
    oit._adjustTranslucentFBO.update(context, width, height);

    oit._adjustAlphaFBO.setColorTexture(oit._revealageTexture);
    oit._adjustAlphaFBO.update(context, width, height);

    var translucentComplete = oit._translucentFBO.status === completeFBO;
    var alphaComplete = oit._alphaFBO.status === completeFBO;
    var adjustTranslucentComplete =
      oit._adjustTranslucentFBO.status === completeFBO;
    var adjustAlphaComplete = oit._adjustAlphaFBO.status === completeFBO;
    if (
      !translucentComplete ||
      !alphaComplete ||
      !adjustTranslucentComplete ||
      !adjustAlphaComplete
    ) {
      destroyResources(oit);
      oit._translucentMultipassSupport = false;
      supported = false;
    }
  }

  return supported;
}

OIT.prototype.update = function (
  context,
  passState,
  framebuffer,
  useHDR,
  numSamples
) {
  if (!this.isSupported()) {
    return;
  }

  this._opaqueFBO = framebuffer;
  this._opaqueTexture = framebuffer.getColorTexture(0);
  this._depthStencilTexture = framebuffer.getDepthStencilTexture();

  var width = this._opaqueTexture.width;
  var height = this._opaqueTexture.height;

  var accumulationTexture = this._accumulationTexture;
  var textureChanged =
    !defined(accumulationTexture) ||
    accumulationTexture.width !== width ||
    accumulationTexture.height !== height ||
    useHDR !== this._useHDR;
  var samplesChanged = this._numSamples !== numSamples;
  this._numSamples = numSamples;
  if (textureChanged || samplesChanged) {
    updateTextures(this, context, width, height);
  }

  if (
    !defined(this._translucentFBO.framebuffer) ||
    textureChanged ||
    samplesChanged
  ) {
    if (!updateFramebuffers(this, context)) {
      // framebuffer creation failed
      return;
    }
  }

  this._useHDR = useHDR;

  var that = this;
  var fs;
  var uniformMap;

  if (!defined(this._compositeCommand)) {
    fs = new ShaderSource({
      sources: [CompositeOITFS],
    });
    if (this._translucentMRTSupport) {
      fs.defines.push("MRT");
    }

    uniformMap = {
      u_opaque: function () {
        return that._opaqueTexture;
      },
      u_accumulation: function () {
        return that._accumulationTexture;
      },
      u_revealage: function () {
        return that._revealageTexture;
      },
    };
    this._compositeCommand = context.createViewportQuadCommand(fs, {
      uniformMap: uniformMap,
      owner: this,
    });
  }

  if (!defined(this._adjustTranslucentCommand)) {
    if (this._translucentMRTSupport) {
      fs = new ShaderSource({
        defines: ["MRT"],
        sources: [AdjustTranslucentFS],
      });

      uniformMap = {
        u_bgColor: function () {
          return that._translucentMRTClearCommand.color;
        },
        u_depthTexture: function () {
          return that._depthStencilTexture;
        },
      };

      this._adjustTranslucentCommand = context.createViewportQuadCommand(fs, {
        uniformMap: uniformMap,
        owner: this,
      });
    } else if (this._translucentMultipassSupport) {
      fs = new ShaderSource({
        sources: [AdjustTranslucentFS],
      });

      uniformMap = {
        u_bgColor: function () {
          return that._translucentMultipassClearCommand.color;
        },
        u_depthTexture: function () {
          return that._depthStencilTexture;
        },
      };

      this._adjustTranslucentCommand = context.createViewportQuadCommand(fs, {
        uniformMap: uniformMap,
        owner: this,
      });

      uniformMap = {
        u_bgColor: function () {
          return that._alphaClearCommand.color;
        },
        u_depthTexture: function () {
          return that._depthStencilTexture;
        },
      };

      this._adjustAlphaCommand = context.createViewportQuadCommand(fs, {
        uniformMap: uniformMap,
        owner: this,
      });
    }
  }

  this._viewport.width = width;
  this._viewport.height = height;

  var useScissorTest = !BoundingRectangle.equals(
    this._viewport,
    passState.viewport
  );
  var updateScissor = useScissorTest !== this._useScissorTest;
  this._useScissorTest = useScissorTest;

  if (!BoundingRectangle.equals(this._scissorRectangle, passState.viewport)) {
    this._scissorRectangle = BoundingRectangle.clone(
      passState.viewport,
      this._scissorRectangle
    );
    updateScissor = true;
  }

  if (
    !defined(this._rs) ||
    !BoundingRectangle.equals(this._viewport, this._rs.viewport) ||
    updateScissor
  ) {
    this._rs = RenderState.fromCache({
      viewport: this._viewport,
      scissorTest: {
        enabled: this._useScissorTest,
        rectangle: this._scissorRectangle,
      },
    });
  }

  if (defined(this._compositeCommand)) {
    this._compositeCommand.renderState = this._rs;
  }

  if (this._adjustTranslucentCommand) {
    this._adjustTranslucentCommand.renderState = this._rs;
  }

  if (defined(this._adjustAlphaCommand)) {
    this._adjustAlphaCommand.renderState = this._rs;
  }
};

var translucentMRTBlend = {
  enabled: true,
  color: new Color(0.0, 0.0, 0.0, 0.0),
  equationRgb: BlendEquation.ADD,
  equationAlpha: BlendEquation.ADD,
  functionSourceRgb: BlendFunction.ONE,
  functionDestinationRgb: BlendFunction.ONE,
  functionSourceAlpha: BlendFunction.ZERO,
  functionDestinationAlpha: BlendFunction.ONE_MINUS_SOURCE_ALPHA,
};

var translucentColorBlend = {
  enabled: true,
  color: new Color(0.0, 0.0, 0.0, 0.0),
  equationRgb: BlendEquation.ADD,
  equationAlpha: BlendEquation.ADD,
  functionSourceRgb: BlendFunction.ONE,
  functionDestinationRgb: BlendFunction.ONE,
  functionSourceAlpha: BlendFunction.ONE,
  functionDestinationAlpha: BlendFunction.ONE,
};

var translucentAlphaBlend = {
  enabled: true,
  color: new Color(0.0, 0.0, 0.0, 0.0),
  equationRgb: BlendEquation.ADD,
  equationAlpha: BlendEquation.ADD,
  functionSourceRgb: BlendFunction.ZERO,
  functionDestinationRgb: BlendFunction.ONE_MINUS_SOURCE_ALPHA,
  functionSourceAlpha: BlendFunction.ZERO,
  functionDestinationAlpha: BlendFunction.ONE_MINUS_SOURCE_ALPHA,
};

function getTranslucentRenderState(
  context,
  translucentBlending,
  cache,
  renderState
) {
  var translucentState = cache[renderState.id];
  if (!defined(translucentState)) {
    var rs = RenderState.getState(renderState);
    rs.depthMask = false;
    rs.blending = translucentBlending;

    translucentState = RenderState.fromCache(rs);
    cache[renderState.id] = translucentState;
  }

  return translucentState;
}

function getTranslucentMRTRenderState(oit, context, renderState) {
  return getTranslucentRenderState(
    context,
    translucentMRTBlend,
    oit._translucentRenderStateCache,
    renderState
  );
}

function getTranslucentColorRenderState(oit, context, renderState) {
  return getTranslucentRenderState(
    context,
    translucentColorBlend,
    oit._translucentRenderStateCache,
    renderState
  );
}

function getTranslucentAlphaRenderState(oit, context, renderState) {
  return getTranslucentRenderState(
    context,
    translucentAlphaBlend,
    oit._alphaRenderStateCache,
    renderState
  );
}

var mrtShaderSource =
  "    vec3 Ci = czm_gl_FragColor.rgb * czm_gl_FragColor.a;\n" +
  "    float ai = czm_gl_FragColor.a;\n" +
  "    float wzi = czm_alphaWeight(ai);\n" +
  "    gl_FragData[0] = vec4(Ci * wzi, ai);\n" +
  "    gl_FragData[1] = vec4(ai * wzi);\n";

var colorShaderSource =
  "    vec3 Ci = czm_gl_FragColor.rgb * czm_gl_FragColor.a;\n" +
  "    float ai = czm_gl_FragColor.a;\n" +
  "    float wzi = czm_alphaWeight(ai);\n" +
  "    gl_FragColor = vec4(Ci, ai) * wzi;\n";

var alphaShaderSource =
  "    float ai = czm_gl_FragColor.a;\n" + "    gl_FragColor = vec4(ai);\n";

function getTranslucentShaderProgram(context, shaderProgram, keyword, source) {
  var shader = context.shaderCache.getDerivedShaderProgram(
    shaderProgram,
    keyword
  );
  if (!defined(shader)) {
    var attributeLocations = shaderProgram._attributeLocations;

    var fs = shaderProgram.fragmentShaderSource.clone();

    fs.sources = fs.sources.map(function (source) {
      source = ShaderSource.replaceMain(source, "czm_translucent_main");
      source = source.replace(/gl_FragColor/g, "czm_gl_FragColor");
      source = source.replace(/\bdiscard\b/g, "czm_discard = true");
      source = source.replace(/czm_phong/g, "czm_translucentPhong");
      return source;
    });

    // Discarding the fragment in main is a workaround for ANGLE D3D9
    // shader compilation errors.

    fs.sources.splice(
      0,
      0,
      (source.indexOf("gl_FragData") !== -1
        ? "#extension GL_EXT_draw_buffers : enable \n"
        : "") +
        "vec4 czm_gl_FragColor;\n" +
        "bool czm_discard = false;\n"
    );

    fs.sources.push(
      "void main()\n" +
        "{\n" +
        "    czm_translucent_main();\n" +
        "    if (czm_discard)\n" +
        "    {\n" +
        "        discard;\n" +
        "    }\n" +
        source +
        "}\n"
    );

    shader = context.shaderCache.createDerivedShaderProgram(
      shaderProgram,
      keyword,
      {
        vertexShaderSource: shaderProgram.vertexShaderSource,
        fragmentShaderSource: fs,
        attributeLocations: attributeLocations,
      }
    );
  }

  return shader;
}

function getTranslucentMRTShaderProgram(context, shaderProgram) {
  return getTranslucentShaderProgram(
    context,
    shaderProgram,
    "translucentMRT",
    mrtShaderSource
  );
}

function getTranslucentColorShaderProgram(context, shaderProgram) {
  return getTranslucentShaderProgram(
    context,
    shaderProgram,
    "translucentMultipass",
    colorShaderSource
  );
}

function getTranslucentAlphaShaderProgram(context, shaderProgram) {
  return getTranslucentShaderProgram(
    context,
    shaderProgram,
    "alphaMultipass",
    alphaShaderSource
  );
}

OIT.prototype.createDerivedCommands = function (command, context, result) {
  if (!defined(result)) {
    result = {};
  }

  if (this._translucentMRTSupport) {
    var translucentShader;
    var translucentRenderState;
    if (defined(result.translucentCommand)) {
      translucentShader = result.translucentCommand.shaderProgram;
      translucentRenderState = result.translucentCommand.renderState;
    }

    result.translucentCommand = DrawCommand.shallowClone(
      command,
      result.translucentCommand
    );

    if (
      !defined(translucentShader) ||
      result.shaderProgramId !== command.shaderProgram.id
    ) {
      result.translucentCommand.shaderProgram = getTranslucentMRTShaderProgram(
        context,
        command.shaderProgram
      );
      result.translucentCommand.renderState = getTranslucentMRTRenderState(
        this,
        context,
        command.renderState
      );
      result.shaderProgramId = command.shaderProgram.id;
    } else {
      result.translucentCommand.shaderProgram = translucentShader;
      result.translucentCommand.renderState = translucentRenderState;
    }
  } else {
    var colorShader;
    var colorRenderState;
    var alphaShader;
    var alphaRenderState;
    if (defined(result.translucentCommand)) {
      colorShader = result.translucentCommand.shaderProgram;
      colorRenderState = result.translucentCommand.renderState;
      alphaShader = result.alphaCommand.shaderProgram;
      alphaRenderState = result.alphaCommand.renderState;
    }

    result.translucentCommand = DrawCommand.shallowClone(
      command,
      result.translucentCommand
    );
    result.alphaCommand = DrawCommand.shallowClone(
      command,
      result.alphaCommand
    );

    if (
      !defined(colorShader) ||
      result.shaderProgramId !== command.shaderProgram.id
    ) {
      result.translucentCommand.shaderProgram = getTranslucentColorShaderProgram(
        context,
        command.shaderProgram
      );
      result.translucentCommand.renderState = getTranslucentColorRenderState(
        this,
        context,
        command.renderState
      );
      result.alphaCommand.shaderProgram = getTranslucentAlphaShaderProgram(
        context,
        command.shaderProgram
      );
      result.alphaCommand.renderState = getTranslucentAlphaRenderState(
        this,
        context,
        command.renderState
      );
      result.shaderProgramId = command.shaderProgram.id;
    } else {
      result.translucentCommand.shaderProgram = colorShader;
      result.translucentCommand.renderState = colorRenderState;
      result.alphaCommand.shaderProgram = alphaShader;
      result.alphaCommand.renderState = alphaRenderState;
    }
  }

  return result;
};

function executeTranslucentCommandsSortedMultipass(
  oit,
  scene,
  executeFunction,
  passState,
  commands,
  invertClassification
) {
  var command;
  var derivedCommand;
  var j;

  var context = scene.context;
  var useLogDepth = scene.frameState.useLogDepth;
  var useHdr = scene._hdr;
  var framebuffer = passState.framebuffer;
  var length = commands.length;

  var lightShadowsEnabled = scene.frameState.shadowState.lightShadowsEnabled;

  passState.framebuffer = oit._adjustTranslucentFBO.framebuffer;
  oit._adjustTranslucentCommand.execute(context, passState);
  passState.framebuffer = oit._adjustAlphaFBO.framebuffer;
  oit._adjustAlphaCommand.execute(context, passState);

  var debugFramebuffer = oit._opaqueFBO;
  passState.framebuffer = oit._translucentFBO.framebuffer;

  for (j = 0; j < length; ++j) {
    command = commands[j];
    command = useLogDepth ? command.derivedCommands.logDepth.command : command;
    command = useHdr ? command.derivedCommands.hdr.command : command;
    derivedCommand =
      lightShadowsEnabled && command.receiveShadows
        ? command.derivedCommands.oit.shadows.translucentCommand
        : command.derivedCommands.oit.translucentCommand;
    executeFunction(
      derivedCommand,
      scene,
      context,
      passState,
      debugFramebuffer
    );
  }

  if (defined(invertClassification)) {
    command = invertClassification.unclassifiedCommand;
    derivedCommand =
      lightShadowsEnabled && command.receiveShadows
        ? command.derivedCommands.oit.shadows.translucentCommand
        : command.derivedCommands.oit.translucentCommand;
    executeFunction(
      derivedCommand,
      scene,
      context,
      passState,
      debugFramebuffer
    );
  }

  passState.framebuffer = oit._alphaFBO.framebuffer;

  for (j = 0; j < length; ++j) {
    command = commands[j];
    command = useLogDepth ? command.derivedCommands.logDepth.command : command;
    command = useHdr ? command.derivedCommands.hdr.command : command;
    derivedCommand =
      lightShadowsEnabled && command.receiveShadows
        ? command.derivedCommands.oit.shadows.alphaCommand
        : command.derivedCommands.oit.alphaCommand;
    executeFunction(
      derivedCommand,
      scene,
      context,
      passState,
      debugFramebuffer
    );
  }

  if (defined(invertClassification)) {
    command = invertClassification.unclassifiedCommand;
    derivedCommand =
      lightShadowsEnabled && command.receiveShadows
        ? command.derivedCommands.oit.shadows.alphaCommand
        : command.derivedCommands.oit.alphaCommand;
    executeFunction(
      derivedCommand,
      scene,
      context,
      passState,
      debugFramebuffer
    );
  }

  passState.framebuffer = framebuffer;
}

function executeTranslucentCommandsSortedMRT(
  oit,
  scene,
  executeFunction,
  passState,
  commands,
  invertClassification
) {
  var context = scene.context;
  var useLogDepth = scene.frameState.useLogDepth;
  var useHdr = scene._hdr;
  var framebuffer = passState.framebuffer;
  var length = commands.length;

  var lightShadowsEnabled = scene.frameState.shadowState.lightShadowsEnabled;

  passState.framebuffer = oit._adjustTranslucentFBO.framebuffer;
  oit._adjustTranslucentCommand.execute(context, passState);

  var debugFramebuffer = oit._opaqueFBO;
  passState.framebuffer = oit._translucentFBO.framebuffer;

  var command;
  var derivedCommand;

  for (var j = 0; j < length; ++j) {
    command = commands[j];
    command = useLogDepth ? command.derivedCommands.logDepth.command : command;
    command = useHdr ? command.derivedCommands.hdr.command : command;
    derivedCommand =
      lightShadowsEnabled && command.receiveShadows
        ? command.derivedCommands.oit.shadows.translucentCommand
        : command.derivedCommands.oit.translucentCommand;
    executeFunction(
      derivedCommand,
      scene,
      context,
      passState,
      debugFramebuffer
    );
  }

  if (defined(invertClassification)) {
    command = invertClassification.unclassifiedCommand;
    derivedCommand =
      lightShadowsEnabled && command.receiveShadows
        ? command.derivedCommands.oit.shadows.translucentCommand
        : command.derivedCommands.oit.translucentCommand;
    executeFunction(
      derivedCommand,
      scene,
      context,
      passState,
      debugFramebuffer
    );
  }

  passState.framebuffer = framebuffer;
}

OIT.prototype.executeCommands = function (
  scene,
  executeFunction,
  passState,
  commands,
  invertClassification
) {
  if (this._translucentMRTSupport) {
    executeTranslucentCommandsSortedMRT(
      this,
      scene,
      executeFunction,
      passState,
      commands,
      invertClassification
    );
    return;
  }

  executeTranslucentCommandsSortedMultipass(
    this,
    scene,
    executeFunction,
    passState,
    commands,
    invertClassification
  );
};

OIT.prototype.execute = function (context, passState) {
  this._compositeCommand.execute(context, passState);
};

OIT.prototype.clear = function (context, passState, clearColor) {
  var framebuffer = passState.framebuffer;

  passState.framebuffer = this._opaqueFBO.framebuffer;
  Color.clone(clearColor, this._opaqueClearCommand.color);
  this._opaqueClearCommand.execute(context, passState);

  passState.framebuffer = this._translucentFBO.framebuffer;
  var translucentClearCommand = this._translucentMRTSupport
    ? this._translucentMRTClearCommand
    : this._translucentMultipassClearCommand;
  translucentClearCommand.execute(context, passState);

  if (this._translucentMultipassSupport) {
    passState.framebuffer = this._alphaFBO.framebuffer;
    this._alphaClearCommand.execute(context, passState);
  }

  passState.framebuffer = framebuffer;
};

OIT.prototype.isSupported = function () {
  return this._translucentMRTSupport || this._translucentMultipassSupport;
};

OIT.prototype.isDestroyed = function () {
  return false;
};

OIT.prototype.destroy = function () {
  destroyResources(this);

  if (defined(this._compositeCommand)) {
    this._compositeCommand.shaderProgram =
      this._compositeCommand.shaderProgram &&
      this._compositeCommand.shaderProgram.destroy();
  }

  if (defined(this._adjustTranslucentCommand)) {
    this._adjustTranslucentCommand.shaderProgram =
      this._adjustTranslucentCommand.shaderProgram &&
      this._adjustTranslucentCommand.shaderProgram.destroy();
  }

  if (defined(this._adjustAlphaCommand)) {
    this._adjustAlphaCommand.shaderProgram =
      this._adjustAlphaCommand.shaderProgram &&
      this._adjustAlphaCommand.shaderProgram.destroy();
  }

  return destroyObject(this);
};
export default OIT;
