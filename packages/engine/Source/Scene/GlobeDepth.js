import BoundingRectangle from "../Core/BoundingRectangle.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import ClearCommand from "../Renderer/ClearCommand.js";
import FramebufferManager from "../Renderer/FramebufferManager.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import RenderState from "../Renderer/RenderState.js";
import PassThrough from "../Shaders/PostProcessStages/PassThrough.js";
import PassThroughDepth from "../Shaders/PostProcessStages/PassThroughDepth.js";
import BlendingState from "./BlendingState.js";
import StencilConstants from "./StencilConstants.js";
import StencilFunction from "./StencilFunction.js";
import StencilOperation from "./StencilOperation.js";

/**
 * @alias GlobeDepth
 * @constructor
 *
 * @private
 */
function GlobeDepth() {
  this._picking = false;
  this._numSamples = 1;
  this._tempCopyDepthTexture = undefined;

  this._pickColorFramebuffer = new FramebufferManager({
    depthStencil: true,
    supportsDepthTexture: true,
  });
  this._outputFramebuffer = new FramebufferManager({
    depthStencil: true,
    supportsDepthTexture: true,
  });
  this._copyDepthFramebuffer = new FramebufferManager();
  this._tempCopyDepthFramebuffer = new FramebufferManager();
  this._updateDepthFramebuffer = new FramebufferManager({
    createColorAttachments: false,
    createDepthAttachments: false,
    depthStencil: true,
  });

  this._clearGlobeColorCommand = undefined;
  this._copyColorCommand = undefined;
  this._copyDepthCommand = undefined;
  this._tempCopyDepthCommand = undefined;
  this._updateDepthCommand = undefined;

  this._viewport = new BoundingRectangle();
  this._rs = undefined;
  this._rsBlend = undefined;
  this._rsUpdate = undefined;

  this._useScissorTest = false;
  this._scissorRectangle = undefined;

  this._useHdr = undefined;
  this._clearGlobeDepth = undefined;
}

Object.defineProperties(GlobeDepth.prototype, {
  colorFramebufferManager: {
    get: function () {
      return this._picking
        ? this._pickColorFramebuffer
        : this._outputFramebuffer;
    },
  },
  framebuffer: {
    get: function () {
      return this.colorFramebufferManager.framebuffer;
    },
  },
  depthStencilTexture: {
    get: function () {
      return this.colorFramebufferManager.getDepthStencilTexture();
    },
  },
  picking: {
    get: function () {
      return this._picking;
    },
    set: function (value) {
      this._picking = value;
    },
  },
});

