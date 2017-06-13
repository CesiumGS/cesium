define([
        '../Core/defined',
        '../Core/defaultValue',
        '../Core/Math',
        '../Core/HeadingPitchRange',
        '../Core/Cartesian3',
        '../Core/BoundingSphere'
    ], function(
        defined,
        defaultValue,
        CesiumMath,
        HeadingPitchRange,
        Cartesian3,
        BoundingSphere ) {
    'use strict';

    /**
     * @alias KmlCamera
     * @constructor
     */
    function KmlCamera(feature, options) {

        this._feature = feature;

        this.latitude = defaultValue(options.latitude, 0.0);
        this.longitude = defaultValue(options.longitude, 0.0);
        this.altitude = defaultValue(options.altitude, 0.0);

        this.heading = defaultValue(options.heading, 0.0);
        this.tilt = defaultValue(options.tilt, 0.0);
        this.roll = defaultValue(options.roll, 0);
    }

    KmlCamera.prototype.getViewOptions = function() {
        orientation = {
            heading: CesiumMath.toRadians(this.heading),
            pitch: CesiumMath.toRadians(this.tilt - 90),
            roll: CesiumMath.toRadians(this.roll)
        }

        var dst = Cartesian3.fromDegrees(this.longitude, this.latitude, this.altitude);

        return {
            dstination: dst,
            orientation: orientation
        };
    }

    KmlCamera.prototype.flyToMe = function(viewer, duration) {
        var camera = (viewer && viewer.camera) ? viewer.camera : viewer;
        var options = this.getViewOptions();
        if (defined(duration)) {
            options['duration'] = duration;
        }
        return camera.flyTo(options);
    };

    KmlCamera.prototype.setView = function(viewer) {
        var camera = (viewer && viewer.camera) ? viewer.camera : viewer;
        var options = this.getViewOptions();
        return viewer.setView(options);
    };

    return KmlCamera;

});
