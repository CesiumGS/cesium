/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defineProperties',
        '../Core/Cartesian3',
        '../Core/Check',
        '../Core/Math',
        './Particle'
    ], function(
        defaultValue,
        defineProperties,
        Cartesian3,
        Check,
        CesiumMath,
        Particle) {
    "use strict";

    /**
     * A ParticleEmitter that emits particles within a cone.
     * Particles will be positioned at the tip of the cone and have initial velocities going towards the base.
     * @constructor
     *
     * @param {Number} [height=5.0] The height of the cone in meters.
     * @param {Number} [angle=Cesium.Math.toRadians(30.0)] The angle of the cone in radians.
     */
    function ConeEmitter(height, angle) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number.greaterThan('height', height, 0.0);
        //>>includeEnd('debug');
        /**
         * The angle of the cone in radians.
         * @type {Number}
         * @default Cesium.Math.toRadians(30.0)
         */
        this.angle = defaultValue(angle, CesiumMath.toRadians(30.0));
        this._height = defaultValue(height, 5.0);
    }

    defineProperties(ConeEmitter.prototype, {
        /**
         * The height of the cone in meters.
         * @memberof ConeEmitter.prototype
         * @type {Number}
         * @default 1.0
         */
        height : {
            get : function() {
                return this._height;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.number.greaterThan('value', value, 0.0);
                //>>includeEnd('debug');
                this._height = value;
            }
        }
    });

    /**
     * Initializes the given {Particle} by setting it's position and velocity.
     *
     * @private
     * @param {Particle} particle The particle to initialize
     */
    ConeEmitter.prototype.emit = function(particle) {
        var height = this._height;
        var radius = height * Math.tan(this.angle);

        // Compute a random point on the cone's base
        var theta = CesiumMath.randomBetween(0.0, CesiumMath.TWO_PI);
        var rad = CesiumMath.randomBetween(0.0, radius);

        var x = rad * Math.cos(theta);
        var y = rad * Math.sin(theta);
        var z = height;

        particle.velocity = Cartesian3.fromElements(x, y, z, particle.velocity);
        Cartesian3.normalize(particle.velocity, particle.velocity);
        particle.position = Cartesian3.clone(Cartesian3.ZERO, particle.position);
    };

    return ConeEmitter;
});
