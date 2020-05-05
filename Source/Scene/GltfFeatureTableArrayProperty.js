import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import GltfFeatureTablePropertyType from "./GltfFeatureTablePropertyType.js";
import when from "../ThirdParty/when.js";

/**
 * A feature table array property.
 * <p>
 * Implements the {@link GltfFeatureTableProperty} interface.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON object.
 * @param {String} options.name The name of the property.
 * @param {Object} options.property The feature property JSON object from the glTF.
 * @param {GltfFeatureMetadataCache} options.cache The feature metadata cache.
 *
 * @alias GltfFeatureTableArrayProperty
 * @constructor
 *
 * @private
 */
function GltfFeatureTableArrayProperty(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var name = options.name;
  var property = options.property;
  var cache = options.cache;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.string("options.name", name);
  Check.typeOf.object("options.property", property);
  Check.typeOf.object("options.cache", cache);
  //>>includeEnd('debug');

  var array = property.array;
  var external = array.external;

  var readyPromise;

  var that = this;
  if (defined(external)) {
    readyPromise = cache
      .getJson({
        uri: external.uri,
      })
      .then(function (cacheItem) {
        if (defined(cacheItem)) {
          that._values = cacheItem.contents[external.key];
          that._cacheItem = cacheItem;
        }
        return that;
      });
  } else {
    readyPromise = when.resolve(this);
  }

  // Clone so that this object doesn't hold on to a reference to the gltf JSON
  var values = clone(array.values, true);
  var extras = clone(property.extras, true);

  this._values = values;
  this._cache = cache;
  this._cacheItem = undefined;
  this._name = name;
  this._semantic = property.semantic;
  this._type = GltfFeatureTablePropertyType.getTypeFromArrayType(array.type);
  this._extras = extras;
  this._readyPromise = readyPromise;
}

Object.defineProperties(GltfFeatureTableArrayProperty.prototype, {
  /**
   * @inheritdoc GltfFeatureTableProperty#name
   */
  name: {
    get: function () {
      return this._name;
    },
  },

  /**
   * @inheritdoc GltfFeatureTableProperty#name
   */
  semantic: {
    get: function () {
      return this._semantic;
    },
  },

  /**
   * @inheritdoc GltfFeatureTableProperty#name
   */
  type: {
    get: function () {
      return this._type;
    },
  },

  /**
   * @inheritdoc GltfFeatureTableProperty#name
   */
  extras: {
    get: function () {
      return this._extras;
    },
  },

  /**
   * @inheritdoc GltfFeatureTableProperty#name
   */
  readyPromise: {
    get: function () {
      return this._readyPromise;
    },
  },
});

/**
 * Get the property value of a feature.
 *
 * @param {Number} featureId The feature ID.
 * @returns {*} The value. A value of the array's type is returned, which may be a string, number, boolean, or any other valid JSON type.
 *
 * @private
 */
GltfFeatureTableArrayProperty.prototype.getValue = function (featureId) {
  var values = this._values;

  if (!defined(values)) {
    return undefined;
  }

  return clone(values[featureId], true);
};

/**
 * Set the property value of a feature.
 *
 * @param {Number} featureId The feature ID.
 * @param {*} value The value. The value must be of the array's type, which may be a string, number, boolean, or any other valid JSON type.
 *
 * @private
 */
GltfFeatureTableArrayProperty.prototype.setValue = function (featureId, value) {
  var values = this._values;

  if (!defined(values)) {
    return;
  }

  if (defined(this._cacheItem)) {
    // Clone on demand if modifying values that are in the cache
    values = clone(values, true);
    this._values = values;
    this._cacheItem = undefined;
  }

  values[featureId] = clone(value, true);
};

/**
 * @inheritdoc GltfFeatureTableProperty#name
 */
GltfFeatureTableArrayProperty.prototype.isDestroyed = function () {
  return false;
};

/**
 * @inheritdoc GltfFeatureTableProperty#name
 */
GltfFeatureTableArrayProperty.prototype.destroy = function () {
  var cache = this._cache;
  var cacheItem = this._cacheItem;

  if (defined(cacheItem)) {
    cache.releaseCacheItem({
      cacheItem: cacheItem,
    });
  }

  return destroyObject(this);
};

export default GltfFeatureTableArrayProperty;
