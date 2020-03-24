import Cartesian3 from '../Core/Cartesian3.js';
import Check from '../Core/Check.js';
import defaultValue from '../Core/defaultValue.js';
import CesiumMath from '../Core/Math.js';

    /**
     * A ParticleEmitter that emits particles from a circle.
     * Particles will be positioned within a circle and have initial velocities going along the z vector.
     *
     * @alias CircleEmitter
     * @constructor
     *
     * @param {Number} [radius=1.0] The radius of the circle in meters.
     */
    function CircleEmitter(radius) {
        radius = defaultValue(radius, 1.0);

        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number.greaterThan('radius', radius, 0.0);
        //>>includeEnd('debug');

        this._radius = defaultValue(radius, 1.0);
    }

    Object.defineProperties(CircleEmitter.prototype, {
        /**
         * The radius of the circle in meters.
         * @memberof CircleEmitter.prototype
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
     * Initializes the given {@link Particle} by setting it's position and velocity.
     *
     * @private
     * @param {Particle} particle The particle to initialize.
     */
    CircleEmitter.prototype.emit = function(particle) {
        var theta = CesiumMath.randomBetween(0.0, CesiumMath.TWO_PI);
        var rad = CesiumMath.randomBetween(0.0, this._radius);

        var x = rad * Math.cos(theta);
        var y = rad * Math.sin(theta);
        var z = 0.0;

        particle.position = Cartesian3.fromElements(x, y, z, particle.position);
        particle.velocity = Cartesian3.clone(Cartesian3.UNIT_Z, particle.velocity);
    };
export default CircleEmitter;
