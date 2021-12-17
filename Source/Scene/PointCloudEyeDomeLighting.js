import Cartesian2 from "../Core/Cartesian2.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import ClearCommand from "../Renderer/ClearCommand.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import FramebufferManager from "../Renderer/FramebufferManager.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import BlendingState from "../Scene/BlendingState.js";
import StencilConstants from "../Scene/StencilConstants.js";
import PointCloudEyeDomeLightingShader from "../Shaders/PostProcessStages/PointCloudEyeDomeLighting.js";

/**
 * Eye dome lighting. Does not support points with per-point translucency, but does allow translucent styling against the globe.
 * Requires support for EXT_frag_depth and WEBGL_draw_buffers extensions in WebGL 1.0.
 *
 * @private
 */
function PointCloudEyeDomeLighting() {
  this._framebuffer = new FramebufferManager({
    colorAttachmentsLength: 2,
    depth: true,
    supportsDepthTexture: true,
  });

  this._drawCommand = undefined;
  this._clearCommand = undefined;

  this._strength = 1.0;
  this._radius = 1.0;
}

Object.defineProperties(PointCloudEyeDomeLighting.prototype, {
  framebuffer: {
    get: function () {
      return this._framebuffer.framebuffer;
    },
  },
  colorGBuffer: {
    get: function () {
      return this._framebuffer.getColorTexture(0);
    },
  },
  depthGBuffer: {
    get: function () {
      return this._framebuffer.getColorTexture(1);
    },
  },
});

function destroyFramebuffer(processor) {
  processor._framebuffer.destroy();
  processor._drawCommand = undefined;
  processor._clearCommand = undefined;
}

var distanceAndEdlStrengthScratch = new Cartesian2();

function createCommands(processor, context) {
  var blendFS = new ShaderSource({
    defines: ["LOG_DEPTH_WRITE"],
    sources: [PointCloudEyeDomeLightingShader],
  });

  var blendUniformMap = {
    u_pointCloud_colorGBuffer: function () {
      return processor.colorGBuffer;
    },
    u_pointCloud_depthGBuffer: function () {
      return processor.depthGBuffer;
    },
    u_distanceAndEdlStrength: function () {
      distanceAndEdlStrengthScratch.x = processor._radius;
      distanceAndEdlStrengthScratch.y = processor._strength;
      return distanceAndEdlStrengthScratch;
    },
  };

  var blendRenderState = RenderState.fromCache({
    blending: BlendingState.ALPHA_BLEND,
    depthMask: true,
    depthTest: {
      enabled: true,
    },
    stencilTest: StencilConstants.setCesium3DTileBit(),
    stencilMask: StencilConstants.CESIUM_3D_TILE_MASK,
  });

  processor._drawCommand = context.createViewportQuadCommand(blendFS, {
    uniformMap: blendUniformMap,
    renderState: blendRenderState,
    pass: Pass.CESIUM_3D_TILE,
    owner: processor,
  });

  processor._clearCommand = new ClearCommand({
    framebuffer: processor.framebuffer,
    color: new Color(0.0, 0.0, 0.0, 0.0),
    depth: 1.0,
    renderState: RenderState.fromCache(),
    pass: Pass.CESIUM_3D_TILE,
    owner: processor,
  });
}

function createResources(processor, context) {
  var width = context.drawingBufferWidth;
  var height = context.drawingBufferHeight;
  var nowDirty = false;
  processor._framebuffer.update(context, width, height);
  createCommands(processor, context);
  nowDirty = true;
  return nowDirty;
}

function isSupported(context) {
  return context.drawBuffers && context.fragmentDepth;
}

PointCloudEyeDomeLighting.isSupported = isSupported;

