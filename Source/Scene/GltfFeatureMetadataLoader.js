import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import when from "../ThirdParty/when.js";
import FeatureMetadata from "./FeatureMetadata.js";
import MetadataSchema from "./MetadataSchema.js";
import ResourceCache from "./ResourceCache.js";
import ResourceLoader from "./ResourceLoader.js";
import ResourceLoaderState from "./ResourceLoaderState.js";

/**
 * Loads glTF feature metadata.
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
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {String} options.extension The feature metadata extension object.
 * @param {Object.<String, Boolean>} options.supportedImageFormats The supported image formats.
 * @param {Boolean} options.supportedImageFormats.webp Whether the browser supports WebP images.
 * @param {Boolean} options.supportedImageFormats.s3tc Whether the browser supports s3tc compressed images.
 * @param {Boolean} options.supportedImageFormats.pvrtc Whether the browser supports pvrtc compressed images.
 * @param {Boolean} options.supportedImageFormats.etc1 Whether the browser supports etc1 compressed images.
 * @param {String} [options.cacheKey] The cache key of the resource.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @private
 */
export default function GltfFeatureMetadataLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var extension = options.extension;
  var supportedImageFormats = defaultValue(
    options.supportedImageFormats,
    defaultValue.EMPTY_OBJECT
  );
  var supportsWebP = supportedImageFormats.webp;
  var supportsS3tc = supportedImageFormats.s3tc;
  var supportsPvrtc = supportedImageFormats.pvrtc;
  var supportsEtc1 = supportedImageFormats.etc1;
  var cacheKey = options.cacheKey;
  var asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.object("options.extension", extension);
  Check.typeOf.boolean("options.supportedImageFormats.webp", supportsWebP);
  Check.typeOf.boolean("options.supportedImageFormats.s3tc", supportsS3tc);
  Check.typeOf.boolean("options.supportedImageFormats.pvrtc", supportsPvrtc);
  Check.typeOf.boolean("options.supportedImageFormats.etc1", supportsEtc1);
  //>>includeEnd('debug');

  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._gltf = gltf;
  this._extension = extension;
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
   */
  featureMetadata: {
    get: function () {
      return this._featureMetadata;
    },
  },
});

/**
 * Loads the resource.
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
        that.unload();
        return;
      }
      var bufferViews = results[0];
      var textures = results[1];
      var schema = results[2];

      that._featureMetadata = new FeatureMetadata({
        extension: that._extension,
        schema: schema,
        bufferViews: bufferViews,
        textures: textures,
      });
      that._state = ResourceLoaderState.READY;
      that._promise.resolve(that);
    })
    .otherwise(function (error) {
      that._unload();
      that._state = ResourceLoaderState.FAILED;
      var errorMessage = "Failed to load feature metadata";
      that._promise.reject(that.getError(error, errorMessage));
    });
};

function loadBufferViews(featureMetadataLoader) {
  var extension = featureMetadataLoader._extension;
  var featureTables = extension.featureTables;

  // Gather the used buffer views
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

  // Load the buffer views
  var bufferViewPromises = [];
  var bufferViewLoaders = {};
  for (var bufferViewId in bufferViewIds) {
    if (bufferViewIds.hasOwnProperty(bufferViewId)) {
      var bufferViewLoader = ResourceCache.loadBufferView({
        gltf: featureMetadataLoader._gltf,
        bufferViewId: bufferViewId,
        gltfResource: featureMetadataLoader._gltfResource,
        baseResource: featureMetadataLoader._baseResource,
        keepResident: false,
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
        bufferViews[bufferViewId] = bufferViewLoader.typedArray;
      }
    }
    return bufferViews;
  });
}

function loadTextures(featureMetadataLoader) {
  var extension = featureMetadataLoader._extension;
  var featureTextures = extension.featureTextures;

  var gltf = featureMetadataLoader._gltf;
  var gltfResource = featureMetadataLoader._gltfResource;
  var baseResource = featureMetadataLoader._baseResource;
  var supportedImageFormats = featureMetadataLoader._supportedImageFormats;
  var asynchronous = featureMetadataLoader._asynchronous;

  // Gather the used textures
  var textureIds = {};
  if (defined(featureTextures)) {
    for (var featureTextureId in featureTextures) {
      if (featureTextures.hasOwnProperty(featureTextureId)) {
        var featureTexture = featureTextures[featureTextureId];
        var properties = featureTexture.properties;
        if (defined(properties)) {
          for (var propertyId in properties) {
            if (properties.hasOwnProperty(propertyId)) {
              var property = properties[propertyId];
              var textureInfo = property.texture;
              textureIds[textureInfo.index] = textureInfo;
            }
          }
        }
      }
    }
  }

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
        keepResident: false,
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
  var extension = featureMetadataLoader._extension;

  var schemaLoader;
  if (defined(extension.schemaUri)) {
    var resource = featureMetadataLoader._baseResource.getDerivedResource({
      url: extension.schemaUri,
      preserveQueryParameters: true, // TODO: make this change everywhere
    });
    schemaLoader = ResourceCache.loadSchema({
      resource: resource,
      keepResident: false,
    });
  } else {
    schemaLoader = ResourceCache.loadSchema({
      schema: extension.schema,
      keepResident: false,
    });
  }

  featureMetadataLoader._schemaLoader = schemaLoader;

  return schemaLoader.promise.then(function (schemaLoader) {
    return new MetadataSchema(schemaLoader.schema);
  });
}

/**
 * Updates the resource.
 *
 * @param {FrameState} frameState The frame state.
 */
GltfFeatureMetadataLoader.prototype.update = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  if (this._state !== ResourceLoaderState.LOADING) {
    return;
  }

  var textureLoaders = this._textureLoaders;
  var textureLoadersLength = textureLoaders.length;

  for (var i; i < textureLoadersLength; ++i) {
    var textureLoader = textureLoaders[i];
    textureLoader.update(frameState);
  }
};

/**
 * Unloads the resource.
 */
GltfFeatureMetadataLoader.prototype.unload = function () {
  this._bufferViewLoaders.forEach(function (bufferViewLoader) {
    ResourceCache.unload(bufferViewLoader);
  });
  this._bufferViewLoaders = [];

  this._textureLoaders.forEach(function (textureLoader) {
    ResourceCache.unload(textureLoader);
  });
  this._textureLoaders = [];

  if (defined(this._schemaLoader)) {
    ResourceCache.unload(this._schemaLoader);
  }
  this._schemaLoader = undefined;

  this._featureMetadata = undefined;
};
