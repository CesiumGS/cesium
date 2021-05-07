import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import getTimestamp from "../Core/getTimestamp.js";
import TimeConstants from "../Core/TimeConstants.js";

/**
 * Monitors the frame rate (frames per second) in a {@link Scene} and raises an event if the frame rate is
 * lower than a threshold.  Later, if the frame rate returns to the required level, a separate event is raised.
 * To avoid creating multiple FrameRateMonitors for a single {@link Scene}, use {@link FrameRateMonitor.fromScene}
 * instead of constructing an instance explicitly.
 *
 * @alias FrameRateMonitor
 * @constructor
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Scene} options.scene The Scene instance for which to monitor performance.
 * @param {Number} [options.samplingWindow=5.0] The length of the sliding window over which to compute the average frame rate, in seconds.
 * @param {Number} [options.quietPeriod=2.0] The length of time to wait at startup and each time the page becomes visible (i.e. when the user
 *        switches back to the tab) before starting to measure performance, in seconds.
 * @param {Number} [options.warmupPeriod=5.0] The length of the warmup period, in seconds.  During the warmup period, a separate
 *        (usually lower) frame rate is required.
 * @param {Number} [options.minimumFrameRateDuringWarmup=4] The minimum frames-per-second that are required for acceptable performance during
 *        the warmup period.  If the frame rate averages less than this during any samplingWindow during the warmupPeriod, the
 *        lowFrameRate event will be raised and the page will redirect to the redirectOnLowFrameRateUrl, if any.
 * @param {Number} [options.minimumFrameRateAfterWarmup=8] The minimum frames-per-second that are required for acceptable performance after
 *        the end of the warmup period.  If the frame rate averages less than this during any samplingWindow after the warmupPeriod, the
 *        lowFrameRate event will be raised and the page will redirect to the redirectOnLowFrameRateUrl, if any.
 */
function FrameRateMonitor(options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(options) || !defined(options.scene)) {
    throw new DeveloperError("options.scene is required.");
  }
  //>>includeEnd('debug');

  this._scene = options.scene;

  /**
   * Gets or sets the length of the sliding window over which to compute the average frame rate, in seconds.
   * @type {Number}
   */
  this.samplingWindow = defaultValue(
    options.samplingWindow,
    FrameRateMonitor.defaultSettings.samplingWindow
  );

  /**
   * Gets or sets the length of time to wait at startup and each time the page becomes visible (i.e. when the user
   * switches back to the tab) before starting to measure performance, in seconds.
   * @type {Number}
   */
  this.quietPeriod = defaultValue(
    options.quietPeriod,
    FrameRateMonitor.defaultSettings.quietPeriod
  );

  /**
   * Gets or sets the length of the warmup period, in seconds.  During the warmup period, a separate
   * (usually lower) frame rate is required.
   * @type {Number}
   */
  this.warmupPeriod = defaultValue(
    options.warmupPeriod,
    FrameRateMonitor.defaultSettings.warmupPeriod
  );

  /**
   * Gets or sets the minimum frames-per-second that are required for acceptable performance during
   * the warmup period.  If the frame rate averages less than this during any <code>samplingWindow</code> during the <code>warmupPeriod</code>, the
   * <code>lowFrameRate</code> event will be raised and the page will redirect to the <code>redirectOnLowFrameRateUrl</code>, if any.
   * @type {Number}
   */
  this.minimumFrameRateDuringWarmup = defaultValue(
    options.minimumFrameRateDuringWarmup,
    FrameRateMonitor.defaultSettings.minimumFrameRateDuringWarmup
  );

  /**
   * Gets or sets the minimum frames-per-second that are required for acceptable performance after
   * the end of the warmup period.  If the frame rate averages less than this during any <code>samplingWindow</code> after the <code>warmupPeriod</code>, the
   * <code>lowFrameRate</code> event will be raised and the page will redirect to the <code>redirectOnLowFrameRateUrl</code>, if any.
   * @type {Number}
   */
  this.minimumFrameRateAfterWarmup = defaultValue(
    options.minimumFrameRateAfterWarmup,
    FrameRateMonitor.defaultSettings.minimumFrameRateAfterWarmup
  );

  this._lowFrameRate = new Event();
  this._nominalFrameRate = new Event();

  this._frameTimes = [];
  this._needsQuietPeriod = true;
  this._quietPeriodEndTime = 0.0;
  this._warmupPeriodEndTime = 0.0;
  this._frameRateIsLow = false;
  this._lastFramesPerSecond = undefined;
  this._pauseCount = 0;

  var that = this;
  this._preUpdateRemoveListener = this._scene.preUpdate.addEventListener(
    function (scene, time) {
      update(that, time);
    }
  );

  this._hiddenPropertyName =
    document.hidden !== undefined
      ? "hidden"
      : document.mozHidden !== undefined
      ? "mozHidden"
      : document.msHidden !== undefined
      ? "msHidden"
      : document.webkitHidden !== undefined
      ? "webkitHidden"
      : undefined;

  var visibilityChangeEventName =
    document.hidden !== undefined
      ? "visibilitychange"
      : document.mozHidden !== undefined
      ? "mozvisibilitychange"
      : document.msHidden !== undefined
      ? "msvisibilitychange"
      : document.webkitHidden !== undefined
      ? "webkitvisibilitychange"
      : undefined;

  function visibilityChangeListener() {
    visibilityChanged(that);
  }

  this._visibilityChangeRemoveListener = undefined;
  if (defined(visibilityChangeEventName)) {
    document.addEventListener(
      visibilityChangeEventName,
      visibilityChangeListener,
      false
    );

    this._visibilityChangeRemoveListener = function () {
      document.removeEventListener(
        visibilityChangeEventName,
        visibilityChangeListener,
        false
      );
    };
  }
}

