import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import destroyObject from "../Core/destroyObject.js";
import GltfFeatureAttributeMapping from "./GltfFeatureAttributeMapping.js";
import GltfFeatureTextureMapping from "./GltfFeatureTextureMapping.js";
import when from "../ThirdParty/when.js";
import defined from "../Core/defined.js";

/**
 * A primitive contain feature mappings.
 *
 * @param {Object} options Object with the following properties:
 * @param {GltfContainer} options.gltfContainer The glTF container.
 * @param {Object} options.primitive The primitive JSON object from the glTF.
 * @param {GltfFeatureTable[]} options.featureTables An array of feature tables.
 * @param {Number} options.meshId The mesh ID.
 * @param {Number} options.primitive The primitive ID.
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

  var i;
  var featureMapping;
  var featureTable;

  var featureMetadataExtension = primitive.extensions.EXT_feature_metadata;
  var featureMappings = featureMetadataExtension.featureMappings;
  var featureMappingsLength = featureMappings.length;
  var featureAttributeMappings = new Array(featureMappingsLength);
  for (i = 0; i < featureMappingsLength; ++i) {
    featureMapping = featureMappings[i];
    featureTable = featureTables[featureMapping.featureTable];
    featureAttributeMappings[i] = new GltfFeatureAttributeMapping({
      gltfContainer: gltfContainer,
      primitive: primitive,
      featureMapping: featureMapping,
      featureTable: featureTable,
      cache: cache,
    });
  }

  var featureTextureMappings = [];
  var material = primitive.material;
  if (
    defined(material) &&
    defined(material.extensions) &&
    defined(material.extensions.EXT_feature_metadata)
  ) {
    var textures = material.extensions.EXT_feature_metadata.textures;
    var texturesLength = textures.length;
    for (i = 0; i < texturesLength; ++i) {
      var textureInfo = textures[i];
      var textureIndex = textureInfo.index;
      var texture = gltfContainer.gltf.textures[textureIndex];
      featureMetadataExtension = texture.extensions.EXT_feature_metadata;
      featureMappings = featureMetadataExtension.featureMappings;
      featureMappingsLength = featureMappings.length;
      for (var j = 0; j < featureMappingsLength; ++j) {
        featureMapping = featureMappings[j];
        featureTable = featureTables[featureMapping.featureTable];
        featureTextureMappings.push(
          new GltfFeatureTextureMapping({
            gltfContainer: gltfContainer,
            texture: texture,
            textureId: textureIndex,
            textureInfo: textureInfo,
            featureMapping: featureMapping,
            featureTable: featureTable,
            cache: cache,
          })
        );
      }
    }
  }

  var attributePromises = featureAttributeMappings.map(function (
    featureAttributeMapping
  ) {
    return featureAttributeMapping.readyPromise;
  });

  var texturePromises = featureTextureMappings.map(function (
    featureTextureMapping
  ) {
    return featureTextureMapping.readyPromise;
  });

  var promises = attributePromises.concat(texturePromises);

  var that = this;
  var readyPromise = when.all(promises).then(function () {
    return that;
  });

  this._featureAttributeMappings = featureAttributeMappings;
  this._featureTextureMappings = featureTextureMappings;
  this._meshId = meshId;
  this._primitiveId = primitiveId;
  this._readyPromise = readyPromise;
}

Object.defineProperties(GltfFeatureMetadataPrimitive.prototype, {
  /**
   * Feature attribute mappings.
   *
   * @memberof GltfFeatureMetadataPrimitive.prototype
   * @type {GltfFeatureAttributeMapping[]}
   * @readonly
   * @private
   */
  featureAttributeMappings: {
    get: function () {
      return this._featureAttributeMappings;
    },
  },

  /**
   * Feature texture mappings.
   *
   * @memberof GltfFeatureMetadataPrimitive.prototype
   * @type {GltfFeatureTextureMapping[]}
   * @readonly
   * @private
   */
  featureTextureMappings: {
    get: function () {
      return this._featureTextureMappings;
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
  this._featureAttributeMappings.forEach(function (featureAttributeMapping) {
    featureAttributeMapping.destroy();
  });
  this._featureTextureMappings.forEach(function (featureTextureMappings) {
    featureTextureMappings.destroy();
  });

  return destroyObject(this);
};

export default GltfFeatureMetadataPrimitive;
