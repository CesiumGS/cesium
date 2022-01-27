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
 * @private
 */
function GlobeDepth() {
  this._numSamples = 1;
  this._tempCopyDepthTexture = undefined;

  this._colorFramebuffer = new FramebufferManager({
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
  framebuffer: {
    get: function () {
      return this._colorFramebuffer.framebuffer;
    },
  },
  depthStencilTexture: {
    get: function () {
      return this._colorFramebuffer.getDepthStencilTexture();
    },
  },
});

function destroyFramebuffers(globeDepth) {
  globeDepth._colorFramebuffer.destroy();
  globeDepth._copyDepthFramebuffer.destroy();
  globeDepth._tempCopyDepthFramebuffer.destroy();
  globeDepth._updateDepthFramebuffer.destroy();
}

function updateCopyCommands(globeDepth, context, width, height, passState) {
  globeDepth._viewport.width = width;
  globeDepth._viewport.height = height;

  const useScissorTest = !BoundingRectangle.equals(
    globeDepth._viewport,
    passState.viewport
  );
  let updateScissor = useScissorTest !== globeDepth._useScissorTest;
  globeDepth._useScissorTest = useScissorTest;

  if (
    !BoundingRectangle.equals(globeDepth._scissorRectangle, passState.viewport)
  ) {
    globeDepth._scissorRectangle = BoundingRectangle.clone(
      passState.viewport,
      globeDepth._scissorRectangle
    );
    updateScissor = true;
  }

  if (
    !defined(globeDepth._rs) ||
    !BoundingRectangle.equals(globeDepth._viewport, globeDepth._rs.viewport) ||
    updateScissor
  ) {
    globeDepth._rs = RenderState.fromCache({
      viewport: globeDepth._viewport,
      scissorTest: {
        enabled: globeDepth._useScissorTest,
        rectangle: globeDepth._scissorRectangle,
      },
    });
    globeDepth._rsBlend = RenderState.fromCache({
      viewport: globeDepth._viewport,
      scissorTest: {
        enabled: globeDepth._useScissorTest,
        rectangle: globeDepth._scissorRectangle,
      },
      blending: BlendingState.ALPHA_BLEND,
    });

    // Copy packed depth only if the 3D Tiles bit is set
    globeDepth._rsUpdate = RenderState.fromCache({
      viewport: globeDepth._viewport,
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
            return globeDepth._colorFramebuffer.getDepthStencilTexture();
          },
        },
        owner: globeDepth,
      }
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
            return globeDepth._colorFramebuffer.getColorTexture();
          },
        },
        owner: globeDepth,
      }
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
      }
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
      }
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

GlobeDepth.prototype.update = function (
  context,
  passState,
  viewport,
  numSamples,
  hdr,
  clearGlobeDepth
) {
  const width = viewport.width;
  const height = viewport.height;

  const pixelDatatype = hdr
    ? context.halfFloatingPointTexture
      ? PixelDatatype.HALF_FLOAT
      : PixelDatatype.FLOAT
    : PixelDatatype.UNSIGNED_BYTE;
  this._numSamples = numSamples;
  this._colorFramebuffer.update(
    context,
    width,
    height,
    numSamples,
    pixelDatatype
  );
  this._copyDepthFramebuffer.update(context, width, height);
  updateCopyCommands(this, context, width, height, passState);
  context.uniformState.globeDepthTexture = undefined;

  this._useHdr = hdr;
  this._clearGlobeDepth = clearGlobeDepth;
};

GlobeDepth.prototype.prepareColorTextures = function (context) {
  if (this._numSamples > 1) {
    this._colorFramebuffer.prepareTextures(context);
  }
};

GlobeDepth.prototype.executeCopyDepth = function (context, passState) {
  if (defined(this._copyDepthCommand)) {
    this.prepareColorTextures(context);
    this._copyDepthCommand.execute(context, passState);
    context.uniformState.globeDepthTexture = this._copyDepthFramebuffer.getColorTexture();
  }
};

GlobeDepth.prototype.executeUpdateDepth = function (
  context,
  passState,
  clearGlobeDepth,
  depthTexture
) {
  const depthTextureToCopy = defined(depthTexture)
    ? depthTexture
    : passState.framebuffer.depthStencilTexture;
  if (
    clearGlobeDepth ||
    depthTextureToCopy !== this._colorFramebuffer.getDepthStencilTexture()
  ) {
    // First copy the depth to a temporary globe depth texture, then update the
    // main globe depth texture where the stencil bit for 3D Tiles is set.
    // This preserves the original globe depth except where 3D Tiles is rendered.
    // The additional texture and framebuffer resources are created on demand.
    if (defined(this._updateDepthCommand)) {
      if (
        !defined(this._updateDepthFramebuffer.framebuffer) ||
        this._updateDepthFramebuffer.getDepthStencilTexture() !==
          depthTextureToCopy ||
        this._updateDepthFramebuffer.getColorTexture() !==
          this._copyDepthFramebuffer.getColorTexture()
      ) {
        const width = this._copyDepthFramebuffer.getColorTexture().width;
        const height = this._copyDepthFramebuffer.getColorTexture().height;
        this._tempCopyDepthFramebuffer.destroy();
        this._tempCopyDepthFramebuffer.update(context, width, height);

        const colorTexture = this._copyDepthFramebuffer.getColorTexture();
        this._updateDepthFramebuffer.setColorTexture(colorTexture, 0);
        this._updateDepthFramebuffer.setDepthStencilTexture(depthTextureToCopy);
        this._updateDepthFramebuffer.update(context, width, height);

        updateCopyCommands(this, context, width, height, passState);
      }
      this._tempCopyDepthTexture = depthTextureToCopy;
      this._tempCopyDepthCommand.execute(context, passState);
      this._updateDepthCommand.execute(context, passState);
    }
    return;
  }

  // Fast path - the depth texture can be copied normally.
  if (defined(this._copyDepthCommand)) {
    this._copyDepthCommand.execute(context, passState);
  }
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
    this._colorFramebuffer.clear(context, clear, passState);
  }
};

GlobeDepth.prototype.isDestroyed = function () {
  return false;
};

GlobeDepth.prototype.destroy = function () {
  destroyFramebuffers(this);

  if (defined(this._copyColorCommand)) {
    this._copyColorCommand.shaderProgram = this._copyColorCommand.shaderProgram.destroy();
  }

  if (defined(this._copyDepthCommand)) {
    this._copyDepthCommand.shaderProgram = this._copyDepthCommand.shaderProgram.destroy();
  }

  if (defined(this._tempCopyDepthCommand)) {
    this._tempCopyDepthCommand.shaderProgram = this._tempCopyDepthCommand.shaderProgram.destroy();
  }

  if (defined(this._updateDepthCommand)) {
    this._updateDepthCommand.shaderProgram = this._updateDepthCommand.shaderProgram.destroy();
  }

  return destroyObject(this);
};
export default GlobeDepth;
