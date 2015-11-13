/*global define*/
define([
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../PerformanceWatchdog/PerformanceWatchdog'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        PerformanceWatchdog) {
    "use strict";

    /**
     * A mixin which adds the {@link PerformanceWatchdog} widget to the {@link Viewer} widget.
     * Rather than being called directly, this function is normally passed as
     * a parameter to {@link Viewer#extend}, as shown in the example below.
     * @exports viewerPerformanceWatchdogMixin
     *
     * @param {Viewer} viewer The viewer instance.
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
    var viewerPerformanceWatchdogMixin = function(viewer, options) {
        if (!defined(viewer)) {
            throw new DeveloperError('viewer is required.');
        }

        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var performanceWatchdog = new PerformanceWatchdog({
            scene : viewer.scene,
            container : viewer.bottomContainer,
            lowFrameRateMessage : options.lowFrameRateMessage
        });

        defineProperties(viewer, {
            performanceWatchdog : {
                get : function() {
                    return performanceWatchdog;
                }
            }
        });
    };

    return viewerPerformanceWatchdogMixin;
});
