define([
        '../Core/Cartesian3',
        '../Core/Check',
        '../Core/defaultValue',
        '../Core/defineProperties',
        '../Core/Math'
    ], function(
        Cartesian3,
        Check,
        defaultValue,
        defineProperties,
        CesiumMath) {
    'use strict';

    /**
     * A ParticleEmitter that emits particles within a sphere.
     * Particles will be positioned randomly within the sphere and have initial velocities emanating from the center of the sphere.
     *
     * @alias SphereEmitter
     * @constructor
     *
     * @param {Number} [radius=1.0] The radius of the sphere in meters.
     */
    function SphereEmitter(radius) {
        radius = defaultValue(radius, 1.0);

        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number.greaterThan('radius', radius, 0.0);
        //>>includeEnd('debug');

        this._radius = defaultValue(radius, 1.0);
    }

    defineProperties(SphereEmitter.prototype, {
        /**
         * The radius of the sphere in meters.
         * @memberof SphereEmitter.prototype
         * @type {Number}
         * @default 1.0
         */
        radius : {
            get : function() {
                return this._radius;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.number.greaterThan('value', value, 0.0);
                //>>includeEnd('debug');
                this._radius = value;
            }
        }
    });

    /**
     * Initializes the given {Particle} by setting it's position and velocity.
     *
     * @private
     * @param {Particle} particle The particle to initialize
     */
    SphereEmitter.prototype.emit = function(particle) {
        var theta = CesiumMath.randomBetween(0.0, CesiumMath.TWO_PI);
        var phi = CesiumMath.randomBetween(0.0, CesiumMath.PI);
        var rad = CesiumMath.randomBetween(0.0, this._radius);

        var x = rad * Math.cos(theta) * Math.sin(phi);
        var y = rad * Math.sin(theta) * Math.sin(phi);
        var z = rad * Math.cos(phi);

        particle.position = Cartesian3.fromElements(x, y, z, particle.position);
        particle.velocity = Cartesian3.normalize(particle.position, particle.velocity);
    };

    return SphereEmitter;
});
