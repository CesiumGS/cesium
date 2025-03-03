import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";

/**
 * The interface for all properties, which represent a value that can optionally vary over time.
 * This type defines an interface and cannot be instantiated directly.
 *
 * @alias Property
 * @constructor
 * @abstract
 *
 * @see CompositeProperty
 * @see ConstantProperty
 * @see SampledProperty
 * @see TimeIntervalCollectionProperty
 * @see MaterialProperty
 * @see PositionProperty
 * @see ReferenceProperty
 */
function Property() {
  DeveloperError.throwInstantiationError();
}

Object.defineProperties(Property.prototype, {
  /**
   * Gets a value indicating if this property is constant.  A property is considered
   * constant if getValue always returns the same result for the current definition.
   * @memberof Property.prototype
   *
   * @type {boolean}
   * @readonly
   */
  isConstant: {
    get: DeveloperError.throwInstantiationError,
  },
  /**
   * Gets the event that is raised whenever the definition of this property changes.
   * The definition is considered to have changed if a call to getValue would return
   * a different result for the same time.
   * @memberof Property.prototype
   *
   * @type {Event}
   * @readonly
   */
  definitionChanged: {
    get: DeveloperError.throwInstantiationError,
  },
});

/**
 * Gets the value of the property at the provided time.
 * @function
 *
 * @param {JulianDate} [time=JulianDate.now()] The time for which to retrieve the value. If omitted, the current system time is used.
 * @param {object} [result] The object to store the value into, if omitted, a new instance is created and returned.
 * @returns {object} The modified result parameter or a new instance if the result parameter was not supplied.
 */
Property.prototype.getValue = DeveloperError.throwInstantiationError;

/**
 * Compares this property to the provided property and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 * @function
 *
 * @param {Property} [other] The other property.
 * @returns {boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
Property.prototype.equals = DeveloperError.throwInstantiationError;

/**
 * @private
 */
Property.equals = function (left, right) {
  return left === right || (defined(left) && left.equals(right));
};

/**
 * @private
 */
Property.arrayEquals = function (left, right) {
  if (left === right) {
    return true;
  }
  if (!defined(left) || !defined(right) || left.length !== right.length) {
    return false;
  }
  const length = left.length;
  for (let i = 0; i < length; i++) {
    if (!Property.equals(left[i], right[i])) {
      return false;
    }
  }
  return true;
};

/**
 * @private
 */
Property.isConstant = function (property) {
  return !defined(property) || property.isConstant;
};

/**
 * @private
 */
Property.getValueOrUndefined = function (property, time, result) {
  return defined(property) ? property.getValue(time, result) : undefined;
};

/**
 * @private
 */
Property.getValueOrDefault = function (property, time, valueDefault, result) {
  return defined(property)
    ? (property.getValue(time, result) ?? valueDefault)
    : valueDefault;
};

/**
 * @private
 */
Property.getValueOrClonedDefault = function (
  property,
  time,
  valueDefault,
  result,
) {
  let value;
  if (defined(property)) {
    value = property.getValue(time, result);
  }
  if (!defined(value)) {
    value = valueDefault.clone(value);
  }
  return value;
};
export default Property;
