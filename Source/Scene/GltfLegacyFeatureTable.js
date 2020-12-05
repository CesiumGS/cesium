import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Matrix2 from "../Core/Matrix2.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import GltfLegacyFeature from "./GltfLegacyFeature.js";
import GltfLegacyFeatureTableAccessorProperty from "./GltfLegacyFeatureTableAccessorProperty.js";
import GltfLegacyFeatureTableArrayProperty from "./GltfLegacyFeatureTableArrayProperty.js";
import GltfLegacyFeatureTableDescriptorProperty from "./GltfLegacyFeatureTableDescriptorProperty.js";
import GltfLegacyFeatureTablePropertyType from "./GltfLegacyFeatureTablePropertyType.js";
import when from "../ThirdParty/when.js";

/**
 * A feature table within the the glTF feature metadata extension.
 *
 * @param {Object} options Object with the following properties:
 * @param {GltfContainer} options.gltfContainer The glTF container.
 * @param {Object} options.featureTable The feature table JSON object from the glTF.
 * @param {GltfFeatureMetadataCache} options.cache The feature metadata cache.
 *
 * @alias GltfLegacyFeatureTable
 * @constructor
 *
 * @private
 */
function GltfLegacyFeatureTable(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltfContainer = options.gltfContainer;
  var featureTable = options.featureTable;
  var cache = options.cache;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltfContainer", gltfContainer);
  Check.typeOf.object("options.featureTable", featureTable);
  Check.typeOf.object("options.cache", cache);
  //>>includeEnd('debug');

  var properties = {};
  var promises = [];
  var featureProperties = featureTable.featureProperties;
  for (var name in featureProperties) {
    if (featureProperties.hasOwnProperty(name)) {
      var featureProperty = featureProperties[name];
      var property;
      if (defined(featureProperty.descriptor)) {
        property = new GltfLegacyFeatureTableDescriptorProperty({
          gltfContainer: gltfContainer,
          name: name,
          property: featureProperty,
          cache: cache,
        });
      } else if (defined(featureProperty.accessor)) {
        property = new GltfLegacyFeatureTableAccessorProperty({
          gltfContainer: gltfContainer,
          name: name,
          property: featureProperty,
          cache: cache,
        });
      } else {
        property = new GltfLegacyFeatureTableArrayProperty({
          gltfContainer: gltfContainer,
          name: name,
          property: featureProperty,
          cache: cache,
        });
      }
      properties[name] = property;
      promises.push(property.readyPromise);
    }
  }

  var that = this;
  var readyPromise = when.all(promises).then(function () {
    return that;
  });

  // Clone so that this object doesn't hold on to a reference to the glTF JSON
  var extras = clone(featureTable.extras, true);

  this._features = undefined; // Allocated on demand
  this._properties = properties;
  this._featureCount = featureTable.featureCount;
  this._name = featureTable.name;
  this._extras = extras;
  this._readyPromise = readyPromise;
}

Object.defineProperties(GltfLegacyFeatureTable.prototype, {
  /**
   * The feature table properties.
   *
   * @memberof GltfLegacyFeatureTable.prototype
   * @type {Object.<String, GltfLegacyFeatureTableProperty>}
   * @readonly
   * @private
   */
  properties: {
    get: function () {
      return this._properties;
    },
  },

  /**
   * The number of features in the feature table.
   * <code>featureCount</code> is undefined if the feature table is a descriptor table.
   *
   * @memberof GltfLegacyFeatureTable.prototype
   * @type {Number|undefined}
   * @readonly
   * @private
   */
  featureCount: {
    get: function () {
      return this._featureCount;
    },
  },

  /**
   * The name of the feature table.
   *
   * @memberof GltfLegacyFeatureTable.prototype
   * @type {String}
   * @readonly
   * @private
   */
  name: {
    get: function () {
      return this._name;
    },
  },

  /**
   * Extras in the feature table JSON object from the glTF.
   *
   * @memberof GltfLegacyFeatureTable.prototype
   * @type {*}
   * @readonly
   * @private
   */
  extras: {
    get: function () {
      return this._extras;
    },
  },

  /**
   * Promise that resolves when the feature table is ready.
   *
   * @memberof GltfLegacyFeatureTable.prototype
   * @type {Promise.<GltfLegacyFeatureTable>}
   * @readonly
   * @private
   */
  readyPromise: {
    get: function () {
      return this._readyPromise;
    },
  },
});

