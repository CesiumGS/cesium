/*global define*/
define([
        '../Core/defaultValue',
        '../Core/Cartesian3',
        '../Core/Math'
    ], function(
        defaultValue,
        Cartesian3,
        CesiumMath) {
    "use strict";

    var SpherePlacer = function(options) {
        this.position = Cartesian3.clone(defaultValue(options.position, Cartesian3.ZERO));
        this.radius = defaultValue(options.radius, 1.0);
    };

    function random(a, b) {
        return CesiumMath.nextRandomNumber() * (b - a) + a;
    }

    SpherePlacer.prototype.place = function(particle) {

        var theta = random(0.0, CesiumMath.TWO_PI);
        var phi = random(0.0, CesiumMath.PI);

        var x = this.radius * Math.cos(theta) * Math.sin(phi);
        var y = this.radius * Math.sin(theta) * Math.sin(phi);
        var z = this.radius * Math.cos(phi);

        particle.position = new Cartesian3(x, y, z);
    };

    return SpherePlacer;
});