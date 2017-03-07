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

    var CirclePlacer = function(options) {
        this.position = Cartesian3.clone(defaultValue(options.position, Cartesian3.ZERO));
        this.radius = defaultValue(options.radius, 1.0);
    };

    function random(a, b) {
        return CesiumMath.nextRandomNumber() * (b - a) + a;
    }

    CirclePlacer.prototype.place = function(particle) {

        var theta = random(0.0, CesiumMath.TWO_PI);
        var rad = random(0.0, this.radius);

        var x = this.position.x + rad * Math.cos(theta);
        var y = this.position.y + rad * Math.sin(theta);
        var z = this.position.z;

        particle.position = new Cartesian3(x, y, z);
    };

    return CirclePlacer;
});