/**
 * The default frame rate monitoring settings.  These settings are used when {@link FrameRateMonitor.fromScene}
 * needs to create a new frame rate monitor, and for any settings that are not passed to the
 * {@link FrameRateMonitor} constructor.
 *
 * @memberof FrameRateMonitor
 * @type {Object}
 */
FrameRateMonitor.defaultSettings = {
  samplingWindow: 5.0,
  quietPeriod: 2.0,
  warmupPeriod: 5.0,
  minimumFrameRateDuringWarmup: 4,
  minimumFrameRateAfterWarmup: 8,
};

/**
 * Gets the {@link FrameRateMonitor} for a given scene.  If the scene does not yet have
 * a {@link FrameRateMonitor}, one is created with the {@link FrameRateMonitor.defaultSettings}.
 *
 * @param {Scene} scene The scene for which to get the {@link FrameRateMonitor}.
 * @returns {FrameRateMonitor} The scene's {@link FrameRateMonitor}.
 */
FrameRateMonitor.fromScene = function (scene) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(scene)) {
    throw new DeveloperError("scene is required.");
  }
  //>>includeEnd('debug');

  if (
    !defined(scene._frameRateMonitor) ||
    scene._frameRateMonitor.isDestroyed()
  ) {
    scene._frameRateMonitor = new FrameRateMonitor({
      scene: scene,
    });
  }

  return scene._frameRateMonitor;
};

Object.defineProperties(FrameRateMonitor.prototype, {
  /**
   * Gets the {@link Scene} instance for which to monitor performance.
   * @memberof FrameRateMonitor.prototype
   * @type {Scene}
   */
  scene: {
    get: function () {
      return this._scene;
    },
  },

  /**
   * Gets the event that is raised when a low frame rate is detected.  The function will be passed
   * the {@link Scene} instance as its first parameter and the average number of frames per second
   * over the sampling window as its second parameter.
   * @memberof FrameRateMonitor.prototype
   * @type {Event}
   */
  lowFrameRate: {
    get: function () {
      return this._lowFrameRate;
    },
  },

  /**
   * Gets the event that is raised when the frame rate returns to a normal level after having been low.
   * The function will be passed the {@link Scene} instance as its first parameter and the average
   * number of frames per second over the sampling window as its second parameter.
   * @memberof FrameRateMonitor.prototype
   * @type {Event}
   */
  nominalFrameRate: {
    get: function () {
      return this._nominalFrameRate;
    },
  },

  /**
   * Gets the most recently computed average frames-per-second over the last <code>samplingWindow</code>.
   * This property may be undefined if the frame rate has not been computed.
   * @memberof FrameRateMonitor.prototype
   * @type {Number}
   */
  lastFramesPerSecond: {
    get: function () {
      return this._lastFramesPerSecond;
    },
  },
});

