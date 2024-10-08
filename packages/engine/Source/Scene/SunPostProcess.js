import BoundingRectangle from "../Core/BoundingRectangle.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian4 from "../Core/Cartesian4.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import CesiumMath from "../Core/Math.js";
import Matrix4 from "../Core/Matrix4.js";
import Transforms from "../Core/Transforms.js";
import AdditiveBlend from "../Shaders/PostProcessStages/AdditiveBlend.js";
import BrightPass from "../Shaders/PostProcessStages/BrightPass.js";
import GaussianBlur1D from "../Shaders/PostProcessStages/GaussianBlur1D.js";
import PassThrough from "../Shaders/PostProcessStages/PassThrough.js";
import PostProcessStage from "./PostProcessStage.js";
import PostProcessStageComposite from "./PostProcessStageComposite.js";
import PostProcessStageSampleMode from "./PostProcessStageSampleMode.js";
import PostProcessStageTextureCache from "./PostProcessStageTextureCache.js";
import SceneFramebuffer from "./SceneFramebuffer.js";

function SunPostProcess() {
  this._sceneFramebuffer = new SceneFramebuffer();

  const scale = 0.125;
  const stages = new Array(6);

  stages[0] = new PostProcessStage({
    fragmentShader: PassThrough,
    textureScale: scale,
    forcePowerOfTwo: true,
    sampleMode: PostProcessStageSampleMode.LINEAR,
  });

  const brightPass = (stages[1] = new PostProcessStage({
    fragmentShader: BrightPass,
    uniforms: {
      avgLuminance: 0.5, // A guess at the average luminance across the entire scene
      threshold: 0.25,
      offset: 0.1,
    },
    textureScale: scale,
    forcePowerOfTwo: true,
  }));

  const that = this;
  this._delta = 1.0;
  this._sigma = 2.0;
  this._blurStep = new Cartesian2();

  stages[2] = new PostProcessStage({
    fragmentShader: GaussianBlur1D,
    uniforms: {
      step: function () {
        that._blurStep.x = that._blurStep.y =
          1.0 / brightPass.outputTexture.width;
        return that._blurStep;
      },
      delta: function () {
        return that._delta;
      },
      sigma: function () {
        return that._sigma;
      },
      direction: 0.0,
    },
    textureScale: scale,
    forcePowerOfTwo: true,
  });

  stages[3] = new PostProcessStage({
    fragmentShader: GaussianBlur1D,
    uniforms: {
      step: function () {
        that._blurStep.x = that._blurStep.y =
          1.0 / brightPass.outputTexture.width;
        return that._blurStep;
      },
      delta: function () {
        return that._delta;
      },
      sigma: function () {
        return that._sigma;
      },
      direction: 1.0,
    },
    textureScale: scale,
    forcePowerOfTwo: true,
  });

  stages[4] = new PostProcessStage({
    fragmentShader: PassThrough,
    sampleMode: PostProcessStageSampleMode.LINEAR,
  });

  this._uCenter = new Cartesian2();
  this._uRadius = undefined;

  stages[5] = new PostProcessStage({
    fragmentShader: AdditiveBlend,
    uniforms: {
      center: function () {
        return that._uCenter;
      },
      radius: function () {
        return that._uRadius;
      },
      colorTexture2: function () {
        return that._sceneFramebuffer.framebuffer.getColorTexture(0);
      },
    },
  });

  this._stages = new PostProcessStageComposite({
    stages: stages,
  });

  const textureCache = new PostProcessStageTextureCache(this);
  const length = stages.length;
  for (let i = 0; i < length; ++i) {
    stages[i]._textureCache = textureCache;
  }

  this._textureCache = textureCache;
  this.length = stages.length;
}

SunPostProcess.prototype.get = function (index) {
  return this._stages.get(index);
};

SunPostProcess.prototype.getStageByName = function (name) {
  const length = this._stages.length;
  for (let i = 0; i < length; ++i) {
    const stage = this._stages.get(i);
    if (stage.name === name) {
      return stage;
    }
  }
  return undefined;
};

const sunPositionECScratch = new Cartesian4();
const sunPositionWCScratch = new Cartesian2();
const sizeScratch = new Cartesian2();
const postProcessMatrix4Scratch = new Matrix4();

