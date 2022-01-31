import arrayFill from "../Core/arrayFill.js";
import Check from "../Core/Check.js";
import combine from "../Core/combine.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import Event from "../Core/Event.js";
import getTimestamp from "../Core/getTimestamp.js";
import JulianDate from "../Core/JulianDate.js";
import CesiumMath from "../Core/Math.js";
import Matrix4 from "../Core/Matrix4.js";
import Resource from "../Core/Resource.js";
import when from "../ThirdParty/when.js";
import ClippingPlaneCollection from "./ClippingPlaneCollection.js";
import PointCloud from "./PointCloud.js";
import PointCloudEyeDomeLighting from "./PointCloudEyeDomeLighting.js";
import PointCloudShading from "./PointCloudShading.js";
import SceneMode from "./SceneMode.js";
import ShadowMode from "./ShadowMode.js";

/**
 * Provides playback of time-dynamic point cloud data.
 * <p>
 * Point cloud frames are prefetched in intervals determined by the average frame load time and the current clock speed.
 * If intermediate frames cannot be loaded in time to meet playback speed, they will be skipped. If frames are sufficiently
 * small or the clock is sufficiently slow then no frames will be skipped.
 * </p>
 *
 * @alias TimeDynamicPointCloud
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {Clock} options.clock A {@link Clock} instance that is used when determining the value for the time dimension.
 * @param {TimeIntervalCollection} options.intervals A {@link TimeIntervalCollection} with its data property being an object containing a <code>uri</code> to a 3D Tiles Point Cloud tile and an optional <code>transform</code>.
 * @param {Boolean} [options.show=true] Determines if the point cloud will be shown.
 * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] A 4x4 transformation matrix that transforms the point cloud.
 * @param {ShadowMode} [options.shadows=ShadowMode.ENABLED] Determines whether the point cloud casts or receives shadows from light sources.
 * @param {Number} [options.maximumMemoryUsage=256] The maximum amount of memory in MB that can be used by the point cloud.
 * @param {Object} [options.shading] Options for constructing a {@link PointCloudShading} object to control point attenuation and eye dome lighting.
 * @param {Cesium3DTileStyle} [options.style] The style, defined using the {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/Styling|3D Tiles Styling language}, applied to each point in the point cloud.
 * @param {ClippingPlaneCollection} [options.clippingPlanes] The {@link ClippingPlaneCollection} used to selectively disable rendering the point cloud.
 */
