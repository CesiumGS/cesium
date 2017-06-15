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
     * @constructor
     *
     * @param {Number} [radius=1.0] The radius of the circle in meters.
     */
    function CircleEmitter(radius) {
        /**
         * The radius of the circle in meters.
         * @type {Number}
         * @default 1.0
         */
        this.radius = defaultValue(radius, 1.0);
    }

    /**
     * Initializes the given {@link Particle} by setting it's position and velocity.
     *
     * @private
     * @param {Particle} particle The particle to initialize.
     */
    CircleEmitter.prototype.emit = function(particle) {
        var theta = CesiumMath.randomBetween(0.0, CesiumMath.TWO_PI);
        var rad = CesiumMath.randomBetween(0.0, this.radius);

        var x = rad * Math.cos(theta);
        var y = rad * Math.sin(theta);
        var z = 0.0;

        particle.position = Cartesian3.fromElements(x, y, z, particle.position);
        particle.velocity = Cartesian3.clone(Cartesian3.UNIT_Z, particle.velocity);
    };

    return CircleEmitter;
});
