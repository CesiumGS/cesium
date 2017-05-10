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
     * A ParticleEmitter that emits particles within a cone.
     * Particles will be positioned at the tip of the cone and have initial velocities going towards the base.
     *
     * @alias ConeEmitter
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Number} [options.height=5.0] The height of the cone in meters.
     * @param {Number} [options.angle=CesiumMath.toRadians(30.0)] The angle of the cone in radians.
     */
    function ConeEmitter(options) {
        this.height = defaultValue(options.height, 5.0);
        this.angle = defaultValue(options.angle, CesiumMath.toRadians(30.0));
    }

    /**
     * Initializes the given {Particle} by setting it's position and velocity.
     *
     * @private
     * @param {Particle} The particle to initialize
     */
    ConeEmitter.prototype.emit = function(particle) {
        var radius = this.height * Math.tan(this.angle);

        // Compute a random point on the cone's base
        var theta = CesiumMath.randomBetween(0.0, CesiumMath.TWO_PI);
        var rad = CesiumMath.randomBetween(0.0, radius);

        var x = rad * Math.cos(theta);
        var y = rad * Math.sin(theta);
        var z = this.height;

        var circlePosition = new Cartesian3(x, y, z);

        // Position the particle at the tip.
        var position = new Cartesian3();

        // Also set the velocity vector.
        var velocity = new Cartesian3();
        Cartesian3.normalize(circlePosition, velocity);

        particle.position = position;
        particle.velocity = velocity;
    };

    return ConeEmitter;
});