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

    var SphereEmitter = function(options) {
        this.radius = defaultValue(options.radius, 1.0);
    };

    function random(a, b) {
        return CesiumMath.nextRandomNumber() * (b - a) + a;
    }

    SphereEmitter.prototype.emit = function() {

        var theta = random(0.0, CesiumMath.TWO_PI);
        var phi = random(0.0, CesiumMath.PI);

        var rad = random(0.0, this.radius);

        var x = rad * Math.cos(theta) * Math.sin(phi);
        var y = rad * Math.sin(theta) * Math.sin(phi);
        var z = rad * Math.cos(phi);

        var position = new Cartesian3(x, y, z);

         // Modify the velocity to shoot out from the center
        var velocity = new Cartesian3();
        Cartesian3.subtract(position, this.position, velocity);
        Cartesian3.normalize(velocity, velocity);

        return new Particle({
            position: position,
            velocity: velocity
        });
    };

    return SphereEmitter;
});