function updateCopyCommands(globeDepth, context, width, height, passState) {
  const viewport = globeDepth._viewport;
  viewport.width = width;
  viewport.height = height;

  const useScissorTest = !BoundingRectangle.equals(
    viewport,
    passState.viewport,
  );
  let updateScissor = useScissorTest !== globeDepth._useScissorTest;
  globeDepth._useScissorTest = useScissorTest;

  if (
    !BoundingRectangle.equals(globeDepth._scissorRectangle, passState.viewport)
  ) {
    globeDepth._scissorRectangle = BoundingRectangle.clone(
      passState.viewport,
      globeDepth._scissorRectangle,
    );
    updateScissor = true;
  }

  if (
    !defined(globeDepth._rs) ||
    !BoundingRectangle.equals(viewport, globeDepth._rs.viewport) ||
    updateScissor
  ) {
    globeDepth._rs = RenderState.fromCache({
      viewport: viewport,
      scissorTest: {
        enabled: globeDepth._useScissorTest,
        rectangle: globeDepth._scissorRectangle,
      },
    });
    globeDepth._rsBlend = RenderState.fromCache({
      viewport: viewport,
      scissorTest: {
        enabled: globeDepth._useScissorTest,
        rectangle: globeDepth._scissorRectangle,
      },
      blending: BlendingState.ALPHA_BLEND,
    });

    // Copy packed depth only if the 3D Tiles bit is set
    globeDepth._rsUpdate = RenderState.fromCache({
      viewport: viewport,
      scissorTest: {
        enabled: globeDepth._useScissorTest,
        rectangle: globeDepth._scissorRectangle,
      },
      stencilTest: {
        enabled: true,
        frontFunction: StencilFunction.EQUAL,
        frontOperation: {
          fail: StencilOperation.KEEP,
          zFail: StencilOperation.KEEP,
          zPass: StencilOperation.KEEP,
        },
        backFunction: StencilFunction.NEVER,
        reference: StencilConstants.CESIUM_3D_TILE_MASK,
        mask: StencilConstants.CESIUM_3D_TILE_MASK,
      },
    });
  }

  if (!defined(globeDepth._copyDepthCommand)) {
    globeDepth._copyDepthCommand = context.createViewportQuadCommand(
      PassThroughDepth,
      {
        uniformMap: {
          u_depthTexture: function () {
            return globeDepth.colorFramebufferManager.getDepthStencilTexture();
          },
        },
        owner: globeDepth,
      },
    );
  }

  globeDepth._copyDepthCommand.framebuffer =
    globeDepth._copyDepthFramebuffer.framebuffer;
  globeDepth._copyDepthCommand.renderState = globeDepth._rs;

  if (!defined(globeDepth._copyColorCommand)) {
    globeDepth._copyColorCommand = context.createViewportQuadCommand(
      PassThrough,
      {
        uniformMap: {
          colorTexture: function () {
            return globeDepth.colorFramebufferManager.getColorTexture();
          },
        },
        owner: globeDepth,
      },
    );
  }

  globeDepth._copyColorCommand.renderState = globeDepth._rs;

  if (!defined(globeDepth._tempCopyDepthCommand)) {
    globeDepth._tempCopyDepthCommand = context.createViewportQuadCommand(
      PassThroughDepth,
      {
        uniformMap: {
          u_depthTexture: function () {
            return globeDepth._tempCopyDepthTexture;
          },
        },
        owner: globeDepth,
      },
    );
  }

  globeDepth._tempCopyDepthCommand.framebuffer =
    globeDepth._tempCopyDepthFramebuffer.framebuffer;
  globeDepth._tempCopyDepthCommand.renderState = globeDepth._rs;

  if (!defined(globeDepth._updateDepthCommand)) {
    globeDepth._updateDepthCommand = context.createViewportQuadCommand(
      PassThrough,
      {
        uniformMap: {
          colorTexture: function () {
            return globeDepth._tempCopyDepthFramebuffer.getColorTexture();
          },
        },
        owner: globeDepth,
      },
    );
  }

  globeDepth._updateDepthCommand.framebuffer =
    globeDepth._updateDepthFramebuffer.framebuffer;
  globeDepth._updateDepthCommand.renderState = globeDepth._rsUpdate;

  if (!defined(globeDepth._clearGlobeColorCommand)) {
    globeDepth._clearGlobeColorCommand = new ClearCommand({
      color: new Color(0.0, 0.0, 0.0, 0.0),
      stencil: 0.0,
      owner: globeDepth,
    });
  }

  globeDepth._clearGlobeColorCommand.framebuffer = globeDepth.framebuffer;
}

/**
 * Update framebuffers and render state.
 *
 * @param {Context} context The context used for rendering.
 * @param {PassState} passState Rendering state for subsequent render passes.
 * @param {BoundingRectangle} viewport The viewport for the rendering.
 * @param {number} numSamples The number of samples for multi-sample anti-aliasing (MSAA).
 * @param {boolean} hdr <code>true</code> if the color output needs to be floating point for HDR rendering.
 * @param {boolean} clearGlobeDepth <code>true</code> if the depth buffer should be cleared before rendering 3D Tiles and opaque entities.
 *
 * @private
 */
GlobeDepth.prototype.update = function (
  context,
  passState,
  viewport,
  numSamples,
  hdr,
  clearGlobeDepth,
) {
  const { width, height } = viewport;

  const pixelDatatype = hdr
    ? context.halfFloatingPointTexture
      ? PixelDatatype.HALF_FLOAT
      : PixelDatatype.FLOAT
    : PixelDatatype.UNSIGNED_BYTE;
  this._numSamples = numSamples;
  if (this.picking) {
    this._pickColorFramebuffer.update(context, width, height);
  } else {
    this._outputFramebuffer.update(
      context,
      width,
      height,
      numSamples,
      pixelDatatype,
    );
  }
  this._copyDepthFramebuffer.update(context, width, height);
  updateCopyCommands(this, context, width, height, passState);
  context.uniformState.globeDepthTexture = undefined;

  this._clearGlobeDepth = clearGlobeDepth;
};

/**
 * If using MSAA, resolve the stencil.
 *
 * @param {Context} context
 * @param {boolean} blitStencil <code>true</code> if the stencil has been set.
 *
 * @private
 */
