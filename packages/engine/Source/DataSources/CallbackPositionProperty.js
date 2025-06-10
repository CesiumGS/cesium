import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import JulianDate from "../Core/JulianDate.js";
import ReferenceFrame from "../Core/ReferenceFrame.js";
import PositionProperty from "./PositionProperty.js";

/**
 * A {@link PositionProperty} whose value is lazily evaluated by a callback function.
 *
 * @alias CallbackPositionProperty
 * @constructor
 *
 * @param {CallbackPositionProperty.Callback} callback The function to be called when the position property is evaluated.
 * @param {boolean} isConstant <code>true</code> when the callback function returns the same value every time, <code>false</code> if the value will change.
 * @param {ReferenceFrame} [referenceFrame=ReferenceFrame.FIXED] The reference frame in which the position is defined.
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Callback%20Position%20Property.html|Cesium Sandcastle Callback Position Property Demo}
 */
function CallbackPositionProperty(callback, isConstant, referenceFrame) {
  this._callback = undefined;
  this._isConstant = undefined;
  this._referenceFrame = referenceFrame ?? ReferenceFrame.FIXED;
  this._definitionChanged = new Event();
  this.setCallback(callback, isConstant);
}

Object.defineProperties(CallbackPositionProperty.prototype, {
  /**
   * Gets a value indicating if this property is constant.
   * @memberof CallbackPositionProperty.prototype
   *
   * @type {boolean}
   * @readonly
   */
  isConstant: {
    get: function () {
      return this._isConstant;
    },
  },
  /**
   * Gets the event that is raised whenever the definition of this property changes.
   * The definition is considered to have changed if a call to getValue would return
   * a different result for the same time.
   * @memberof CallbackPositionProperty.prototype
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
   * Gets the reference frame in which the position is defined.
   * @memberof CallbackPositionProperty.prototype
   * @type {ReferenceFrame}
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
 * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
 * @returns {Cartesian3 | undefined} The modified result parameter or a new instance if the result parameter was not supplied.
 */
CallbackPositionProperty.prototype.getValue = function (time, result) {
  if (!defined(time)) {
    time = JulianDate.now(timeScratch);
  }
  return this.getValueInReferenceFrame(time, ReferenceFrame.FIXED, result);
};

/**
 * Sets the callback to be used.
 *
 * @param {CallbackPositionProperty.Callback} callback The function to be called when the property is evaluated.
 * @param {boolean} isConstant <code>true</code> when the callback function returns the same value every time, <code>false</code> if the value will change.
 */
CallbackPositionProperty.prototype.setCallback = function (
  callback,
  isConstant,
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(callback)) {
    throw new DeveloperError("callback is required.");
  }
  if (!defined(isConstant)) {
    throw new DeveloperError("isConstant is required.");
  }
  //>>includeEnd('debug');

  const changed =
    this._callback !== callback || this._isConstant !== isConstant;

  this._callback = callback;
  this._isConstant = isConstant;

  if (changed) {
    this._definitionChanged.raiseEvent(this);
  }
};

/**
 * Gets the value of the property at the provided time and in the provided reference frame.
 *
 * @param {JulianDate} time The time for which to retrieve the value.
 * @param {ReferenceFrame} referenceFrame The desired referenceFrame of the result.
 * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
 * @returns {Cartesian3 | undefined} The modified result parameter or a new instance if the result parameter was not supplied.
 */
CallbackPositionProperty.prototype.getValueInReferenceFrame = function (
  time,
  referenceFrame,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(time)) {
    throw new DeveloperError("time is required.");
  }
  if (!defined(referenceFrame)) {
    throw new DeveloperError("referenceFrame is required.");
  }
  //>>includeEnd('debug');

  const value = this._callback(time, result);

  return PositionProperty.convertToReferenceFrame(
    time,
    value,
    this._referenceFrame,
    referenceFrame,
    result,
  );
};

/**
 * Compares this property to the provided property and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Property} [other] The other property.
 * @returns {boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
CallbackPositionProperty.prototype.equals = function (other) {
  return (
    this === other ||
    (other instanceof CallbackPositionProperty &&
      this._callback === other._callback &&
      this._isConstant === other._isConstant &&
      this._referenceFrame === other._referenceFrame)
  );
};

/**
 * A function that returns the value of the position property.
 * @callback CallbackPositionProperty.Callback
 *
 * @param {JulianDate} [time=JulianDate.now()] The time for which to retrieve the value. If omitted, the current system time is used.
 * @param {Cartesian3} [result] The object to store the value into. If omitted, the function must create and return a new instance.
 * @returns {Cartesian3 | undefined} The modified result parameter, or a new instance if the result parameter was not supplied or is unsupported.
 */
export default CallbackPositionProperty;
