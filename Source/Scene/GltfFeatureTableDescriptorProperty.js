import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import destroyObject from "../Core/destroyObject.js";
import GltfFeatureTablePropertyType from "./GltfFeatureTablePropertyType.js";
import when from "../ThirdParty/when.js";

/**
 * A feature table descriptor property.
 * <p>
 * Implements the {@link GltfFeatureTableProperty} interface.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {GltfContainer} options.gltfContainer The glTF container.
 * @param {String} options.name The name of the property.
 * @param {Object} options.property The feature property JSON object from the glTF.
 * @param {GltfFeatureMetadataCache} options.cache The feature metadata cache.
 *
 * @alias GltfFeatureTableDescriptorProperty
 * @constructor
 *
 * @private
 */
function GltfFeatureTableDescriptorProperty(options) {
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
  this._type = GltfFeatureTablePropertyType.getTypeFromAccessorType(type);
  this._extras = extras;
  this._readyPromise = when.resolve(this);
}

Object.defineProperties(GltfFeatureTableDescriptorProperty.prototype, {
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
 * Implements the {@link GltfFeatureTableProperty} interface
 *
 * @private
 */
GltfFeatureTableDescriptorProperty.prototype.getValue = function () {
  return undefined;
};

/**
 * Implements the {@link GltfFeatureTableProperty} interface.
 *
 * @private
 */
GltfFeatureTableDescriptorProperty.prototype.setValue = function () {};

GltfFeatureTableDescriptorProperty.prototype.isDestroyed = function () {
  return false;
};

GltfFeatureTableDescriptorProperty.prototype.destroy = function () {
  return destroyObject(this);
};

export default GltfFeatureTableDescriptorProperty;
