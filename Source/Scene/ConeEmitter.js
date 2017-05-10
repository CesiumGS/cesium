/*global define*/
define([
        '../Core/defaultValue',
        '../Core/Cartesian3',
        '../Core/Math',
        './Particle'
    ], function(
        defaultValue,
        Cartesian3,
        CesiumMath,
        Particle) {
    "use strict";

    function ConeEmitter(options) {
        this.height = defaultValue(options.height, 5.0);
        this.angle = defaultValue(options.angle, CesiumMath.toRadians(30.0));
    };

    function random(a, b) {
        return CesiumMath.nextRandomNumber() * (b - a) + a;
    }

    ConeEmitter.prototype.emit = function() {

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
        var position = new Cartesian3();

        // Also set the velocity vector.
        var velocity = new Cartesian3();
        Cartesian3.normalize(circlePosition, velocity);
        return new Particle({
            position: position,
            velocity: velocity
        });
    };

    return ConeEmitter;
});