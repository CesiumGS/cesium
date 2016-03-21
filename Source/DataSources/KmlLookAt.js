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
     * @alias KmlLookAt
     * @constructor
     */
    function KmlLookAt(feature, options) {

        this._feature = feature;

        this.latitude = defaultValue(options.latitude, 0.0);
        this.longitude = defaultValue(options.longitude, 0.0);
        this.altitude = defaultValue(options.altitude, 0.0);

        this.heading = defaultValue(options.heading, 0.0);
        this.tilt = defaultValue(options.tilt, 0.0);
        this.range = defaultValue(options.range, 0);
    }

    KmlLookAt.prototype.flyToMe = function(viewer) {
        var camera = (viewer && viewer.camera) ? viewer.camera : viewer;
        var heading = CesiumMath.toRadians(this.heading);
        var pitch = CesiumMath.toRadians(this.tilt - 90);
        var range = this.range;
        var origin = Cartesian3.fromDegrees(this.longitude, this.latitude, this.altitude);
        return camera.flyToBoundingSphere(new BoundingSphere(origin, 0.0), {
              offset: new HeadingPitchRange(heading, pitch, range)
        });
    };

    KmlLookAt.prototype.zoomToMe = function(viewer) {
      if(viewer && viewer.zoomTo) {
        var heading = CesiumMath.toRadians(this.heading);
        var pitch = CesiumMath.toRadians(this.tilt - 90.0);
        var hpr = new HeadingPitchRange(heading, pitch, this.range);
        return viewer.zoomTo(this._feature, {
            offset: hpr
        });
      }
    };

    return KmlLookAt;

});