/**
 * Pauses monitoring of the frame rate.  To resume monitoring, {@link FrameRateMonitor#unpause}
 * must be called once for each time this function is called.
 * @memberof FrameRateMonitor
 */
FrameRateMonitor.prototype.pause = function () {
  ++this._pauseCount;
  if (this._pauseCount === 1) {
    this._frameTimes.length = 0;
    this._lastFramesPerSecond = undefined;
  }
};

/**
 * Resumes monitoring of the frame rate.  If {@link FrameRateMonitor#pause} was called
 * multiple times, this function must be called the same number of times in order to
 * actually resume monitoring.
 * @memberof FrameRateMonitor
 */
FrameRateMonitor.prototype.unpause = function () {
  --this._pauseCount;
  if (this._pauseCount <= 0) {
    this._pauseCount = 0;
    this._needsQuietPeriod = true;
  }
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @memberof FrameRateMonitor
 *
 * @returns {Boolean} True if this object was destroyed; otherwise, false.
 *
 * @see FrameRateMonitor#destroy
 */
FrameRateMonitor.prototype.isDestroyed = function () {
  return false;
};

/**
 * Unsubscribes this instance from all events it is listening to.
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @memberof FrameRateMonitor
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @see FrameRateMonitor#isDestroyed
 */
FrameRateMonitor.prototype.destroy = function () {
  this._preUpdateRemoveListener();

  if (defined(this._visibilityChangeRemoveListener)) {
    this._visibilityChangeRemoveListener();
  }

  return destroyObject(this);
};

function update(monitor, time) {
  if (monitor._pauseCount > 0) {
    return;
  }

  var timeStamp = getTimestamp();

  if (monitor._needsQuietPeriod) {
    monitor._needsQuietPeriod = false;
    monitor._frameTimes.length = 0;
    monitor._quietPeriodEndTime =
      timeStamp + monitor.quietPeriod / TimeConstants.SECONDS_PER_MILLISECOND;
    monitor._warmupPeriodEndTime =
      monitor._quietPeriodEndTime +
      (monitor.warmupPeriod + monitor.samplingWindow) /
        TimeConstants.SECONDS_PER_MILLISECOND;
  } else if (timeStamp >= monitor._quietPeriodEndTime) {
    monitor._frameTimes.push(timeStamp);

    var beginningOfWindow =
      timeStamp -
      monitor.samplingWindow / TimeConstants.SECONDS_PER_MILLISECOND;

    if (
      monitor._frameTimes.length >= 2 &&
      monitor._frameTimes[0] <= beginningOfWindow
    ) {
      while (
        monitor._frameTimes.length >= 2 &&
        monitor._frameTimes[1] < beginningOfWindow
      ) {
        monitor._frameTimes.shift();
      }

      var averageTimeBetweenFrames =
        (timeStamp - monitor._frameTimes[0]) / (monitor._frameTimes.length - 1);

      monitor._lastFramesPerSecond = 1000.0 / averageTimeBetweenFrames;

      var maximumFrameTime =
        1000.0 /
        (timeStamp > monitor._warmupPeriodEndTime
          ? monitor.minimumFrameRateAfterWarmup
          : monitor.minimumFrameRateDuringWarmup);
      if (averageTimeBetweenFrames > maximumFrameTime) {
        if (!monitor._frameRateIsLow) {
          monitor._frameRateIsLow = true;
          monitor._needsQuietPeriod = true;
          monitor.lowFrameRate.raiseEvent(
            monitor.scene,
            monitor._lastFramesPerSecond
          );
        }
      } else if (monitor._frameRateIsLow) {
        monitor._frameRateIsLow = false;
        monitor._needsQuietPeriod = true;
        monitor.nominalFrameRate.raiseEvent(
          monitor.scene,
          monitor._lastFramesPerSecond
        );
      }
    }
  }
}

function visibilityChanged(monitor) {
  if (document[monitor._hiddenPropertyName]) {
    monitor.pause();
  } else {
    monitor.unpause();
  }
}
export default FrameRateMonitor;
