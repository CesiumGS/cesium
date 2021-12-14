import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import PixelFormat from "../Core/PixelFormat.js";
import ClearCommand from "../Renderer/ClearCommand.js";
import FramebufferManager from "../Renderer/FramebufferManager.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import RenderState from "../Renderer/RenderState.js";
import Sampler from "../Renderer/Sampler.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import Texture from "../Renderer/Texture.js";
import TextureMagnificationFilter from "../Renderer/TextureMagnificationFilter.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";
import TextureWrap from "../Renderer/TextureWrap.js";
import PassThrough from "../Shaders/PostProcessStages/PassThrough.js";
import BlendingState from "./BlendingState.js";
import StencilConstants from "./StencilConstants.js";
import StencilFunction from "./StencilFunction.js";
import StencilOperation from "./StencilOperation.js";

/**
 * @private
 */
function InvertClassification() {
  this.previousFramebuffer = undefined;
  this._previousFramebuffer = undefined;

  this._texture = undefined;
  this._classifiedTexture = undefined;
  this._depthStencilTexture = undefined;
  this._fbo = new FramebufferManager({
    createColorAttachments: false,
    createDepthAttachments: false,
  });
  this._fboClassified = new FramebufferManager({
    createColorAttachments: false,
    createDepthAttachments: false,
  });

  this._rsUnclassified = undefined;
  this._rsClassified = undefined;

  this._unclassifiedCommand = undefined;
  this._classifiedCommand = undefined;
  this._translucentCommand = undefined;

  this._clearColorCommand = new ClearCommand({
    color: new Color(0.0, 0.0, 0.0, 0.0),
    owner: this,
  });
  this._clearCommand = new ClearCommand({
    color: new Color(0.0, 0.0, 0.0, 0.0),
    depth: 1.0,
    stencil: 0,
  });

  var that = this;
  this._uniformMap = {
    colorTexture: function () {
      return that._texture;
    },
    depthTexture: function () {
      return that._depthStencilTexture;
    },
    classifiedTexture: function () {
      return that._classifiedTexture;
    },
  };
}

Object.defineProperties(InvertClassification.prototype, {
  unclassifiedCommand: {
    get: function () {
      return this._unclassifiedCommand;
    },
  },
});

InvertClassification.isTranslucencySupported = function (context) {
  return context.depthTexture && context.fragmentDepth;
};

var rsUnclassified = {
  depthMask: false,
  stencilTest: {
    enabled: true,
    frontFunction: StencilFunction.EQUAL,
    frontOperation: {
      fail: StencilOperation.KEEP,
      zFail: StencilOperation.KEEP,
      zPass: StencilOperation.KEEP,
    },
    backFunction: StencilFunction.NEVER,
    reference: 0,
    mask: StencilConstants.CLASSIFICATION_MASK,
  },
  blending: BlendingState.ALPHA_BLEND,
};

var rsClassified = {
  depthMask: false,
  stencilTest: {
    enabled: true,
    frontFunction: StencilFunction.NOT_EQUAL,
    frontOperation: {
      fail: StencilOperation.KEEP,
      zFail: StencilOperation.KEEP,
      zPass: StencilOperation.KEEP,
    },
    backFunction: StencilFunction.NEVER,
    reference: 0,
    mask: StencilConstants.CLASSIFICATION_MASK,
  },
  blending: BlendingState.ALPHA_BLEND,
};

// Set the 3D Tiles bit when rendering back into the scene's framebuffer. This is only needed if
// invert classification does not use the scene's depth-stencil texture, which is the case if the invert
// classification color is translucent.
var rsDefault = {
  depthMask: true,
  depthTest: {
    enabled: true,
  },
  stencilTest: StencilConstants.setCesium3DTileBit(),
  stencilMask: StencilConstants.CESIUM_3D_TILE_MASK,
  blending: BlendingState.ALPHA_BLEND,
};

