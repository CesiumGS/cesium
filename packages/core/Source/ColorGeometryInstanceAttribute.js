import Color from "./Color.js";
import ComponentDatatype from "./ComponentDatatype.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

/**
 * Value and type information for per-instance geometry color.
 *
 * @alias ColorGeometryInstanceAttribute
 * @constructor
 *
 * @param {number} [red=1.0] The red component.
 * @param {number} [green=1.0] The green component.
 * @param {number} [blue=1.0] The blue component.
 * @param {number} [alpha=1.0] The alpha component.
 *
 *
 * @example
 * const instance = new Cesium.GeometryInstance({
 *   geometry : Cesium.BoxGeometry.fromDimensions({
 *     dimensions : new Cesium.Cartesian3(1000000.0, 1000000.0, 500000.0)
 *   }),
 *   modelMatrix : Cesium.Matrix4.multiplyByTranslation(Cesium.Transforms.eastNorthUpToFixedFrame(
 *     Cesium.Cartesian3.fromDegrees(0.0, 0.0)), new Cesium.Cartesian3(0.0, 0.0, 1000000.0), new Cesium.Matrix4()),
 *   id : 'box',
 *   attributes : {
 *     color : new Cesium.ColorGeometryInstanceAttribute(red, green, blue, alpha)
 *   }
 * });
 *
 * @see GeometryInstance
 * @see GeometryInstanceAttribute
 */
function ColorGeometryInstanceAttribute(red, green, blue, alpha) {
  red = red ?? 1.0;
  green = green ?? 1.0;
  blue = blue ?? 1.0;
  alpha = alpha ?? 1.0;

  /**
   * The values for the attributes stored in a typed array.
   *
   * @type Uint8Array
   *
   * @default [255, 255, 255, 255]
   */
  this.value = new Uint8Array([
    Color.floatToByte(red),
    Color.floatToByte(green),
    Color.floatToByte(blue),
    Color.floatToByte(alpha),
  ]);
}

Object.defineProperties(ColorGeometryInstanceAttribute.prototype, {
  /**
   * The datatype of each component in the attribute, e.g., individual elements in
   * {@link ColorGeometryInstanceAttribute#value}.
   *
   * @memberof ColorGeometryInstanceAttribute.prototype
   *
   * @type {ComponentDatatype}
   * @readonly
   *
   * @default {@link ComponentDatatype.UNSIGNED_BYTE}
   */
  componentDatatype: {
    get: function () {
      return ComponentDatatype.UNSIGNED_BYTE;
    },
  },

  /**
   * The number of components in the attributes, i.e., {@link ColorGeometryInstanceAttribute#value}.
   *
   * @memberof ColorGeometryInstanceAttribute.prototype
   *
   * @type {number}
   * @readonly
   *
   * @default 4
   */
  componentsPerAttribute: {
    get: function () {
      return 4;
    },
  },

  /**
   * When <code>true</code> and <code>componentDatatype</code> is an integer format,
   * indicate that the components should be mapped to the range [0, 1] (unsigned)
   * or [-1, 1] (signed) when they are accessed as floating-point for rendering.
   *
   * @memberof ColorGeometryInstanceAttribute.prototype
   *
   * @type {boolean}
   * @readonly
   *
   * @default true
   */
  normalize: {
    get: function () {
      return true;
    },
  },
});

/**
 * Creates a new {@link ColorGeometryInstanceAttribute} instance given the provided {@link Color}.
 *
 * @param {Color} color The color.
 * @returns {ColorGeometryInstanceAttribute} The new {@link ColorGeometryInstanceAttribute} instance.
 *
 * @example
 * const instance = new Cesium.GeometryInstance({
 *   geometry : geometry,
 *   attributes : {
 *     color : Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.CORNFLOWERBLUE),
 *   }
 * });
 */
ColorGeometryInstanceAttribute.fromColor = function (color) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(color)) {
    throw new DeveloperError("color is required.");
  }
  //>>includeEnd('debug');

  return new ColorGeometryInstanceAttribute(
    color.red,
    color.green,
    color.blue,
    color.alpha,
  );
};

/**
 * Converts a color to a typed array that can be used to assign a color attribute.
 *
 * @param {Color} color The color.
 * @param {Uint8Array} [result] The array to store the result in, if undefined a new instance will be created.
 *
 * @returns {Uint8Array} The modified result parameter or a new instance if result was undefined.
 *
 * @example
 * const attributes = primitive.getGeometryInstanceAttributes('an id');
 * attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(Cesium.Color.AQUA, attributes.color);
 */
ColorGeometryInstanceAttribute.toValue = function (color, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(color)) {
    throw new DeveloperError("color is required.");
  }
  //>>includeEnd('debug');

  if (!defined(result)) {
    return new Uint8Array(color.toBytes());
  }
  return color.toBytes(result);
};

/**
 * Compares the provided ColorGeometryInstanceAttributes and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {ColorGeometryInstanceAttribute} [left] The first ColorGeometryInstanceAttribute.
 * @param {ColorGeometryInstanceAttribute} [right] The second ColorGeometryInstanceAttribute.
 * @returns {boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
ColorGeometryInstanceAttribute.equals = function (left, right) {
  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      left.value[0] === right.value[0] &&
      left.value[1] === right.value[1] &&
      left.value[2] === right.value[2] &&
      left.value[3] === right.value[3])
  );
};
export default ColorGeometryInstanceAttribute;
