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
}

Object.defineProperties(PickDepth.prototype, {
  framebuffer: {
    get: function () {
      return this._framebuffer.framebuffer;
    },
  },
});

function updateFramebuffers(pickDepth, context, depthTexture) {
  const width = depthTexture.width;
  const height = depthTexture.height;
  pickDepth._framebuffer.update(context, width, height);
}

function updateCopyCommands(pickDepth, context, depthTexture) {
  if (!defined(pickDepth._copyDepthCommand)) {
    pickDepth._copyDepthCommand = context.createViewportQuadCommand(
      `uniform highp sampler2D colorTexture;

in vec2 v_textureCoordinates;

void main()
{
  vec4 globeDepthPacked = texture(czm_globeDepthTexture, v_textureCoordinates);
  float globeDepth = czm_unpackDepth(globeDepthPacked);
  float depth = texture(colorTexture, v_textureCoordinates).r;
  out_FragColor = czm_branchFreeTernary(globeDepth <= 0.0 || globeDepth >= 1.0 || depth < globeDepth && depth > 0.0 && depth < 1.0,
    czm_packDepth(depth), globeDepthPacked);
}
`,
      {
        renderState: RenderState.fromCache(),
        uniformMap: {
          colorTexture: function () {
            return pickDepth._textureToCopy;
          },
        },
        owner: pickDepth,
      }
    );
  }

  pickDepth._textureToCopy = depthTexture;
  pickDepth._copyDepthCommand.framebuffer = pickDepth.framebuffer;
}

PickDepth.prototype.update = function (context, depthTexture) {
  updateFramebuffers(this, context, depthTexture);
  updateCopyCommands(this, context, depthTexture);
};

const scratchPackedDepth = new Cartesian4();
const packedDepthScale = new Cartesian4(
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

  const pixels = context.readPixels({
    x: x,
    y: y,
    width: 1,
    height: 1,
    framebuffer: this.framebuffer,
  });

  const packedDepth = Cartesian4.unpack(pixels, 0, scratchPackedDepth);
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
  this._framebuffer.destroy();
  if (defined(this._copyDepthCommand)) {
    this._copyDepthCommand.shaderProgram =
      defined(this._copyDepthCommand.shaderProgram) &&
      this._copyDepthCommand.shaderProgram.destroy();
  }

  return destroyObject(this);
};
export default PickDepth;
