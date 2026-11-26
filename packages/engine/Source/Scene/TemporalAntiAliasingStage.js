import {
  BoundingRectangle,
  Cartesian3,
  Check,
  Color,
  Frozen,
  Matrix4,
  PixelDatatype,
  PixelFormat,
  createGuid,
  defined,
  destroyObject,
} from "@cesium/core";
import FramebufferManager from "../Renderer/FramebufferManager.js";
import RenderState from "../Renderer/RenderState.js";
import TemporalAntiAliasing from "../Shaders/PostProcessStages/TemporalAntiAliasing.js";
import TemporalAntiAliasingVelocity from "../Shaders/PostProcessStages/TemporalAntiAliasingVelocity.js";

/**
 * A post-process stage that averages the scene over successive frames, which
 * removes the noise of stochastically rendered content such as Gaussian splats
 * drawn with {@link GaussianSplatRenderMode.STOCHASTIC}.
 * <p>
 * While the camera moves, the previous output is reprojected with the depth
 * buffer and the previous view-projection matrix, clamped to the colors around
 * the current pixel to limit ghosting, and blended with the current frame.
 * Only camera motion is reprojected, so objects that move on their own can
 * leave trails.
 * </p>
 *
 * @alias TemporalAntiAliasingStage
 * @constructor
 *
 * @param {object} [options] Object with the following properties:
 * @param {string} [options.name=createGuid()] The unique name of this stage.
 * @param {number} [options.feedback=0.98] The weight of the history in [0, 1] while the camera moves. Higher values are smoother but ghost more.
 * @param {number} [options.resetDistance=0.001] The camera movement since the previous frame, relative to the camera's distance from the origin, above which the history is discarded.
 * @param {number} [options.resetDot=0.995] The dot product of the current and previous camera directions below which the history is discarded.
 * @param {boolean} [options.progressive=false] Whether to average frames with equal weights while the camera is still, so that the image converges instead of following the latest frames.
 * @param {number} [options.maxProgressiveFrames=256] The number of frames averaged with equal weights. Later frames keep the weight of the last one.
 * @param {boolean} [options.historyFloat=options.progressive] Whether to prefer a 32-bit float history. A half float history loses the small contributions of progressive averaging after about 128 frames.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see PostProcessStageLibrary.createTemporalAntiAliasingStage
 *
 * @example
 * tileset.gaussianSplatRenderMode = Cesium.GaussianSplatRenderMode.STOCHASTIC;
 * const temporalAntiAliasing = new Cesium.TemporalAntiAliasingStage({
 *   progressive: true,
 * });
 * scene.postProcessStages.add(temporalAntiAliasing);
 */
function TemporalAntiAliasingStage(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const {
    name = createGuid(),
    feedback = 0.98,
    resetDistance = 0.001,
    resetDot = 0.995,
    progressive = false,
    maxProgressiveFrames = 256,
    historyFloat = progressive,
  } = options;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("options.feedback", feedback);
  Check.typeOf.number("options.resetDistance", resetDistance);
  Check.typeOf.number("options.resetDot", resetDot);
  //>>includeEnd('debug');

  this._name = name;

  /**
   * The weight of the history in [0, 1] while the camera moves. Higher values
   * are smoother but ghost more.
   *
   * @type {number}
   * @default 0.98
   */
  this.feedback = feedback;

  /**
   * The camera movement since the previous frame, relative to the camera's
   * distance from the origin, above which the history is discarded.
   *
   * @type {number}
   * @default 0.001
   */
  this.resetDistance = resetDistance;

  /**
   * The dot product of the current and previous camera directions below which
   * the history is discarded.
   *
   * @type {number}
   * @default 0.995
   */
  this.resetDot = resetDot;

  /**
   * Whether to average frames with equal weights while the camera is still,
   * so that the image converges instead of following the latest frames.
   *
   * @type {boolean}
   * @default false
   */
  this.progressive = progressive;

  /**
   * The number of frames averaged with equal weights when
   * {@link TemporalAntiAliasingStage#progressive} is <code>true</code>. Later
   * frames keep the weight of the last one.
   *
   * @type {number}
   * @default 256
   */
  this.maxProgressiveFrames = maxProgressiveFrames;

  /**
   * Whether to prefer a 32-bit float history. A half float history loses the
   * small contributions of progressive averaging after about 128 frames.
   *
   * @type {boolean}
   */
  this.historyFloat = historyFloat;

  this._enabled = true;

  // PostProcessStageTextureCache reads these to allocate an output framebuffer
  // for every stage. This stage writes to its own history framebuffers instead.
  this._textureScale = 1.0;
  this._forcePowerOfTwo = false;
  this._pixelFormat = PixelFormat.RGBA;
  this._pixelDatatype = PixelDatatype.UNSIGNED_BYTE;
  this._clearColor = Color.BLACK;

  // The output of each frame is the history of the next one, so the two
  // framebuffers are swapped every frame.
  this._historyFramebuffers = [
    new FramebufferManager(),
    new FramebufferManager(),
  ];
  this._historyIndex = 0;
  this._velocityFramebuffer = new FramebufferManager();
  this._renderState = undefined;
  this._velocityCommand = undefined;
  this._resolveCommand = undefined;

  this._colorTexture = undefined;
  this._depthTexture = undefined;

  this._needsReset = true;
  // The number of consecutive frames accumulated with a still camera.
  this._frameCount = 0;
  this._previousViewProjection = new Matrix4();
  this._previousCameraPositionWC = new Cartesian3();
  this._previousCameraDirectionWC = new Cartesian3();
}