var translucentFS =
  "#extension GL_EXT_frag_depth : enable\n" +
  "uniform sampler2D colorTexture;\n" +
  "uniform sampler2D depthTexture;\n" +
  "uniform sampler2D classifiedTexture;\n" +
  "varying vec2 v_textureCoordinates;\n" +
  "void main()\n" +
  "{\n" +
  "    vec4 color = texture2D(colorTexture, v_textureCoordinates);\n" +
  "    if (color.a == 0.0)\n" +
  "    {\n" +
  "        discard;\n" +
  "    }\n" +
  "    bool isClassified = all(equal(texture2D(classifiedTexture, v_textureCoordinates), vec4(0.0)));\n" +
  "#ifdef UNCLASSIFIED\n" +
  "    vec4 highlightColor = czm_invertClassificationColor;\n" +
  "    if (isClassified)\n" +
  "    {\n" +
  "        discard;\n" +
  "    }\n" +
  "#else\n" +
  "    vec4 highlightColor = vec4(1.0);\n" +
  "    if (!isClassified)\n" +
  "    {\n" +
  "        discard;\n" +
  "    }\n" +
  "#endif\n" +
  "    gl_FragColor = color * highlightColor;\n" +
  "    gl_FragDepthEXT = texture2D(depthTexture, v_textureCoordinates).r;\n" +
  "}\n";

var opaqueFS =
  "uniform sampler2D colorTexture;\n" +
  "varying vec2 v_textureCoordinates;\n" +
  "void main()\n" +
  "{\n" +
  "    vec4 color = texture2D(colorTexture, v_textureCoordinates);\n" +
  "    if (color.a == 0.0)\n" +
  "    {\n" +
  "        discard;\n" +
  "    }\n" +
  "#ifdef UNCLASSIFIED\n" +
  "    gl_FragColor = color * czm_invertClassificationColor;\n" +
  "#else\n" +
  "    gl_FragColor = color;\n" +
  "#endif\n" +
  "}\n";

InvertClassification.prototype.update = function (context) {
  var texture = this._texture;
  var previousFramebufferChanged =
    !defined(texture) || this.previousFramebuffer !== this._previousFramebuffer;
  this._previousFramebuffer = this.previousFramebuffer;

  var width = context.drawingBufferWidth;
  var height = context.drawingBufferHeight;

  var textureChanged =
    !defined(texture) || texture.width !== width || texture.height !== height;
  if (textureChanged || previousFramebufferChanged) {
    this._texture = this._texture && this._texture.destroy();
    this._classifiedTexture =
      this._classifiedTexture && this._classifiedTexture.destroy();
    this._depthStencilTexture =
      this._depthStencilTexture && this._depthStencilTexture.destroy();

    this._texture = new Texture({
      context: context,
      width: width,
      height: height,
      pixelFormat: PixelFormat.RGBA,
      pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      sampler: new Sampler({
        wrapS: TextureWrap.CLAMP_TO_EDGE,
        wrapT: TextureWrap.CLAMP_TO_EDGE,
        minificationFilter: TextureMinificationFilter.LINEAR,
        magnificationFilter: TextureMagnificationFilter.LINEAR,
      }),
    });

    if (!defined(this._previousFramebuffer)) {
      this._classifiedTexture = new Texture({
        context: context,
        width: width,
        height: height,
        pixelFormat: PixelFormat.RGBA,
        pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
        sampler: new Sampler({
          wrapS: TextureWrap.CLAMP_TO_EDGE,
          wrapT: TextureWrap.CLAMP_TO_EDGE,
          minificationFilter: TextureMinificationFilter.LINEAR,
          magnificationFilter: TextureMagnificationFilter.LINEAR,
        }),
      });
      this._depthStencilTexture = new Texture({
        context: context,
        width: width,
        height: height,
        pixelFormat: PixelFormat.DEPTH_STENCIL,
        pixelDatatype: PixelDatatype.UNSIGNED_INT_24_8,
      });
    }
  }

  if (
    !defined(this._fbo.framebuffer) ||
    textureChanged ||
    previousFramebufferChanged
  ) {
    this._fbo.destroyFramebuffer();
    this._fboClassified.destroyFramebuffer();

    var depthStencilTexture;
    var depthStencilRenderbuffer;
    if (defined(this._previousFramebuffer)) {
      depthStencilTexture = this._previousFramebuffer.depthStencilTexture;
      depthStencilRenderbuffer = this._previousFramebuffer
        .depthStencilRenderbuffer;
    } else {
      depthStencilTexture = this._depthStencilTexture;
    }

    this._fbo.setColorTexture(this._texture);
    this._fbo.setDepthStencilTexture(depthStencilTexture);
    if (defined(depthStencilRenderbuffer)) {
      this._fbo.setDepthStencilRenderbuffer(depthStencilRenderbuffer);
    }
    this._fbo.update(context);

    if (!defined(this._previousFramebuffer)) {
      this._fboClassified.setColorTexture(this._classifiedTexture);
      this._fboClassified.setDepthStencilTexture(depthStencilTexture);
      this._fboClassified.update(context);
    }
  }

  if (!defined(this._rsUnclassified)) {
    this._rsUnclassified = RenderState.fromCache(rsUnclassified);
    this._rsClassified = RenderState.fromCache(rsClassified);
    this._rsDefault = RenderState.fromCache(rsDefault);
  }

  if (!defined(this._unclassifiedCommand) || previousFramebufferChanged) {
    if (defined(this._unclassifiedCommand)) {
      this._unclassifiedCommand.shaderProgram =
        this._unclassifiedCommand.shaderProgram &&
        this._unclassifiedCommand.shaderProgram.destroy();
      this._classifiedCommand.shaderProgram =
        this._classifiedCommand.shaderProgram &&
        this._classifiedCommand.shaderProgram.destroy();
    }

    var fs = defined(this._previousFramebuffer) ? opaqueFS : translucentFS;
    var unclassifiedFSSource = new ShaderSource({
      defines: ["UNCLASSIFIED"],
      sources: [fs],
    });
    var classifiedFSSource = new ShaderSource({
      sources: [fs],
    });
    this._unclassifiedCommand = context.createViewportQuadCommand(
      unclassifiedFSSource,
      {
        renderState: defined(this._previousFramebuffer)
          ? this._rsUnclassified
          : this._rsDefault,
        uniformMap: this._uniformMap,
        owner: this,
      }
    );
    this._classifiedCommand = context.createViewportQuadCommand(
      classifiedFSSource,
      {
        renderState: defined(this._previousFramebuffer)
          ? this._rsClassified
          : this._rsDefault,
        uniformMap: this._uniformMap,
        owner: this,
      }
    );

    if (defined(this._translucentCommand)) {
      this._translucentCommand.shaderProgram =
        this._translucentCommand.shaderProgram &&
        this._translucentCommand.shaderProgram.destroy();
    }
    if (!defined(this._previousFramebuffer)) {
      this._translucentCommand = context.createViewportQuadCommand(
        PassThrough,
        {
          renderState: this._rsUnclassified,
          uniformMap: this._uniformMap,
          owner: this,
        }
      );
    }
  }
};

