import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import loadCRN from "../Core/loadCRN.js";
import loadImageFromTypedArray from "../Core/loadImageFromTypedArray.js";
import loadKTX from "../Core/loadKTX.js";
import Resource from "../Core/Resource.js";
import GltfFeatureMetadataUtility from "./GltfFeatureMetadataUtility.js";
import when from "../ThirdParty/when.js";

/**
 * Cache for feature table properties that are referenced from external files.
 * <p>
 * Calls to {@link GltfFeatureMetadataCache#getJson}, {@link GltfFeatureMetadataCache#getBuffer},
 * and {@link GltfFeatureMetadataCache#getTexture} are reference counted. Make sure to call
 * {@link GltfFeatureMetadataCache#releaseCacheItem} when the item is no longer needed.
 * </p>
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Resource|String} [options.basePath=""] The base path that paths in the glTF JSON are relative to.
 *
 * @alias GltfFeatureMetadataCache
 * @constructor
 *
 * @private
 */
function GltfFeatureMetadataCache(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var basePath = defaultValue(options.basePath, "");

  this._resource = Resource.createIfNeeded(basePath);
  this._cache = {};
  this._promiseCache = {};
}

function CacheItem(contents, uri, childCacheItem) {
  this.referenceCount = 0;
  this.contents = contents;
  this.uri = uri;
  this.childCacheItem = childCacheItem;
}

function getExternalResource(metadataCache, uri) {
  var resource = metadataCache._resource;
  return resource.getDerivedResource({
    url: uri,
  });
}

function getCacheItem(metadataCache, cacheKey, childCacheItem, fetchCallback) {
  var cache = metadataCache._cache;
  var promiseCache = metadataCache._promiseCache;

  if (defined(cache[cacheKey])) {
    return cache[cacheKey];
  }

  if (!defined(promiseCache[cacheKey])) {
    promiseCache[cacheKey] = fetchCallback();
  }

  return promiseCache[cacheKey]
    .then(function (contents) {
      if (defined(promiseCache[cacheKey])) {
        cache[cacheKey] = new CacheItem(contents, cacheKey, childCacheItem);
        delete promiseCache[cacheKey];
      }
      ++cache[cacheKey].referenceCount;
      return cache[cacheKey];
    })
    .otherwise(function () {
      if (defined(promiseCache[cacheKey])) {
        cache[cacheKey] = new CacheItem(undefined, cacheKey, childCacheItem);
        delete promiseCache[cacheKey];
      }
      ++cache[cacheKey].referenceCount;
      return cache[cacheKey];
    });
}

function releaseCacheItem(cacheItem) {
  --cacheItem.referenceCount;

  if (cacheItem.referenceCount === 0) {
    if (defined(cacheItem.childCacheItem)) {
      releaseCacheItem(cacheItem.childCacheItem);
    }
    delete this._cache[cacheItem.uri];
  }
}

/**
 * Get a JSON object from the cache. If the JSON is not already in the cache
 * request it and save it in the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.uri The uri to the external file.
 * @returns {Promise.<CacheItem>} The cache item.
 *
 * @private
 */
GltfFeatureMetadataCache.prototype.getJson = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var uri = options.uri;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.uri", uri);
  //>>includeEnd('debug');

  var externalResource = getExternalResource(this, uri);
  var cacheKey = externalResource.url;

  return getCacheItem(this, cacheKey, undefined, function () {
    return externalResource.fetchJson();
  });
};

/**
 * Get a glTF buffer from the cache. If the buffer is not already in the cache
 * request it and save it in the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.buffer The uri to the external file.
 * @returns {Promise.<CacheItem>} The cache item.
 *
 * @private
 */
GltfFeatureMetadataCache.prototype.getBuffer = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var buffer = options.buffer;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.buffer", buffer);
  //>>includeEnd('debug');

  var cacheKey = "buffer_" + Math.random(); // TODO
  var bufferData = GltfFeatureMetadataUtility.getBufferDataFromPipelineExtras(
    buffer
  );
  if (defined(bufferData)) {
    return getCacheItem(this, cacheKey, undefined, function () {
      return when.resolve(bufferData);
    });
  }

  if (!defined(buffer.uri)) {
    return getEmptyCacheItem(this, cacheKey);
  }

  var uri = buffer.uri;
  var externalResource = getExternalResource(this, uri);
  cacheKey = externalResource.url; // TODO: can become a large cacheKey if its a datauri

  return getCacheItem(this, cacheKey, undefined, function () {
    return externalResource.fetchArrayBuffer().then(function (arrayBuffer) {
      return new Uint8Array(arrayBuffer);
    });
  });
};

function getEmptyCacheItem(metadataCache, cacheKey) {
  return getCacheItem(metadataCache, cacheKey, undefined, function () {
    return when.resolve(undefined);
  });
}

