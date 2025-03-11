import Color from "../Core/Color.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import Event from "../Core/Event.js";
import JulianDate from "../Core/JulianDate.js";
import createPropertyDescriptor from "./createPropertyDescriptor.js";
import Property from "./Property.js";

const defaultColor = Color.WHITE;
const defaultOutlineColor = Color.BLACK;
const defaultOutlineWidth = 1.0;

/**
 * A {@link MaterialProperty} that maps to polyline outline {@link Material} uniforms.
 * @alias PolylineOutlineMaterialProperty
 * @constructor
 *
 * @param {object} [options] Object with the following properties:
 * @param {Property|Color} [options.color=Color.WHITE] A Property specifying the {@link Color} of the line.
 * @param {Property|Color} [options.outlineColor=Color.BLACK] A Property specifying the {@link Color} of the outline.
 * @param {Property|number} [options.outlineWidth=1.0] A numeric Property specifying the width of the outline, in pixels.
 */
function PolylineOutlineMaterialProperty(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  this._definitionChanged = new Event();
  this._color = undefined;
  this._colorSubscription = undefined;
  this._outlineColor = undefined;
  this._outlineColorSubscription = undefined;
  this._outlineWidth = undefined;
  this._outlineWidthSubscription = undefined;

  this.color = options.color;
  this.outlineColor = options.outlineColor;
  this.outlineWidth = options.outlineWidth;
}

Object.defineProperties(PolylineOutlineMaterialProperty.prototype, {
  /**
   * Gets a value indicating if this property is constant.  A property is considered
   * constant if getValue always returns the same result for the current definition.
   * @memberof PolylineOutlineMaterialProperty.prototype
   *
   * @type {boolean}
   * @readonly
   */
  isConstant: {
    get: function () {
      return (
        Property.isConstant(this._color) &&
        Property.isConstant(this._outlineColor) &&
        Property.isConstant(this._outlineWidth)
      );
    },
  },
  /**
   * Gets the event that is raised whenever the definition of this property changes.
   * The definition is considered to have changed if a call to getValue would return
   * a different result for the same time.
   * @memberof PolylineOutlineMaterialProperty.prototype
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
   * Gets or sets the Property specifying the {@link Color} of the line.
   * @memberof PolylineOutlineMaterialProperty.prototype
   * @type {Property|undefined}
   * @default Color.WHITE
   */
  color: createPropertyDescriptor("color"),

  /**
   * Gets or sets the Property specifying the {@link Color} of the outline.
   * @memberof PolylineOutlineMaterialProperty.prototype
   * @type {Property|undefined}
   * @default Color.BLACK
   */
  outlineColor: createPropertyDescriptor("outlineColor"),

  /**
   * Gets or sets the numeric Property specifying the width of the outline.
   * @memberof PolylineOutlineMaterialProperty.prototype
   * @type {Property|undefined}
   * @default 1.0
   */
  outlineWidth: createPropertyDescriptor("outlineWidth"),
});

/**
 * Gets the {@link Material} type at the provided time.
 *
 * @param {JulianDate} time The time for which to retrieve the type.
 * @returns {string} The type of material.
 */
PolylineOutlineMaterialProperty.prototype.getType = function (time) {
  return "PolylineOutline";
};

const timeScratch = new JulianDate();

/**
 * Gets the value of the property at the provided time.
 *
 * @param {JulianDate} [time=JulianDate.now()] The time for which to retrieve the value. If omitted, the current system time is used.
 * @param {object} [result] The object to store the value into, if omitted, a new instance is created and returned.
 * @returns {object} The modified result parameter or a new instance if the result parameter was not supplied.
 */
PolylineOutlineMaterialProperty.prototype.getValue = function (time, result) {
  if (!defined(time)) {
    time = JulianDate.now(timeScratch);
  }
  if (!defined(result)) {
    result = {};
  }
  result.color = Property.getValueOrClonedDefault(
    this._color,
    time,
    defaultColor,
    result.color,
  );
  result.outlineColor = Property.getValueOrClonedDefault(
    this._outlineColor,
    time,
    defaultOutlineColor,
    result.outlineColor,
  );
  result.outlineWidth = Property.getValueOrDefault(
    this._outlineWidth,
    time,
    defaultOutlineWidth,
  );
  return result;
};

/**
 * Compares this property to the provided property and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Property} [other] The other property.
 * @returns {boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
PolylineOutlineMaterialProperty.prototype.equals = function (other) {
  return (
    this === other || //
    (other instanceof PolylineOutlineMaterialProperty && //
      Property.equals(this._color, other._color) && //
      Property.equals(this._outlineColor, other._outlineColor) && //
      Property.equals(this._outlineWidth, other._outlineWidth))
  );
};
export default PolylineOutlineMaterialProperty;
