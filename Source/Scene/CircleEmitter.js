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

    function CircleEmitter(options) {
        this.radius = defaultValue(options.radius, 1.0);
    }

    CircleEmitter.prototype.emit = function(particle) {
        var theta = CesiumMath.randomBetween(0.0, CesiumMath.TWO_PI);
        var rad = CesiumMath.randomBetween(0.0, this.radius);

        var x = rad * Math.cos(theta);
        var y = rad * Math.sin(theta);
        var z = 0.0;

        var position = new Cartesian3(x, y, z);

        // Set the velocity to shoot up
        var velocity = Cartesian3.clone(Cartesian3.UNIT_Z);
        particle.position = position;
        particle.velocity = velocity;
    };

    return CircleEmitter;
});