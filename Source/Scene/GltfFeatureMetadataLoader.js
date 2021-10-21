import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import when from "../ThirdParty/when.js";
import parseFeatureMetadata from "./parseFeatureMetadata.js";
import parseFeatureMetadataLegacy from "./parseFeatureMetadataLegacy.js";
import ResourceCache from "./ResourceCache.js";
import ResourceLoader from "./ResourceLoader.js";
import ResourceLoaderState from "./ResourceLoaderState.js";

/**
 * Loads glTF feature metadata
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias GltfFeatureMetadataLoader
 * @constructor
 * @augments ResourceLoader
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {String} [options.extension] The <code>EXT_mesh_features</code> extension object. If this is undefined, then extensionLegacy must be defined.
 * @param {String} [options.extensionLegacy] The legacy <code>EXT_feature_metadata</code> extension for backwards compatibility.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {SupportedImageFormats} options.supportedImageFormats The supported image formats.
 * @param {String} [options.cacheKey] The cache key of the resource.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function GltfFeatureMetadataLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var extension = options.extension;
  var extensionLegacy = options.extensionLegacy;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var supportedImageFormats = options.supportedImageFormats;
  var cacheKey = options.cacheKey;
  var asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.object("options.supportedImageFormats", supportedImageFormats);

  if (!defined(options.extension) && !defined(options.extensionLegacy)) {
    throw new DeveloperError(
      "One of options.extension or options.extensionLegacy must be specified"
    );
  }
  //>>includeEnd('debug');

  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._gltf = gltf;
  this._extension = extension;
  this._extensionLegacy = extensionLegacy;
  this._supportedImageFormats = supportedImageFormats;
  this._cacheKey = cacheKey;
  this._asynchronous = asynchronous;
  this._bufferViewLoaders = [];
  this._textureLoaders = [];
  this._schemaLoader = undefined;
  this._featureMetadata = undefined;
  this._state = ResourceLoaderState.UNLOADED;
  this._promise = when.defer();
}

if (defined(Object.create)) {
  GltfFeatureMetadataLoader.prototype = Object.create(ResourceLoader.prototype);
  GltfFeatureMetadataLoader.prototype.constructor = GltfFeatureMetadataLoader;
}

Object.defineProperties(GltfFeatureMetadataLoader.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof GltfFeatureMetadataLoader.prototype
   *
   * @type {Promise.<GltfFeatureMetadataLoader>}
   * @readonly
   * @private
   */
  promise: {
    get: function () {
      return this._promise.promise;
    },
  },
  /**
   * The cache key of the resource.
   *
   * @memberof GltfFeatureMetadataLoader.prototype
   *
   * @type {String}
   * @readonly
   * @private
   */
  cacheKey: {
    get: function () {
      return this._cacheKey;
    },
  },
  /**
   * Feature metadata.
   *
   * @memberof GltfFeatureMetadataLoader.prototype
   *
   * @type {FeatureMetadata}
   * @readonly
   * @private
   */
  featureMetadata: {
    get: function () {
      return this._featureMetadata;
    },
  },
});

/**
 * Loads the resource.
 * @private
 */
GltfFeatureMetadataLoader.prototype.load = function () {
  var bufferViewsPromise = loadBufferViews(this);
  var texturesPromise = loadTextures(this);
  var schemaPromise = loadSchema(this);

  this._gltf = undefined; // No longer need to hold onto the glTF
  this._state = ResourceLoaderState.LOADING;

  var that = this;

  when
    .all([bufferViewsPromise, texturesPromise, schemaPromise])
    .then(function (results) {
      if (that.isDestroyed()) {
        return;
      }
      var bufferViews = results[0];
      var textures = results[1];
      var schema = results[2];

      if (defined(that._extension)) {
        that._featureMetadata = parseFeatureMetadata({
          extension: that._extension,
          schema: schema,
          bufferViews: bufferViews,
          textures: textures,
        });
      } else {
        that._featureMetadata = parseFeatureMetadataLegacy({
          extension: that._extensionLegacy,
          schema: schema,
          bufferViews: bufferViews,
          textures: textures,
        });
      }
      that._state = ResourceLoaderState.READY;
      that._promise.resolve(that);
    })
    .otherwise(function (error) {
      if (that.isDestroyed()) {
        return;
      }
      that.unload();
      that._state = ResourceLoaderState.FAILED;
      var errorMessage = "Failed to load feature metadata";
      that._promise.reject(that.getError(errorMessage, error));
    });
};