function TimeDynamicPointCloud(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.clock", options.clock);
  Check.typeOf.object("options.intervals", options.intervals);
  //>>includeEnd('debug');

  /**
   * Determines if the point cloud will be shown.
   *
   * @type {Boolean}
   * @default true
   */
  this.show = defaultValue(options.show, true);

  /**
   * A 4x4 transformation matrix that transforms the point cloud.
   *
   * @type {Matrix4}
   * @default Matrix4.IDENTITY
   */
  this.modelMatrix = Matrix4.clone(
    defaultValue(options.modelMatrix, Matrix4.IDENTITY)
  );

  /**
   * Determines whether the point cloud casts or receives shadows from light sources.
   * <p>
   * Enabling shadows has a performance impact. A point cloud that casts shadows must be rendered twice, once from the camera and again from the light's point of view.
   * </p>
   * <p>
   * Shadows are rendered only when {@link Viewer#shadows} is <code>true</code>.
   * </p>
   *
   * @type {ShadowMode}
   * @default ShadowMode.ENABLED
   */
  this.shadows = defaultValue(options.shadows, ShadowMode.ENABLED);

  /**
   * The maximum amount of GPU memory (in MB) that may be used to cache point cloud frames.
   * <p>
   * Frames that are not being loaded or rendered are unloaded to enforce this.
   * </p>
   * <p>
   * If decreasing this value results in unloading tiles, the tiles are unloaded the next frame.
   * </p>
   *
   * @type {Number}
   * @default 256
   *
   * @see TimeDynamicPointCloud#totalMemoryUsageInBytes
   */
  this.maximumMemoryUsage = defaultValue(options.maximumMemoryUsage, 256);

  /**
   * Options for controlling point size based on geometric error and eye dome lighting.
   * @type {PointCloudShading}
   */
  this.shading = new PointCloudShading(options.shading);

  /**
   * The style, defined using the
   * {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/Styling|3D Tiles Styling language},
   * applied to each point in the point cloud.
   * <p>
   * Assign <code>undefined</code> to remove the style, which will restore the visual
   * appearance of the point cloud to its default when no style was applied.
   * </p>
   *
   * @type {Cesium3DTileStyle}
   *
   * @example
   * pointCloud.style = new Cesium.Cesium3DTileStyle({
   *    color : {
   *        conditions : [
   *            ['${Classification} === 0', 'color("purple", 0.5)'],
   *            ['${Classification} === 1', 'color("red")'],
   *            ['true', '${COLOR}']
   *        ]
   *    },
   *    show : '${Classification} !== 2'
   * });
   *
   * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/Styling|3D Tiles Styling language}
   */
  this.style = options.style;

  /**
   * The event fired to indicate that a frame failed to load. A frame may fail to load if the
   * request for its uri fails or processing fails due to invalid content.
   * <p>
   * If there are no event listeners, error messages will be logged to the console.
   * </p>
   * <p>
   * The error object passed to the listener contains two properties:
   * <ul>
   * <li><code>uri</code>: the uri of the failed frame.</li>
   * <li><code>message</code>: the error message.</li>
   * </ul>
   *
   * @type {Event}
   * @default new Event()
   *
   * @example
   * pointCloud.frameFailed.addEventListener(function(error) {
   *     console.log('An error occurred loading frame: ' + error.uri);
   *     console.log('Error: ' + error.message);
   * });
   */
  this.frameFailed = new Event();

  /**
   * The event fired to indicate that a new frame was rendered.
   * <p>
   * The time dynamic point cloud {@link TimeDynamicPointCloud} is passed to the event listener.
   * </p>
   * @type {Event}
   * @default new Event()
   *
   * @example
   * pointCloud.frameChanged.addEventListener(function(timeDynamicPointCloud) {
   *     viewer.camera.viewBoundingSphere(timeDynamicPointCloud.boundingSphere);
   * });
   */
  this.frameChanged = new Event();

  this._clock = options.clock;
  this._intervals = options.intervals;
  this._clippingPlanes = undefined;
  this.clippingPlanes = options.clippingPlanes; // Call setter
  this._pointCloudEyeDomeLighting = new PointCloudEyeDomeLighting();
  this._loadTimestamp = undefined;
  this._clippingPlanesState = 0;
  this._styleDirty = false;
  this._pickId = undefined;
  this._totalMemoryUsageInBytes = 0;
  this._frames = [];
  this._previousInterval = undefined;
  this._nextInterval = undefined;
  this._lastRenderedFrame = undefined;
  this._clockMultiplier = 0.0;
  this._readyPromise = when.defer();

  // For calculating average load time of the last N frames
  this._runningSum = 0.0;
  this._runningLength = 0;
  this._runningIndex = 0;
  this._runningSamples = arrayFill(new Array(5), 0.0);
  this._runningAverage = 0.0;
}

