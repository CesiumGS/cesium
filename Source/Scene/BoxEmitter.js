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

    var defaultDimensions = new Cartesian3(1.0, 1.0, 1.0);

    /**
     * A ParticleEmitter that emits particles within a box.
     * Particles will be positioned randomly within the box and have initial velocities emanating from the center of the box.
     * @constructor
     *
     * @param {Cartesian3} dimensions The width, height and depth dimensions of the box.
     */
    function BoxEmitter(dimensions) {
        /**
         * The width, height and depth dimensions of the box in meters.
         * @type {Cartesian3}
         * @default new Cartesian3(1.0, 1.0, 1.0)
         */
        this.dimensions = defaultValue(dimensions, defaultDimensions);
    }

    var scratchHalfDim = new Cartesian3();

    /**
     * Initializes the given {Particle} by setting it's position and velocity.
     *
     * @private
     * @param {Particle} particle The particle to initialize
     */
    BoxEmitter.prototype.emit = function(particle) {
        var dim = this.dimensions;
        var halfDim = Cartesian3.multiplyByScalar(dim, 0.5, scratchHalfDim);

        var x = CesiumMath.randomBetween(-halfDim.x, halfDim.x);
        var y = CesiumMath.randomBetween(-halfDim.y, halfDim.y);
        var z = CesiumMath.randomBetween(-halfDim.z, halfDim.z);

        particle.position = Cartesian3.fromElements(x, y, z, particle.position);
        particle.velocity = Cartesian3.normalize(particle.position, particle.velocity);
    };

    return BoxEmitter;
});
