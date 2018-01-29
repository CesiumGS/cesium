define([
        '../Core/defaultValue',
        '../Core/defineProperties'
    ], function(
        defaultValue,
        defineProperties) {
    'use strict';

    /**
     * Represents a burst of {@link Particle}s from a {@link ParticleSystem} at a given time in the systems lifetime.
     *
     * @alias ParticleBurst
     * @constructor
     *
     * @param {Object} [options] An object with the following properties:
     * @param {Number} [options.time=0.0] The time in seconds after the beginning of the particle system's lifetime that the burst will occur.
     * @param {Number} [options.minimum=0.0] The minimum number of particles emmitted in the burst.
     * @param {Number} [options.maximum=50.0] The maximum number of particles emitted in the burst.
     */
    function ParticleBurst(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * The time in seconds after the eginning of the particle system's lifetime that the burst will occur.
         * @type {Number}
         * @default 0.0
         */
        this.time = defaultValue(options.time, 0.0);
        /**
         * The minimum number of particles emitted.
         * @type {Number}
         * @default 0.0
         */
        this.minimum = defaultValue(options.minimum, 0.0);
        /**
         * The maximum number of particles emitted.
         * @type {Number}
         * @default 50.0
         */
        this.maximum = defaultValue(options.maximum, 50.0);

        this._complete = false;
    }

    defineProperties(ParticleBurst.prototype, {
        /**
         * <code>true</code> if the burst has been completed; <code>false</code> otherwise.
         * @memberof ParticleBurst.prototype
         * @type {Boolean}
         */
        complete : {
            get : function() {
                return this._complete;
            }
        }
    });

    return ParticleBurst;
});
