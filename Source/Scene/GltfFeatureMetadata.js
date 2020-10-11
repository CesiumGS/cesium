import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import destroyObject from "../Core/destroyObject.js";
import GltfContainer from "./GltfContainer.js";
import GltfFeatureClass from "./GltfFeatureClass.js";
import GltfFeatureMetadataPrimitive from "./GltfFeatureMetadataPrimitive.js";
import GltfFeatureTable from "./GltfFeatureTable.js";
import defined from "../Core/defined.js";
import when from "../ThirdParty/when.js";

/**
 * Internal representation of the glTF feature metadata extension: EXT_feature_metadata.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON object.
 * @param {Object} options.featureMetadata The feature metadata JSON object from the glTF.
 * @param {GltfFeatureMetadataCache} options.cache The feature metadata cache.
 *
 * @alias GltfFeatureMetadata
 * @constructor
 *
 * @private
 */
function GltfFeatureMetadata(options) {
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

  var featureClasses = {};
  for (var featureClassId in featureMetadata.featureClasses) {
    if (featureMetadata.featureClasses.hasOwnProperty(featureClassId)) {
      featureClasses[featureClassId] = new GltfFeatureClass({
        id: featureClassId,
        featureClass: featureMetadata.featureClasses[featureClassId],
      });
    }
  }

  var featureTables = {};
  for (var featureTableId in featureMetadata.featureTables) {
    if (featureMetadata.featureTables.hasOwnProperty(featureTableId)) {
      var featureTable = featureMetadata.featureTables[featureTableId];
      var featureClass = featureClasses[featureTable.featureClass];
      featureTables[featureTableId] = new GltfFeatureTable({
        gltfContainer: gltfContainer,
        id: featureTableId,
        featureTable: featureTable,
        featureClass: featureClass,
        cache: cache,
      });
    }
  }

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
        var hasPrimitiveExtension =
          defined(primitive.extensions) &&
          defined(primitive.extensions.EXT_feature_metadata);

        var hasMaterialExtension = false;
        if (defined(primitive.material)) {
          var material = gltf.materials[primitive.material];
          hasMaterialExtension =
            defined(material.extensions) &&
            defined(material.extensions.EXT_feature_metadata);
        }

        if (hasPrimitiveExtension || hasMaterialExtension) {
          metadataPrimitives.push(
            new GltfFeatureMetadataPrimitive({
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

  var promises = metadataPrimitives.map(function (primitive) {
    return primitive.readyPromise;
  });

  var that = this;
  var readyPromise = when.all(promises).then(function () {
    return that;
  });

  this._featureClasses = featureClasses;
  this._featureTables = featureTables;
  this._primitives = metadataPrimitives;
  this._extras = clone(featureMetadata.extras, true); // Clone so that this object doesn't hold on to a reference to the gltf JSON
  this._readyPromise = readyPromise;
}

Object.defineProperties(GltfFeatureMetadata.prototype, {
  /**
   * Feature classes in the feature metadata extension.
   *
   * @memberof GltfFeatureMetadata.prototype
   * @type {Object.<String, GltfFeatureClass>}
   * @readonly
   * @private
   */
  featureClasses: {
    get: function () {
      return this._featureClasses;
    },
  },

  /**
   * Feature tables in the feature metadata extension.
   *
   * @memberof GltfFeatureMetadata.prototype
   * @type {Object.<String, GltfFeatureTable>}
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
   * @memberof GltfFeatureMetadata.prototype
   * @type {GltfFeatureMetadataPrimitive[]}
   * @readonly
   * @private
   */
  primitives: {
    get: function () {
      return this._primitives;
    },
  },

  /**
   * Extras in the feature metadata JSON object from the glTF.
   *
   * @memberof GltfFeatureMetadata.prototype
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
   * @memberof GltfFeatureMetadata.prototype
   * @type {Promise.<GltfFeatureMetadata>}
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
 * @see GltfFeatureMetadata#destroy
 *
 * @private
 */
GltfFeatureMetadata.prototype.isDestroyed = function () {
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
 * @see GltfFeatureMetadata#isDestroyed
 *
 * @private
 */
GltfFeatureMetadata.prototype.destroy = function () {
  var featureTables = this._featureTables;
  for (var featureTableId in featureTables) {
    if (featureTables.hasOwnProperty(featureTableId)) {
      featureTables[featureTableId].destroy();
    }
  }

  this._primitives.forEach(function (primitive) {
    primitive.destroy();
  });

  return destroyObject(this);
};

export default GltfFeatureMetadata;
