import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import BoundingRectangle from "../Core/BoundingRectangle.js";
import Color from "../Core/Color.js";
import createGuid from "../Core/createGuid.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import Matrix4 from "../Core/Matrix4.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import PixelFormat from "../Core/PixelFormat.js";
import FramebufferManager from "../Renderer/FramebufferManager.js";
import RenderState from "../Renderer/RenderState.js";
import TemporalAntiAliasing from "../Shaders/PostProcessStages/TemporalAntiAliasing.js";
import TemporalAntiAliasingVelocity from "../Shaders/PostProcessStages/TemporalAntiAliasingVelocity.js";

function computePixelDatatype(context) {
  if (context.halfFloatingPointTexture) {
    return PixelDatatype.HALF_FLOAT;
  }
  if (context.floatingPointTexture) {
    return PixelDatatype.FLOAT;
  }
  return PixelDatatype.UNSIGNED_BYTE;
}

function computeRelativeDistance(a, b) {
  const denom = Math.max(Cartesian3.magnitude(b), 1.0);
  return Cartesian3.distance(a, b) / denom;
}

/**
 * A temporal anti-aliasing stage that uses depth reprojection plus neighborhood
 * clamping to reduce ghosting versus plain EMA accumulation.
 *
 * Motion is reconstructed from current depth and previous view-projection
 * (camera motion only; no per-object motion vectors), then used to sample
 * history at a reprojected UV.
 *
 * @alias TemporalAntiAliasingStage
 * @constructor
 *
 * @param {object} [options]
 * @param {string} [options.name=createGuid()] The unique name of this stage.
 * @param {number} [options.feedback=0.96] History weight in [0, 1]. Higher = smoother but more ghosting.
 * @param {number} [options.resetDistance=0.001] Relative camera-position threshold to reset history.
 * @param {number} [options.resetDot=0.995] Camera-direction dot threshold to reset history.
 *
 * @private
 */
function TemporalAntiAliasingStage(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const {
    name = createGuid(),
    feedback = 0.98,
    resetDistance = 0.001,
    resetDot = 0.995,
  } = options;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("options.feedback", feedback);
  Check.typeOf.number("options.resetDistance", resetDistance);
  Check.typeOf.number("options.resetDot", resetDot);
  //>>includeEnd('debug');

  this._name = name;
  this.feedback = feedback;
  this.resetDistance = resetDistance;
  this.resetDot = resetDot;

  // Match the fields read by PostProcessStageTextureCache when allocating stage output textures.
  this._textureScale = 1.0;
  this._forcePowerOfTwo = false;
  this._pixelFormat = PixelFormat.RGBA;
  this._pixelDatatype = PixelDatatype.UNSIGNED_BYTE;
  this._clearColor = Color.BLACK;

  this._velocityUniformMap = undefined;
  this._resolveUniformMap = undefined;
  this._velocityCommand = undefined;
  this._resolveCommand = undefined;
  this._renderState = undefined;

  this._colorTexture = undefined;
  this._historyTexture = undefined;
  this._depthTexture = undefined;
  this._velocityTexture = undefined;
  this._outputTexture = undefined;

  // History ping-pong for temporal accumulation.
  this._framebuffers = [new FramebufferManager(), new FramebufferManager()];
  this._velocityFramebuffer = new FramebufferManager();
  this._pingPong = 0;
  this._width = undefined;
  this._height = undefined;
  this._historyPixelDatatype = undefined;

  this._frameState = undefined;
  this._lastCameraPositionWC = new Cartesian3();
  this._lastCameraDirectionWC = new Cartesian3();
  this._previousViewProjection = new Matrix4();
  this._hasPreviousViewProjection = false;
  this._hasLastCamera = false;
  this._needsReset = true;

  this._ready = false;

  /**
   * Whether or not to execute this post-process stage when ready.
   *
   * @type {boolean}
   */
  this.enabled = true;
}

Object.defineProperties(TemporalAntiAliasingStage.prototype, {
  ready: {
    get: function () {
      return this._ready;
    },
  },
  name: {
    get: function () {
      return this._name;
    },
  },
  outputTexture: {
    get: function () {
      return this._outputTexture;
    },
  },
});

function destroyResources(stage) {
  if (defined(stage._velocityCommand)) {
    stage._velocityCommand.shaderProgram =
      stage._velocityCommand.shaderProgram &&
      stage._velocityCommand.shaderProgram.destroy();
    stage._velocityCommand = undefined;
  }

  if (defined(stage._resolveCommand)) {
    stage._resolveCommand.shaderProgram =
      stage._resolveCommand.shaderProgram &&
      stage._resolveCommand.shaderProgram.destroy();
    stage._resolveCommand = undefined;
  }

  if (defined(stage._framebuffers)) {
    stage._framebuffers[0].destroy();
    stage._framebuffers[1].destroy();
  }
  if (defined(stage._velocityFramebuffer)) {
    stage._velocityFramebuffer.destroy();
  }

  stage._historyTexture = undefined;
  stage._depthTexture = undefined;
  stage._velocityTexture = undefined;
  stage._colorTexture = undefined;
  stage._outputTexture = undefined;
  stage._hasPreviousViewProjection = false;
  stage._ready = false;
}

