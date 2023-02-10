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
 * @constructor
 * @param {Context} context
 */
function OIT(context) {
  this._numSamples = 1;
  // We support multipass for the Chrome D3D9 backend and ES 2.0 on mobile.
  this._translucentMultipassSupport = false;
  this._translucentMRTSupport = false;

  const extensionsSupported =
    context.colorBufferFloat && context.depthTexture && context.floatBlend;
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
    depth: true,
  });
  this._alphaFBO = new FramebufferManager({
    createColorAttachments: false,
    createDepthAttachments: false,
    depth: true,
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

/**
 * @private
 * @param {OIT} oit
 */
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

/**
 * @private
 * @param {OIT} oit
 */
function destroyFramebuffers(oit) {
  oit._translucentFBO.destroy();
  oit._alphaFBO.destroy();
  oit._adjustTranslucentFBO.destroy();
  oit._adjustAlphaFBO.destroy();
}

/**
 * @private
 * @param {OIT} oit
 */
function destroyResources(oit) {
  destroyTextures(oit);
  destroyFramebuffers(oit);
}

/**
 * @private
 * @param {OIT} oit
 * @param {Context} context
 * @param {number} width
 * @param {number} height
 */
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
  const source = new Float32Array(width * height * 4);
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

/**
 * @private
 * @param {OIT} oit
 * @param {Context} context
 * @returns {boolean}
 */
function updateFramebuffers(oit, context) {
  destroyFramebuffers(oit);

  const completeFBO = WebGLConstants.FRAMEBUFFER_COMPLETE;
  let supported = true;

  const { width, height } = oit._accumulationTexture;

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

    const translucentComplete = oit._translucentFBO.status === completeFBO;
    const alphaComplete = oit._alphaFBO.status === completeFBO;
    const adjustTranslucentComplete =
      oit._adjustTranslucentFBO.status === completeFBO;
    const adjustAlphaComplete = oit._adjustAlphaFBO.status === completeFBO;
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

/**
 * @private
 * @param {Context} context
 * @param {PassState} passState
 * @param {Framebuffer} framebuffer
 * @param {boolean} useHDR
 * @param {number} numSamples
 */
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

  const { width, height } = this._opaqueTexture;

  const accumulationTexture = this._accumulationTexture;
  const textureChanged =
    !defined(accumulationTexture) ||
    accumulationTexture.width !== width ||
    accumulationTexture.height !== height ||
    useHDR !== this._useHDR;
  const samplesChanged = this._numSamples !== numSamples;

  if (textureChanged || samplesChanged) {
    this._numSamples = numSamples;
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

  const that = this;
  let fs;
  let uniformMap;

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

  const useScissorTest = !BoundingRectangle.equals(
    this._viewport,
    passState.viewport
  );
  let updateScissor = useScissorTest !== this._useScissorTest;
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

const translucentMRTBlend = {
  enabled: true,
  color: new Color(0.0, 0.0, 0.0, 0.0),
  equationRgb: BlendEquation.ADD,
  equationAlpha: BlendEquation.ADD,
  functionSourceRgb: BlendFunction.ONE,
  functionDestinationRgb: BlendFunction.ONE,
  functionSourceAlpha: BlendFunction.ZERO,
  functionDestinationAlpha: BlendFunction.ONE_MINUS_SOURCE_ALPHA,
};

const translucentColorBlend = {
  enabled: true,
  color: new Color(0.0, 0.0, 0.0, 0.0),
  equationRgb: BlendEquation.ADD,
  equationAlpha: BlendEquation.ADD,
  functionSourceRgb: BlendFunction.ONE,
  functionDestinationRgb: BlendFunction.ONE,
  functionSourceAlpha: BlendFunction.ONE,
  functionDestinationAlpha: BlendFunction.ONE,
};

const translucentAlphaBlend = {
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
  let translucentState = cache[renderState.id];
  if (!defined(translucentState)) {
    const rs = RenderState.getState(renderState);
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

const mrtShaderSource =
  "    vec3 Ci = czm_out_FragColor.rgb * czm_out_FragColor.a;\n" +
  "    float ai = czm_out_FragColor.a;\n" +
  "    float wzi = czm_alphaWeight(ai);\n" +
  "    out_FragData_0 = vec4(Ci * wzi, ai);\n" +
  "    out_FragData_1 = vec4(ai * wzi);\n";

const colorShaderSource =
  "    vec3 Ci = czm_out_FragColor.rgb * czm_out_FragColor.a;\n" +
  "    float ai = czm_out_FragColor.a;\n" +
  "    float wzi = czm_alphaWeight(ai);\n" +
  "    out_FragColor = vec4(Ci, ai) * wzi;\n";

const alphaShaderSource =
  "    float ai = czm_out_FragColor.a;\n" + "    out_FragColor = vec4(ai);\n";

/**
 * @private
 * @param {Context} context
 * @param {ShaderProgram} shaderProgram
 * @param {string} keyword
 * @param {string} source
 * @returns {ShaderProgram}
 */
function getTranslucentShaderProgram(context, shaderProgram, keyword, source) {
  const { shaderCache } = context;
  const shader = shaderCache.getDerivedShaderProgram(shaderProgram, keyword);
  if (defined(shader)) {
    return shader;
  }

  const attributeLocations = shaderProgram._attributeLocations;
  const fs = shaderProgram.fragmentShaderSource.clone();

  fs.sources = fs.sources.map(function (fsSource) {
    return ShaderSource.replaceMain(fsSource, "czm_translucent_main")
      .replace(/out_FragColor/g, "czm_out_FragColor")
      .replace(
        /layout\s*\(location\s*=\s*0\)\s*out\s+vec4\s+out_FragColor;/g,
        ""
      )
      .replace(/\bdiscard\b/g, "czm_discard = true")
      .replace(/czm_phong/g, "czm_translucentPhong");
  });

  // Discarding the fragment in main is a workaround for ANGLE D3D9
  // shader compilation errors.
  fs.sources.splice(
    0,
    0,
    `vec4 czm_out_FragColor;\n` + `bool czm_discard = false;\n`
  );

  const fragDataMatches = [...source.matchAll(/out_FragData_(\d+)/g)];
  let fragDataDeclarations = ``;
  for (let i = 0; i < fragDataMatches.length; i++) {
    const fragDataMatch = fragDataMatches[i];
    fragDataDeclarations = `layout (location = ${fragDataMatch[1]}) out vec4 ${fragDataMatch[0]};\n${fragDataDeclarations}`;
  }
  fs.sources.push(fragDataDeclarations);

  fs.sources.push(
    `${
      "void main()\n" +
      "{\n" +
      "    czm_translucent_main();\n" +
      "    if (czm_discard)\n" +
      "    {\n" +
      "        discard;\n" +
      "    }\n"
    }${source}}\n`
  );

  return shaderCache.createDerivedShaderProgram(shaderProgram, keyword, {
    vertexShaderSource: shaderProgram.vertexShaderSource,
    fragmentShaderSource: fs,
    attributeLocations: attributeLocations,
  });
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

/**
 * @private
 * @param {DrawCommand} command
 * @param {Context} context
 * @param {*} result
 * @returns {*}
 */
OIT.prototype.createDerivedCommands = function (command, context, result) {
  if (!defined(result)) {
    result = {};
  }

  if (this._translucentMRTSupport) {
    let translucentShader;
    let translucentRenderState;
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
    return result;
  }

  let colorShader;
  let colorRenderState;
  let alphaShader;
  let alphaRenderState;
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
  result.alphaCommand = DrawCommand.shallowClone(command, result.alphaCommand);

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

  return result;
};

/**
 * @private
 * @param {OIT} oit
 * @param {Scene} scene
 * @param {Function} executeFunction
 * @param {PassState} passState
 * @param {DrawCommand[]} commands
 * @param {InvertClassification} invertClassification
 */
function executeTranslucentCommandsSortedMultipass(
  oit,
  scene,
  executeFunction,
  passState,
  commands,
  invertClassification
) {
  let command;
  let derivedCommand;
  let j;

  const { context, frameState } = scene;
  const { useLogDepth, shadowState } = frameState;
  const useHdr = scene._hdr;
  const framebuffer = passState.framebuffer;

  const lightShadowsEnabled = shadowState.lightShadowsEnabled;

  passState.framebuffer = oit._adjustTranslucentFBO.framebuffer;
  oit._adjustTranslucentCommand.execute(context, passState);
  passState.framebuffer = oit._adjustAlphaFBO.framebuffer;
  oit._adjustAlphaCommand.execute(context, passState);

  const debugFramebuffer = oit._opaqueFBO.framebuffer;
  passState.framebuffer = oit._translucentFBO.framebuffer;

  for (j = 0; j < commands.length; ++j) {
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

  for (j = 0; j < commands.length; ++j) {
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

/**
 * @private
 * @param {OIT} oit
 * @param {Scene} scene
 * @param {Function} executeFunction
 * @param {PassState} passState
 * @param {DrawCommand[]} commands
 * @param {InvertClassification} invertClassification
 */
function executeTranslucentCommandsSortedMRT(
  oit,
  scene,
  executeFunction,
  passState,
  commands,
  invertClassification
) {
  const { context, frameState } = scene;
  const { useLogDepth, shadowState } = frameState;
  const useHdr = scene._hdr;
  const framebuffer = passState.framebuffer;

  const lightShadowsEnabled = shadowState.lightShadowsEnabled;

  passState.framebuffer = oit._adjustTranslucentFBO.framebuffer;
  oit._adjustTranslucentCommand.execute(context, passState);

  const debugFramebuffer = oit._opaqueFBO.framebuffer;
  passState.framebuffer = oit._translucentFBO.framebuffer;

  let command;
  let derivedCommand;

  for (let j = 0; j < commands.length; ++j) {
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

/**
 * @private
 * @param {Scene} scene
 * @param {Function} executeFunction
 * @param {PassState} passState
 * @param {DrawCommand[]} commands
 * @param {InvertClassification} invertClassification
 */
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

/**
 * @private
 * @param {Context} context
 * @param {PassState} passState
 */
OIT.prototype.execute = function (context, passState) {
  this._compositeCommand.execute(context, passState);
};

/**
 * @private
 * @param {Context} context
 * @param {PassState} passState
 * @param {Color} clearColor
 */
OIT.prototype.clear = function (context, passState, clearColor) {
  const framebuffer = passState.framebuffer;

  passState.framebuffer = this._opaqueFBO.framebuffer;
  Color.clone(clearColor, this._opaqueClearCommand.color);
  this._opaqueClearCommand.execute(context, passState);

  passState.framebuffer = this._translucentFBO.framebuffer;
  const translucentClearCommand = this._translucentMRTSupport
    ? this._translucentMRTClearCommand
    : this._translucentMultipassClearCommand;
  translucentClearCommand.execute(context, passState);

  if (this._translucentMultipassSupport) {
    passState.framebuffer = this._alphaFBO.framebuffer;
    this._alphaClearCommand.execute(context, passState);
  }

  passState.framebuffer = framebuffer;
};

/**
 * @private
 * @returns {boolean}
 */
OIT.prototype.isSupported = function () {
  return this._translucentMRTSupport || this._translucentMultipassSupport;
};

/**
 * @private
 * @returns {boolean}
 */
OIT.prototype.isDestroyed = function () {
  return false;
};

/**
 * @private
 */
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
