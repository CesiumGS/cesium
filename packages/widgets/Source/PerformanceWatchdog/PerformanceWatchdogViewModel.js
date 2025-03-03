import {
  defined,
  destroyObject,
  DeveloperError,
  FrameRateMonitor,
} from "@cesium/engine";
import knockout from "../ThirdParty/knockout.js";
import createCommand from "../createCommand.js";

/**
 * The view model for {@link PerformanceWatchdog}.
 *
 * @alias PerformanceWatchdogViewModel
 * @constructor
 *
 * @param {object} [options] Object with the following properties:
 * @param {Scene} options.scene The Scene instance for which to monitor performance.
 * @param {string} [options.lowFrameRateMessage='This application appears to be performing poorly on your system.  Please try using a different web browser or updating your video drivers.'] The
 *        message to display when a low frame rate is detected.  The message is interpeted as HTML, so make sure
 *        it comes from a trusted source so that your application is not vulnerable to cross-site scripting attacks.
 */
function PerformanceWatchdogViewModel(options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(options) || !defined(options.scene)) {
    throw new DeveloperError("options.scene is required.");
  }
  //>>includeEnd('debug');

  this._scene = options.scene;

  /**
   * Gets or sets the message to display when a low frame rate is detected.  This string will be interpreted as HTML.
   * @type {string}
   */
  this.lowFrameRateMessage =
    options.lowFrameRateMessage ??
    "This application appears to be performing poorly on your system.  Please try using a different web browser or updating your video drivers.";

  /**
   * Gets or sets a value indicating whether the low frame rate message has previously been dismissed by the user.  If it has
   * been dismissed, the message will not be redisplayed, no matter the frame rate.
   * @type {boolean}
   */
  this.lowFrameRateMessageDismissed = false;

  /**
   * Gets or sets a value indicating whether the low frame rate message is currently being displayed.
   * @type {boolean}
   */
  this.showingLowFrameRateMessage = false;

  knockout.track(this, [
    "lowFrameRateMessage",
    "lowFrameRateMessageDismissed",
    "showingLowFrameRateMessage",
  ]);

  const that = this;
  this._dismissMessage = createCommand(function () {
    that.showingLowFrameRateMessage = false;
    that.lowFrameRateMessageDismissed = true;
  });

  const monitor = FrameRateMonitor.fromScene(options.scene);

  this._unsubscribeLowFrameRate = monitor.lowFrameRate.addEventListener(
    function () {
      if (!that.lowFrameRateMessageDismissed) {
        that.showingLowFrameRateMessage = true;
      }
    },
  );

  this._unsubscribeNominalFrameRate = monitor.nominalFrameRate.addEventListener(
    function () {
      that.showingLowFrameRateMessage = false;
    },
  );
}

Object.defineProperties(PerformanceWatchdogViewModel.prototype, {
  /**
   * Gets the {@link Scene} instance for which to monitor performance.
   * @memberof PerformanceWatchdogViewModel.prototype
   * @type {Scene}
   */
  scene: {
    get: function () {
      return this._scene;
    },
  },

  /**
   * Gets a command that dismisses the low frame rate message.  Once it is dismissed, the message
   * will not be redisplayed.
   * @memberof PerformanceWatchdogViewModel.prototype
   * @type {Command}
   */
  dismissMessage: {
    get: function () {
      return this._dismissMessage;
    },
  },
});

PerformanceWatchdogViewModel.prototype.destroy = function () {
  this._unsubscribeLowFrameRate();
  this._unsubscribeNominalFrameRate();

  return destroyObject(this);
};
export default PerformanceWatchdogViewModel;