function getECShaderProgram(context, shaderProgram) {
  var shader = context.shaderCache.getDerivedShaderProgram(shaderProgram, "EC");
  if (!defined(shader)) {
    var attributeLocations = shaderProgram._attributeLocations;

    var fs = shaderProgram.fragmentShaderSource.clone();

    fs.sources = fs.sources.map(function (source) {
      source = ShaderSource.replaceMain(
        source,
        "czm_point_cloud_post_process_main"
      );
      source = source.replace(/gl_FragColor/g, "gl_FragData[0]");
      return source;
    });

    fs.sources.unshift("#extension GL_EXT_draw_buffers : enable \n");
    fs.sources.push(
      "void main() \n" +
        "{ \n" +
        "    czm_point_cloud_post_process_main(); \n" +
        "#ifdef LOG_DEPTH\n" +
        "    czm_writeLogDepth();\n" +
        "    gl_FragData[1] = czm_packDepth(gl_FragDepthEXT); \n" +
        "#else\n" +
        "    gl_FragData[1] = czm_packDepth(gl_FragCoord.z);\n" +
        "#endif\n" +
        "}"
    );

    shader = context.shaderCache.createDerivedShaderProgram(
      shaderProgram,
      "EC",
      {
        vertexShaderSource: shaderProgram.vertexShaderSource,
        fragmentShaderSource: fs,
        attributeLocations: attributeLocations,
      }
    );
  }

  return shader;
}

PointCloudEyeDomeLighting.prototype.update = function (
  frameState,
  commandStart,
  pointCloudShading,
  boundingVolume
) {
  if (!isSupported(frameState.context)) {
    return;
  }

  this._strength = pointCloudShading.eyeDomeLightingStrength;
  this._radius =
    pointCloudShading.eyeDomeLightingRadius * frameState.pixelRatio;

  var dirty = createResources(this, frameState.context);

  // Hijack existing point commands to render into an offscreen FBO.
  var i;
  var commandList = frameState.commandList;
  var commandEnd = commandList.length;

  var derivedCommand;
  var originalShaderProgram;

  for (i = commandStart; i < commandEnd; ++i) {
    var command = commandList[i];
    if (
      command.primitiveType !== PrimitiveType.POINTS ||
      command.pass === Pass.TRANSLUCENT
    ) {
      continue;
    }

    // These variables need to get reset for each iteration. It has to be
    // done manually since var is function scope not block scope.
    derivedCommand = undefined;
    originalShaderProgram = undefined;

    var derivedCommandObject = command.derivedCommands.pointCloudProcessor;
    if (defined(derivedCommandObject)) {
      derivedCommand = derivedCommandObject.command;
      originalShaderProgram = derivedCommandObject.originalShaderProgram;
    }

    if (
      !defined(derivedCommand) ||
      command.dirty ||
      dirty ||
      originalShaderProgram !== command.shaderProgram ||
      derivedCommand.framebuffer !== this.framebuffer
    ) {
      // Prevent crash when tiles out-of-view come in-view during context size change or
      // when the underlying shader changes while EDL is disabled
      derivedCommand = DrawCommand.shallowClone(command, derivedCommand);
      derivedCommand.framebuffer = this.framebuffer;
      derivedCommand.shaderProgram = getECShaderProgram(
        frameState.context,
        command.shaderProgram
      );
      derivedCommand.castShadows = false;
      derivedCommand.receiveShadows = false;

      if (!defined(derivedCommandObject)) {
        derivedCommandObject = {
          command: derivedCommand,
          originalShaderProgram: command.shaderProgram,
        };
        command.derivedCommands.pointCloudProcessor = derivedCommandObject;
      }

      derivedCommandObject.originalShaderProgram = command.shaderProgram;
    }

    commandList[i] = derivedCommand;
  }

  var clearCommand = this._clearCommand;
  var blendCommand = this._drawCommand;

  blendCommand.boundingVolume = boundingVolume;

  // Blend EDL into the main FBO
  commandList.push(blendCommand);
  commandList.push(clearCommand);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see PointCloudEyeDomeLighting#destroy
 */
PointCloudEyeDomeLighting.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @example
 * processor = processor && processor.destroy();
 *
 * @see PointCloudEyeDomeLighting#isDestroyed
 */
PointCloudEyeDomeLighting.prototype.destroy = function () {
  destroyFramebuffer(this);
  return destroyObject(this);
};
export default PointCloudEyeDomeLighting;