var ktxRegex = /(^data:image\/ktx)|(\.ktx$)/i;
var crnRegex = /(^data:image\/crn)|(\.crn$)/i;

/**
 * Get a texture from the cache. If the texture is not already in the cache
 * request it and save it in the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON object.
 * @param {String} options.texture The texture JSON object from the glTF.
 * @param {Context} [options.context] The context.
 * @returns {Promise.<CacheItem>} The cache item.
 *
 * @private
 */
GltfFeatureMetadataCache.prototype.getTexture = function (options) {
  // TODO : should it be getImage because multiple textures could reference the same image (like textureAccessor's)
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var texture = options.texture;
  var context = defaultValue(options.context, defaultValue.EMPTY_OBJECT); // TODO: make it required cleanly

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.texture", texture);
  //>>includeEnd('debug');

  // TODO: fix - get cache key from the gltf id + texture id
  var cacheKey = "texture_" + Math.random();

  if (!defined(texture.source)) {
    return getEmptyCacheItem(this, cacheKey);
  }

  var that = this;
  return FeatureDetection.supportsWebP
    .initialize()
    .then(function (supportsWebP) {
      var imageId = texture.source;
      if (
        defined(texture.extensions) &&
        defined(texture.extensions.EXT_texture_webp) &&
        supportsWebP
      ) {
        imageId = texture.extensions.EXT_texture_webp.source;
      }

      var image = gltf.images[imageId];
      var extras = image.extras;

      var bufferViewId = image.bufferView;
      var mimeType = image.mimeType;
      var uri = image.uri;

      // First check for a compressed texture
      if (defined(extras) && defined(extras.compressedImage3DTiles)) {
        var crunch = extras.compressedImage3DTiles.crunch;
        var s3tc = extras.compressedImage3DTiles.s3tc;
        var pvrtc = extras.compressedImage3DTiles.pvrtc1;
        var etc1 = extras.compressedImage3DTiles.etc1;

        if (context.s3tc && defined(crunch)) {
          mimeType = crunch.mimeType;
          if (defined(crunch.bufferView)) {
            bufferViewId = crunch.bufferView;
          } else {
            uri = crunch.uri;
          }
        } else if (context.s3tc && defined(s3tc)) {
          mimeType = s3tc.mimeType;
          if (defined(s3tc.bufferView)) {
            bufferViewId = s3tc.bufferView;
          } else {
            uri = s3tc.uri;
          }
        } else if (context.pvrtc && defined(pvrtc)) {
          mimeType = pvrtc.mimeType;
          if (defined(pvrtc.bufferView)) {
            bufferViewId = pvrtc.bufferView;
          } else {
            uri = pvrtc.uri;
          }
        } else if (context.etc1 && defined(etc1)) {
          mimeType = etc1.mimeType;
          if (defined(etc1.bufferView)) {
            bufferViewId = etc1.bufferView;
          } else {
            uri = etc1.uri;
          }
        }
      }

      if (defined(bufferViewId)) {
        var bufferView = gltf.bufferViews[bufferViewId];
        var bufferId = bufferView.buffer;
        var buffer = gltf.buffers[bufferId];

        return that
          .getBuffer({
            buffer: buffer,
          })
          .then(function (bufferCacheItem) {
            var bufferData = bufferCacheItem.contents;
            var bufferViewData = GltfFeatureMetadataUtility.getBufferViewData(
              bufferView,
              bufferData
            );
            return getCacheItem(that, cacheKey, bufferCacheItem, function () {
              if (mimeType === "image/ktx") {
                // Resolves to a CompressedTextureBuffer
                return loadKTX(bufferViewData);
              } else if (mimeType === "image/crn") {
                // Resolves to a CompressedTextureBuffer
                return loadCRN(bufferViewData);
              }
              // Resolves to an ImageBitmap or Image
              return loadImageFromTypedArray({
                uint8Array: bufferViewData,
                format: mimeType,
                flipY: false,
              });
            });
          });
      }

      var externalResource = getExternalResource(that, uri);
      cacheKey = externalResource.url;

      return getCacheItem(that, cacheKey, undefined, function () {
        if (ktxRegex.test(uri)) {
          // Resolves to a CompressedTextureBuffer
          return loadKTX(externalResource);
        } else if (crnRegex.test(uri)) {
          // Resolves to a CompressedTextureBuffer
          return loadCRN(externalResource);
        }
        // Resolves to an ImageBitmap or Image
        return externalResource.fetchImage();
      });
    });
};

/**
 * Release an item from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {CacheItem} options.cacheItem The cache item.
 *
 * @private
 */
GltfFeatureMetadataCache.prototype.releaseCacheItem = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var cacheItem = options.cacheItem;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.cacheItem", cacheItem);
  //>>includeEnd('debug');

  releaseCacheItem(cacheItem);
};

export default GltfFeatureMetadataCache;
