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

    function SphereEmitter(options) {
        this.radius = defaultValue(options.radius, 1.0);
    }

    SphereEmitter.prototype.emit = function(particle) {
        var theta = CesiumMath.randomBetween(0.0, CesiumMath.TWO_PI);
        var phi = CesiumMath.randomBetween(0.0, CesiumMath.PI);
        var rad = CesiumMath.randomBetween(0.0, this.radius);

        var x = rad * Math.cos(theta) * Math.sin(phi);
        var y = rad * Math.sin(theta) * Math.sin(phi);
        var z = rad * Math.cos(phi);

        var position = new Cartesian3(x, y, z);

         // Modify the velocity to shoot out from the center
        var velocity = new Cartesian3();
        Cartesian3.normalize(position, velocity);

        particle.position = position;
        particle.velocity = velocity;
    };

    return SphereEmitter;
});