function updateSunPosition(postProcess, context, viewport) {
  const us = context.uniformState;
  const sunPosition = us.sunPositionWC;
  const viewMatrix = us.view;
  const viewProjectionMatrix = us.viewProjection;
  const projectionMatrix = us.projection;

  // create up sampled render state
  let viewportTransformation = Matrix4.computeViewportTransformation(
    viewport,
    0.0,
    1.0,
    postProcessMatrix4Scratch,
  );
  const sunPositionEC = Matrix4.multiplyByPoint(
    viewMatrix,
    sunPosition,
    sunPositionECScratch,
  );
  let sunPositionWC = Transforms.pointToGLWindowCoordinates(
    viewProjectionMatrix,
    viewportTransformation,
    sunPosition,
    sunPositionWCScratch,
  );

  sunPositionEC.x += CesiumMath.SOLAR_RADIUS;
  const limbWC = Transforms.pointToGLWindowCoordinates(
    projectionMatrix,
    viewportTransformation,
    sunPositionEC,
    sunPositionEC,
  );
  const sunSize =
    Cartesian2.magnitude(Cartesian2.subtract(limbWC, sunPositionWC, limbWC)) *
    30.0 *
    2.0;

  const size = sizeScratch;
  size.x = sunSize;
  size.y = sunSize;

  postProcess._uCenter = Cartesian2.clone(sunPositionWC, postProcess._uCenter);
  postProcess._uRadius = Math.max(size.x, size.y) * 0.15;

  const width = context.drawingBufferWidth;
  const height = context.drawingBufferHeight;

  const stages = postProcess._stages;
  const firstStage = stages.get(0);

  const downSampleWidth = firstStage.outputTexture.width;
  const downSampleHeight = firstStage.outputTexture.height;

  const downSampleViewport = new BoundingRectangle();
  downSampleViewport.width = downSampleWidth;
  downSampleViewport.height = downSampleHeight;

  // create down sampled render state
  viewportTransformation = Matrix4.computeViewportTransformation(
    downSampleViewport,
    0.0,
    1.0,
    postProcessMatrix4Scratch,
  );
  sunPositionWC = Transforms.pointToGLWindowCoordinates(
    viewProjectionMatrix,
    viewportTransformation,
    sunPosition,
    sunPositionWCScratch,
  );

  size.x *= downSampleWidth / width;
  size.y *= downSampleHeight / height;

  const scissorRectangle = firstStage.scissorRectangle;
  scissorRectangle.x = Math.max(sunPositionWC.x - size.x * 0.5, 0.0);
  scissorRectangle.y = Math.max(sunPositionWC.y - size.y * 0.5, 0.0);
  scissorRectangle.width = Math.min(size.x, width);
  scissorRectangle.height = Math.min(size.y, height);

  for (let i = 1; i < 4; ++i) {
    BoundingRectangle.clone(scissorRectangle, stages.get(i).scissorRectangle);
  }
}

SunPostProcess.prototype.clear = function (context, passState, clearColor) {
  this._sceneFramebuffer.clear(context, passState, clearColor);
  this._textureCache.clear(context);
};

SunPostProcess.prototype.update = function (passState) {
  const context = passState.context;
  const viewport = passState.viewport;

  const sceneFramebuffer = this._sceneFramebuffer;
  sceneFramebuffer.update(context, viewport);
  const framebuffer = sceneFramebuffer.framebuffer;

  this._textureCache.update(context);
  this._stages.update(context, false);

  updateSunPosition(this, context, viewport);

  return framebuffer;
};

SunPostProcess.prototype.execute = function (context) {
  const colorTexture = this._sceneFramebuffer.framebuffer.getColorTexture(0);
  const stages = this._stages;
  const length = stages.length;
  stages.get(0).execute(context, colorTexture);
  for (let i = 1; i < length; ++i) {
    stages.get(i).execute(context, stages.get(i - 1).outputTexture);
  }
};

SunPostProcess.prototype.copy = function (context, framebuffer) {
  if (!defined(this._copyColorCommand)) {
    const that = this;
    this._copyColorCommand = context.createViewportQuadCommand(PassThrough, {
      uniformMap: {
        colorTexture: function () {
          return that._stages.get(that._stages.length - 1).outputTexture;
        },
      },
      owner: this,
    });
  }

  this._copyColorCommand.framebuffer = framebuffer;
  this._copyColorCommand.execute(context);
};

SunPostProcess.prototype.isDestroyed = function () {
  return false;
};

SunPostProcess.prototype.destroy = function () {
  this._textureCache.destroy();
  this._stages.destroy();
  return destroyObject(this);
};
export default SunPostProcess;
