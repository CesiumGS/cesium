import DeveloperError from "../Core/DeveloperError.js";

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
  ;
}

/**
 * Initializes the given {Particle} by setting it's position and velocity.
 *
 * @private
 * @param {Particle} The particle to initialize
 */
ParticleEmitter.prototype.emit = function (particle) {
  DeveloperError.throwInstantiationError();
};
export { ParticleEmitter };
export default ParticleEmitter;
