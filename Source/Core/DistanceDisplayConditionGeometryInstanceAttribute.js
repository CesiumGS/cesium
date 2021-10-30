import ComponentDatatype from "./ComponentDatatype.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

/**
 * Value and type information for per-instance geometry attribute that determines if the geometry instance has a distance display condition.
 *
 * @alias DistanceDisplayConditionGeometryInstanceAttribute
 * @constructor
 *
 * @param {Number} [near=0.0] The near distance.
 * @param {Number} [far=Number.MAX_VALUE] The far distance.
 *
 * @exception {DeveloperError} far must be greater than near.
 *
 * @example
 * var instance = new Cesium.GeometryInstance({
 *   geometry : new Cesium.BoxGeometry({
 *     vertexFormat : Cesium.VertexFormat.POSITION_AND_NORMAL,
 *     minimum : new Cesium.Cartesian3(-250000.0, -250000.0, -250000.0),
 *     maximum : new Cesium.Cartesian3(250000.0, 250000.0, 250000.0)
 *   }),
 *   modelMatrix : Cesium.Matrix4.multiplyByTranslation(Cesium.Transforms.eastNorthUpToFixedFrame(
 *     Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883)), new Cesium.Cartesian3(0.0, 0.0, 1000000.0), new Cesium.Matrix4()),
 *   id : 'box',
 *   attributes : {
 *     distanceDisplayCondition : new Cesium.DistanceDisplayConditionGeometryInstanceAttribute(100.0, 10000.0)
 *   }
 * });
 *
 * @see GeometryInstance
 * @see GeometryInstanceAttribute
 */
function DistanceDisplayConditionGeometryInstanceAttribute(near, far) {
  near = defaultValue(near, 0.0);
  far = defaultValue(far, Number.MAX_VALUE);

  //>>includeStart('debug', pragmas.debug);
  if (far <= near) {
    throw new DeveloperError(
      "far distance must be greater than near distance."
    );
  }
  //>>includeEnd('debug');

  /**
   * The values for the attributes stored in a typed array.
   *
   * @type Float32Array
   *
   * @default [0.0, 0.0, Number.MAX_VALUE]
   */
  this.value = new Float32Array([near, far]);
}

Object.defineProperties(
  DistanceDisplayConditionGeometryInstanceAttribute.prototype,
  {
    /**
     * The datatype of each component in the attribute, e.g., individual elements in
     * {@link DistanceDisplayConditionGeometryInstanceAttribute#value}.
     *
     * @memberof DistanceDisplayConditionGeometryInstanceAttribute.prototype
     *
     * @type {ComponentDatatype}
     * @readonly
     *
     * @default {@link ComponentDatatype.FLOAT}
     */
    componentDatatype: {
      get: function () {
        return ComponentDatatype.FLOAT;
      },
    },

    /**
     * The number of components in the attributes, i.e., {@link DistanceDisplayConditionGeometryInstanceAttribute#value}.
     *
     * @memberof DistanceDisplayConditionGeometryInstanceAttribute.prototype
     *
     * @type {Number}
     * @readonly
     *
     * @default 3
     */
    componentsPerAttribute: {
      get: function () {
        return 2;
      },
    },

    /**
     * When <code>true</code> and <code>componentDatatype</code> is an integer format,
     * indicate that the components should be mapped to the range [0, 1] (unsigned)
     * or [-1, 1] (signed) when they are accessed as floating-point for rendering.
     *
     * @memberof DistanceDisplayConditionGeometryInstanceAttribute.prototype
     *
     * @type {Boolean}
     * @readonly
     *
     * @default false
     */
    normalize: {
      get: function () {
        return false;
      },
    },
  }
);

/**
 * Creates a new {@link DistanceDisplayConditionGeometryInstanceAttribute} instance given the provided an enabled flag and {@link DistanceDisplayCondition}.
 *
 * @param {DistanceDisplayCondition} distanceDisplayCondition The distance display condition.
 * @returns {DistanceDisplayConditionGeometryInstanceAttribute} The new {@link DistanceDisplayConditionGeometryInstanceAttribute} instance.
 *
 * @exception {DeveloperError} distanceDisplayCondition.far must be greater than distanceDisplayCondition.near
 *
 * @example
 * var distanceDisplayCondition = new Cesium.DistanceDisplayCondition(100.0, 10000.0);
 * var instance = new Cesium.GeometryInstance({
 *   geometry : geometry,
 *   attributes : {
 *     distanceDisplayCondition : Cesium.DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition)
 *   }
 * });
 */
DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition = function (
  distanceDisplayCondition
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(distanceDisplayCondition)) {
    throw new DeveloperError("distanceDisplayCondition is required.");
  }
  if (distanceDisplayCondition.far <= distanceDisplayCondition.near) {
    throw new DeveloperError(
      "distanceDisplayCondition.far distance must be greater than distanceDisplayCondition.near distance."
    );
  }
  //>>includeEnd('debug');

  return new DistanceDisplayConditionGeometryInstanceAttribute(
    distanceDisplayCondition.near,
    distanceDisplayCondition.far
  );
};

/**
 * Converts a distance display condition to a typed array that can be used to assign a distance display condition attribute.
 *
 * @param {DistanceDisplayCondition} distanceDisplayCondition The distance display condition value.
 * @param {Float32Array} [result] The array to store the result in, if undefined a new instance will be created.
 * @returns {Float32Array} The modified result parameter or a new instance if result was undefined.
 *
 * @example
 * var attributes = primitive.getGeometryInstanceAttributes('an id');
 * attributes.distanceDisplayCondition = Cesium.DistanceDisplayConditionGeometryInstanceAttribute.toValue(distanceDisplayCondition, attributes.distanceDisplayCondition);
 */
DistanceDisplayConditionGeometryInstanceAttribute.toValue = function (
  distanceDisplayCondition,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(distanceDisplayCondition)) {
    throw new DeveloperError("distanceDisplayCondition is required.");
  }
  //>>includeEnd('debug');

  if (!defined(result)) {
    return new Float32Array([
      distanceDisplayCondition.near,
      distanceDisplayCondition.far,
    ]);
  }
  result[0] = distanceDisplayCondition.near;
  result[1] = distanceDisplayCondition.far;
  return result;
};
export default DistanceDisplayConditionGeometryInstanceAttribute;
