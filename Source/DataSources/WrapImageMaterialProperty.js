import Cartesian2 from "../Core/Cartesian2.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Event from "../Core/Event.js";
import createPropertyDescriptor from "./createPropertyDescriptor.js";
import Property from "./Property.js";

var defaultRepeat = new Cartesian2(1, 1);
var defaultTransparent = false;
var defaultColor = Color.WHITE;

/**
 * Свойство полигона, возвращающего материал WrapImage, позволяющего натянуть растр
 * по вершинам полигона с указанием текстурных координат.
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Property|String|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} [options.image] A Property specifying the Image, URL, Canvas, or Video.
 * @param {Property|Cartesian2} [options.repeat=new Cartesian2(1.0, 1.0)] A {@link Cartesian2} Property specifying the number of times the image repeats in each direction.
 * @param {Property|Color} [options.color=Color.WHITE] The color applied to the image
 * @param {Property|Boolean} [options.transparent=false] Set to true when the image has transparency (for example, when a png has transparent sections)
 */
function WrapImageMaterialProperty(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._definitionChanged = new Event();
  this._image = undefined;
  this._imageSubscription = undefined;
  this._repeat = undefined; // todo не нужен
  this._repeatSubscription = undefined;
  this._color = undefined;
  this._colorSubscription = undefined;
  this._transparent = undefined;
  this._transparentSubscription = undefined;

  this.image = options.image;
  this.repeat = options.repeat; // todo не нужен
  this.color = options.color;
  this.transparent = options.transparent;
  this.setupUniform = options.setupUniform;
}

Object.defineProperties(WrapImageMaterialProperty.prototype, {
  /**
   * Gets a value indicating if this property is constant.  A property is considered
   * constant if getValue always returns the same result for the current definition.
   * @memberof WrapImageMaterialProperty.prototype
   *
   * @type {Boolean}
   * @readonly
   */
  isConstant: {
    get: function () {
      return (
        Property.isConstant(this._image) && Property.isConstant(this._repeat)
      );
    },
  },

  /**
   * Gets the event that is raised whenever the definition of this property changes.
   * The definition is considered to have changed if a call to getValue would return
   * a different result for the same time.
   * @memberof WrapImageMaterialProperty.prototype
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
   * Gets or sets the Property specifying Image, URL, Canvas, or Video to use.
   * @memberof WrapImageMaterialProperty.prototype
   * @type {Property|undefined}
   */
  image: createPropertyDescriptor("image"),

  /**
   * Gets or sets the {@link Cartesian2} Property specifying the number of times the image repeats in each direction.
   * @memberof WrapImageMaterialProperty.prototype
   * @type {Property|undefined}
   * @default new Cartesian2(1, 1)
   */
  repeat: createPropertyDescriptor("repeat"),

  /**
   * Gets or sets the Color Property specifying the desired color applied to the image.
   * @memberof WrapImageMaterialProperty.prototype
   * @type {Property|undefined}
   * @default 1.0
   */
  color: createPropertyDescriptor("color"),

  /**
   * Gets or sets the Boolean Property specifying whether the image has transparency
   * @memberof WrapImageMaterialProperty.prototype
   * @type {Property|undefined}
   * @default 1.0
   */
  transparent: createPropertyDescriptor("transparent"),
});

/**
 * Gets the {@link Material} type at the provided time.
 *
 * @param {JulianDate} time The time for which to retrieve the type.
 * @returns {String} The type of material.
 */
WrapImageMaterialProperty.prototype.getType = function (time) {
  return "WrapImage";
};

/**
 * Gets the value of the property at the provided time.
 *
 * @param {JulianDate} time The time for which to retrieve the value.
 * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
 * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
 */
WrapImageMaterialProperty.prototype.getValue = function (
  time,
  result,
  material
) {
  if (!defined(result)) {
    result = {};
  }

  result.image = Property.getValueOrUndefined(this._image, time);
  result.repeat = Property.getValueOrClonedDefault(
    this._repeat,
    time,
    defaultRepeat,
    result.repeat
  );
  result.color = Property.getValueOrClonedDefault(
    this._color,
    time,
    defaultColor,
    result.color
  );
  if (Property.getValueOrDefault(this._transparent, time, defaultTransparent)) {
    result.color.alpha = Math.min(0.99, result.color.alpha);
  }
  material.setupUniform = this.setupUniform;

  return result;
};

/**
 * Compares this property to the provided property and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Property} [other] The other property.
 * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
WrapImageMaterialProperty.prototype.equals = function (other) {
  return (
    this === other ||
    (other instanceof WrapImageMaterialProperty &&
      Property.equals(this._image, other._image) &&
      Property.equals(this._repeat, other._repeat) &&
      Property.equals(this._color, other._color) &&
      Property.equals(this._transparent, other._transparent))
  );
};
export default WrapImageMaterialProperty;
