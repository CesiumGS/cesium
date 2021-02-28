import Cartesian4 from "../Core/Cartesian4.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import PixelFormat from "../Core/PixelFormat.js";
import Framebuffer from "../Renderer/Framebuffer.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import Texture from "../Renderer/Texture.js";

/**
 * @private
 */
function PickDepth() {
  this._framebuffer = undefined;

  this._depthTexture = undefined;
  this._textureToCopy = undefined;
  this._copyDepthCommand = undefined;

  this._useLogDepth = undefined;

  this._debugPickDepthViewportCommand = undefined;
}

function executeDebugPickDepth(pickDepth, context, passState, useLogDepth) {
  if (
    !defined(pickDepth._debugPickDepthViewportCommand) ||
    useLogDepth !== pickDepth._useLogDepth
  ) {
    var fsSource =
      "uniform sampler2D u_texture;\n" +
      "varying vec2 v_textureCoordinates;\n" +
      "void main()\n" +
      "{\n" +
      "    float z_window = czm_unpackDepth(texture2D(u_texture, v_textureCoordinates));\n" +
      "    z_window = czm_reverseLogDepth(z_window); \n" +
      "    float n_range = czm_depthRange.near;\n" +
      "    float f_range = czm_depthRange.far;\n" +
      "    float z_ndc = (2.0 * z_window - n_range - f_range) / (f_range - n_range);\n" +
      "    float scale = pow(z_ndc * 0.5 + 0.5, 8.0);\n" +
      "    gl_FragColor = vec4(mix(vec3(0.0), vec3(1.0), scale), 1.0);\n" +
      "}\n";
    var fs = new ShaderSource({
      defines: [useLogDepth ? "LOG_DEPTH" : ""],
      sources: [fsSource],
    });

    pickDepth._debugPickDepthViewportCommand = context.createViewportQuadCommand(
      fs,
      {
        uniformMap: {
          u_texture: function () {
            return pickDepth._depthTexture;
          },
        },
        owner: pickDepth,
      }
    );

    pickDepth._useLogDepth = useLogDepth;
  }

  pickDepth._debugPickDepthViewportCommand.execute(context, passState);
}

function destroyTextures(pickDepth) {
  pickDepth._depthTexture =
    pickDepth._depthTexture &&
    !pickDepth._depthTexture.isDestroyed() &&
    pickDepth._depthTexture.destroy();
}

function destroyFramebuffers(pickDepth) {
  pickDepth._framebuffer =
    pickDepth._framebuffer &&
    !pickDepth._framebuffer.isDestroyed() &&
    pickDepth._framebuffer.destroy();
}

function createTextures(pickDepth, context, width, height) {
  pickDepth._depthTexture = new Texture({
    context: context,
    width: width,
    height: height,
    pixelFormat: PixelFormat.RGBA,
    pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
  });
}

function createFramebuffers(pickDepth, context, width, height) {
  destroyTextures(pickDepth);
  destroyFramebuffers(pickDepth);

  createTextures(pickDepth, context, width, height);

  pickDepth._framebuffer = new Framebuffer({
    context: context,
    colorTextures: [pickDepth._depthTexture],
    destroyAttachments: false,
  });
}

function updateFramebuffers(pickDepth, context, depthTexture) {
  var width = depthTexture.width;
  var height = depthTexture.height;

  var texture = pickDepth._depthTexture;
  var textureChanged =
    !defined(texture) || texture.width !== width || texture.height !== height;
  if (!defined(pickDepth._framebuffer) || textureChanged) {
    createFramebuffers(pickDepth, context, width, height);
  }
}

function updateCopyCommands(pickDepth, context, depthTexture) {
  if (!defined(pickDepth._copyDepthCommand)) {
    var fs =
      "uniform sampler2D u_texture;\n" +
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
  pickDepth._copyDepthCommand.framebuffer = pickDepth._framebuffer;
}

PickDepth.prototype.executeDebugPickDepth = function (
  context,
  passState,
  useLogDepth
) {
  executeDebugPickDepth(this, context, passState, useLogDepth);
};

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
  var pixels = context.readPixels({
    x: x,
    y: y,
    width: 1,
    height: 1,
    framebuffer: this._framebuffer,
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
  destroyTextures(this);
  destroyFramebuffers(this);

  this._copyDepthCommand.shaderProgram =
    defined(this._copyDepthCommand.shaderProgram) &&
    this._copyDepthCommand.shaderProgram.destroy();

  return destroyObject(this);
};
export default PickDepth;
