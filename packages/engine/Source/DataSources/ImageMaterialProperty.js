import Cartesian2 from "../Core/Cartesian2.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Event from "../Core/Event.js";
import createPropertyDescriptor from "./createPropertyDescriptor.js";
import Property from "./Property.js";

const defaultRepeat = new Cartesian2(1, 1);
const defaultTransparent = false;
const defaultColor = Color.WHITE;

/**
 * A {@link MaterialProperty} that maps to image {@link Material} uniforms.
 * @alias ImageMaterialProperty
 * @constructor
 *
 * @param {object} [options] Object with the following properties:
 * @param {Property|string|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} [options.image] A Property specifying the Image, URL, Canvas, or Video.
 * @param {Property|Cartesian2} [options.repeat=new Cartesian2(1.0, 1.0)] A {@link Cartesian2} Property specifying the number of times the image repeats in each direction.
 * @param {Property|Color} [options.color=Color.WHITE] The color applied to the image
 * @param {Property|boolean} [options.transparent=false] Set to true when the image has transparency (for example, when a png has transparent sections)
 */
function ImageMaterialProperty(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._definitionChanged = new Event();
  this._image = undefined;
  this._imageSubscription = undefined;
  this._repeat = undefined;
  this._repeatSubscription = undefined;
  this._color = undefined;
  this._colorSubscription = undefined;
  this._transparent = undefined;
  this._transparentSubscription = undefined;

  this.image = options.image;
  this.repeat = options.repeat;
  this.color = options.color;
  this.transparent = options.transparent;
}

Object.defineProperties(ImageMaterialProperty.prototype, {
  /**
   * Gets a value indicating if this property is constant.  A property is considered
   * constant if getValue always returns the same result for the current definition.
   * @memberof ImageMaterialProperty.prototype
   *
   * @type {boolean}
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
   * @memberof ImageMaterialProperty.prototype
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
   * @memberof ImageMaterialProperty.prototype
   * @type {Property|undefined}
   */
  image: createPropertyDescriptor("image"),

  /**
   * Gets or sets the {@link Cartesian2} Property specifying the number of times the image repeats in each direction.
   * @memberof ImageMaterialProperty.prototype
   * @type {Property|undefined}
   * @default new Cartesian2(1, 1)
   */
  repeat: createPropertyDescriptor("repeat"),

  /**
   * Gets or sets the Color Property specifying the desired color applied to the image.
   * @memberof ImageMaterialProperty.prototype
   * @type {Property|undefined}
   * @default 1.0
   */
  color: createPropertyDescriptor("color"),

  /**
   * Gets or sets the Boolean Property specifying whether the image has transparency
   * @memberof ImageMaterialProperty.prototype
   * @type {Property|undefined}
   * @default 1.0
   */
  transparent: createPropertyDescriptor("transparent"),
});

/**
 * Gets the {@link Material} type at the provided time.
 *
 * @param {JulianDate} time The time for which to retrieve the type.
 * @returns {string} The type of material.
 */
ImageMaterialProperty.prototype.getType = function (time) {
  return "Image";
};

/**
 * Gets the value of the property at the provided time.
 *
 * @param {JulianDate} time The time for which to retrieve the value.
 * @param {object} [result] The object to store the value into, if omitted, a new instance is created and returned.
 * @returns {object} The modified result parameter or a new instance if the result parameter was not supplied.
 */
ImageMaterialProperty.prototype.getValue = function (time, result) {
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

  return result;
};

/**
 * Compares this property to the provided property and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Property} [other] The other property.
 * @returns {boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
ImageMaterialProperty.prototype.equals = function (other) {
  return (
    this === other ||
    (other instanceof ImageMaterialProperty &&
      Property.equals(this._image, other._image) &&
      Property.equals(this._repeat, other._repeat) &&
      Property.equals(this._color, other._color) &&
      Property.equals(this._transparent, other._transparent))
  );
};
export default ImageMaterialProperty;
