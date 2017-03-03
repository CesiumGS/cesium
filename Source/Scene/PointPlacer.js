/*global define*/
define([
        '../Core/defaultValue',
        '../Core/Cartesian3',
    ], function(
        defaultValue,
        Cartesian3) {
    "use strict";

    var PointPlacer = function(options) {
        this.position = Cartesian3.clone(defaultValue(options.position, Cartesian3.ZERO));
    };

    PointPlacer.prototype.place = function(particle) {
        particle.position = Cartesian3.clone(this.position);
    };

    return PointPlacer;
});