/*global define*/
define([
        './defaultValue',
        './defined',
        './defineProperties',
        './destroyObject',
        './DeveloperError',
        './Event',
        './Iso8601',
        './JulianDate'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        Event,
        Iso8601,
        JulianDate) {
    "use strict";

    /**
     * Synchronizes a video element with a simulation clock.
     *
     * @alias VideoSynchronizer
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Clock} [options.clock] The clock instance used to drive the video.
     * @param {HTMLVideoElement} [options.element] The video element to be synchronized.
     * @param {JulianDate} [options.epoch=Iso8601.MINIMUM_VALUE] The simulation time that marks the start of the video.
     * @param {Number} [options.tolerance=1.0] The maximum amount of time, in seconds, that the clock and video can diverge.
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Video.html|Video Material Demo}
     */
    var VideoSynchronizer = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._clock = undefined;
        this._element = undefined;
        this._clockSubscription = undefined;
        this._seekFunction = undefined;

        this.clock = options.clock;
        this.element = options.element;

        /**
         * Gets or sets the simulation time that marks the start of the video.
         * @type {JulianDate}
         * @default Iso8601.MINIMUM_VALUE
         */
        this.epoch = defaultValue(options.epoch, Iso8601.MINIMUM_VALUE);

        /**
         * Gets or sets the amount of time in seconds the video's currentTime
         * and the clock's currentTime can diverge before a video seek is performed.
         * Lower values make the synchronization more accurate but video
         * performance might suffer.  Higher values provide better performance
         * but at the cost of accuracy.
         * @type {Number}
         * @default 1.0
         */
        this.tolerance = defaultValue(options.tolerance, 1.0);

        this._seeking = false;
        this._seekFunction = undefined;
        this._firstTickAfterSeek = false;
    };

    defineProperties(VideoSynchronizer.prototype, {
        /**
         * Gets or sets the clock used to drive the video element.
         *
         * @memberof VideoSynchronizer.prototype
         * @type {Clock}
         */
        clock : {
            get : function() {
                return this._clock;
            },
            set : function(value) {
                var oldValue = this._clock;

                if (oldValue === value) {
                    return;
                }

                if (defined(oldValue)) {
                    this._clockSubscription();
                    this._clockSubscription = undefined;
                }

                if (defined(value)) {
                    this._clockSubscription = value.onTick.addEventListener(VideoSynchronizer.prototype._onTick, this);
                }

                this._clock = value;
            }
        },
        /**
         * Gets or sets the video element to synchronize.
         *
         * @memberof VideoSynchronizer.prototype
         * @type {HTMLVideoElement}
         */
        element : {
            get : function() {
                return this._element;
            },
            set : function(value) {
                var oldValue = this._element;

                if (oldValue === value) {
                    return;
                }

                if (defined(oldValue)) {
                    oldValue.removeEventListener("seeked", this._seekFunction, false);
                }

                if (defined(value)) {
                    this._seeking = false;
                    this._seekFunction = createSeekFunction(this);
                    value.addEventListener("seeked", this._seekFunction, false);
                }

                this._element = value;
                this._seeking = false;
                this._firstTickAfterSeek = false;
            }
        }
    });

    /**
     * Destroys and resources used by the object.  Once an object is destroyed, it should not be used.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    VideoSynchronizer.prototype.destroy = function() {
        this.element = undefined;
        this.clock = undefined;
        return destroyObject(this);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    VideoSynchronizer.prototype.isDestroyed = function() {
        return false;
    };

    VideoSynchronizer.prototype._onTick = function(clock) {
        var element = this._element;
        if (!defined(element) || element.readyState < 2) {
            return;
        }

        var paused = element.paused;
        var shouldAnimate = clock.shouldAnimate;
        if (shouldAnimate === paused) {
            if (shouldAnimate) {
                element.play();
            } else {
                element.pause();
            }
        }

        //We need to avoid constant seeking or the video will
        //never contain a complete frame for us to render.
        //So don't do anything if we're seeing or on the first
        //tick after a seek (the latter of which allows the frame
        //to actually be rendered.
        if (this._seeking || this._firstTickAfterSeek) {
            this._firstTickAfterSeek = false;
            return;
        }

        element.playbackRate = clock.multiplier;

        var clockTime = clock.currentTime;
        var epoch = defaultValue(this.epoch, Iso8601.MINIMUM_VALUE);
        var videoTime = JulianDate.secondsDifference(clockTime, epoch);

        var duration = element.duration;
        var desiredTime;
        var currentTime = element.currentTime;
        if (element.loop) {
            videoTime = videoTime % duration;
            if (videoTime < 0.0) {
                videoTime = duration - videoTime;
            }
            desiredTime = videoTime;
        } else if (videoTime > duration) {
            desiredTime = duration;
        } else if (videoTime < 0.0) {
            desiredTime = 0.0;
        } else {
            desiredTime = videoTime;
        }

        //If the playing video's time and the scene's clock time
        //ever drift too far apart, we want to set the video to match
        var tolerance = shouldAnimate ? defaultValue(this.tolerance, 1.0) : 0.001;
        if (Math.abs(desiredTime - currentTime) > tolerance) {
            this._seeking = true;
            element.currentTime = desiredTime;
        }
    };

    function createSeekFunction(that) {
        return function() {
            that._seeking = false;
            that._firstTickAfterSeek = true;
        };
    }

    return VideoSynchronizer;
});