function checkFeatureId(featureId, featureCount) {
  featureCount = defaultValue(featureCount, 0);

  if (featureCount === 0) {
    throw new DeveloperError("The feature table does not contain any features");
  }

  if (featureId < 0 || featureId >= featureCount) {
    var maximumFeatureId = featureCount - 1;
    throw new DeveloperError(
      "featureId must be between zero and featureCount - 1 (" +
        maximumFeatureId +
        ")."
    );
  }
}

function createFeatures(featureTable) {
  var featureCount = featureTable.featureCount;
  if (!defined(featureTable._features)) {
    var features = new Array(featureCount);
    for (var i = 0; i < featureCount; ++i) {
      features[i] = new GltfLegacyFeature({
        featureTable: featureTable,
        featureId: i,
      });
    }
    featureTable._features = features;
  }
}

/**
 * Returns the {@link GltfLegacyFeature} object for the feature with the
 * given <code>featureId</code>. This object is used to get and modify the
 * feature's properties.
 * <p>
 * Features in a tile are ordered by <code>featureId</code>, an index used to retrieve their metadata from the feature table.
 * </p>
 *
 * @param {Number} featureId The featureId for the feature.
 * @returns {GltfLegacyFeature} The corresponding {@link GltfLegacyFeature} object.
 *
 * @throws {DeveloperError} if <code>featureId<code> is not between zero and {@link GltfLegacyFeatureTable#featureCount} - 1.
 */
GltfLegacyFeatureTable.prototype.getFeature = function (featureId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("featureId", featureId);
  checkFeatureId(featureId, this._featureCount);
  //>>includeEnd('debug')

  createFeatures(this);
  return this._features[featureId];
};

/**
 * Get the property value of a feature.
 * <p>
 * If the property is normalized, integer data values will be normalized to [0, 1]
 * for unsigned types or [-1, 1] for signed types before being returned.
 * </p>
 *
 * @param {Number} featureId The feature ID.
 * @param {String} name The property name.
 * @param {Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4} [result] The object into which to store
 * the result for vector and matrix properties. The <code>result</code> argument is ignored for all other properties.
 * @returns {*} The value. The type of the returned value corresponds with the property's <code>type</code>.
 * For vector and matrix properties the returned object is the modified result parameter or a new instance if one was not provided
 * and may be a {@link Cartesian2}, {@link Cartesian3}, {@link Cartesian4}, {@link Matrix2}, {@link Matrix3}, or {@link Matrix4}.
 * For scalar properties a number is returned.
 * For array properties a value of the array's type is returned, which may be a string, number, boolean, or any other valid JSON type.
 *
 * @throws {DeveloperError} if <code>featureId<code> is not between zero and {@link GltfLegacyFeatureTable#featureCount} - 1.
 * @throws {DeveloperError} if the feature table does not have a property with the specified name.
 * @throws {DeveloperError} if <code>result</code>'s type doesn't match the property's type.
 *
 * @private
 */
GltfLegacyFeatureTable.prototype.getPropertyValue = function (
  featureId,
  name,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("featureId", featureId);
  Check.typeOf.string("name", name);
  checkFeatureId(featureId, this._featureCount);
  //>>includeEnd('debug');

  var property = this._properties[name];

  //>>includeStart('debug', pragmas.debug);
  if (!defined(property)) {
    throw new DeveloperError(
      'The feature table does not have a property with the name "' + name + '".'
    );
  }
  if (defined(result)) {
    var type = property.type;
    if (
      type === GltfLegacyFeatureTablePropertyType.VEC2 &&
      !(result instanceof Cartesian2)
    ) {
      throw new DeveloperError("result must be a Cartesian2");
    } else if (
      type === GltfLegacyFeatureTablePropertyType.VEC3 &&
      !(result instanceof Cartesian3)
    ) {
      throw new DeveloperError("result must be a Cartesian3");
    } else if (
      type === GltfLegacyFeatureTablePropertyType.VEC4 &&
      !(result instanceof Cartesian4)
    ) {
      throw new DeveloperError("result must be a Cartesian4");
    } else if (
      type === GltfLegacyFeatureTablePropertyType.MAT2 &&
      !(result instanceof Matrix2)
    ) {
      throw new DeveloperError("result must be a Matrix2");
    } else if (
      type === GltfLegacyFeatureTablePropertyType.MAT3 &&
      !(result instanceof Matrix3)
    ) {
      throw new DeveloperError("result must be a Matrix3");
    } else if (
      type === GltfLegacyFeatureTablePropertyType.MAT4 &&
      !(result instanceof Matrix4)
    ) {
      throw new DeveloperError("result must be a Matrix4");
    }
  }
  //>>includeEnd('debug');

  return property.getValue(featureId, result);
};

