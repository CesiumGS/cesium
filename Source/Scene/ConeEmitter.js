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

    var ConePlacer = function(options) {
        this.height = defaultValue(options.height, 5.0);
        this.angle = defaultValue(options.angle, CesiumMath.toRadians(30.0));
    };

    function random(a, b) {
        return CesiumMath.nextRandomNumber() * (b - a) + a;
    }

    ConePlacer.prototype.emit = function(particle) {

        var radius = this.height * Math.tan(this.angle);

        // Compute a random point on the cone's base
        var theta = random(0.0, CesiumMath.TWO_PI);
        var rad = random(0.0, radius);

        var x = rad * Math.cos(theta);
        var y = rad * Math.sin(theta);
        var z = this.height;

        var circlePosition = new Cartesian3(x, y, z);

        //particle.position = circlePosition;
        // Position the point at the tip.
        particle.position = new Cartesian3();

        // Also set the velocity vector.
        var velocity = new Cartesian3();
        Cartesian3.normalize(circlePosition, velocity);
        particle.velocity = velocity;
    };

    return ConePlacer;
});