import BoundingRectangle from "../Core/BoundingRectangle.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import PixelFormat from "../Core/PixelFormat.js";
import ClearCommand from "../Renderer/ClearCommand.js";
import Framebuffer from "../Renderer/Framebuffer.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import Renderbuffer from "../Renderer/Renderbuffer.js";
import RenderbufferFormat from "../Renderer/RenderbufferFormat.js";
import RenderState from "../Renderer/RenderState.js";
import Sampler from "../Renderer/Sampler.js";
import Texture from "../Renderer/Texture.js";
import PassThroughDepth from "../Shaders/PostProcessStages/PassThroughDepth.js";

/**
 * @private
 */
function GlobeTranslucencyFramebuffer() {
  this._colorTexture = undefined;
  this._depthStencilTexture = undefined;
  this._depthStencilRenderbuffer = undefined;
  this._framebuffer = undefined;

  this._packedDepthTexture = undefined;
  this._packedDepthFramebuffer = undefined;

  this._renderState = undefined;

  this._packedDepthCommand = undefined;
  this._clearCommand = undefined;

  this._viewport = new BoundingRectangle();
  this._useScissorTest = false;
  this._scissorRectangle = undefined;
  this._useHdr = undefined;
}

Object.defineProperties(GlobeTranslucencyFramebuffer.prototype, {
  classificationTexture: {
    get: function () {
      return this._colorTexture;
    },
  },
  classificationFramebuffer: {
    get: function () {
      return this._framebuffer;
    },
  },
});

function destroyResources(globeTranslucency) {
  globeTranslucency._colorTexture =
    globeTranslucency._colorTexture &&
    !globeTranslucency._colorTexture.isDestroyed() &&
    globeTranslucency._colorTexture.destroy();
  globeTranslucency._depthStencilTexture =
    globeTranslucency._depthStencilTexture &&
    !globeTranslucency._depthStencilTexture.isDestroyed() &&
    globeTranslucency._depthStencilTexture.destroy();
  globeTranslucency._depthStencilRenderbuffer =
    globeTranslucency._depthStencilRenderbuffer &&
    !globeTranslucency._depthStencilRenderbuffer.isDestroyed() &&
    globeTranslucency._depthStencilRenderbuffer.destroy();
  globeTranslucency._framebuffer =
    globeTranslucency._framebuffer &&
    !globeTranslucency._framebuffer.isDestroyed() &&
    globeTranslucency._framebuffer.destroy();
  globeTranslucency._packedDepthTexture =
    globeTranslucency._packedDepthTexture &&
    !globeTranslucency._packedDepthTexture.isDestroyed() &&
    globeTranslucency._packedDepthTexture.destroy();
  globeTranslucency._packedDepthFramebuffer =
    globeTranslucency._packedDepthFramebuffer &&
    !globeTranslucency._packedDepthFramebuffer.isDestroyed() &&
    globeTranslucency._packedDepthFramebuffer.destroy();
}

function createResources(globeTranslucency, context, width, height, hdr) {
  var pixelDatatype = hdr
    ? context.halfFloatingPointTexture
      ? PixelDatatype.HALF_FLOAT
      : PixelDatatype.FLOAT
    : PixelDatatype.UNSIGNED_BYTE;
  globeTranslucency._colorTexture = new Texture({
    context: context,
    width: width,
    height: height,
    pixelFormat: PixelFormat.RGBA,
    pixelDatatype: pixelDatatype,
    sampler: Sampler.NEAREST,
  });

  if (context.depthTexture) {
    globeTranslucency._depthStencilTexture = new Texture({
      context: context,
      width: width,
      height: height,
      pixelFormat: PixelFormat.DEPTH_STENCIL,
      pixelDatatype: PixelDatatype.UNSIGNED_INT_24_8,
    });
  } else {
    globeTranslucency._depthStencilRenderbuffer = new Renderbuffer({
      context: context,
      width: width,
      height: height,
      format: RenderbufferFormat.DEPTH_STENCIL,
    });
  }

  globeTranslucency._framebuffer = new Framebuffer({
    context: context,
    colorTextures: [globeTranslucency._colorTexture],
    depthStencilTexture: globeTranslucency._depthStencilTexture,
    depthStencilRenderbuffer: globeTranslucency._depthStencilRenderbuffer,
    destroyAttachments: false,
  });

  globeTranslucency._packedDepthTexture = new Texture({
    context: context,
    width: width,
    height: height,
    pixelFormat: PixelFormat.RGBA,
    pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
    sampler: Sampler.NEAREST,
  });

  globeTranslucency._packedDepthFramebuffer = new Framebuffer({
    context: context,
    colorTextures: [globeTranslucency._packedDepthTexture],
    destroyAttachments: false,
  });
}

