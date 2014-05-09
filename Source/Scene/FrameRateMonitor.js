/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/getTimestamp',
        '../Core/redirectToUrl'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        Event,
        getTimestamp,
        redirectToUrl) {
    "use strict";

    /**
     * Monitors the frame rate (frames per second) in a {@link Scene} and raises an event if the frame rate is
     * lower than a threshold.  Later, if the frame rate returns to the required level, a separate event is raised.
     * To avoid creating multiple FrameRateMonitors for a single {@link Scene}, use {@link FrameRateMonitor.fromScene}
     * instead of constructing an instance explicitly.
     *
     * @alias FrameRateMonitor
     * @constructor
     *
     * @param {Scene} scene The Scene instance for which to monitor performance.
     * @param {Number} [samplingWindow=5000] The length of the sliding window over which to compute the average frame rate, in milliseconds.
     * @param {Number} [quietPeriod=2000] The length of time to wait at startup and each time the page becomes visible (i.e. when the user
     *        switches back to the tab) before starting to measure performance, in milliseconds.
     * @param {Number} [warmupPeriod=5000] The length of the warmup period, in milliseconds.  During the warmup period, a separate
     *        (usually lower) frame rate is required.
     * @param {Number} [minimumFrameRateDuringWarmup=4] The minimum frames-per-second that are required for acceptable performance during
     *        the warmup period.  If the frame rate averages less than this during any samplingWindow during the warmupPeriod, the
     *        lowFrameRate event will be raised and the page will redirect to the redirectOnLowFrameRateUrl, if any.
     * @param {Number} [minimumFrameRateAfterWarmup=8] The minimum frames-per-second that are required for acceptable performance after
     *        the end of the warmup period.  If the frame rate averages less than this during any samplingWindow after the warmupPeriod, the
     *        lowFrameRate event will be raised and the page will redirect to the redirectOnLowFrameRateUrl, if any.
     */
    var FrameRateMonitor = function(description) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(description) || !defined(description.scene)) {
            throw new DeveloperError('description.scene is required.');
        }
        //>>includeEnd('debug');

        this._scene = description.scene;

        /**
         * Gets or sets the length of the sliding window over which to compute the average frame rate, in milliseconds.
         * @type {Number}
         */
        this.samplingWindow = defaultValue(description.samplingWindow, FrameRateMonitor.defaultSettings.samplingWindow);

        /**
         * Gets or sets the length of time to wait at startup and each time the page becomes visible (i.e. when the user
         * switches back to the tab) before starting to measure performance, in milliseconds.
         * @type {Number}
         */
        this.quietPeriod = defaultValue(description.quietPeriod, FrameRateMonitor.defaultSettings.quietPeriod);

        /**
         * Gets or sets the length of the warmup period, in milliseconds.  During the warmup period, a separate
         * (usually lower) frame rate is required.
         * @type {Number}
         */
        this.warmupPeriod = defaultValue(description.warmupPeriod, FrameRateMonitor.defaultSettings.warmupPeriod);

        /**
         * Gets or sets the minimum frames-per-second that are required for acceptable performance during
         * the warmup period.  If the frame rate averages less than this during any <code>samplingWindow</code> during the <code>warmupPeriod</code>, the
         * <code>lowFrameRate</code> event will be raised and the page will redirect to the <code>redirectOnLowFrameRateUrl</code>, if any.
         * @type {Number}
         */
        this.minimumFrameRateDuringWarmup = defaultValue(description.minimumFrameRateDuringWarmup, FrameRateMonitor.defaultSettings.minimumFrameRateDuringWarmup);

        /**
         * Gets or sets the minimum frames-per-second that are required for acceptable performance after
         * the end of the warmup period.  If the frame rate averages less than this during any <code>samplingWindow</code> after the <code>warmupPeriod</code>, the
         * <code>lowFrameRate</code> event will be raised and the page will redirect to the <code>redirectOnLowFrameRateUrl</code>, if any.
         * @type {Number}
         */
        this.minimumFrameRateAfterWarmup = defaultValue(description.minimumFrameRateAfterWarmup, FrameRateMonitor.defaultSettings.minimumFrameRateAfterWarmup);

        this._lowFrameRate = new Event();
        this._nominalFrameRate = new Event();

        this._frameTimes = [];
        this._needsQuietPeriod = true;
        this._quietPeriodEndTime = 0.0;
        this._warmupPeriodEndTime = 0.0;
        this._frameRateIsLow = false;

        var that = this;
        this._preRenderRemoveListener = this._scene.preRender.addEventListener(function(scene, time) {
            update(that, time);
        });

        this._hiddenPropertyName = defined(document.hidden) ? 'hidden' :
                                   defined(document.mozHidden) ? 'mozHidden' :
                                   defined(document.msHidden) ? 'msHidden' :
                                   defined(document.webkitHidden) ? 'webkitHidden' : 'hiddenNotSupported';

        var visibilityChangeEventName = defined(document.hidden) ? 'visibilitychange' :
            defined(document.mozHidden) ? 'mozvisibilitychange' :
            defined(document.msHidden) ? 'msvisibilitychange' :
            defined(document.webkitHidden) ? 'webkitvisibilitychange' : undefined;

        function visibilityChangeListener() {
            visibilityChanged(that);
        }

        document.addEventListener(visibilityChangeEventName, this._visibilityChangeListener, false);

        this._visibilityChangeRemoveListener = function() {
            document.removeEventListener(visibilityChangeEventName, visibilityChangeListener, false);
        };
    };

    /**
     * The default frame rate monitoring settings.  These settings are used when {@link FrameRateMonitor.fromScene}
     * needs to create a new frame rate monitor, and for any settings that are not passed to the
     * {@link FrameRateMonitor} constructor.
     *
     * @memberof FrameRateMonitor
     */
    FrameRateMonitor.defaultSettings = {
        samplingWindow : 5000,
        quietPeriod : 2000,
        warmupPeriod : 5000,
        minimumFrameRateDuringWarmup : 4,
        minimumFrameRateAfterWarmup : 8
    };

    /**
     * Gets the {@link FrameRateMonitor} for a given scene.  If the scene does not yet have
     * a {@link FrameRateMonitor}, one is created with the {@link FrameRateMonitor.defaultSettings}.
     *
     * @param {Scene} scene The scene for which to get the {@link FrameRateMonitor}.
     * @returns {FrameRateMonitor} The scene's {@link FrameRateMonitor}.
     */
    FrameRateMonitor.fromScene = function(scene) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        if (!defined(scene._frameRateMonitor) || scene._frameRateMonitor.isDestroyed()) {
            scene._frameRateMonitor = new FrameRateMonitor({
                scene : scene
            });
        }

        return scene._frameRateMonitor;
    };

    defineProperties(FrameRateMonitor.prototype, {
        /**
         * Gets the {@link Scene} instance for which to monitor performance.
         * @memberof FrameRateMonitor.prototype
         * @type {Scene}
         */
        scene : {
            get : function() {
                return this._scene;
            }
        },

        /**
         * Gets the event that is raised when a low frame rate is detected.  The function will be passed
         * the {@link Scene} instance as its first parameter and the average number of frames per second
         * over the sampling window as its second parameter.
         * @memberof FrameRateMonitor.prototype
         * @type {Event}
         */
        lowFrameRate : {
            get : function() {
                return this._lowFrameRate;
            }
        },

        /**
         * Gets the event that is raised when the frame rate returns to a normal level after having been low.
         * The function will be passed the {@link Scene} instance as its first parameter and the average
         * number of frames per second over the sampling window as its second parameter.
         * @memberof FrameRateMonitor.prototype
         * @type {Event}
         */
        nominalFrameRate : {
            get : function() {
                return this._nominalFrameRate;
            }
        }
    });

    FrameRateMonitor.prototype.isDestroyed = function() {
        return false;
    };

    FrameRateMonitor.prototype.destroy = function() {
        this._preRenderRemoveListener();
        this._visibilityChangeRemoveListener();

        return destroyObject(this);
    };

    function update(viewModel, time) {
        if (!shouldDoPerformanceTracking(viewModel)) {
            return;
        }

        var timeStamp = getTimestamp();

        if (viewModel._needsQuietPeriod) {
            viewModel._needsQuietPeriod = false;
            viewModel._frameTimes.length = 0;
            viewModel._quietPeriodEndTime = timeStamp + viewModel.quietPeriod;
            viewModel._warmupPeriodEndTime = viewModel._quietPeriodEndTime + viewModel.warmupPeriod + viewModel.samplingWindow;
        } else if (timeStamp >= viewModel._quietPeriodEndTime) {
            viewModel._frameTimes.push(timeStamp);

            var beginningOfWindow = timeStamp - viewModel.samplingWindow;

            if (viewModel._frameTimes.length >= 2 && viewModel._frameTimes[0] <= beginningOfWindow) {
                while (viewModel._frameTimes.length >= 2 && viewModel._frameTimes[1] < beginningOfWindow) {
                    viewModel._frameTimes.shift();
                }

                var averageTimeBetweenFrames = (timeStamp - viewModel._frameTimes[0]) / (viewModel._frameTimes.length - 1);

                var maximumFrameTime = 1000.0 / (timeStamp > viewModel._warmupPeriodEndTime ? viewModel.minimumFrameRateAfterWarmup : viewModel.minimumFrameRateDuringWarmup);
                if (averageTimeBetweenFrames > maximumFrameTime) {
                    if (!viewModel._frameRateIsLow) {
                        viewModel._frameRateIsLow = true;
                        viewModel._needsQuietPeriod = true;
                        viewModel.lowFrameRate.raiseEvent(viewModel.scene, 1000.0 / averageTimeBetweenFrames);
                    }
                } else if (viewModel._frameRateIsLow) {
                    viewModel._frameRateIsLow = false;
                    viewModel._needsQuietPeriod = true;
                    viewModel.nominalFrameRate.raiseEvent(viewModel.scene, 1000.0 / averageTimeBetweenFrames);
                }
            }
        }
    }

    function visibilityChanged(viewModel) {
        if (document[viewModel._hiddenPropertyName]) {
            viewModel._frameTimes.length = 0;
        } else {
            viewModel._needsQuietPeriod = true;
        }
    }

    function shouldDoPerformanceTracking(viewModel) {
        return !viewModel.lowFrameRateMessageDismissed && !document[viewModel._hiddenPropertyName];
    }

    return FrameRateMonitor;
});