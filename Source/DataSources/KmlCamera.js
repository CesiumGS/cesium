define([], function() {
    'use strict';
    /**
     * Representation of <Camera> from KML
     * @alias KmlCamera
     * @constructor
     *
     * @param {Cartesian3} position camera position
     * @param {HeadingPitchRoll} headingPitchRoll camera orientation
     */
    function KmlCamera(position, headingPitchRoll) {
        this.position = position;
        this.headingPitchRoll = headingPitchRoll;
    }

    return KmlCamera;
});