Object.defineProperties(TemporalAntiAliasingStage.prototype, {
  /**
   * The unique name of this post-process stage.
   *
   * @memberof TemporalAntiAliasingStage.prototype
   * @type {string}
   * @readonly
   */
  name: {
    get: function () {
      return this._name;
    },
  },

  /**
   * Determines if this post-process stage is ready to be executed, which is
   * always the case.
   *
   * @memberof TemporalAntiAliasingStage.prototype
   * @type {boolean}
   * @readonly
   */
  ready: {
    get: function () {
      return true;
    },
  },

  /**
   * Whether to execute this stage. Disabling it discards the accumulated
   * history and releases its framebuffers.
   *
   * @memberof TemporalAntiAliasingStage.prototype
   * @type {boolean}
   * @default true
   */
  enabled: {
    get: function () {
      return this._enabled;
    },
    set: function (value) {
      if (this._enabled && !value) {
        destroyFramebuffers(this);
      }
      this._enabled = value;
    },
  },

  /**
   * A reference to the texture written to when executing this post process stage.
   *
   * @memberof TemporalAntiAliasingStage.prototype
   * @type {Texture|undefined}
   * @readonly
   * @private
   */
  outputTexture: {
    get: function () {
      return getHistoryTexture(this);
    },
  },
});

function getHistoryTexture(stage) {
  return stage._historyFramebuffers[stage._historyIndex].getColorTexture(0);
}

function destroyFramebuffers(stage) {
  stage._historyFramebuffers[0].destroy();
  stage._historyFramebuffers[1].destroy();
  stage._velocityFramebuffer.destroy();
}

function getHistoryPixelDatatype(context, preferFloat) {
  // The history is rendered to, so the format has to be color-renderable and
  // not just sampleable.
  const float = context.floatingPointTexture && context.colorBufferFloat;
  const halfFloat =
    context.halfFloatingPointTexture && context.colorBufferHalfFloat;
  if (float && (preferFloat || !halfFloat)) {
    return PixelDatatype.FLOAT;
  }
  return halfFloat ? PixelDatatype.HALF_FLOAT : PixelDatatype.UNSIGNED_BYTE;
}

function updateFramebuffers(stage, context, width, height) {
  const historyFramebuffers = stage._historyFramebuffers;
  const pixelDatatype = getHistoryPixelDatatype(context, stage.historyFloat);
  const pixelFormat = PixelFormat.RGBA;
  if (
    !historyFramebuffers[0].isDirty(
      width,
      height,
      1,
      pixelDatatype,
      pixelFormat,
    )
  ) {
    return;
  }

  for (const framebuffer of historyFramebuffers) {
    framebuffer.update(context, width, height, 1, pixelDatatype, pixelFormat);
  }
  stage._velocityFramebuffer.update(context, width, height);
  stage._renderState = RenderState.fromCache({
    viewport: new BoundingRectangle(0, 0, width, height),
  });
  stage._needsReset = true;
}

function isAveragingProgressively(stage) {
  return stage.progressive && stage._frameCount > 0;
}

