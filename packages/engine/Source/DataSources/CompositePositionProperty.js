import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import ReferenceFrame from "../Core/ReferenceFrame.js";
import CompositeProperty from "./CompositeProperty.js";
import Property from "./Property.js";

/**
 * A {@link CompositeProperty} which is also a {@link PositionProperty}.
 *
 * @alias CompositePositionProperty
 * @constructor
 *
 * @param {ReferenceFrame} [referenceFrame=ReferenceFrame.FIXED] The reference frame in which the position is defined.
 */
function CompositePositionProperty(referenceFrame) {
  this._referenceFrame = defaultValue(referenceFrame, ReferenceFrame.FIXED);
  this._definitionChanged = new Event();
  this._composite = new CompositeProperty();
  this._composite.definitionChanged.addEventListener(
    CompositePositionProperty.prototype._raiseDefinitionChanged,
    this
  );
}

Object.defineProperties(CompositePositionProperty.prototype, {
  /**
   * Gets a value indicating if this property is constant.  A property is considered
   * constant if getValue always returns the same result for the current definition.
   * @memberof CompositePositionProperty.prototype
   *
   * @type {boolean}
   * @readonly
   */
  isConstant: {
    get: function () {
      return this._composite.isConstant;
    },
  },
  /**
   * Gets the event that is raised whenever the definition of this property changes.
   * The definition is changed whenever setValue is called with data different
   * than the current value.
   * @memberof CompositePositionProperty.prototype
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
   * Gets the interval collection.
   * @memberof CompositePositionProperty.prototype
   *
   * @type {TimeIntervalCollection}
   */
  intervals: {
    get: function () {
      return this._composite.intervals;
    },
  },
  /**
   * Gets or sets the reference frame which this position presents itself as.
   * Each PositionProperty making up this object has it's own reference frame,
   * so this property merely exposes a "preferred" reference frame for clients
   * to use.
   * @memberof CompositePositionProperty.prototype
   *
   * @type {ReferenceFrame}
   */
  referenceFrame: {
    get: function () {
      return this._referenceFrame;
    },
    set: function (value) {
      this._referenceFrame = value;
    },
  },
});

/**
 * Gets the value of the property at the provided time in the fixed frame.
 *
 * @param {JulianDate} time The time for which to retrieve the value.
 * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
 * @returns {Cartesian3 | undefined} The modified result parameter or a new instance if the result parameter was not supplied.
 */
CompositePositionProperty.prototype.getValue = function (time, result) {
  return this.getValueInReferenceFrame(time, ReferenceFrame.FIXED, result);
};

/**
 * Gets the value of the property at the provided time and in the provided reference frame.
 *
 * @param {JulianDate} time The time for which to retrieve the value.
 * @param {ReferenceFrame} referenceFrame The desired referenceFrame of the result.
 * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
 * @returns {Cartesian3 | undefined} The modified result parameter or a new instance if the result parameter was not supplied.
 */
CompositePositionProperty.prototype.getValueInReferenceFrame = function (
  time,
  referenceFrame,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(time)) {
    throw new DeveloperError("time is required.");
  }
  if (!defined(referenceFrame)) {
    throw new DeveloperError("referenceFrame is required.");
  }
  //>>includeEnd('debug');

  const innerProperty = this._composite._intervals.findDataForIntervalContainingDate(
    time
  );
  if (defined(innerProperty)) {
    return innerProperty.getValueInReferenceFrame(time, referenceFrame, result);
  }
  return undefined;
};

/**
 * Compares this property to the provided property and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Property} [other] The other property.
 * @returns {boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
CompositePositionProperty.prototype.equals = function (other) {
  return (
    this === other || //
    (other instanceof CompositePositionProperty && //
      this._referenceFrame === other._referenceFrame && //
      this._composite.equals(other._composite, Property.equals))
  );
};

/**
 * @private
 */
CompositePositionProperty.prototype._raiseDefinitionChanged = function () {
  this._definitionChanged.raiseEvent(this);
};
export default CompositePositionProperty;
