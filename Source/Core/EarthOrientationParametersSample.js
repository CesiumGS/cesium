/*global define*/
define([
    ],
    function(
        ) {
    "use strict";

    var EarthOrientationParametersSample = function EarthOrientationParametersSample(xPoleWander, yPoleWander, xPoleOffset, yPoleOffset, ut1MinusUtc) {
        this.xPoleWander = xPoleWander;
        this.yPoleWander = yPoleWander;
        this.xPoleOffset = xPoleOffset;
        this.yPoleOffset = yPoleOffset;
        this.ut1MinusUtc = ut1MinusUtc;
    };

    return EarthOrientationParametersSample;
});