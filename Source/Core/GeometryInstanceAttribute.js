import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

/**
 * Values and type information for per-instance geometry attributes.
 *
 * @alias GeometryInstanceAttribute
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {ComponentDatatype} options.componentDatatype The datatype of each component in the attribute, e.g., individual elements in values.
 * @param {Number} options.componentsPerAttribute A number between 1 and 4 that defines the number of components in an attributes.
 * @param {Boolean} [options.normalize=false] When <code>true</code> and <code>componentDatatype</code> is an integer format, indicate that the components should be mapped to the range [0, 1] (unsigned) or [-1, 1] (signed) when they are accessed as floating-point for rendering.
 * @param {Number[]} options.value The value for the attribute.
 *
 * @exception {DeveloperError} options.componentsPerAttribute must be between 1 and 4.
 *
 *
 * @example
 * var instance = new Cesium.GeometryInstance({
 *   geometry : Cesium.BoxGeometry.fromDimensions({
 *     dimensions : new Cesium.Cartesian3(1000000.0, 1000000.0, 500000.0)
 *   }),
 *   modelMatrix : Cesium.Matrix4.multiplyByTranslation(Cesium.Transforms.eastNorthUpToFixedFrame(
 *     Cesium.Cartesian3.fromDegrees(0.0, 0.0)), new Cesium.Cartesian3(0.0, 0.0, 1000000.0), new Cesium.Matrix4()),
 *   id : 'box',
 *   attributes : {
 *     color : new Cesium.GeometryInstanceAttribute({
 *       componentDatatype : Cesium.ComponentDatatype.UNSIGNED_BYTE,
 *       componentsPerAttribute : 4,
 *       normalize : true,
 *       value : [255, 255, 0, 255]
 *     })
 *   }
 * });
 *
 * @see ColorGeometryInstanceAttribute
 * @see ShowGeometryInstanceAttribute
 * @see DistanceDisplayConditionGeometryInstanceAttribute
 */
function GeometryInstanceAttribute(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.componentDatatype)) {
    throw new DeveloperError("options.componentDatatype is required.");
  }
  if (!defined(options.componentsPerAttribute)) {
    throw new DeveloperError("options.componentsPerAttribute is required.");
  }
  if (
    options.componentsPerAttribute < 1 ||
    options.componentsPerAttribute > 4
  ) {
    throw new DeveloperError(
      "options.componentsPerAttribute must be between 1 and 4."
    );
  }
  if (!defined(options.value)) {
    throw new DeveloperError("options.value is required.");
  }
  //>>includeEnd('debug');

  /**
   * The datatype of each component in the attribute, e.g., individual elements in
   * {@link GeometryInstanceAttribute#value}.
   *
   * @type ComponentDatatype
   *
   * @default undefined
   */
  this.componentDatatype = options.componentDatatype;

  /**
   * A number between 1 and 4 that defines the number of components in an attributes.
   * For example, a position attribute with x, y, and z components would have 3 as
   * shown in the code example.
   *
   * @type Number
   *
   * @default undefined
   *
   * @example
   * show : new Cesium.GeometryInstanceAttribute({
   *   componentDatatype : Cesium.ComponentDatatype.UNSIGNED_BYTE,
   *   componentsPerAttribute : 1,
   *   normalize : true,
   *   value : [1.0]
   * })
   */
  this.componentsPerAttribute = options.componentsPerAttribute;

  /**
   * When <code>true</code> and <code>componentDatatype</code> is an integer format,
   * indicate that the components should be mapped to the range [0, 1] (unsigned)
   * or [-1, 1] (signed) when they are accessed as floating-point for rendering.
   * <p>
   * This is commonly used when storing colors using {@link ComponentDatatype.UNSIGNED_BYTE}.
   * </p>
   *
   * @type Boolean
   *
   * @default false
   *
   * @example
   * attribute.componentDatatype = Cesium.ComponentDatatype.UNSIGNED_BYTE;
   * attribute.componentsPerAttribute = 4;
   * attribute.normalize = true;
   * attribute.value = [
   *   Cesium.Color.floatToByte(color.red),
   *   Cesium.Color.floatToByte(color.green),
   *   Cesium.Color.floatToByte(color.blue),
   *   Cesium.Color.floatToByte(color.alpha)
   * ];
   */
  this.normalize = defaultValue(options.normalize, false);

  /**
   * The values for the attributes stored in a typed array.  In the code example,
   * every three elements in <code>values</code> defines one attributes since
   * <code>componentsPerAttribute</code> is 3.
   *
   * @type {Number[]}
   *
   * @default undefined
   *
   * @example
   * show : new Cesium.GeometryInstanceAttribute({
   *   componentDatatype : Cesium.ComponentDatatype.UNSIGNED_BYTE,
   *   componentsPerAttribute : 1,
   *   normalize : true,
   *   value : [1.0]
   * })
   */
  this.value = options.value;
}
export default GeometryInstanceAttribute;
