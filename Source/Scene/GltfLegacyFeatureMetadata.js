import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import destroyObject from "../Core/destroyObject.js";
import GltfContainer from "./GltfContainer.js";
import GltfLegacyFeatureMetadataPrimitive from "./GltfLegacyFeatureMetadataPrimitive.js";
import GltfLegacyFeatureTable from "./GltfLegacyFeatureTable.js";
import defined from "../Core/defined.js";
import when from "../ThirdParty/when.js";

/**
 * Internal representation of the glTF feature metadata extension: EXT_3dtiles_feature_metadata.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON object.
 * @param {Object} options.featureMetadata The feature metadata JSON object from the glTF.
 * @param {GltfFeatureMetadataCache} options.cache The feature metadata cache.
 *
 * @alias GltfLegacyFeatureMetadata
 * @constructor
 *
 * @private
 */
function GltfLegacyFeatureMetadata(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var featureMetadata = options.featureMetadata;
  var cache = options.cache;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.featureMetadata", featureMetadata);
  Check.typeOf.object("options.cache", cache);
  //>>includeEnd('debug');

  var gltfContainer = new GltfContainer({
    gltf: gltf,
  });

  var featureTables = featureMetadata.featureTables;
  featureTables = featureTables.map(function (featureTable) {
    return new GltfLegacyFeatureTable({
      gltfContainer: gltfContainer,
      featureTable: featureTable,
      cache: cache,
    });
  });

  var metadataPrimitives = [];
  var meshes = gltf.meshes;
  if (defined(meshes)) {
    var meshesLength = meshes.length;
    for (var i = 0; i < meshesLength; ++i) {
      var mesh = meshes[i];
      var primitives = mesh.primitives;
      var primitivesLength = primitives.length;
      for (var j = 0; j < primitivesLength; ++j) {
        var primitive = primitives[j];
        var extensions = primitive.extensions;
        if (defined(extensions)) {
          var featureMetadataExtension =
            extensions.EXT_3dtiles_feature_metadata;
          if (defined(featureMetadataExtension)) {
            metadataPrimitives.push(
              new GltfLegacyFeatureMetadataPrimitive({
                gltfContainer: gltfContainer,
                primitive: primitive,
                featureTables: featureTables,
                meshId: i,
                primitiveId: j,
                cache: cache,
              })
            );
          }
        }
      }
    }
  }

  var primitivePromises = metadataPrimitives.map(function (primitive) {
    return primitive.readyPromise;
  });

  var that = this;
  var readyPromise = when.all(primitivePromises).then(function () {
    return that;
  });

  // Clone so that this object doesn't hold on to a reference to the glTF JSON
  var extras = clone(featureMetadata.extras, true);

  this._featureTables = featureTables;
  this._primitives = metadataPrimitives;
  this._extras = extras;
  this._readyPromise = readyPromise;
}

Object.defineProperties(GltfLegacyFeatureMetadata.prototype, {
  /**
   * Feature tables in the feature metadata extension.
   *
   * @memberof GltfLegacyFeatureMetadata.prototype
   * @type {GltfLegacyFeatureTable[]}
   * @readonly
   * @private
   */
  featureTables: {
    get: function () {
      return this._featureTables;
    },
  },

  /**
   * Primitives with the feature metadata extension.
   *
   * @memberof GltfLegacyFeatureMetadata.prototype
   * @type {GltfLegacyFeatureMetadataPrimitive[]}
   * @readonly
   * @private
   */
  primitives: {
    get: function () {
      return this._primitives;
    },
  },

  /**
   * Extras in the feature property JSON object from the glTF.
   *
   * @memberof GltfLegacyFeatureMetadata.prototype
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
   * Promise that resolves when the feature metadata is ready.
   *
   * @memberof GltfLegacyFeatureMetadata.prototype
   * @type {Promise.<GltfLegacyFeatureMetadata>}
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
 * @see GltfLegacyFeatureMetadata#destroy
 *
 * @private
 */
GltfLegacyFeatureMetadata.prototype.isDestroyed = function () {
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
 * @see GltfLegacyFeatureMetadata#isDestroyed
 *
 * @private
 */
GltfLegacyFeatureMetadata.prototype.destroy = function () {
  this._featureTables.forEach(function (featureTable) {
    featureTable.destroy();
  });

  this._primitives.forEach(function (primitive) {
    primitive.destroy();
  });

  return destroyObject(this);
};

export default GltfLegacyFeatureMetadata;
