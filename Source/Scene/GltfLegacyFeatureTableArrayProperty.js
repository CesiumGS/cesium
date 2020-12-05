import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import GltfLegacyFeatureTablePropertyType from "./GltfLegacyFeatureTablePropertyType.js";
import when from "../ThirdParty/when.js";

/**
 * A feature table array property.
 * <p>
 * Implements the {@link GltfLegacyFeatureTableProperty} interface.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {GltfContainer} options.gltfContainer The glTF container.
 * @param {String} options.name The name of the property.
 * @param {Object} options.property The feature property JSON object from the glTF.
 * @param {GltfFeatureMetadataCache} options.cache The feature metadata cache.
 *
 * @alias GltfLegacyFeatureTableArrayProperty
 * @constructor
 *
 * @private
 */
function GltfLegacyFeatureTableArrayProperty(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltfContainer = options.gltfContainer;
  var name = options.name;
  var property = options.property;
  var cache = options.cache;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltfContainer", gltfContainer);
  Check.typeOf.string("options.name", name);
  Check.typeOf.object("options.property", property);
  Check.typeOf.object("options.cache", cache);
  //>>includeEnd('debug');

  var array = property.array;
  var type = defaultValue(array.type, "any");
  var external = array.external;

  // Clone so that this object doesn't hold on to a reference to the glTF JSON
  var values = clone(array.values, true);
  var extras = clone(property.extras, true);

  this._values = values;
  this._cache = cache;
  this._cacheItem = undefined;
  this._name = name;
  this._semantic = property.semantic;
  this._type = GltfLegacyFeatureTablePropertyType.getTypeFromArrayType(type);
  this._extras = extras;

  var that = this;
  var readyPromise;

  if (defined(external)) {
    readyPromise = cache
      .getJson({
        uri: external.uri,
      })
      .then(function (cacheItem) {
        if (that.isDestroyed()) {
          // The feature table property was destroyed before the request came back
          cache.releaseCacheItem(cacheItem);
          return;
        }
        that._cacheItem = cacheItem;
        var json = cacheItem.contents;
        if (defined(json)) {
          that._values = json[external.key];
        }
        return that;
      });
  } else {
    readyPromise = when.resolve(this);
  }

  this._readyPromise = readyPromise;
}

Object.defineProperties(GltfLegacyFeatureTableArrayProperty.prototype, {
  name: {
    get: function () {
      return this._name;
    },
  },

  semantic: {
    get: function () {
      return this._semantic;
    },
  },

  type: {
    get: function () {
      return this._type;
    },
  },

  extras: {
    get: function () {
      return this._extras;
    },
  },

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
GltfLegacyFeatureTableArrayProperty.prototype.getValue = function (featureId) {
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
GltfLegacyFeatureTableArrayProperty.prototype.setValue = function (
  featureId,
  value
) {
  var values = this._values;
  var cache = this._cache;
  var cacheItem = this._cacheItem;

  if (!defined(values)) {
    // TODO: allocate on demand? What size array?
    return;
  }

  if (defined(cacheItem)) {
    // Clone on demand if modifying values that are in the cache
    values = clone(values, true);
    cache.releaseCacheItem(cacheItem);
    this._values = values;
    this._cacheItem = undefined;
  }

  values[featureId] = clone(value, true);
};

GltfLegacyFeatureTableArrayProperty.prototype.isDestroyed = function () {
  return false;
};

GltfLegacyFeatureTableArrayProperty.prototype.destroy = function () {
  var cache = this._cache;
  var cacheItem = this._cacheItem;

  if (defined(cacheItem)) {
    cache.releaseCacheItem(cacheItem);
  }

  return destroyObject(this);
};

export default GltfLegacyFeatureTableArrayProperty;
