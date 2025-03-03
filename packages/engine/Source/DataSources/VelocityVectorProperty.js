import Cartesian3 from "../Core/Cartesian3.js";
import defined from "../Core/defined.js";
import Event from "../Core/Event.js";
import JulianDate from "../Core/JulianDate.js";
import Property from "./Property.js";

/**
 * A {@link Property} which evaluates to a {@link Cartesian3} vector
 * based on the velocity of the provided {@link PositionProperty}.
 *
 * @alias VelocityVectorProperty
 * @constructor
 *
 * @param {PositionProperty} [position] The position property used to compute the velocity.
 * @param {boolean} [normalize=true] Whether to normalize the computed velocity vector.
 *
 * @example
 * //Create an entity with a billboard rotated to match its velocity.
 * const position = new Cesium.SampledProperty();
 * position.addSamples(...);
 * const entity = viewer.entities.add({
 *   position : position,
 *   billboard : {
 *     image : 'image.png',
 *     alignedAxis : new Cesium.VelocityVectorProperty(position, true) // alignedAxis must be a unit vector
 *   }
 * }));
 */
function VelocityVectorProperty(position, normalize) {
  this._position = undefined;
  this._subscription = undefined;
  this._definitionChanged = new Event();
  this._normalize = normalize ?? true;

  this.position = position;
}

Object.defineProperties(VelocityVectorProperty.prototype, {
  /**
   * Gets a value indicating if this property is constant.
   * @memberof VelocityVectorProperty.prototype
   *
   * @type {boolean}
   * @readonly
   */
  isConstant: {
    get: function () {
      return Property.isConstant(this._position);
    },
  },
  /**
   * Gets the event that is raised whenever the definition of this property changes.
   * @memberof VelocityVectorProperty.prototype
   *
   * @type {Event}
   * @readonly
   */
  definitionChanged: {
    get: function () {
      return this._definitionChanged;
    },
  },
  /**
   * Gets or sets the position property used to compute the velocity vector.
   * @memberof VelocityVectorProperty.prototype
   *
   * @type {Property|undefined}
   */
  position: {
    get: function () {
      return this._position;
    },
    set: function (value) {
      const oldValue = this._position;
      if (oldValue !== value) {
        if (defined(oldValue)) {
          this._subscription();
        }

        this._position = value;

        if (defined(value)) {
          this._subscription = value._definitionChanged.addEventListener(
            function () {
              this._definitionChanged.raiseEvent(this);
            },
            this,
          );
        }

        this._definitionChanged.raiseEvent(this);
      }
    },
  },
  /**
   * Gets or sets whether the vector produced by this property
   * will be normalized or not.
   * @memberof VelocityVectorProperty.prototype
   *
   * @type {boolean}
   */
  normalize: {
    get: function () {
      return this._normalize;
    },
    set: function (value) {
      if (this._normalize === value) {
        return;
      }

      this._normalize = value;
      this._definitionChanged.raiseEvent(this);
    },
  },
});

const position1Scratch = new Cartesian3();
const position2Scratch = new Cartesian3();
const timeScratch = new JulianDate();
const timeNowScratch = new JulianDate();
const step = 1.0 / 60.0;

/**
 * Gets the value of the property at the provided time.
 *
 * @param {JulianDate} [time=JulianDate.now()] The time for which to retrieve the value. If omitted, the current system time is used.
 * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
 * @returns {Cartesian3} The modified result parameter or a new instance if the result parameter was not supplied.
 */
VelocityVectorProperty.prototype.getValue = function (time, result) {
  return this._getValue(time, result);
};

/**
 * @private
 */
VelocityVectorProperty.prototype._getValue = function (
  time,
  velocityResult,
  positionResult,
) {
  if (!defined(time)) {
    time = JulianDate.now(timeNowScratch);
  }

  if (!defined(velocityResult)) {
    velocityResult = new Cartesian3();
  }

  const property = this._position;
  if (Property.isConstant(property)) {
    return this._normalize
      ? undefined
      : Cartesian3.clone(Cartesian3.ZERO, velocityResult);
  }

  let position1 = property.getValue(time, position1Scratch);
  let position2 = property.getValue(
    JulianDate.addSeconds(time, step, timeScratch),
    position2Scratch,
  );

  //If we don't have a position for now, return undefined.
  if (!defined(position1)) {
    return undefined;
  }

  //If we don't have a position for now + step, see if we have a position for now - step.
  if (!defined(position2)) {
    position2 = position1;
    position1 = property.getValue(
      JulianDate.addSeconds(time, -step, timeScratch),
      position2Scratch,
    );

    if (!defined(position1)) {
      return undefined;
    }
  }

  if (Cartesian3.equals(position1, position2)) {
    return this._normalize
      ? undefined
      : Cartesian3.clone(Cartesian3.ZERO, velocityResult);
  }

  if (defined(positionResult)) {
    position1.clone(positionResult);
  }

  const velocity = Cartesian3.subtract(position2, position1, velocityResult);
  if (this._normalize) {
    return Cartesian3.normalize(velocity, velocityResult);
  }

  return Cartesian3.divideByScalar(velocity, step, velocityResult);
};

/**
 * Compares this property to the provided property and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Property} [other] The other property.
 * @returns {boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
VelocityVectorProperty.prototype.equals = function (other) {
  return (
    this === other || //
    (other instanceof VelocityVectorProperty &&
      Property.equals(this._position, other._position))
  );
};
export default VelocityVectorProperty;