function gatherBufferViewIdsFromProperties(properties, bufferViewIdSet) {
  for (var propertyId in properties) {
    if (properties.hasOwnProperty(propertyId)) {
      var property = properties[propertyId];
      var bufferView = property.bufferView;
      var arrayOffsetBufferView = property.arrayOffsetBufferView;
      var stringOffsetBufferView = property.stringOffsetBufferView;

      // Using an object like a mathematical set
      if (defined(bufferView)) {
        bufferViewIdSet[bufferView] = true;
      }
      if (defined(arrayOffsetBufferView)) {
        bufferViewIdSet[arrayOffsetBufferView] = true;
      }
      if (defined(stringOffsetBufferView)) {
        bufferViewIdSet[stringOffsetBufferView] = true;
      }
    }
  }
}

function gatherUsedBufferViewIds(extension) {
  var propertyTables = extension.propertyTables;
  var bufferViewIdSet = {};
  if (defined(propertyTables)) {
    for (var i = 0; i < propertyTables.length; i++) {
      var propertyTable = propertyTables[i];
      gatherBufferViewIdsFromProperties(
        propertyTable.properties,
        bufferViewIdSet
      );
    }
  }
  return bufferViewIdSet;
}

function gatherUsedBufferViewIdsLegacy(extensionLegacy) {
  var featureTables = extensionLegacy.featureTables;

  var bufferViewIdSet = {};
  if (defined(featureTables)) {
    for (var featureTableId in featureTables) {
      if (featureTables.hasOwnProperty(featureTableId)) {
        var featureTable = featureTables[featureTableId];
        var properties = featureTable.properties;
        if (defined(properties)) {
          gatherBufferViewIdsFromProperties(properties, bufferViewIdSet);
        }
      }
    }
  }
  return bufferViewIdSet;
}

function loadBufferViews(featureMetadataLoader) {
  var bufferViewIds;
  if (defined(featureMetadataLoader._extension)) {
    bufferViewIds = gatherUsedBufferViewIds(featureMetadataLoader._extension);
  } else {
    bufferViewIds = gatherUsedBufferViewIdsLegacy(
      featureMetadataLoader._extensionLegacy
    );
  }

  // Load the buffer views
  var bufferViewPromises = [];
  var bufferViewLoaders = {};
  for (var bufferViewId in bufferViewIds) {
    if (bufferViewIds.hasOwnProperty(bufferViewId)) {
      var bufferViewLoader = ResourceCache.loadBufferView({
        gltf: featureMetadataLoader._gltf,
        bufferViewId: parseInt(bufferViewId),
        gltfResource: featureMetadataLoader._gltfResource,
        baseResource: featureMetadataLoader._baseResource,
      });
      bufferViewPromises.push(bufferViewLoader.promise);
      featureMetadataLoader._bufferViewLoaders.push(bufferViewLoader);
      bufferViewLoaders[bufferViewId] = bufferViewLoader;
    }
  }

  // Return a promise to a map of buffer view IDs to typed arrays
  return when.all(bufferViewPromises).then(function () {
    var bufferViews = {};
    for (var bufferViewId in bufferViewLoaders) {
      if (bufferViewLoaders.hasOwnProperty(bufferViewId)) {
        var bufferViewLoader = bufferViewLoaders[bufferViewId];
        // Copy the typed array and let the underlying ArrayBuffer be freed
        var bufferViewTypedArray = new Uint8Array(bufferViewLoader.typedArray);
        bufferViews[bufferViewId] = bufferViewTypedArray;
      }
    }

    // Buffer views can be unloaded after the data has been copied
    unloadBufferViews(featureMetadataLoader);

    return bufferViews;
  });
}

function gatherUsedTextureIds(extension) {
  // Gather the used textures
  var textureIds = {};
  var propertyTextures = extension.propertyTextures;
  if (defined(propertyTextures)) {
    for (var i = 0; i < propertyTextures.length; i++) {
      var propertyTexture = propertyTextures[i];
      if (defined(propertyTexture.properties)) {
        // The property texture JSON is also a glTF textureInfo
        textureIds[propertyTexture.index] = propertyTexture;
      }
    }
  }
  return textureIds;
}

function gatherTextureIdsFromProperties(properties, textureIds) {
  for (var propertyId in properties) {
    if (properties.hasOwnProperty(propertyId)) {
      var property = properties[propertyId];
      var textureInfo = property.texture;
      textureIds[textureInfo.index] = textureInfo;
    }
  }
}

