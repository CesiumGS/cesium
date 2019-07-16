define([
        '../Core/DeveloperError'
    ], function(
        DeveloperError) {
    'use strict';

    /**
     * <p>
     * An object that initializes a {@link Particle} from a {@link ParticleSystem}.
     * </p>
     * <p>
     * This type describes an interface and is not intended to be instantiated directly.
     * </p>
     *
     * @alias ParticleEmitter
     * @constructor
     *
     * @see BoxEmitter
     * @see CircleEmitter
     * @see ConeEmitter
     * @see SphereEmitter
     */
    function ParticleEmitter(options) {
        //>>includeStart('debug', pragmas.debug);
        throw new DeveloperError('This type should not be instantiated directly.  Instead, use BoxEmitter, CircleEmitter, ConeEmitter or SphereEmitter.');
        //>>includeEnd('debug');
    }

    /**
     * Initializes the given {Particle} by setting it's position and velocity.
     *
     * @private
     * @param {Particle} The particle to initialize
     */
    ParticleEmitter.prototype.emit = function(particle) {
        DeveloperError.throwInstantiationError();
    };

    return ParticleEmitter;
});
