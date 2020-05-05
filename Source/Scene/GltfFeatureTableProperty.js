import DeveloperError from "../Core/DeveloperError.js";

/**
 * A feature table property.
 * <p>
 * Derived classes of this interface provide access to property values.
 * </p>
 * <p>
 * This type describes an interface and is not intended to be instantiated directly.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {GltfContainer} options.gltfContainer The glTF container.
 * @param {String} options.name The name of the property.
 * @param {Object} options.property The feature property JSON object from the glTF.
 * @param {GltfFeatureMetadataCache} options.cache The feature metadata cache.
 *
 * @alias GltfFeatureTableProperty
 * @constructor
 *
 * @see GltfFeatureTableArrayProperty
 * @see GltfFeatureTableAccessorProperty
 * @see GltfFeatureTableDescriptorProperty
 *
 * @private
 */
function GltfFeatureTableProperty(options) {}

Object.defineProperties(GltfFeatureTableProperty.prototype, {
  /**
   * The name of the property.
   *
   * @memberof GltfFeatureTableProperty.prototype
   * @type {String}
   * @readonly
   * @private
   */
  name: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },

  /**
   * The semantic of the property.
   *
   * @memberof GltfFeatureTableProperty.prototype
   * @type {String}
   * @readonly
   * @private
   */
  semantic: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },

  /**
   * The type of the property.
   *
   * @memberof GltfFeatureTableProperty.prototype
   * @type {GltfFeatureTablePropertyType}
   * @readonly
   * @private
   */
  type: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },

  /**
   * Extras in the feature property JSON object from the glTF.
   *
   * @memberof GltfFeatureTableProperty.prototype
   * @type {*}
   * @readonly
   * @private
   */
  extras: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },

  /**
   * Promise that resolves when the property is ready.
   *
   * @memberof GltfFeatureTableProperty.prototype
   * @type {Promise.<GltfFeatureTableProperty>}
   * @readonly
   * @private
   */
  readyPromise: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },
});

/**
 * Get the property value of a feature.
 * <p>
 * If the property is normalized, integer data values will be normalized to [0, 1]
 * for unsigned types or [-1, 1] for signed types before being returned.
 * </p>
 *
 * @param {Number} featureId The feature ID.
 * @param {Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4} [result] The object into which to store
 * the result for vector and matrix properties. The <code>result</code> argument is ignored for all other properties.
 * @returns {*} The value. The type of the returned value corresponds with the property's <code>type</code>.
 * For vector and matrix properties the returned object is the modified result parameter or a new instance if one was not provided
 * and may be a {@link Cartesian2}, {@link Cartesian3}, {@link Cartesian4}, {@link Matrix2}, {@link Matrix3}, or {@link Matrix4}.
 * For scalar properties a number is returned.
 * For array properties a value of the array's type is returned, which may be a string, number, boolean, or any other valid JSON type.
 * For descriptor properties <code>undefined</code> is returned.
 *
 * @private
 */
GltfFeatureTableProperty.prototype.getValue = function (featureId, result) {
  DeveloperError.throwInstantiationError();
};

/**
 * Set the property value of a feature.
 * <p>
 * If the property is normalized, integer data values should be normalized to [0, 1]
 * for unsigned types or [-1, 1] for signed types before being passed to <code>setPropertyValue</code>.
 * </p>
 *
 * @param {Number} featureId The feature ID.
 * @param {*} value The value. The type of the value corresponds with the property's <code>type</code>.
 * For vector and matrix properties the value may be a {@link Cartesian2}, {@link Cartesian3}, {@link Cartesian4}, {@link Matrix2}, {@link Matrix3}, or {@link Matrix4}.
 * For scalar properties the value is a number.
 * For array properties the value must be of the array's type, which may be a string, number, boolean, or any other valid JSON type.
 * When the property is a descriptor property this function has no effect.
 *
 * @private
 */
GltfFeatureTableProperty.prototype.setValue = function (featureId, value) {
  DeveloperError.throwInstantiationError();
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see GltfFeatureTableProperty#destroy
 *
 * @private
 */
GltfFeatureTableProperty.prototype.isDestroyed = function () {
  DeveloperError.throwInstantiationError();
};

/**
 * Destroys the object. Destroying an object allows for deterministic release of
 * resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception. Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @see GltfFeatureTableProperty#isDestroyed
 *
 * @private
 */
GltfFeatureTableProperty.prototype.destroy = function () {
  DeveloperError.throwInstantiationError();
};

export default GltfFeatureTableProperty;
