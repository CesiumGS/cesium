import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import destroyObject from "../Core/destroyObject.js";
import GltfLegacyFeatureTablePropertyType from "./GltfLegacyFeatureTablePropertyType.js";
import when from "../ThirdParty/when.js";

/**
 * A feature table descriptor property.
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
 * @alias GltfLegacyFeatureTableDescriptorProperty
 * @constructor
 *
 * @private
 */
function GltfLegacyFeatureTableDescriptorProperty(options) {
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

  var type = property.descriptor.type;

  // Clone so that this object doesn't hold on to a reference to the gltf JSON
  var extras = clone(property.extras, true);

  this._name = name;
  this._semantic = property.semantic;
  this._type = GltfLegacyFeatureTablePropertyType.getTypeFromAccessorType(type);
  this._extras = extras;
  this._readyPromise = when.resolve(this);
}

Object.defineProperties(GltfLegacyFeatureTableDescriptorProperty.prototype, {
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
 * Implements the {@link GltfLegacyFeatureTableProperty} interface
 *
 * @private
 */
GltfLegacyFeatureTableDescriptorProperty.prototype.getValue = function () {
  return undefined;
};

/**
 * Implements the {@link GltfLegacyFeatureTableProperty} interface.
 *
 * @private
 */
GltfLegacyFeatureTableDescriptorProperty.prototype.setValue = function () {};

GltfLegacyFeatureTableDescriptorProperty.prototype.isDestroyed = function () {
  return false;
};

GltfLegacyFeatureTableDescriptorProperty.prototype.destroy = function () {
  return destroyObject(this);
};

export default GltfLegacyFeatureTableDescriptorProperty;
