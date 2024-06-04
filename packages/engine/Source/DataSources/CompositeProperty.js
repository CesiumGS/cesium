import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import EventHelper from "../Core/EventHelper.js";
import TimeIntervalCollection from "../Core/TimeIntervalCollection.js";
import Property from "./Property.js";

function subscribeAll(property, eventHelper, definitionChanged, intervals) {
  function callback() {
    definitionChanged.raiseEvent(property);
  }
  const items = [];
  eventHelper.removeAll();
  const length = intervals.length;
  for (let i = 0; i < length; i++) {
    const interval = intervals.get(i);
    if (defined(interval.data) && items.indexOf(interval.data) === -1) {
      eventHelper.add(interval.data.definitionChanged, callback);
    }
  }
}

/**
 * A {@link Property} which is defined by a {@link TimeIntervalCollection}, where the
 * data property of each {@link TimeInterval} is another Property instance which is
 * evaluated at the provided time.
 *
 * @alias CompositeProperty
 * @constructor
 *
 *
 * @example
 * const constantProperty = ...;
 * const sampledProperty = ...;
 *
 * //Create a composite property from two previously defined properties
 * //where the property is valid on August 1st, 2012 and uses a constant
 * //property for the first half of the day and a sampled property for the
 * //remaining half.
 * const composite = new Cesium.CompositeProperty();
 * composite.intervals.addInterval(Cesium.TimeInterval.fromIso8601({
 *     iso8601 : '2012-08-01T00:00:00.00Z/2012-08-01T12:00:00.00Z',
 *     data : constantProperty
 * }));
 * composite.intervals.addInterval(Cesium.TimeInterval.fromIso8601({
 *     iso8601 : '2012-08-01T12:00:00.00Z/2012-08-02T00:00:00.00Z',
 *     isStartIncluded : false,
 *     isStopIncluded : false,
 *     data : sampledProperty
 * }));
 *
 * @see CompositeMaterialProperty
 * @see CompositePositionProperty
 */
function CompositeProperty() {
  this._eventHelper = new EventHelper();
  this._definitionChanged = new Event();
  this._intervals = new TimeIntervalCollection();
  this._intervals.changedEvent.addEventListener(
    CompositeProperty.prototype._intervalsChanged,
    this
  );
}

Object.defineProperties(CompositeProperty.prototype, {
  /**
   * Gets a value indicating if this property is constant.  A property is considered
   * constant if getValue always returns the same result for the current definition.
   * @memberof CompositeProperty.prototype
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
   * The definition is changed whenever setValue is called with data different
   * than the current value.
   * @memberof CompositeProperty.prototype
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
   * @memberof CompositeProperty.prototype
   *
   * @type {TimeIntervalCollection}
   */
  intervals: {
    get: function () {
      return this._intervals;
    },
  },
});

/**
 * Gets the value of the property at the provided time.
 *
 * @param {JulianDate} time The time for which to retrieve the value.
 * @param {object} [result] The object to store the value into, if omitted, a new instance is created and returned.
 * @returns {object} The modified result parameter or a new instance if the result parameter was not supplied.
 */
CompositeProperty.prototype.getValue = function (time, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(time)) {
    throw new DeveloperError("time is required");
  }
  //>>includeEnd('debug');

  const innerProperty = this._intervals.findDataForIntervalContainingDate(time);
  if (defined(innerProperty)) {
    return innerProperty.getValue(time, result);
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
CompositeProperty.prototype.equals = function (other) {
  return (
    this === other || //
    (other instanceof CompositeProperty && //
      this._intervals.equals(other._intervals, Property.equals))
  );
};

/**
 * @private
 */
CompositeProperty.prototype._intervalsChanged = function () {
  subscribeAll(
    this,
    this._eventHelper,
    this._definitionChanged,
    this._intervals
  );
  this._definitionChanged.raiseEvent(this);
};
export default CompositeProperty;