function ensureFramebuffers(stage, context, width, height) {
  const pixelDatatype = computePixelDatatype(context);
  const sizeChanged = stage._width !== width || stage._height !== height;
  const pixelChanged = stage._historyPixelDatatype !== pixelDatatype;

  if (!sizeChanged && !pixelChanged) {
    return;
  }

  stage._width = width;
  stage._height = height;
  stage._historyPixelDatatype = pixelDatatype;

  stage._framebuffers[0].update(
    context,
    width,
    height,
    1,
    pixelDatatype,
    PixelFormat.RGBA,
  );
  stage._framebuffers[1].update(
    context,
    width,
    height,
    1,
    pixelDatatype,
    PixelFormat.RGBA,
  );
  stage._velocityFramebuffer.update(
    context,
    width,
    height,
    1,
    PixelDatatype.UNSIGNED_BYTE,
    PixelFormat.RGBA,
  );

  stage._renderState = undefined;
  stage._needsReset = true;
}

function ensureCommands(stage, context) {
  if (defined(stage._velocityCommand) && defined(stage._resolveCommand)) {
    return;
  }

  stage._velocityUniformMap = {
    depthTexture: function () {
      return stage._depthTexture;
    },
    u_previousViewProjection: function () {
      return stage._previousViewProjection;
    },
    u_hasPreviousViewProjection: function () {
      return stage._hasPreviousViewProjection && !stage._needsReset ? 1.0 : 0.0;
    },
  };

  stage._resolveUniformMap = {
    colorTexture: function () {
      return stage._colorTexture;
    },
    historyTexture: function () {
      return stage._historyTexture;
    },
    velocityTexture: function () {
      return stage._velocityTexture;
    },
    u_feedback: function () {
      return stage.feedback;
    },
    u_reset: function () {
      return stage._needsReset || !stage._hasPreviousViewProjection ? 1.0 : 0.0;
    },
  };

  stage._velocityCommand = context.createViewportQuadCommand(
    TemporalAntiAliasingVelocity,
    {
      uniformMap: stage._velocityUniformMap,
      owner: stage,
    },
  );
  stage._resolveCommand = context.createViewportQuadCommand(
    TemporalAntiAliasing,
    {
      uniformMap: stage._resolveUniformMap,
      owner: stage,
    },
  );
}

function shouldResetHistory(stage, frameState) {
  if (!defined(frameState) || !defined(frameState.camera)) {
    return true;
  }

  if (!stage._hasLastCamera) {
    return true;
  }

  const camera = frameState.camera;
  const positionWC = camera.positionWC;
  const directionWC = camera.directionWC;

  const relDist = computeRelativeDistance(
    stage._lastCameraPositionWC,
    positionWC,
  );
  if (relDist > stage.resetDistance) {
    return true;
  }

  const dot = Cartesian3.dot(stage._lastCameraDirectionWC, directionWC);
  if (dot < stage.resetDot) {
    return true;
  }

  return false;
}

TemporalAntiAliasingStage.prototype.update = function (context, useLogDepth) {
  // We don't need log depth defines; keep signature for compatibility.
  ensureCommands(this, context);
  this._ready = true;
};

TemporalAntiAliasingStage.prototype._isSupported = function (context) {
  return true;
};

TemporalAntiAliasingStage.prototype.execute = function (
  context,
  colorTexture,
  depthTexture,
  idTexture,
) {
  if (!this._ready || !this.enabled) {
    return;
  }

  if (!defined(colorTexture)) {
    return;
  }

  if (colorTexture.width < 1 || colorTexture.height < 1) {
    return;
  }

  const frameState = context.uniformState.frameState;
  this._needsReset = this._needsReset || shouldResetHistory(this, frameState);

  ensureFramebuffers(this, context, colorTexture.width, colorTexture.height);

  const readIndex = this._pingPong;
  const writeIndex = 1 - readIndex;
  const readFbo = this._framebuffers[readIndex];
  const writeFbo = this._framebuffers[writeIndex];

  this._colorTexture = colorTexture;
  this._historyTexture = readFbo.getColorTexture(0);
  this._depthTexture = depthTexture;
  this._velocityTexture = this._velocityFramebuffer.getColorTexture(0);

  if (
    !defined(this._renderState) ||
    this._renderState.viewport.width !== colorTexture.width ||
    this._renderState.viewport.height !== colorTexture.height
  ) {
    this._renderState = RenderState.fromCache({
      viewport: new BoundingRectangle(
        0,
        0,
        colorTexture.width,
        colorTexture.height,
      ),
    });
  }
  this._velocityCommand.framebuffer = this._velocityFramebuffer.framebuffer;
  this._velocityCommand.renderState = this._renderState;
  this._velocityCommand.execute(context);

  this._resolveCommand.framebuffer = writeFbo.framebuffer;
  this._resolveCommand.renderState = this._renderState;
  this._resolveCommand.execute(context);

  this._outputTexture = writeFbo.getColorTexture(0);
  this._pingPong = writeIndex;

  if (defined(frameState) && defined(frameState.camera)) {
    Cartesian3.clone(frameState.camera.positionWC, this._lastCameraPositionWC);
    Cartesian3.clone(
      frameState.camera.directionWC,
      this._lastCameraDirectionWC,
    );
    Matrix4.clone(
      context.uniformState.viewProjection,
      this._previousViewProjection,
    );
    this._hasPreviousViewProjection = true;
    this._hasLastCamera = true;
  }

  // After we successfully produced one history frame, allow accumulation.
  this._needsReset = false;
};

TemporalAntiAliasingStage.prototype.isDestroyed = function () {
  return false;
};

TemporalAntiAliasingStage.prototype.destroy = function () {
  destroyResources(this);
  return destroyObject(this);
};

export default TemporalAntiAliasingStage;
