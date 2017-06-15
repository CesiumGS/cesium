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
     * A ParticleEmitter that emits particles within a sphere.
     * Particles will be positioned randomly within the sphere and have initial velocities emanating from the center of the sphere.
     * @constructor
     *
     * @param {Number} [radius=1.0] The radius of the sphere in meters.
     */
    function SphereEmitter(radius) {
        /**
         * The radius of the sphere in meters.
         * @type {Number}
         * @default 1.0
         */
        this.radius = defaultValue(radius, 1.0);
    }

    /**
     * Initializes the given {Particle} by setting it's position and velocity.
     *
     * @private
     * @param {Particle} particle The particle to initialize
     */
    SphereEmitter.prototype.emit = function(particle) {
        var theta = CesiumMath.randomBetween(0.0, CesiumMath.TWO_PI);
        var phi = CesiumMath.randomBetween(0.0, CesiumMath.PI);
        var rad = CesiumMath.randomBetween(0.0, this.radius);

        var x = rad * Math.cos(theta) * Math.sin(phi);
        var y = rad * Math.sin(theta) * Math.sin(phi);
        var z = rad * Math.cos(phi);

        particle.position = Cartesian3.fromElements(x, y, z, particle.position);
        particle.velocity = Cartesian3.normalize(particle.position, particle.velocity);
    };

    return SphereEmitter;
});