function createCommands(stage, context) {
  stage._velocityCommand = context.createViewportQuadCommand(
    TemporalAntiAliasingVelocity,
    {
      uniformMap: {
        depthTexture: function () {
          return stage._depthTexture;
        },
        u_previousViewProjection: function () {
          return stage._previousViewProjection;
        },
      },
      owner: stage,
    },
  );

  stage._resolveCommand = context.createViewportQuadCommand(
    TemporalAntiAliasing,
    {
      uniformMap: {
        colorTexture: function () {
          return stage._colorTexture;
        },
        historyTexture: function () {
          return getHistoryTexture(stage);
        },
        velocityTexture: function () {
          return stage._velocityFramebuffer.getColorTexture(0);
        },
        u_feedback: function () {
          return stage.feedback;
        },
        u_progressiveWeight: function () {
          if (!isAveragingProgressively(stage)) {
            return 0.0;
          }
          const frames = Math.min(
            stage._frameCount,
            stage.maxProgressiveFrames,
          );
          return 1.0 / (frames + 1.0);
        },
        u_reset: function () {
          return stage._needsReset ? 1.0 : 0.0;
        },
      },
      owner: stage,
    },
  );
}

/**
 * Compares the camera with the previous frame. A large jump discards the
 * history, and any movement restarts progressive averaging.
 *
 * @param {TemporalAntiAliasingStage} stage The stage.
 * @param {Camera} camera The camera of the current frame.
 * @private
 */
function trackCamera(stage, camera) {
  const position = camera.positionWC;
  const direction = camera.directionWC;
  const previousPosition = stage._previousCameraPositionWC;
  const previousDirection = stage._previousCameraDirectionWC;

  const relativeDistance =
    Cartesian3.distance(position, previousPosition) /
    Math.max(Cartesian3.magnitude(position), 1.0);
  if (
    relativeDistance > stage.resetDistance ||
    Cartesian3.dot(direction, previousDirection) < stage.resetDot
  ) {
    stage._needsReset = true;
  }

  const isStill =
    Cartesian3.equalsEpsilon(position, previousPosition, 0.0, 1e-6) &&
    Cartesian3.equalsEpsilon(direction, previousDirection, 1e-9);
  stage._frameCount = isStill && !stage._needsReset ? stage._frameCount + 1 : 0;

  Cartesian3.clone(position, previousPosition);
  Cartesian3.clone(direction, previousDirection);
}

/**
 * A function that will be called before execute. This stage has nothing to
 * prepare, but {@link PostProcessStageCollection} updates every stage.
 *
 * @private
 */
TemporalAntiAliasingStage.prototype.update = function () {};

/**
 * Whether this stage can be executed: reprojecting the history needs to read
 * the depth texture.
 *
 * @param {Context} context The context.
 * @returns {boolean} Whether this post process stage is supported.
 *
 * @private
 */
TemporalAntiAliasingStage.prototype._isSupported = function (context) {
  return context.depthTexture;
};

/**
 * Blends the scene with the accumulated history and writes the result to
 * {@link TemporalAntiAliasingStage#outputTexture}.
 *
 * @param {Context} context The context.
 * @param {Texture} colorTexture The color texture of the current frame.
 * @param {Texture} depthTexture The depth texture of the current frame.
 *
 * @private
 */
TemporalAntiAliasingStage.prototype.execute = function (
  context,
  colorTexture,
  depthTexture,
) {
  const uniformState = context.uniformState;
  updateFramebuffers(this, context, colorTexture.width, colorTexture.height);
  trackCamera(this, uniformState.frameState.camera);
  if (!defined(this._resolveCommand)) {
    createCommands(this, context);
  }

  this._colorTexture = colorTexture;
  this._depthTexture = depthTexture;

  // The velocity is only read when the history is reprojected.
  if (!this._needsReset && !isAveragingProgressively(this)) {
    const velocityCommand = this._velocityCommand;
    velocityCommand.framebuffer = this._velocityFramebuffer.framebuffer;
    velocityCommand.renderState = this._renderState;
    velocityCommand.execute(context);
  }

  const outputIndex = 1 - this._historyIndex;
  const resolveCommand = this._resolveCommand;
  resolveCommand.framebuffer =
    this._historyFramebuffers[outputIndex].framebuffer;
  resolveCommand.renderState = this._renderState;
  resolveCommand.execute(context);

  this._historyIndex = outputIndex;
  this._needsReset = false;
  Matrix4.clone(uniformState.viewProjection, this._previousViewProjection);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <p>
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 * </p>
 *
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see TemporalAntiAliasingStage#destroy
 */
TemporalAntiAliasingStage.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <p>
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 * </p>
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @see TemporalAntiAliasingStage#isDestroyed
 */
TemporalAntiAliasingStage.prototype.destroy = function () {
  destroyFramebuffers(this);
  for (const command of [this._velocityCommand, this._resolveCommand]) {
    if (defined(command)) {
      command.shaderProgram.destroy();
    }
  }
  return destroyObject(this);
};

export default TemporalAntiAliasingStage;
