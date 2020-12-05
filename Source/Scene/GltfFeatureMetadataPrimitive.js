import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import destroyObject from "../Core/destroyObject.js";
import GltfFeatureIdAttribute from "./GltfFeatureIdAttribute.js";
import GltfFeatureIdTexture from "./GltfFeatureIdTexture.js";
import when from "../ThirdParty/when.js";
import defined from "../Core/defined.js";

/**
 * A primitive with the feature metadata extension.
 *
 * @param {Object} options Object with the following properties:
 * @param {GltfContainer} options.gltfContainer The glTF container.
 * @param {Object} options.primitive The primitive JSON object from the glTF.
 * @param {GltfFeatureTable[]} options.featureTables An array of feature tables.
 * @param {Number} options.meshId The mesh ID.
 * @param {Number} options.primitiveId The primitive ID.
 * @param {GltfFeatureMetadataCache} options.cache The feature metadata cache.
 *
 * @alias GltfFeatureMetadataPrimitive
 * @constructor
 *
 * @private
 */
function GltfFeatureMetadataPrimitive(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltfContainer = options.gltfContainer;
  var primitive = options.primitive;
  var featureTables = options.featureTables;
  var meshId = options.meshId;
  var primitiveId = options.primitiveId;
  var cache = options.cache;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltfContainer", gltfContainer);
  Check.typeOf.object("options.primitive", primitive);
  Check.defined("options.featureTables", featureTables);
  Check.typeOf.number("options.meshId", meshId);
  Check.typeOf.number("options.primitiveId", primitiveId);
  Check.typeOf.object("options.cache", cache);
  //>>includeEnd('debug');

  var featureMetadataExtension = primitive.extensions.EXT_feature_metadata;
  var featureIdAttributes = featureMetadataExtension.featureIdAttributes;
  var featureIdTextures = featureMetadataExtension.featureIdTextures;

  featureIdAttributes = defined(featureIdAttributes) ? featureIdAttributes : [];
  featureIdTextures = defined(featureIdTextures) ? featureIdTextures : [];

  featureIdAttributes = featureIdAttributes.map(function (featureIdAttribute) {
    return new GltfFeatureIdAttribute({
      gltfContainer: gltfContainer,
      primitive: primitive,
      featureIdAttribute: featureIdAttribute,
      featureTable: featureTables[featureIdAttribute.featureTable],
      cache: cache,
    });
  });

  featureIdTextures = featureIdTextures.map(function (featureIdTexture) {
    return new GltfFeatureIdTexture({
      gltfContainer: gltfContainer,
      featureIdTexture: featureIdTexture,
      featureTable: featureTables[featureIdTexture.featureTable],
      cache: cache,
    });
  });

  var promises = [];
  featureIdAttributes.forEach(function (featureIdAttribute) {
    promises.push(featureIdAttribute.readyPromise);
  });
  featureIdTextures.forEach(function (featureIdTexture) {
    promises.push(featureIdTexture.readyPromise);
  });

  // TODO: support feature textures

  var that = this;
  var readyPromise = when.all(promises).then(function () {
    return that;
  });

  this._featureIdAttributes = featureIdAttributes;
  this._featureIdTextures = featureIdTextures;
  this._meshId = meshId;
  this._primitiveId = primitiveId;
  this._readyPromise = readyPromise;
}

Object.defineProperties(GltfFeatureMetadataPrimitive.prototype, {
  /**
   * Feature ID attributes.
   *
   * @memberof GltfFeatureMetadataPrimitive.prototype
   * @type {GltfFeatureIdAttribute[]}
   * @readonly
   * @private
   */
  featureIdAttributes: {
    get: function () {
      return this._featureIdAttributes;
    },
  },

  /**
   * Feature ID textures.
   *
   * @memberof GltfFeatureMetadataPrimitive.prototype
   * @type {GltfFeatureIdTexture[]}
   * @readonly
   * @private
   */
  featureIdTextures: {
    get: function () {
      return this._featureIdTextures;
    },
  },

  /**
   * Promise that resolves when the primitive is ready.
   *
   * @memberof GltfFeatureMetadataPrimitive.prototype
   * @type {Promise.<GltfFeatureMetadataPrimitive>}
   * @readonly
   * @private
   */
  readyPromise: {
    get: function () {
      return this._readyPromise;
    },
  },
});

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see GltfFeatureMetadataPrimitive#destroy
 *
 * @private
 */
GltfFeatureMetadataPrimitive.prototype.isDestroyed = function () {
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
 * @see GltfFeatureMetadataPrimitive#isDestroyed
 *
 * @private
 */
GltfFeatureMetadataPrimitive.prototype.destroy = function () {
  this._featureIdAttributes.forEach(function (featureIdAttribute) {
    featureIdAttribute.destroy();
  });
  this._featureIdTextures.forEach(function (featureIdTexture) {
    featureIdTexture.destroy();
  });

  return destroyObject(this);
};

export default GltfFeatureMetadataPrimitive;
