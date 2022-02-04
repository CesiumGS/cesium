import BoundingRectangle from "../Core/BoundingRectangle.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import ClearCommand from "../Renderer/ClearCommand.js";
import FramebufferManager from "../Renderer/FramebufferManager.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import RenderState from "../Renderer/RenderState.js";
import PassThroughDepth from "../Shaders/PostProcessStages/PassThroughDepth.js";

/**
 * @private
 */
function GlobeTranslucencyFramebuffer() {
  this._framebuffer = new FramebufferManager({
    depthStencil: true,
    supportsDepthTexture: true,
  });
  this._packedDepthFramebuffer = new FramebufferManager();

  this._renderState = undefined;

  this._packedDepthCommand = undefined;
  this._clearCommand = undefined;

  this._viewport = new BoundingRectangle();
  this._useScissorTest = false;
  this._scissorRectangle = undefined;
  this._useHdr = undefined;
}

Object.defineProperties(GlobeTranslucencyFramebuffer.prototype, {
  // Exposed for testing
  classificationTexture: {
    get: function () {
      return this._framebuffer.getColorTexture();
    },
  },
  classificationFramebuffer: {
    get: function () {
      return this._framebuffer.framebuffer;
    },
  },
  // Exposed for testing
  packedDepthFramebuffer: {
    get: function () {
      return this._packedDepthFramebuffer.framebuffer;
    },
  },
  depthStencilTexture: {
    get: function () {
      return this._framebuffer.getDepthStencilTexture();
    },
  },
  // Exposed for testing
  depthStencilRenderbuffer: {
    get: function () {
      return this._framebuffer.getDepthStencilRenderbuffer();
    },
  },
  packedDepthTexture: {
    get: function () {
      return this._packedDepthFramebuffer.getColorTexture();
    },
  },
});

function destroyResources(globeTranslucency) {
  globeTranslucency._framebuffer.destroy();
  globeTranslucency._packedDepthFramebuffer.destroy();
}

function updateResources(globeTranslucency, context, width, height, hdr) {
  const pixelDatatype = hdr
    ? context.halfFloatingPointTexture
      ? PixelDatatype.HALF_FLOAT
      : PixelDatatype.FLOAT
    : PixelDatatype.UNSIGNED_BYTE;
  globeTranslucency._framebuffer.update(context, width, height, pixelDatatype);
  globeTranslucency._packedDepthFramebuffer.update(context, width, height);
}

function updateCommands(globeTranslucency, context, width, height, passState) {
  globeTranslucency._viewport.width = width;
  globeTranslucency._viewport.height = height;

  const useScissorTest = !BoundingRectangle.equals(
    globeTranslucency._viewport,
    passState.viewport
  );
  let updateScissor = useScissorTest !== globeTranslucency._useScissorTest;
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
            return globeTranslucency.depthStencilTexture;
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
    globeTranslucency._packedDepthFramebuffer.framebuffer;
  globeTranslucency._packedDepthCommand.renderState =
    globeTranslucency._renderState;
  globeTranslucency._clearCommand.framebuffer =
    globeTranslucency.classificationFramebuffer;
  globeTranslucency._clearCommand.renderState = globeTranslucency._renderState;
}

GlobeTranslucencyFramebuffer.prototype.updateAndClear = function (
  hdr,
  viewport,
  context,
  passState
) {
  const width = viewport.width;
  const height = viewport.height;

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
  return this.packedDepthTexture;
};

GlobeTranslucencyFramebuffer.prototype.isDestroyed = function () {
  return false;
};

GlobeTranslucencyFramebuffer.prototype.destroy = function () {
  destroyResources(this);
  return destroyObject(this);
};

export default GlobeTranslucencyFramebuffer;