/**
 * Set the property value of a feature.
 * <p>
 * If the property is normalized, integer data values should be normalized to [0, 1]
 * for unsigned types or [-1, 1] for signed types before being passed to <code>setPropertyValue</code>.
 * </p>
 *
 * @param {Number} featureId The feature ID.
 * @param {String} name The property name.
 * @param {*} value The value. The type of the value corresponds with the property's <code>type</code>.
 * For vector and matrix properties the value may be a {@link Cartesian2}, {@link Cartesian3}, {@link Cartesian4}, {@link Matrix2}, {@link Matrix3}, or {@link Matrix4}.
 * For scalar properties the value is a number.
 * For array properties the value must be of the array's type, which may be a string, number, boolean, or any other valid JSON type.
 *
 * @throws {DeveloperError} if <code>featureId<code> is not between zero and featureCount - 1.
 * @throws {DeveloperError} if the feature table does not have a property with the specified name.
 * @throws {DeveloperError} if <code>value</code>'s type doesn't match the property's type.
 *
 * @private
 */
GltfLegacyFeatureTable.prototype.setPropertyValue = function (
  featureId,
  name,
  value
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("featureId", featureId);
  Check.typeOf.string("name", name);
  checkFeatureId(featureId, this._featureCount);
  //>>includeEnd('debug');

  var property = this._properties[name];

  //>>includeStart('debug', pragmas.debug);
  if (!defined(property)) {
    throw new DeveloperError(
      'The feature table does not have a property with the name "' + name + '".'
    );
  }
  var type = property.type;
  if (
    type === GltfLegacyFeatureTablePropertyType.VEC2 &&
    !(value instanceof Cartesian2)
  ) {
    throw new DeveloperError("value must be a Cartesian2");
  } else if (
    type === GltfLegacyFeatureTablePropertyType.VEC3 &&
    !(value instanceof Cartesian3)
  ) {
    throw new DeveloperError("value must be a Cartesian3");
  } else if (
    type === GltfLegacyFeatureTablePropertyType.VEC4 &&
    !(value instanceof Cartesian4)
  ) {
    throw new DeveloperError("value must be a Cartesian4");
  } else if (
    type === GltfLegacyFeatureTablePropertyType.MAT2 &&
    !(value instanceof Matrix2)
  ) {
    throw new DeveloperError("value must be a Matrix2");
  } else if (
    type === GltfLegacyFeatureTablePropertyType.MAT3 &&
    !(value instanceof Matrix3)
  ) {
    throw new DeveloperError("value must be a Matrix3");
  } else if (
    type === GltfLegacyFeatureTablePropertyType.MAT4 &&
    !(value instanceof Matrix4)
  ) {
    throw new DeveloperError("value must be a Matrix4");
  } else if (
    type === GltfLegacyFeatureTablePropertyType.STRING &&
    typeof value !== "string"
  ) {
    throw new DeveloperError("value must be a string");
  } else if (
    type === GltfLegacyFeatureTablePropertyType.NUMBER &&
    typeof value !== "number"
  ) {
    throw new DeveloperError("value must be a number");
  } else if (
    type === GltfLegacyFeatureTablePropertyType.BOOLEAN &&
    typeof value !== "boolean"
  ) {
    throw new DeveloperError("value must be a boolean");
  }
  //>>includeEnd('debug');

  return property.setValue(featureId, value);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see GltfLegacyFeatureTable#destroy
 *
 * @private
 */
GltfLegacyFeatureTable.prototype.isDestroyed = function () {
  return false;
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
 * @see GltfLegacyFeatureTable#isDestroyed
 *
 * @private
 */
GltfLegacyFeatureTable.prototype.destroy = function () {
  var properties = this._properties;
  for (var name in properties) {
    if (properties.hasOwnProperty(name)) {
      var property = properties[name];
      property.destroy();
    }
  }

  return destroyObject(this);
};

export default GltfLegacyFeatureTable;
