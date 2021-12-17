import BoundingRectangle from "../Core/BoundingRectangle.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import FramebufferManager from "../Renderer/FramebufferManager.js";
import RenderState from "../Renderer/RenderState.js";
import BrdfLutGeneratorFS from "../Shaders/BrdfLutGeneratorFS.js";

/**
 * @private
 */
function BrdfLutGenerator() {
  this._framebuffer = new FramebufferManager();
  this._drawCommand = undefined;
}

Object.defineProperties(BrdfLutGenerator.prototype, {
  framebuffer: {
    get: function () {
      return this._framebuffer.framebuffer;
    },
  },
  colorTexture: {
    get: function () {
      return this._framebuffer.getColorTexture();
    },
  },
});

function createCommand(generator, context) {
  var framebuffer = generator.framebuffer;

  var drawCommand = context.createViewportQuadCommand(BrdfLutGeneratorFS, {
    framebuffer: framebuffer,
    renderState: RenderState.fromCache({
      viewport: new BoundingRectangle(0.0, 0.0, 256.0, 256.0),
    }),
  });

  generator._drawCommand = drawCommand;
}

BrdfLutGenerator.prototype.update = function (frameState) {
  if (!defined(this.colorTexture)) {
    var context = frameState.context;

    this._framebuffer.update(context, 256, 256);
    createCommand(this, context);
    this._drawCommand.execute(context);
    this._framebuffer.destroyFramebuffer();
    this._drawCommand.shaderProgram =
      this._drawCommand.shaderProgram &&
      this._drawCommand.shaderProgram.destroy();
  }
};

BrdfLutGenerator.prototype.isDestroyed = function () {
  return false;
};

BrdfLutGenerator.prototype.destroy = function () {
  this._framebuffer.destroy();
  return destroyObject(this);
};
export default BrdfLutGenerator;
