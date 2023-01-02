import BoundingRectangle from "../Core/BoundingRectangle.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import PixelFormat from "../Core/PixelFormat.js";
import Framebuffer from "../Renderer/Framebuffer.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import RenderState from "../Renderer/RenderState.js";
import Sampler from "../Renderer/Sampler.js";
import Texture from "../Renderer/Texture.js";
import BrdfLutGeneratorFS from "../Shaders/BrdfLutGeneratorFS.js";

/**
 * @private
 */
function BrdfLutGenerator() {
  this._colorTexture = undefined;
  this._drawCommand = undefined;
}

Object.defineProperties(BrdfLutGenerator.prototype, {
  colorTexture: {
    get: function () {
      return this._colorTexture;
    },
  },
});

function createCommand(generator, context, framebuffer) {
  const drawCommand = context.createViewportQuadCommand(BrdfLutGeneratorFS, {
    framebuffer: framebuffer,
    renderState: RenderState.fromCache({
      viewport: new BoundingRectangle(0.0, 0.0, 256.0, 256.0),
    }),
  });

  generator._drawCommand = drawCommand;
}

BrdfLutGenerator.prototype.update = function (frameState) {
  if (!defined(this._colorTexture)) {
    const context = frameState.context;
    const colorTexture = new Texture({
      context: context,
      width: 256,
      height: 256,
      pixelFormat: PixelFormat.RGBA,
      pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      sampler: Sampler.NEAREST,
    });

    this._colorTexture = colorTexture;
    const framebuffer = new Framebuffer({
      context: context,
      colorTextures: [colorTexture],
      destroyAttachments: false,
    });

    createCommand(this, context, framebuffer);
    this._drawCommand.execute(context);
    framebuffer.destroy();
    this._drawCommand.shaderProgram =
      this._drawCommand.shaderProgram &&
      this._drawCommand.shaderProgram.destroy();
  }
};

BrdfLutGenerator.prototype.isDestroyed = function () {
  return false;
};

BrdfLutGenerator.prototype.destroy = function () {
  this._colorTexture = this._colorTexture && this._colorTexture.destroy();
  return destroyObject(this);
};
export default BrdfLutGenerator;