GlobeDepth.prototype.prepareColorTextures = function (context, blitStencil) {
  if (!this.picking && this._numSamples > 1) {
    this._outputFramebuffer.prepareTextures(context, blitStencil);
  }
};

GlobeDepth.prototype.executeCopyDepth = function (context, passState) {
  if (defined(this._copyDepthCommand)) {
    this.prepareColorTextures(context);
    this._copyDepthCommand.execute(context, passState);
    context.uniformState.globeDepthTexture =
      this._copyDepthFramebuffer.getColorTexture();
  }
};

/**
 * Update the existing depth texture using a stencil.
 *
 * @param {Context} context The context used for rendering.
 * @param {PassState} passState Render state for subsequent rendering passes.
 * @param {Texture} [depthTexture] The depth texture to copy.
 */
GlobeDepth.prototype.executeUpdateDepth = function (
  context,
  passState,
  depthTexture,
) {
  const depthTextureToCopy = defined(depthTexture)
    ? depthTexture
    : passState.framebuffer.depthStencilTexture;
  if (
    !this._clearGlobeDepth &&
    depthTextureToCopy === this.colorFramebufferManager.getDepthStencilTexture()
  ) {
    // Fast path - the depth texture can be copied normally.
    if (defined(this._copyDepthCommand)) {
      this._copyDepthCommand.execute(context, passState);
    }
    return;
  }
  if (!defined(this._updateDepthCommand)) {
    return;
  }

  // First copy the depth to a temporary globe depth texture, then update the
  // main globe depth texture where the stencil bit for 3D Tiles is set.
  // This preserves the original globe depth except where 3D Tiles is rendered.
  // The additional texture and framebuffer resources are created on demand.
  const updateDepthFramebuffer = this._updateDepthFramebuffer;
  if (
    !defined(updateDepthFramebuffer.framebuffer) ||
    updateDepthFramebuffer.getDepthStencilTexture() !== depthTextureToCopy ||
    updateDepthFramebuffer.getColorTexture() !==
      this._copyDepthFramebuffer.getColorTexture()
  ) {
    const colorTexture = this._copyDepthFramebuffer.getColorTexture();
    const { width, height } = colorTexture;
    this._tempCopyDepthFramebuffer.destroy();
    this._tempCopyDepthFramebuffer.update(context, width, height);

    updateDepthFramebuffer.setColorTexture(colorTexture, 0);
    updateDepthFramebuffer.setDepthStencilTexture(depthTextureToCopy);
    updateDepthFramebuffer.update(context, width, height);

    updateCopyCommands(this, context, width, height, passState);
  }
  this._tempCopyDepthTexture = depthTextureToCopy;
  this._tempCopyDepthCommand.execute(context, passState);
  this._updateDepthCommand.execute(context, passState);
};

GlobeDepth.prototype.executeCopyColor = function (context, passState) {
  if (defined(this._copyColorCommand)) {
    this._copyColorCommand.execute(context, passState);
  }
};

GlobeDepth.prototype.clear = function (context, passState, clearColor) {
  const clear = this._clearGlobeColorCommand;
  if (defined(clear)) {
    Color.clone(clearColor, clear.color);
    this.colorFramebufferManager.clear(context, clear, passState);
  }
};

GlobeDepth.prototype.isDestroyed = function () {
  return false;
};

GlobeDepth.prototype.destroy = function () {
  this._pickColorFramebuffer.destroy();
  this._outputFramebuffer.destroy();
  this._copyDepthFramebuffer.destroy();
  this._tempCopyDepthFramebuffer.destroy();
  this._updateDepthFramebuffer.destroy();

  if (defined(this._copyColorCommand)) {
    this._copyColorCommand.shaderProgram =
      this._copyColorCommand.shaderProgram.destroy();
  }

  if (defined(this._copyDepthCommand)) {
    this._copyDepthCommand.shaderProgram =
      this._copyDepthCommand.shaderProgram.destroy();
  }

  if (defined(this._tempCopyDepthCommand)) {
    this._tempCopyDepthCommand.shaderProgram =
      this._tempCopyDepthCommand.shaderProgram.destroy();
  }

  if (defined(this._updateDepthCommand)) {
    this._updateDepthCommand.shaderProgram =
      this._updateDepthCommand.shaderProgram.destroy();
  }

  return destroyObject(this);
};
export default GlobeDepth;