function gatherUsedTextureIdsLegacy(extensionLegacy) {
  // Gather the used textures
  var textureIds = {};
  var featureTextures = extensionLegacy.featureTextures;
  if (defined(featureTextures)) {
    for (var featureTextureId in featureTextures) {
      if (featureTextures.hasOwnProperty(featureTextureId)) {
        var featureTexture = featureTextures[featureTextureId];
        var properties = featureTexture.properties;
        if (defined(properties)) {
          gatherTextureIdsFromProperties(properties, textureIds);
        }
      }
    }
  }

  return textureIds;
}

function loadTextures(featureMetadataLoader) {
  var textureIds;
  if (defined(featureMetadataLoader._extension)) {
    textureIds = gatherUsedTextureIds(featureMetadataLoader._extension);
  } else {
    textureIds = gatherUsedTextureIdsLegacy(
      featureMetadataLoader._extensionLegacy
    );
  }

  var gltf = featureMetadataLoader._gltf;
  var gltfResource = featureMetadataLoader._gltfResource;
  var baseResource = featureMetadataLoader._baseResource;
  var supportedImageFormats = featureMetadataLoader._supportedImageFormats;
  var asynchronous = featureMetadataLoader._asynchronous;

  // Load the textures
  var texturePromises = [];
  var textureLoaders = {};
  for (var textureId in textureIds) {
    if (textureIds.hasOwnProperty(textureId)) {
      var textureLoader = ResourceCache.loadTexture({
        gltf: gltf,
        textureInfo: textureIds[textureId],
        gltfResource: gltfResource,
        baseResource: baseResource,
        supportedImageFormats: supportedImageFormats,
        asynchronous: asynchronous,
      });
      texturePromises.push(textureLoader.promise);
      featureMetadataLoader._textureLoaders.push(textureLoader);
      textureLoaders[textureId] = textureLoader;
    }
  }

  // Return a promise to a map of texture IDs to Texture objects
  return when.all(texturePromises).then(function () {
    var textures = {};
    for (var textureId in textureLoaders) {
      if (textureLoaders.hasOwnProperty(textureId)) {
        var textureLoader = textureLoaders[textureId];
        textures[textureId] = textureLoader.texture;
      }
    }
    return textures;
  });
}

function loadSchema(featureMetadataLoader) {
  var extension = defaultValue(
    featureMetadataLoader._extension,
    featureMetadataLoader._extensionLegacy
  );

  var schemaLoader;
  if (defined(extension.schemaUri)) {
    var resource = featureMetadataLoader._baseResource.getDerivedResource({
      url: extension.schemaUri,
    });
    schemaLoader = ResourceCache.loadSchema({
      resource: resource,
    });
  } else {
    schemaLoader = ResourceCache.loadSchema({
      schema: extension.schema,
    });
  }

  featureMetadataLoader._schemaLoader = schemaLoader;

  return schemaLoader.promise.then(function (schemaLoader) {
    return schemaLoader.schema;
  });
}

/**
 * Processes the resource until it becomes ready.
 *
 * @param {FrameState} frameState The frame state.
 * @private
 */
GltfFeatureMetadataLoader.prototype.process = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  if (this._state !== ResourceLoaderState.LOADING) {
    return;
  }

  var textureLoaders = this._textureLoaders;
  var textureLoadersLength = textureLoaders.length;

  for (var i = 0; i < textureLoadersLength; ++i) {
    var textureLoader = textureLoaders[i];
    textureLoader.process(frameState);
  }
};

function unloadBufferViews(featureMetadataLoader) {
  var bufferViewLoaders = featureMetadataLoader._bufferViewLoaders;
  var bufferViewLoadersLength = bufferViewLoaders.length;
  for (var i = 0; i < bufferViewLoadersLength; ++i) {
    ResourceCache.unload(bufferViewLoaders[i]);
  }
  featureMetadataLoader._bufferViewLoaders.length = 0;
}

function unloadTextures(featureMetadataLoader) {
  var textureLoaders = featureMetadataLoader._textureLoaders;
  var textureLoadersLength = textureLoaders.length;
  for (var i = 0; i < textureLoadersLength; ++i) {
    ResourceCache.unload(textureLoaders[i]);
  }
  featureMetadataLoader._textureLoaders.length = 0;
}

/**
 * Unloads the resource.
 * @private
 */
GltfFeatureMetadataLoader.prototype.unload = function () {
  unloadBufferViews(this);
  unloadTextures(this);

  if (defined(this._schemaLoader)) {
    ResourceCache.unload(this._schemaLoader);
  }
  this._schemaLoader = undefined;

  this._featureMetadata = undefined;
};