Object.defineProperties(TimeDynamicPointCloud.prototype, {
  /**
   * The {@link ClippingPlaneCollection} used to selectively disable rendering the point cloud.
   *
   * @memberof TimeDynamicPointCloud.prototype
   *
   * @type {ClippingPlaneCollection}
   */
  clippingPlanes: {
    get: function () {
      return this._clippingPlanes;
    },
    set: function (value) {
      ClippingPlaneCollection.setOwner(value, this, "_clippingPlanes");
    },
  },

  /**
   * The total amount of GPU memory in bytes used by the point cloud.
   *
   * @memberof TimeDynamicPointCloud.prototype
   *
   * @type {Number}
   * @readonly
   *
   * @see TimeDynamicPointCloud#maximumMemoryUsage
   */
  totalMemoryUsageInBytes: {
    get: function () {
      return this._totalMemoryUsageInBytes;
    },
  },

  /**
   * The bounding sphere of the frame being rendered. Returns <code>undefined</code> if no frame is being rendered.
   *
   * @memberof TimeDynamicPointCloud.prototype
   *
   * @type {BoundingSphere}
   * @readonly
   */
  boundingSphere: {
    get: function () {
      if (defined(this._lastRenderedFrame)) {
        return this._lastRenderedFrame.pointCloud.boundingSphere;
      }
      return undefined;
    },
  },

  /**
   * Gets the promise that will be resolved when the point cloud renders a frame for the first time.
   *
   * @memberof TimeDynamicPointCloud.prototype
   *
   * @type {Promise.<TimeDynamicPointCloud>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    },
  },
});

function getFragmentShaderLoaded(fs) {
  return "uniform vec4 czm_pickColor;\n" + fs;
}

function getUniformMapLoaded(stream) {
  return function (uniformMap) {
    return combine(uniformMap, {
      czm_pickColor: function () {
        return stream._pickId.color;
      },
    });
  };
}

function getPickIdLoaded() {
  return "czm_pickColor";
}

/**
 * Marks the point cloud's {@link TimeDynamicPointCloud#style} as dirty, which forces all
 * points to re-evaluate the style in the next frame.
 */
TimeDynamicPointCloud.prototype.makeStyleDirty = function () {
  this._styleDirty = true;
};

/**
 * Exposed for testing.
 *
 * @private
 */
TimeDynamicPointCloud.prototype._getAverageLoadTime = function () {
  if (this._runningLength === 0) {
    // Before any frames have loaded make a best guess about the average load time
    return 0.05;
  }
  return this._runningAverage;
};

const scratchDate = new JulianDate();

function getClockMultiplier(that) {
  const clock = that._clock;
  const isAnimating = clock.canAnimate && clock.shouldAnimate;
  const multiplier = clock.multiplier;
  return isAnimating ? multiplier : 0.0;
}

function getIntervalIndex(that, interval) {
  return that._intervals.indexOf(interval.start);
}

function getNextInterval(that, currentInterval) {
  const intervals = that._intervals;
  const clock = that._clock;
  const multiplier = getClockMultiplier(that);

  if (multiplier === 0.0) {
    return undefined;
  }

  const averageLoadTime = that._getAverageLoadTime();
  const time = JulianDate.addSeconds(
    clock.currentTime,
    averageLoadTime * multiplier,
    scratchDate
  );
  let index = intervals.indexOf(time);

  const currentIndex = getIntervalIndex(that, currentInterval);
  if (index === currentIndex) {
    if (multiplier >= 0) {
      ++index;
    } else {
      --index;
    }
  }

  // Returns undefined if not in range
  return intervals.get(index);
}

function getCurrentInterval(that) {
  const intervals = that._intervals;
  const clock = that._clock;
  const time = clock.currentTime;
  const index = intervals.indexOf(time);

  // Returns undefined if not in range
  return intervals.get(index);
}

function reachedInterval(that, currentInterval, nextInterval) {
  const multiplier = getClockMultiplier(that);
  const currentIndex = getIntervalIndex(that, currentInterval);
  const nextIndex = getIntervalIndex(that, nextInterval);

  if (multiplier >= 0) {
    return currentIndex >= nextIndex;
  }
  return currentIndex <= nextIndex;
}

function handleFrameFailure(that, uri) {
  return function (error) {
    const message = defined(error.message) ? error.message : error.toString();
    if (that.frameFailed.numberOfListeners > 0) {
      that.frameFailed.raiseEvent({
        uri: uri,
        message: message,
      });
    } else {
      console.log("A frame failed to load: " + uri);
      console.log("Error: " + message);
    }
  };
}

function requestFrame(that, interval, frameState) {
  const index = getIntervalIndex(that, interval);
  const frames = that._frames;
  let frame = frames[index];
  if (!defined(frame)) {
    const transformArray = interval.data.transform;
    const transform = defined(transformArray)
      ? Matrix4.fromArray(transformArray)
      : undefined;
    const uri = interval.data.uri;
    frame = {
      pointCloud: undefined,
      transform: transform,
      timestamp: getTimestamp(),
      sequential: true,
      ready: false,
      touchedFrameNumber: frameState.frameNumber,
    };
    frames[index] = frame;
    Resource.fetchArrayBuffer({
      url: uri,
    })
      .then(function (arrayBuffer) {
        // PERFORMANCE_IDEA: share a memory pool, render states, shaders, and other resources among all
        // frames. Each frame just needs an index/offset into the pool.
        frame.pointCloud = new PointCloud({
          arrayBuffer: arrayBuffer,
          cull: true,
          fragmentShaderLoaded: getFragmentShaderLoaded,
          uniformMapLoaded: getUniformMapLoaded(that),
          pickIdLoaded: getPickIdLoaded,
        });
        return frame.pointCloud.readyPromise;
      })
      .otherwise(handleFrameFailure(that, uri));
  }
  return frame;
}

function updateAverageLoadTime(that, loadTime) {
  that._runningSum += loadTime;
  that._runningSum -= that._runningSamples[that._runningIndex];
  that._runningSamples[that._runningIndex] = loadTime;
  that._runningLength = Math.min(
    that._runningLength + 1,
    that._runningSamples.length
  );
  that._runningIndex = (that._runningIndex + 1) % that._runningSamples.length;
  that._runningAverage = that._runningSum / that._runningLength;
}

function prepareFrame(that, frame, updateState, frameState) {
  if (frame.touchedFrameNumber < frameState.frameNumber - 1) {
    // If this frame was not loaded in sequential updates then it can't be used it for calculating the average load time.
    // For example: selecting a frame on the timeline, selecting another frame before the request finishes, then selecting this frame later.
    frame.sequential = false;
  }

  const pointCloud = frame.pointCloud;

  if (defined(pointCloud) && !frame.ready) {
    // Call update to prepare renderer resources. Don't render anything yet.
    const commandList = frameState.commandList;
    const lengthBeforeUpdate = commandList.length;
    renderFrame(that, frame, updateState, frameState);

    if (pointCloud.ready) {
      // Point cloud became ready this update
      frame.ready = true;
      that._totalMemoryUsageInBytes += pointCloud.geometryByteLength;
      commandList.length = lengthBeforeUpdate; // Don't allow preparing frame to insert commands.
      if (frame.sequential) {
        // Update the values used to calculate average load time
        const loadTime = (getTimestamp() - frame.timestamp) / 1000.0;
        updateAverageLoadTime(that, loadTime);
      }
    }
  }

  frame.touchedFrameNumber = frameState.frameNumber;
}

const scratchModelMatrix = new Matrix4();

function getGeometricError(that, pointCloud) {
  const shading = that.shading;
  if (defined(shading) && defined(shading.baseResolution)) {
    return shading.baseResolution;
  } else if (defined(pointCloud.boundingSphere)) {
    return CesiumMath.cbrt(
      pointCloud.boundingSphere.volume() / pointCloud.pointsLength
    );
  }
  return 0.0;
}

function getMaximumAttenuation(that) {
  const shading = that.shading;
  if (defined(shading) && defined(shading.maximumAttenuation)) {
    return shading.maximumAttenuation;
  }

  // Return a hardcoded maximum attenuation. For a tileset this would instead be the maximum screen space error.
  return 10.0;
}

const defaultShading = new PointCloudShading();

function renderFrame(that, frame, updateState, frameState) {
  const shading = defaultValue(that.shading, defaultShading);
  const pointCloud = frame.pointCloud;
  const transform = defaultValue(frame.transform, Matrix4.IDENTITY);
  pointCloud.modelMatrix = Matrix4.multiplyTransformation(
    that.modelMatrix,
    transform,
    scratchModelMatrix
  );
  pointCloud.style = that.style;
  pointCloud.time = updateState.timeSinceLoad;
  pointCloud.shadows = that.shadows;
  pointCloud.clippingPlanes = that._clippingPlanes;
  pointCloud.isClipped = updateState.isClipped;
  pointCloud.attenuation = shading.attenuation;
  pointCloud.backFaceCulling = shading.backFaceCulling;
  pointCloud.normalShading = shading.normalShading;
  pointCloud.geometricError = getGeometricError(that, pointCloud);
  pointCloud.geometricErrorScale = shading.geometricErrorScale;
  pointCloud.maximumAttenuation = getMaximumAttenuation(that);

  pointCloud.update(frameState);
  frame.touchedFrameNumber = frameState.frameNumber;
}

function loadFrame(that, interval, updateState, frameState) {
  const frame = requestFrame(that, interval, frameState);
  prepareFrame(that, frame, updateState, frameState);
}

function getUnloadCondition(frameState) {
  return function (frame) {
    // Unload all frames that aren't currently being loaded or rendered
    return frame.touchedFrameNumber < frameState.frameNumber;
  };
}

function unloadFrames(that, unloadCondition) {
  const frames = that._frames;
  const length = frames.length;
  for (let i = 0; i < length; ++i) {
    const frame = frames[i];
    if (defined(frame)) {
      if (!defined(unloadCondition) || unloadCondition(frame)) {
        const pointCloud = frame.pointCloud;
        if (frame.ready) {
          that._totalMemoryUsageInBytes -= pointCloud.geometryByteLength;
        }
        if (defined(pointCloud)) {
          pointCloud.destroy();
        }
        if (frame === that._lastRenderedFrame) {
          that._lastRenderedFrame = undefined;
        }
        frames[i] = undefined;
      }
    }
  }
}

function getFrame(that, interval) {
  const index = getIntervalIndex(that, interval);
  const frame = that._frames[index];
  if (defined(frame) && frame.ready) {
    return frame;
  }
}

function updateInterval(that, interval, frame, updateState, frameState) {
  if (defined(frame)) {
    if (frame.ready) {
      return true;
    }
    loadFrame(that, interval, updateState, frameState);
    return frame.ready;
  }
  return false;
}

function getNearestReadyInterval(
  that,
  previousInterval,
  currentInterval,
  updateState,
  frameState
) {
  let i;
  let interval;
  let frame;
  const intervals = that._intervals;
  const frames = that._frames;
  const currentIndex = getIntervalIndex(that, currentInterval);
  const previousIndex = getIntervalIndex(that, previousInterval);

  if (currentIndex >= previousIndex) {
    // look backwards
    for (i = currentIndex; i >= previousIndex; --i) {
      interval = intervals.get(i);
      frame = frames[i];
      if (updateInterval(that, interval, frame, updateState, frameState)) {
        return interval;
      }
    }
  } else {
    // look forwards
    for (i = currentIndex; i <= previousIndex; ++i) {
      interval = intervals.get(i);
      frame = frames[i];
      if (updateInterval(that, interval, frame, updateState, frameState)) {
        return interval;
      }
    }
  }

  // If no intervals are ready return the previous interval
  return previousInterval;
}

function setFramesDirty(that, clippingPlanesDirty, styleDirty) {
  const frames = that._frames;
  const framesLength = frames.length;
  for (let i = 0; i < framesLength; ++i) {
    const frame = frames[i];
    if (defined(frame) && defined(frame.pointCloud)) {
      frame.pointCloud.clippingPlanesDirty = clippingPlanesDirty;
      frame.pointCloud.styleDirty = styleDirty;
    }
  }
}

const updateState = {
  timeSinceLoad: 0,
  isClipped: false,
  clippingPlanesDirty: false,
};

/**
 * @private
 */
TimeDynamicPointCloud.prototype.update = function (frameState) {
  if (frameState.mode === SceneMode.MORPHING) {
    return;
  }

  if (!this.show) {
    return;
  }

  if (!defined(this._pickId)) {
    this._pickId = frameState.context.createPickId({
      primitive: this,
    });
  }

  if (!defined(this._loadTimestamp)) {
    this._loadTimestamp = JulianDate.clone(frameState.time);
  }

  // For styling
  const timeSinceLoad = Math.max(
    JulianDate.secondsDifference(frameState.time, this._loadTimestamp) * 1000,
    0.0
  );

  // Update clipping planes
  const clippingPlanes = this._clippingPlanes;
  let clippingPlanesState = 0;
  let clippingPlanesDirty = false;
  const isClipped = defined(clippingPlanes) && clippingPlanes.enabled;

  if (isClipped) {
    clippingPlanes.update(frameState);
    clippingPlanesState = clippingPlanes.clippingPlanesState;
  }

  if (this._clippingPlanesState !== clippingPlanesState) {
    this._clippingPlanesState = clippingPlanesState;
    clippingPlanesDirty = true;
  }

  const styleDirty = this._styleDirty;
  this._styleDirty = false;

  if (clippingPlanesDirty || styleDirty) {
    setFramesDirty(this, clippingPlanesDirty, styleDirty);
  }

  updateState.timeSinceLoad = timeSinceLoad;
  updateState.isClipped = isClipped;

  const shading = this.shading;
  const eyeDomeLighting = this._pointCloudEyeDomeLighting;

  const commandList = frameState.commandList;
  const lengthBeforeUpdate = commandList.length;

  let previousInterval = this._previousInterval;
  let nextInterval = this._nextInterval;
  const currentInterval = getCurrentInterval(this);

  if (!defined(currentInterval)) {
    return;
  }

  let clockMultiplierChanged = false;
  const clockMultiplier = getClockMultiplier(this);
  const clockPaused = clockMultiplier === 0;
  if (clockMultiplier !== this._clockMultiplier) {
    clockMultiplierChanged = true;
    this._clockMultiplier = clockMultiplier;
  }

  if (!defined(previousInterval) || clockPaused) {
    previousInterval = currentInterval;
  }

  if (
    !defined(nextInterval) ||
    clockMultiplierChanged ||
    reachedInterval(this, currentInterval, nextInterval)
  ) {
    nextInterval = getNextInterval(this, currentInterval);
  }

  previousInterval = getNearestReadyInterval(
    this,
    previousInterval,
    currentInterval,
    updateState,
    frameState
  );
  let frame = getFrame(this, previousInterval);

  if (!defined(frame)) {
    // The frame is not ready to render. This can happen when the simulation starts or when scrubbing the timeline
    // to a frame that hasn't loaded yet. Just render the last rendered frame in its place until it finishes loading.
    loadFrame(this, previousInterval, updateState, frameState);
    frame = this._lastRenderedFrame;
  }

  if (defined(frame)) {
    renderFrame(this, frame, updateState, frameState);
  }

  if (defined(nextInterval)) {
    // Start loading the next frame
    loadFrame(this, nextInterval, updateState, frameState);
  }

  const that = this;
  if (defined(frame) && !defined(this._lastRenderedFrame)) {
    frameState.afterRender.push(function () {
      that._readyPromise.resolve(that);
    });
  }

  if (defined(frame) && frame !== this._lastRenderedFrame) {
    if (that.frameChanged.numberOfListeners > 0) {
      frameState.afterRender.push(function () {
        that.frameChanged.raiseEvent(that);
      });
    }
  }

  this._previousInterval = previousInterval;
  this._nextInterval = nextInterval;
  this._lastRenderedFrame = frame;

  const totalMemoryUsageInBytes = this._totalMemoryUsageInBytes;
  const maximumMemoryUsageInBytes = this.maximumMemoryUsage * 1024 * 1024;

  if (totalMemoryUsageInBytes > maximumMemoryUsageInBytes) {
    unloadFrames(this, getUnloadCondition(frameState));
  }

  const lengthAfterUpdate = commandList.length;
  const addedCommandsLength = lengthAfterUpdate - lengthBeforeUpdate;

  if (
    defined(shading) &&
    shading.attenuation &&
    shading.eyeDomeLighting &&
    addedCommandsLength > 0
  ) {
    eyeDomeLighting.update(
      frameState,
      lengthBeforeUpdate,
      shading,
      this.boundingSphere
    );
  }
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see TimeDynamicPointCloud#destroy
 */
TimeDynamicPointCloud.prototype.isDestroyed = function () {
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
 * pointCloud = pointCloud && pointCloud.destroy();
 *
 * @see TimeDynamicPointCloud#isDestroyed
 */
TimeDynamicPointCloud.prototype.destroy = function () {
  unloadFrames(this);
  this._clippingPlanes = this._clippingPlanes && this._clippingPlanes.destroy();
  this._pickId = this._pickId && this._pickId.destroy();
  return destroyObject(this);
};
export default TimeDynamicPointCloud;
