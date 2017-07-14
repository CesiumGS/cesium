define([], function() {
    'use strict';
    /**
     * @alias KmlLookAt
     * @constructor
     *
     * @param {Cartesian3} position camera position
     * @param {HeadingPitchRange} headingPitchRange camera orientation
     */
    function KmlLookAt(position, headingPitchRange) {
        this.position = position;
        this.headingPitchRange = headingPitchRange;
    }

    return KmlLookAt;
});