InvertClassification.prototype.clear = function (context, passState) {
  var framebuffer = passState.framebuffer;

  if (defined(this._previousFramebuffer)) {
    passState.framebuffer = this._fbo.framebuffer;
    this._clearColorCommand.execute(context, passState);
  } else {
    passState.framebuffer = this._fbo.framebuffer;
    this._clearCommand.execute(context, passState);
    passState.framebuffer = this._fboClassified.framebuffer;
    this._clearCommand.execute(context, passState);
  }

  passState.framebuffer = framebuffer;
};

InvertClassification.prototype.executeClassified = function (
  context,
  passState
) {
  if (!defined(this._previousFramebuffer)) {
    var framebuffer = passState.framebuffer;

    passState.framebuffer = this._fboClassified.framebuffer;
    this._translucentCommand.execute(context, passState);

    passState.framebuffer = framebuffer;
  }
  this._classifiedCommand.execute(context, passState);
};

InvertClassification.prototype.executeUnclassified = function (
  context,
  passState
) {
  this._unclassifiedCommand.execute(context, passState);
};

InvertClassification.prototype.isDestroyed = function () {
  return false;
};

InvertClassification.prototype.destroy = function () {
  this._fbo.destroyFramebuffer();
  this._texture = this._texture && this._texture.destroy();
  this._depthStencilTexture =
    this._depthStencilTexture && this._depthStencilTexture.destroy();

  if (defined(this._unclassifiedCommand)) {
    this._unclassifiedCommand.shaderProgram =
      this._unclassifiedCommand.shaderProgram &&
      this._unclassifiedCommand.shaderProgram.destroy();
    this._classifiedCommand.shaderProgram =
      this._classifiedCommand.shaderProgram &&
      this._classifiedCommand.shaderProgram.destroy();
  }

  return destroyObject(this);
};
export default InvertClassification;
