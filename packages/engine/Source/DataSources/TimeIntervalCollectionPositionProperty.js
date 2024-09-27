import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import JulianDate from "../Core/JulianDate.js";
import ReferenceFrame from "../Core/ReferenceFrame.js";
import TimeIntervalCollection from "../Core/TimeIntervalCollection.js";
import PositionProperty from "./PositionProperty.js";
import Property from "./Property.js";

/**
 * A {@link TimeIntervalCollectionProperty} which is also a {@link PositionProperty}.
 *
 * @alias TimeIntervalCollectionPositionProperty
 * @constructor
 *
 * @param {ReferenceFrame} [referenceFrame=ReferenceFrame.FIXED] The reference frame in which the position is defined.
 */
function TimeIntervalCollectionPositionProperty(referenceFrame) {
  this._definitionChanged = new Event();
  this._intervals = new TimeIntervalCollection();
  this._intervals.changedEvent.addEventListener(
    TimeIntervalCollectionPositionProperty.prototype._intervalsChanged,
    this,
  );
  this._referenceFrame = defaultValue(referenceFrame, ReferenceFrame.FIXED);
}

Object.defineProperties(TimeIntervalCollectionPositionProperty.prototype, {
  /**
   * Gets a value indicating if this property is constant.  A property is considered
   * constant if getValue always returns the same result for the current definition.
   * @memberof TimeIntervalCollectionPositionProperty.prototype
   *
   * @type {boolean}
   * @readonly
   */
  isConstant: {
    get: function () {
      return this._intervals.isEmpty;
    },
  },
  /**
   * Gets the event that is raised whenever the definition of this property changes.
   * The definition is considered to have changed if a call to getValue would return
   * a different result for the same time.
   * @memberof TimeIntervalCollectionPositionProperty.prototype
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
   * @memberof TimeIntervalCollectionPositionProperty.prototype
   * @type {TimeIntervalCollection}
   * @readonly
   */
  intervals: {
    get: function () {
      return this._intervals;
    },
  },
  /**
   * Gets the reference frame in which the position is defined.
   * @memberof TimeIntervalCollectionPositionProperty.prototype
   * @type {ReferenceFrame}
   * @readonly
   * @default ReferenceFrame.FIXED;
   */
  referenceFrame: {
    get: function () {
      return this._referenceFrame;
    },
  },
});

const timeScratch = new JulianDate();

/**
 * Gets the value of the property at the provided time in the fixed frame.
 *
 * @param {JulianDate} [time=JulianDate.now()] The time for which to retrieve the value. If omitted, the current system time is used.
 * @param {object} [result] The object to store the value into, if omitted, a new instance is created and returned.
 * @returns {Cartesian3 | undefined} The modified result parameter or a new instance if the result parameter was not supplied.
 */
TimeIntervalCollectionPositionProperty.prototype.getValue = function (
  time,
  result,
) {
  if (!defined(time)) {
    time = JulianDate.now(timeScratch);
  }
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
TimeIntervalCollectionPositionProperty.prototype.getValueInReferenceFrame =
  function (time, referenceFrame, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(time)) {
      throw new DeveloperError("time is required.");
    }
    if (!defined(referenceFrame)) {
      throw new DeveloperError("referenceFrame is required.");
    }
    //>>includeEnd('debug');

    const position = this._intervals.findDataForIntervalContainingDate(time);
    if (defined(position)) {
      return PositionProperty.convertToReferenceFrame(
        time,
        position,
        this._referenceFrame,
        referenceFrame,
        result,
      );
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
TimeIntervalCollectionPositionProperty.prototype.equals = function (other) {
  return (
    this === other || //
    (other instanceof TimeIntervalCollectionPositionProperty && //
      this._intervals.equals(other._intervals, Property.equals) && //
      this._referenceFrame === other._referenceFrame)
  );
};

/**
 * @private
 */
TimeIntervalCollectionPositionProperty.prototype._intervalsChanged =
  function () {
    this._definitionChanged.raiseEvent(this);
  };
export default TimeIntervalCollectionPositionProperty;