function updateResources(globeTranslucency, context, width, height, hdr) {
  var colorTexture = globeTranslucency._colorTexture;
  var textureChanged =
    !defined(colorTexture) ||
    colorTexture.width !== width ||
    colorTexture.height !== height ||
    hdr !== globeTranslucency._useHdr;
  if (textureChanged) {
    destroyResources(globeTranslucency);
    createResources(globeTranslucency, context, width, height, hdr);
  }
}

function updateCommands(globeTranslucency, context, width, height, passState) {
  globeTranslucency._viewport.width = width;
  globeTranslucency._viewport.height = height;

  var useScissorTest = !BoundingRectangle.equals(
    globeTranslucency._viewport,
    passState.viewport
  );
  var updateScissor = useScissorTest !== globeTranslucency._useScissorTest;
  globeTranslucency._useScissorTest = useScissorTest;

  if (
    !BoundingRectangle.equals(
      globeTranslucency._scissorRectangle,
      passState.viewport
    )
  ) {
    globeTranslucency._scissorRectangle = BoundingRectangle.clone(
      passState.viewport,
      globeTranslucency._scissorRectangle
    );
    updateScissor = true;
  }

  if (
    !defined(globeTranslucency._renderState) ||
    !BoundingRectangle.equals(
      globeTranslucency._viewport,
      globeTranslucency._renderState.viewport
    ) ||
    updateScissor
  ) {
    globeTranslucency._renderState = RenderState.fromCache({
      viewport: globeTranslucency._viewport,
      scissorTest: {
        enabled: globeTranslucency._useScissorTest,
        rectangle: globeTranslucency._scissorRectangle,
      },
    });
  }

  if (!defined(globeTranslucency._packedDepthCommand)) {
    globeTranslucency._packedDepthCommand = context.createViewportQuadCommand(
      PassThroughDepth,
      {
        uniformMap: {
          u_depthTexture: function () {
            return globeTranslucency._depthStencilTexture;
          },
        },
        owner: globeTranslucency,
      }
    );
  }

  if (!defined(globeTranslucency._clearCommand)) {
    globeTranslucency._clearCommand = new ClearCommand({
      color: new Color(0.0, 0.0, 0.0, 0.0),
      depth: 1.0,
      stencil: 0.0,
      owner: globeTranslucency,
    });
  }

  globeTranslucency._packedDepthCommand.framebuffer =
    globeTranslucency._packedDepthFramebuffer;
  globeTranslucency._packedDepthCommand.renderState =
    globeTranslucency._renderState;
  globeTranslucency._clearCommand.framebuffer = globeTranslucency._framebuffer;
  globeTranslucency._clearCommand.renderState = globeTranslucency._renderState;
}

GlobeTranslucencyFramebuffer.prototype.updateAndClear = function (
  hdr,
  viewport,
  context,
  passState
) {
  var width = viewport.width;
  var height = viewport.height;

  updateResources(this, context, width, height, hdr);
  updateCommands(this, context, width, height, passState);

  this._useHdr = hdr;
};

GlobeTranslucencyFramebuffer.prototype.clearClassification = function (
  context,
  passState
) {
  this._clearCommand.execute(context, passState);
};

GlobeTranslucencyFramebuffer.prototype.packDepth = function (
  context,
  passState
) {
  this._packedDepthCommand.execute(context, passState);
  return this._packedDepthTexture;
};

GlobeTranslucencyFramebuffer.prototype.isDestroyed = function () {
  return false;
};

GlobeTranslucencyFramebuffer.prototype.destroy = function () {
  destroyResources(this);
  return destroyObject(this);
};

export default GlobeTranslucencyFramebuffer;
