import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import CesiumMath from "../Core/Math.js";

const defaultDimensions = new Cartesian3(1.0, 1.0, 1.0);

/**
 * A ParticleEmitter that emits particles within a box.
 * Particles will be positioned randomly within the box and have initial velocities emanating from the center of the box.
 *
 * @alias BoxEmitter
 * @constructor
 *
 * @param {Cartesian3} dimensions The width, height and depth dimensions of the box.
 */
function BoxEmitter(dimensions) {
  dimensions = defaultValue(dimensions, defaultDimensions);

  //>>includeStart('debug', pragmas.debug);
  Check.defined("dimensions", dimensions);
  Check.typeOf.number.greaterThanOrEquals("dimensions.x", dimensions.x, 0.0);
  Check.typeOf.number.greaterThanOrEquals("dimensions.y", dimensions.y, 0.0);
  Check.typeOf.number.greaterThanOrEquals("dimensions.z", dimensions.z, 0.0);
  //>>includeEnd('debug');

  this._dimensions = Cartesian3.clone(dimensions);
}

Object.defineProperties(BoxEmitter.prototype, {
  /**
   * The width, height and depth dimensions of the box in meters.
   * @memberof BoxEmitter.prototype
   * @type {Cartesian3}
   * @default new Cartesian3(1.0, 1.0, 1.0)
   */
  dimensions: {
    get: function () {
      return this._dimensions;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("value", value);
      Check.typeOf.number.greaterThanOrEquals("value.x", value.x, 0.0);
      Check.typeOf.number.greaterThanOrEquals("value.y", value.y, 0.0);
      Check.typeOf.number.greaterThanOrEquals("value.z", value.z, 0.0);
      //>>includeEnd('debug');
      Cartesian3.clone(value, this._dimensions);
    },
  },
});

const scratchHalfDim = new Cartesian3();

/**
 * Initializes the given {Particle} by setting it's position and velocity.
 *
 * @private
 * @param {Particle} particle The particle to initialize.
 */
BoxEmitter.prototype.emit = function (particle) {
  const dim = this._dimensions;
  const halfDim = Cartesian3.multiplyByScalar(dim, 0.5, scratchHalfDim);

  const x = CesiumMath.randomBetween(-halfDim.x, halfDim.x);
  const y = CesiumMath.randomBetween(-halfDim.y, halfDim.y);
  const z = CesiumMath.randomBetween(-halfDim.z, halfDim.z);

  particle.position = Cartesian3.fromElements(x, y, z, particle.position);
  particle.velocity = Cartesian3.normalize(
    particle.position,
    particle.velocity
  );
};
export default BoxEmitter;
