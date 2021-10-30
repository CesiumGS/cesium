import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import PerformanceWatchdog from "../PerformanceWatchdog/PerformanceWatchdog.js";

/**
 * A mixin which adds the {@link PerformanceWatchdog} widget to the {@link Viewer} widget.
 * Rather than being called directly, this function is normally passed as
 * a parameter to {@link Viewer#extend}, as shown in the example below.
 * @function
 *
 * @param {Viewer} viewer The viewer instance.
 * @param {Object} [options] An object with properties.
 * @param {String} [options.lowFrameRateMessage='This application appears to be performing poorly on your system.  Please try using a different web browser or updating your video drivers.'] The
 *        message to display when a low frame rate is detected.  The message is interpeted as HTML, so make sure
 *        it comes from a trusted source so that your application is not vulnerable to cross-site scripting attacks.
 *
 * @exception {DeveloperError} viewer is required.
 *
 * @example
 * var viewer = new Cesium.Viewer('cesiumContainer');
 * viewer.extend(Cesium.viewerPerformanceWatchdogMixin, {
 *     lowFrameRateMessage : 'Why is this going so <em>slowly</em>?'
 * });
 */
function viewerPerformanceWatchdogMixin(viewer, options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(viewer)) {
    throw new DeveloperError("viewer is required.");
  }
  //>>includeEnd('debug');

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  var performanceWatchdog = new PerformanceWatchdog({
    scene: viewer.scene,
    container: viewer.bottomContainer,
    lowFrameRateMessage: options.lowFrameRateMessage,
  });

  Object.defineProperties(viewer, {
    performanceWatchdog: {
      get: function () {
        return performanceWatchdog;
      },
    },
  });
}
export default viewerPerformanceWatchdogMixin;
