import Cartesian2 from '../Core/Cartesian2.js';
import Cartesian3 from '../Core/Cartesian3.js';
import Color from '../Core/Color.js';
import defaultValue from '../Core/defaultValue.js';
import defined from '../Core/defined.js';
import defineProperties from '../Core/defineProperties.js';

    var defaultSize = new Cartesian2(1.0, 1.0);

    /**
     * A particle emitted by a {@link ParticleSystem}.
     *
     * @alias Particle
     * @constructor
     *
     * @param {Object} options An object with the following properties:
     * @param {Number} [options.mass=1.0] The mass of the particle in kilograms.
     * @param {Cartesian3} [options.position=Cartesian3.ZERO] The initial position of the particle in world coordinates.
     * @param {Cartesian3} [options.velocity=Cartesian3.ZERO] The velocity vector of the particle in world coordinates.
     * @param {Number} [options.life=Number.MAX_VALUE] The life of the particle in seconds.
     * @param {Object} [options.image] The URI, HTMLImageElement, or HTMLCanvasElement to use for the billboard.
     * @param {Color} [options.startColor=Color.WHITE] The color of a particle when it is born.
     * @param {Color} [options.endColor=Color.WHITE] The color of a particle when it dies.
     * @param {Number} [options.startScale=1.0] The scale of the particle when it is born.
     * @param {Number} [options.endScale=1.0] The scale of the particle when it dies.
     * @param {Cartesian2} [options.imageSize=new Cartesian2(1.0, 1.0)] The dimensions, width by height, to scale the particle image in pixels.
     */
    function Particle(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * The mass of the particle in kilograms.
         * @type {Number}
         * @default 1.0
         */
        this.mass = defaultValue(options.mass, 1.0);
        /**
         * The positon of the particle in world coordinates.
         * @type {Cartesian3}
         * @default Cartesian3.ZERO
         */
        this.position = Cartesian3.clone(defaultValue(options.position, Cartesian3.ZERO));
        /**
         * The velocity of the particle in world coordinates.
         * @type {Cartesian3}
         * @default Cartesian3.ZERO
         */
        this.velocity = Cartesian3.clone(defaultValue(options.velocity, Cartesian3.ZERO));
        /**
         * The life of the particle in seconds.
         * @type {Number}
         * @default Number.MAX_VALUE
         */
        this.life = defaultValue(options.life, Number.MAX_VALUE);
        /**
         * The image to use for the particle.
         * @type {Object}
         * @default undefined
         */
        this.image = options.image;
        /**
         * The color of the particle when it is born.
         * @type {Color}
         * @default Color.WHITE
         */
        this.startColor = Color.clone(defaultValue(options.startColor, Color.WHITE));
        /**
         * The color of the particle when it dies.
         * @type {Color}
         * @default Color.WHITE
         */
        this.endColor = Color.clone(defaultValue(options.endColor, Color.WHITE));
        /**
         * the scale of the particle when it is born.
         * @type {Number}
         * @default 1.0
         */
        this.startScale = defaultValue(options.startScale, 1.0);
        /**
         * The scale of the particle when it dies.
         * @type {Number}
         * @default 1.0
         */
        this.endScale = defaultValue(options.endScale, 1.0);
        /**
         * The dimensions, width by height, to scale the particle image in pixels.
         * @type {Cartesian2}
         * @default new Cartesian(1.0, 1.0)
         */
        this.imageSize = Cartesian2.clone(defaultValue(options.imageSize, defaultSize));

        this._age = 0.0;
        this._normalizedAge = 0.0;

        // used by ParticleSystem
        this._billboard = undefined;
    }

    defineProperties(Particle.prototype, {
        /**
         * Gets the age of the particle in seconds.
         * @memberof Particle.prototype
         * @type {Number}
         */
        age : {
            get : function() {
                return this._age;
            }
        },
        /**
         * Gets the age normalized to a value in the range [0.0, 1.0].
         * @memberof Particle.prototype
         * @type {Number}
         */
        normalizedAge : {
            get : function() {
                return this._normalizedAge;
            }
        }
    });

    var deltaScratch = new Cartesian3();

    /**
     * @private
     */
    Particle.prototype.update = function(dt, particleUpdateFunction) {
        // Apply the velocity
        Cartesian3.multiplyByScalar(this.velocity, dt, deltaScratch);
        Cartesian3.add(this.position, deltaScratch, this.position);

        // Update any forces.
        if (defined(particleUpdateFunction)) {
            particleUpdateFunction(this, dt);
        }

        // Age the particle
        this._age += dt;

        // Compute the normalized age.
        if (this.life === Number.MAX_VALUE) {
            this._normalizedAge = 0.0;
        } else {
            this._normalizedAge = this._age / this.life;
        }

        // If this particle is older than it's lifespan then die.
        return this._age <= this.life;
    };
export default Particle;
