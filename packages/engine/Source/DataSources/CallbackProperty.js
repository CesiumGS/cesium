import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";

/**
 * A {@link Property} whose value is lazily evaluated by a callback function.
 *
 * @alias CallbackProperty
 * @constructor
 *
 * @param {CallbackProperty.Callback} callback The function to be called when the property is evaluated.
 * @param {boolean} isConstant <code>true</code> when the callback function returns the same value every time, <code>false</code> if the value will change.
 */
function CallbackProperty(callback, isConstant) {
  this._callback = undefined;
  this._isConstant = undefined;
  this._definitionChanged = new Event();
  this.setCallback(callback, isConstant);
}

Object.defineProperties(CallbackProperty.prototype, {
  /**
   * Gets a value indicating if this property is constant.
   * @memberof CallbackProperty.prototype
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
   * The definition is changed whenever setCallback is called.
   * @memberof CallbackProperty.prototype
   *
   * @type {Event}
   * @readonly
   */
  definitionChanged: {
    get: function () {
      return this._definitionChanged;
    },
  },
});

/**
 * Gets the value of the property.
 *
 * @param {JulianDate} time The time for which to retrieve the value.
 * @param {object} [result] The object to store the value into, if omitted, a new instance is created and returned.
 * @returns {object} The modified result parameter or a new instance if the result parameter was not supplied or is unsupported.
 */
CallbackProperty.prototype.getValue = function (time, result) {
  return this._callback(time, result);
};

/**
 * Sets the callback to be used.
 *
 * @param {CallbackProperty.Callback} callback The function to be called when the property is evaluated.
 * @param {boolean} isConstant <code>true</code> when the callback function returns the same value every time, <code>false</code> if the value will change.
 */
CallbackProperty.prototype.setCallback = function (callback, isConstant) {
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
 * Compares this property to the provided property and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Property} [other] The other property.
 * @returns {boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
CallbackProperty.prototype.equals = function (other) {
  return (
    this === other ||
    (other instanceof CallbackProperty &&
      this._callback === other._callback &&
      this._isConstant === other._isConstant)
  );
};

/**
 * A function that returns the value of the property.
 * @callback CallbackProperty.Callback
 *
 * @param {JulianDate} time The time for which to retrieve the value.
 * @param {object} [result] The object to store the value into. If omitted, the function must create and return a new instance.
 * @returns {object} The modified result parameter, or a new instance if the result parameter was not supplied or is unsupported.
 */
export default CallbackProperty;
