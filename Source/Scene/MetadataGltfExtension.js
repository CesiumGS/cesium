import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import when from "../ThirdParty/when.js";
import CacheResource from "./CacheResource.js";
import CacheResourceState from "./CacheResourceState.js";
import MetadataSchema from "./MetadataSchema.js";
import MetadataTable from "./MetadataTable.js";
import ResourceCache from "./ResourceCache.js";

/**
 * An object containing metadata about a glTF model.
 * <p>
 * See the {@link https://github.com/CesiumGS/glTF/tree/master/extensions/2.0/Vendor/EXT_feature_metadata/1.0.0|EXT_feature_metadata Extension} for glTF.
 * </p>
 * <p>
 * Implements the {@link CacheResource} interface.
 * </p>
 *
 * @alias MetadataGltfExtension
 * @constructor
 * @augments CacheResource
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {String} options.featureMetadata The feature metadata extension object.
 *
 * @private
 */
function MetadataGltfExtension(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var featureMetadata = options.featureMetadata;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.object("options.featureMetadata", featureMetadata);
  //>>includeEnd('debug');

  var schema;
  if (defined(featureMetadata.schema)) {
    schema = new MetadataSchema(featureMetadata.schema);
  }

  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._gltf = gltf;
  this._featureMetadata = featureMetadata;
  this._statistics = featureMetadata.statistics;
  this._extras = featureMetadata.extras;
  this._extensions = featureMetadata.extensions;
  this._schema = schema;
  this._bufferViewCacheResources = undefined;
  this._featureTables = undefined;
  this._state = CacheResourceState.UNLOADED;
  this._promise = when.defer();
}

Object.defineProperties(MetadataGltfExtension.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof GltfVertexBufferCacheResource.prototype
   *
   * @type {Promise.<GltfVertexBufferCacheResource>}
   * @readonly
   */
  promise: {
    get: function () {
      return this._promise.promise;
    },
  },

  /**
   * Schema containing classes and enums.
   *
   * @memberof MetadataGltfExtension.prototype
   * @type {MetadataSchema}
   * @readonly
   * @private
   */
  schema: {
    get: function () {
      return this._schema;
    },
  },

  /**
   * Feature tables.
   *
   * @memberof MetadataGltfExtension.prototype
   * @type {Object.<String, MetadataTable>}
   * @readonly
   * @private
   */
  featureTables: {
    get: function () {
      return this._featureTables;
    },
  },

  /**
   * Statistics about the metadata.
   * <p>
   * See the {@link https://github.com/CesiumGS/glTF/blob/master/extensions/2.0/Vendor/EXT_feature_metadata/1.0.0/schema/statistics.schema.json|statistics schema reference}
   * in the 3D Tiles spec for the full set of properties.
   * </p>
   *
   * @memberof MetadataGltfExtension.prototype
   * @type {Object}
   * @readonly
   * @private
   */
  statistics: {
    get: function () {
      return this._statistics;
    },
  },

  /**
   * Extras in the JSON object.
   *
   * @memberof MetadataGltfExtension.prototype
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
   * Extensions in the JSON object.
   *
   * @memberof MetadataGltfExtension.prototype
   * @type {Object}
   * @readonly
   * @private
   */
  extensions: {
    get: function () {
      return this._extensions;
    },
  },
});

/**
 * Loads the resource.
 */
MetadataGltfExtension.prototype.load = function () {
  var featureMetadata = this._featureMetadata;
  var featureTables = featureMetadata.featureTables;

  var bufferViewIds = {};

  if (defined(featureTables)) {
    for (var featureTableId in featureTables) {
      if (featureTables.hasOwnProperty(featureTableId)) {
        var featureTable = featureTables[featureTableId];
        var properties = featureTable.properties;
        if (defined(properties)) {
          for (var propertyId in properties) {
            if (properties.hasOwnProperty(propertyId)) {
              var property = properties[propertyId];
              var bufferView = property.bufferView;
              var arrayOffsetBufferView = property.arrayOffsetBufferView;
              var stringOffsetBufferView = property.stringOffsetBufferView;
              if (defined(bufferView)) {
                bufferViewIds[bufferView] = true;
              }
              if (defined(arrayOffsetBufferView)) {
                bufferViewIds[arrayOffsetBufferView] = true;
              }
              if (defined(stringOffsetBufferView)) {
                bufferViewIds[stringOffsetBufferView] = true;
              }
            }
          }
        }
      }
    }
  }

  var bufferViewCacheResources = {};

  var bufferViewPromises = [];
  for (var bufferViewId in bufferViewIds) {
    if (bufferViewIds.hasOwnProperty(bufferViewId)) {
      var bufferViewCacheResource = ResourceCache.loadBufferView({
        gltf: this._gltf,
        bufferViewId: bufferViewId,
        gltfResource: this._gltfResource,
        baseResource: this._baseResource,
        keepResident: false,
      });
      bufferViewCacheResources[bufferViewId] = bufferViewCacheResource;
      bufferViewPromises.push(bufferViewCacheResource.promise);
    }
  }

  this._bufferViewCacheResources = bufferViewCacheResources;
  this._gltf = undefined; // No longer need the glTF

  var that = this;

  when
    .all(bufferViewPromises)
    .then(function () {
      if (that._state === CacheResourceState.UNLOADED) {
        unload(that);
        return;
      }

      var bufferViews = {};
      var bufferViewCacheResources = that._bufferViewCacheResources;
      for (var bufferViewId in bufferViewCacheResources) {
        if (bufferViewCacheResources.hasOwnProperty(bufferViewId)) {
          var bufferViewCacheResource = bufferViewCacheResources[bufferViewId];
          var typedArray = bufferViewCacheResource.typedArray;
          bufferViews[bufferViewId] = typedArray;
        }
      }

      var featureTables = {};
      if (defined(featureMetadata.featureTables)) {
        for (var featureTableId in featureMetadata.featureTables) {
          if (featureMetadata.featureTables.hasOwnProperty(featureTableId)) {
            var featureTable = featureMetadata.featureTables[featureTableId];
            featureTables[featureTableId] = new MetadataTable({
              count: featureTable.count,
              properties: featureTable.properties,
              class: that._schema.classes[featureTable.class],
              bufferViews: bufferViews,
            });
          }
        }
      }

      that._featureTables = featureTables;
      that._state = CacheResourceState.READY;
      that._promise.resolve(that);
    })
    .otherwise(function (error) {
      unload(that);
      that._state = CacheResourceState.FAILED;
      var errorMessage = "Failed to load feature metadata";
      that._promise.reject(CacheResource.getError(error, errorMessage));
    });
};

function unload(metadataGltfExtension) {
  var bufferViewCacheResources =
    metadataGltfExtension._bufferViewCacheResources;
  for (var bufferViewId in bufferViewCacheResources) {
    if (bufferViewCacheResources.hasOwnProperty(bufferViewId)) {
      var bufferViewCacheResource = bufferViewCacheResources[bufferViewId];
      ResourceCache.unload(bufferViewCacheResource);
    }
  }
}

/**
 * Unloads the resource.
 */
MetadataGltfExtension.prototype.unload = function () {
  unload(this);
  this._state = CacheResourceState.UNLOADED;
};

export default MetadataGltfExtension;
