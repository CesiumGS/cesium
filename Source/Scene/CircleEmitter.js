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

    /**
     * A ParticleEmitter that emits particles from a circle.
     * Particles will be positioned within a circle and have initial velocities going along the z vector.
     *
     * @alias CircleEmitter
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Number} [options.radius=1.0] The radius of the circle in meters.
     */
    function CircleEmitter(options) {
        this.radius = defaultValue(options.radius, 1.0);
    }

    /**
     * Initializes the given {Particle} by setting it's position and velocity.
     *
     * @private
     * @param {Particle} The particle to initialize
     */
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