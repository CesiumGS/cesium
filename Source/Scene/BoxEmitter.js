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
     * A ParticleEmitter that emits particles within a box.
     * Particles will be positioned randomly within the box and have initial velocities emanating from the center of the box.
     *
     * @alias BoxEmitter
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Number} [options.width=1.0] The width of the box in meters.
     * @param {Number} [options.height=1.0] The height of the box in meters.
     * @param {Number} [options.depth=1.0] The depth of the box in meters.
     */
    function BoxEmitter(options) {
        this.width = defaultValue(options.width, 1.0);
        this.height = defaultValue(options.height, 1.0);
        this.depth = defaultValue(options.depth, 1.0);

        this._halfWidth = this.width / 2.0;
        this._halfHeight = this.height / 2.0;
        this._halfDepth = this.depth / 2.0;
    }

    /**
     * Initializes the given {Particle} by setting it's position and velocity.
     *
     * @private
     * @param {Particle} The particle to initialize
     */
    BoxEmitter.prototype.emit = function(particle) {
        var x = CesiumMath.randomBetween(-this._halfWidth, this._halfWidth);
        var y = CesiumMath.randomBetween(-this._halfDepth, this._halfDepth);
        var z = CesiumMath.randomBetween(-this._halfHeight, this._halfHeight);
        var position = new Cartesian3(x, y, z);

        // Modify the velocity to shoot out from the center
        var velocity = new Cartesian3();
        Cartesian3.normalize(position, velocity);

        particle.position = position;
        particle.velocity = velocity;
    };

    return BoxEmitter;
});