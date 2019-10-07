import Cartesian3 from '../Core/Cartesian3.js';
import Check from '../Core/Check.js';
import defaultValue from '../Core/defaultValue.js';
import defineProperties from '../Core/defineProperties.js';
import CesiumMath from '../Core/Math.js';

    var defaultAngle = CesiumMath.toRadians(30.0);

    /**
     * A ParticleEmitter that emits particles within a cone.
     * Particles will be positioned at the tip of the cone and have initial velocities going towards the base.
     *
     * @alias ConeEmitter
     * @constructor
     *
     * @param {Number} [angle=Cesium.Math.toRadians(30.0)] The angle of the cone in radians.
     */
    function ConeEmitter(angle) {
        this._angle = defaultValue(angle, defaultAngle);
    }

    defineProperties(ConeEmitter.prototype, {
        /**
         * The angle of the cone in radians.
         * @memberof CircleEmitter.prototype
         * @type {Number}
         * @default Cesium.Math.toRadians(30.0)
         */
        angle : {
            get : function() {
                return this._angle;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.number('value', value);
                //>>includeEnd('debug');
                this._angle = value;
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
        var radius = Math.tan(this._angle);

        // Compute a random point on the cone's base
        var theta = CesiumMath.randomBetween(0.0, CesiumMath.TWO_PI);
        var rad = CesiumMath.randomBetween(0.0, radius);

        var x = rad * Math.cos(theta);
        var y = rad * Math.sin(theta);
        var z = 1.0;

        particle.velocity = Cartesian3.fromElements(x, y, z, particle.velocity);
        Cartesian3.normalize(particle.velocity, particle.velocity);
        particle.position = Cartesian3.clone(Cartesian3.ZERO, particle.position);
    };
export default ConeEmitter;
