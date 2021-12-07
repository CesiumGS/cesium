import Cartesian4 from "../Core/Cartesian4.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import FramebufferManager from "../Renderer/FramebufferManager.js";
import RenderState from "../Renderer/RenderState.js";

/**
 * @private
 */
function PickDepth() {
  this._framebuffer = new FramebufferManager();

  this._textureToCopy = undefined;
  this._copyDepthCommand = undefined;

  this._useLogDepth = undefined;
}

Object.defineProperties(PickDepth.prototype, {
  framebuffer: {
    get: function () {
      return this._framebuffer.getFramebuffer();
    },
  },
});

function updateFramebuffers(pickDepth, context, depthTexture) {
  var width = depthTexture.width;
  var height = depthTexture.height;

  var textureChanged = pickDepth._framebuffer.isDirty(width, height);
  if (!defined(pickDepth.framebuffer) || textureChanged) {
    pickDepth._framebuffer.update(context, width, height);
  }
}

function updateCopyCommands(pickDepth, context, depthTexture) {
  if (!defined(pickDepth._copyDepthCommand)) {
    var fs =
      "uniform highp sampler2D u_texture;\n" +
      "varying vec2 v_textureCoordinates;\n" +
      "void main()\n" +
      "{\n" +
      "    gl_FragColor = czm_packDepth(texture2D(u_texture, v_textureCoordinates).r);\n" +
      "}\n";
    pickDepth._copyDepthCommand = context.createViewportQuadCommand(fs, {
      renderState: RenderState.fromCache(),
      uniformMap: {
        u_texture: function () {
          return pickDepth._textureToCopy;
        },
      },
      owner: pickDepth,
    });
  }

  pickDepth._textureToCopy = depthTexture;
  pickDepth._copyDepthCommand.framebuffer = pickDepth.framebuffer;
}

PickDepth.prototype.update = function (context, depthTexture) {
  updateFramebuffers(this, context, depthTexture);
  updateCopyCommands(this, context, depthTexture);
};

var scratchPackedDepth = new Cartesian4();
var packedDepthScale = new Cartesian4(
  1.0,
  1.0 / 255.0,
  1.0 / 65025.0,
  1.0 / 16581375.0
);

PickDepth.prototype.getDepth = function (context, x, y) {
  // If this function is called before the framebuffer is created, the depth is undefined.
  if (!defined(this.framebuffer)) {
    return undefined;
  }

  var pixels = context.readPixels({
    x: x,
    y: y,
    width: 1,
    height: 1,
    framebuffer: this.framebuffer,
  });

  var packedDepth = Cartesian4.unpack(pixels, 0, scratchPackedDepth);
  Cartesian4.divideByScalar(packedDepth, 255.0, packedDepth);
  return Cartesian4.dot(packedDepth, packedDepthScale);
};

PickDepth.prototype.executeCopyDepth = function (context, passState) {
  this._copyDepthCommand.execute(context, passState);
};

PickDepth.prototype.isDestroyed = function () {
  return false;
};

PickDepth.prototype.destroy = function () {
  if (defined(this._copyDepthCommand)) {
    this._copyDepthCommand.shaderProgram =
      defined(this._copyDepthCommand.shaderProgram) &&
      this._copyDepthCommand.shaderProgram.destroy();
  }

  return destroyObject(this);
};
export default PickDepth;
