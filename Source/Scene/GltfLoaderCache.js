import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import loadCRN from "../Core/loadCRN.js";
import loadImageFromTypedArray from "../Core/loadImageFromTypedArray.js";
import loadKTX from "../Core/loadKTX.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import GltfFeatureMetadataUtility from "./GltfFeatureMetadataUtility.js";
import when from "../ThirdParty/when.js";

/**
 * Cache for feature properties that are referenced from external files.
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
function GltfLoaderCache(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var basePath = defaultValue(options.basePath, "");

  this._resource = Resource.createIfNeeded(basePath);
  this._cache = {};
  this._promiseCache = {};
}

function CacheItem(options) {
  this.referenceCount = 1;
  this.contents = options.contents;
  this.cacheKey = options.cacheKey;
  this.childCacheItem = options.childCacheItem;
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
    return when.resolve(cache[cacheKey]);
  }

  if (!defined(promiseCache[cacheKey])) {
    promiseCache[cacheKey] = fetchCallback();
  }

  return promiseCache[cacheKey]
    .then(function (contents) {
      if (defined(promiseCache[cacheKey])) {
        cache[cacheKey] = new CacheItem({
          contents: contents,
          cacheKey: cacheKey,
          childCacheItem: childCacheItem,
        });
        delete promiseCache[cacheKey];
      } else {
        ++cache[cacheKey].referenceCount;
      }
      return cache[cacheKey];
    })
    .otherwise(function (error) {
      if (defined(promiseCache[cacheKey])) {
        delete promiseCache[cacheKey];
      }
      throw error;
    });
}

function releaseCacheItem(cache, cacheItem) {
  --cacheItem.referenceCount;

  if (cacheItem.referenceCount === 0) {
    if (defined(cacheItem.childCacheItem)) {
      releaseCacheItem(cache, cacheItem.childCacheItem);
    }
    var cacheKey = cacheItem.cacheKey;
    if (defined(cacheKey)) {
      delete cache[cacheKey];
    }
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
 * @param {GltfContainer} options.gltfContainer The glTF container.
 * @param {Object} options.buffer The buffer JSON object from the glTF.
 * @param {Number} options.bufferId The buffer id.
 * @returns {Promise.<CacheItem>} The cache item.
 *
 * @private
 */
GltfFeatureMetadataCache.prototype.getBuffer = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltfContainer = options.gltfContainer;
  var buffer = options.buffer;
  var bufferId = options.bufferId;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltfContainer", gltfContainer);
  Check.typeOf.object("options.buffer", buffer);
  Check.typeOf.number("options.bufferId", bufferId);
  //>>includeEnd('debug');

  var that = this;
  return gltfContainer.readyPromise.then(function () {
    var bufferData = gltfContainer.getBufferData(bufferId);
    if (defined(bufferData)) {
      return new CacheItem({
        contents: bufferData,
        cacheKey: undefined,
        childCacheItem: undefined,
      });
    }

    var uri = buffer.uri;

    if (!defined(uri)) {
      return new CacheItem({
        contents: undefined,
        cacheKey: undefined,
        childCacheItem: undefined,
      });
    }

    var externalResource = getExternalResource(that, uri);

    return getCacheItem(that, externalResource.url, undefined, function () {
      return externalResource.fetchArrayBuffer().then(function (arrayBuffer) {
        return new Uint8Array(arrayBuffer);
      });
    });
  });
};

/**
 * Get a texture from the cache. If the texture is not already in the cache
 * request it and save it in the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {GltfContainer} options.gltfContainer The glTF container.
 * @param {Object} options.texture The texture JSON object from the glTF.
 * @param {Object} options.textureId The texture id;
 * @param {Context} [options.context] The context.
 * @returns {Promise.<CacheItem>} The cache item.
 *
 * @private
 */
