define([
        '../Core/BoundingSphere',
        '../Core/combine',
        '../Core/defined',
        '../Core/EasingFunction'
    ], function(
        BoundingSphere,
        combine,
        defined,
        EasingFunction) {
    'use strict';
    /**
     * @alias KmlTourFlyTo
     * @constructor
     *
     * @param {Number} duration entry duration
     * @param {String} flyToMode KML fly to mode: bounce, smooth, etc
     * @param {KmlCamera|KmlLookAt} view KmlCamera or KmlLookAt
     */
    function KmlTourFlyTo(duration, flyToMode, view) {
        this.type = 'KmlTourFlyTo';
        this.blocking = true;
        this.activeCamera = null;
        this.activeCallback = null;

        this.duration = duration;
        this.view = view;
        this.flyToMode = flyToMode;
    }

    /**
     * Play this playlist entry
     *
     * @param {KmlTourFlyTo~DoneCallback} done function which will be called when playback ends
     * @param {Camera} camera Cesium camera
     * @param {Object} [cameraOptions] which will be merged with camera flyTo options. See {@link Camera#flyTo}
     */
    KmlTourFlyTo.prototype.play = function(done, camera, cameraOptions) {
        this.activeCamera = camera;
        if (defined(done) && done !== null) {
            var self = this;
            this.activeCallback = function(terminated) {
                delete self.activeCallback;
                delete self.activeCamera;
                done(defined(terminated) ? false : terminated);
            };
        }

        var options = this.getCameraOptions(cameraOptions);
        if (this.view.headingPitchRoll) {
            camera.flyTo(options);
        }
        else if (this.view.headingPitchRange) {
            var target = new BoundingSphere(this.view.position);
            camera.flyToBoundingSphere(target, options);
        }
    };

    /**
     * Stop execution of curent entry. Cancel camera flyTo
     */
    KmlTourFlyTo.prototype.stop = function() {
        if (defined(this.activeCamera)) {
            this.activeCamera.cancelFlight();
        }
        if (defined(this.activeCallback)) {
            this.activeCallback(true);
        }
    };

    /**
     * Returns options for {@link Camera#flyTo} or {@link Camera#flyToBoundingSphere}
     * depends on this.view type.
     *
     * @param {Object} cameraOptions options to merge with generated. See {@link Camera#flyTo}
     * @returns {Object} {@link Camera#flyTo} or {@link Camera#flyToBoundingSphere} options
     */
    KmlTourFlyTo.prototype.getCameraOptions = function(cameraOptions) {
        var options = {
            duration: this.duration
        };

        if (defined(this.activeCallback)) {
            options.complete = this.activeCallback;
        }

        if (this.flyToMode === 'smooth' ) {
            options.easingFunction = EasingFunction.LINEAR_NONE;
        }

        if (this.view.headingPitchRoll) {
            options.destination = this.view.position;
            options.orientation = this.view.headingPitchRoll;
        }
        else if (this.view.headingPitchRange) {
            options.offset = this.view.headingPitchRange;
        }

        if (defined(cameraOptions)) {
            options = combine(options, cameraOptions);
        }
        return options;
    };

    /**
     * A function that will be executed when the flight completes.
     * @callback KmlTourFlyTo~DoneCallback
     *
     * @param {Boolean} terminated true if {@link KmlTourFlyTo#stop} was
     * called before entry done playback.
     */

    return KmlTourFlyTo;
});