GltfFeatureMetadataCache.prototype.getTexture = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltfContainer = options.gltfContainer;
  var texture = options.texture;
  var textureId = options.textureId;
  var context = defaultValue(options.context, defaultValue.EMPTY_OBJECT); // TODO: make it required cleanly

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltfContainer", gltfContainer);
  Check.typeOf.object("options.texture", texture);
  Check.typeOf.number("options.textureId", textureId);
  //>>includeEnd('debug');

  var that = this;
  return gltfContainer.readyPromise.then(function () {
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

        if (!defined(imageId)) {
          return new CacheItem({
            contents: undefined,
            cacheKey: undefined,
            childCacheItem: undefined,
          });
        }

        var gltf = gltfContainer.gltf;
        var image = gltf.images[imageId];
        var extras = image.extras;

        var bufferViewId = image.bufferView;
        var uri = image.uri;
        var useCompressedImage = false;

        // First check for a compressed texture
        if (defined(extras) && defined(extras.compressedImage3DTiles)) {
          var crunch = extras.compressedImage3DTiles.crunch;
          var s3tc = extras.compressedImage3DTiles.s3tc;
          var pvrtc = extras.compressedImage3DTiles.pvrtc1;
          var etc1 = extras.compressedImage3DTiles.etc1;

          if (context.s3tc && defined(crunch)) {
            useCompressedImage = true;
            if (defined(crunch.bufferView)) {
              bufferViewId = crunch.bufferView;
            } else {
              uri = crunch.uri;
            }
          } else if (context.s3tc && defined(s3tc)) {
            useCompressedImage = true;
            if (defined(s3tc.bufferView)) {
              bufferViewId = s3tc.bufferView;
            } else {
              uri = s3tc.uri;
            }
          } else if (context.pvrtc && defined(pvrtc)) {
            useCompressedImage = true;
            if (defined(pvrtc.bufferView)) {
              bufferViewId = pvrtc.bufferView;
            } else {
              uri = pvrtc.uri;
            }
          } else if (context.etc1 && defined(etc1)) {
            useCompressedImage = true;
            if (defined(etc1.bufferView)) {
              bufferViewId = etc1.bufferView;
            } else {
              uri = etc1.uri;
            }
          }
        }

        var embeddedCacheKey = "texture_" + gltfContainer.id + "_" + textureId;

        if (!useCompressedImage) {
          // Grab the decoded data uri if it exists
          var imageData = gltfContainer.getImageData(imageId);
          if (defined(imageData)) {
            return getCacheItem(that, embeddedCacheKey, undefined, function () {
              return loadImageFromImageData(imageData);
            });
          }
        }

        if (defined(bufferViewId)) {
          var bufferView = gltf.bufferViews[bufferViewId];
          var bufferId = bufferView.buffer;
          var buffer = gltf.buffers[bufferId];

          return that
            .getBuffer({
              gltfContainer: gltfContainer,
              buffer: buffer,
              bufferId: bufferId,
            })
            .then(function (bufferCacheItem) {
              var bufferData = bufferCacheItem.contents;
              if (!defined(bufferData)) {
                return when.resolve(
                  new CacheItem({
                    contents: undefined,
                    cacheKey: undefined,
                    childCacheItem: bufferCacheItem,
                  })
                );
              }

              var imageData = GltfFeatureMetadataUtility.getBufferViewData(
                bufferView,
                bufferData
              );

              return getCacheItem(
                that,
                embeddedCacheKey,
                bufferCacheItem,
                function () {
                  return loadImageFromImageData(imageData);
                }
              );
            });
        }

        var externalResource = getExternalResource(that, uri);
        var externalCacheKey = externalResource.url;

        return getCacheItem(that, externalCacheKey, undefined, function () {
          return loadImageFromUri(externalResource);
        });
      });
  });
};

function getMimeTypeFromImageData(imageData) {
  var header = imageData.subarray(0, 2);
  var webpHeaderRIFFChars = imageData.subarray(0, 4);
  var webpHeaderWEBPChars = imageData.subarray(8, 12);

  if (header[0] === 0x42 && header[1] === 0x49) {
    return "image/bmp";
  } else if (header[0] === 0x47 && header[1] === 0x49) {
    return "image/gif";
  } else if (header[0] === 0xff && header[1] === 0xd8) {
    return "image/jpeg";
  } else if (header[0] === 0x89 && header[1] === 0x50) {
    return "image/png";
  } else if (header[0] === 0xab && header[1] === 0x4b) {
    return "image/ktx";
  } else if (header[0] === 0x48 && header[1] === 0x78) {
    return "image/crn";
  } else if (header[0] === 0x73 && header[1] === 0x42) {
    return "image/basis";
  } else if (
    webpHeaderRIFFChars[0] === 0x52 &&
    webpHeaderRIFFChars[1] === 0x49 &&
    webpHeaderRIFFChars[2] === 0x46 &&
    webpHeaderRIFFChars[3] === 0x46 &&
    webpHeaderWEBPChars[0] === 0x57 &&
    webpHeaderWEBPChars[1] === 0x45 &&
    webpHeaderWEBPChars[2] === 0x42 &&
    webpHeaderWEBPChars[3] === 0x50
  ) {
    return "image/webp";
  }

  throw new RuntimeError("Image data does not have valid header");
}

function loadImageFromImageData(imageData) {
  var mimeType = getMimeTypeFromImageData(imageData);
  if (mimeType === "image/ktx") {
    // Resolves to a CompressedTextureBuffer
    return loadKTX(imageData);
  } else if (mimeType === "image/crn") {
    // Resolves to a CompressedTextureBuffer
    return loadCRN(imageData);
  }
  // Resolves to an ImageBitmap or Image
  return loadImageFromTypedArray({
    uint8Array: imageData,
    format: mimeType,
    flipY: false,
  });
}

var ktxRegex = /(^data:image\/ktx)|(\.ktx$)/i;
var crnRegex = /(^data:image\/crn)|(\.crn$)/i;

function loadImageFromUri(externalResource) {
  var uri = externalResource.url;
  if (ktxRegex.test(uri)) {
    // Resolves to a CompressedTextureBuffer
    return loadKTX(externalResource);
  } else if (crnRegex.test(uri)) {
    // Resolves to a CompressedTextureBuffer
    return loadCRN(externalResource);
  }
  // Resolves to an ImageBitmap or Image
  return externalResource.fetchImage();
}

/**
 * Release an item from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {CacheItem} options.cacheItem The cache item.
 *
 * @private
 */
GltfFeatureMetadataCache.prototype.releaseCacheItem = function (cacheItem) {
  releaseCacheItem(this._cache, cacheItem);
};

export default GltfFeatureMetadataCache;
