import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import loadCRN from "../Core/loadCRN.js";
import loadImageFromTypedArray from "../Core/loadImageFromTypedArray.js";
import loadKTX from "../Core/loadKTX.js";
import RuntimeError from "../Core/RuntimeError.js";
import when from "../ThirdParty/when.js";
import CacheResourceState from "./CacheResourceState.js";
import ResourceCache from "./ResourceCache.js";

/**
 * A glTF image cache resource.
 * <p>
 * Implements the {@link CacheResource} interface.
 * </p>
 *
 * @alias GltfImageCacheResource
 * @constructor
 * @augments CacheResource
 *
 * @param {Object} options Object with the following properties:
 * @param {ResourceCache} options.resourceCache The {@link ResourceCache} (to avoid circular dependencies).
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.imageId The image ID.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Object.<String, Boolean>} options.supportedImageFormats The supported image formats.
 * @param {Boolean} options.supportedImageFormats.webp Whether the browser supports WebP images.
 * @param {Boolean} options.supportedImageFormats.s3tc Whether the browser supports s3tc compressed images.
 * @param {Boolean} options.supportedImageFormats.pvrtc Whether the browser supports pvrtc compressed images.
 * @param {Boolean} options.supportedImageFormats.etc1 Whether the browser supports etc1 compressed images.
 * @param {String} options.cacheKey The cache key of the resource.
 *
 * @private
 */
export default function GltfImageCacheResource(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resourceCache = options.resourceCache;
  var gltf = options.gltf;
  var imageId = options.imageId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var supportedImageFormats = defaultValue(
    options.supportedImageFormats,
    defaultValue.EMPTY_OBJECT
  );
  var supportsWebP = supportedImageFormats.webp;
  var supportsS3tc = supportedImageFormats.s3tc;
  var supportsPvrtc = supportedImageFormats.pvrtc;
  var supportsEtc1 = supportedImageFormats.etc1;
  var cacheKey = options.cacheKey;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.resourceCache", resourceCache);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.imageId", imageId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.boolean("options.supportedImageFormats.webp", supportsWebP);
  Check.typeOf.boolean("options.supportedImageFormats.s3tc", supportsS3tc);
  Check.typeOf.boolean("options.supportedImageFormats.pvrtc", supportsPvrtc);
  Check.typeOf.boolean("options.supportedImageFormats.etc1", supportsEtc1);
  Check.typeOf.string("options.cacheKey", cacheKey);
  //>>includeEnd('debug');

  var image = gltf.images[imageId];
  var extras = image.extras;

  var bufferViewId = image.bufferView;
  var uri = image.uri;

  // First check for a compressed texture
  if (defined(extras) && defined(extras.compressedImage3DTiles)) {
    var crunch = extras.compressedImage3DTiles.crunch;
    var s3tc = extras.compressedImage3DTiles.s3tc;
    var pvrtc = extras.compressedImage3DTiles.pvrtc1;
    var etc1 = extras.compressedImage3DTiles.etc1;

    if (supportsS3tc && defined(crunch)) {
      if (defined(crunch.bufferView)) {
        bufferViewId = crunch.bufferView;
      } else {
        uri = crunch.uri;
      }
    } else if (supportsS3tc && defined(s3tc)) {
      if (defined(s3tc.bufferView)) {
        bufferViewId = s3tc.bufferView;
      } else {
        uri = s3tc.uri;
      }
    } else if (supportsPvrtc && defined(pvrtc)) {
      if (defined(pvrtc.bufferView)) {
        bufferViewId = pvrtc.bufferView;
      } else {
        uri = pvrtc.uri;
      }
    } else if (supportsEtc1 && defined(etc1)) {
      if (defined(etc1.bufferView)) {
        bufferViewId = etc1.bufferView;
      } else {
        uri = etc1.uri;
      }
    }
  }

  var buffer;
  var bufferId;
  var byteOffset;
  var byteLength;

  if (defined(bufferViewId)) {
    var bufferView = gltf.bufferViews[bufferViewId];
    bufferId = bufferView.buffer;
    buffer = gltf.buffers[bufferId];
    byteOffset = bufferView.byteOffset;
    byteLength = bufferView.byteLength;
  }

  this._resourceCache = resourceCache;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._buffer = buffer;
  this._bufferId = bufferId;
  this._byteOffset = byteOffset;
  this._byteLength = byteLength;
  this._uri = uri;
  this._cacheKey = cacheKey;
  this._bufferCacheResource = undefined;
  this._image = undefined;
  this._state = CacheResourceState.UNLOADED;
  this._promise = when.defer();
}

Object.defineProperties(GltfImageCacheResource.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof GltfImageCacheResource.prototype
   *
   * @type {Promise.<GltfImageCacheResource>}
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
   * @memberof GltfImageCacheResource.prototype
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
   * The image.
   *
   * @memberof GltfImageCacheResource.prototype
   *
   * @type {Image|ImageBitmap|CompressedTextureBuffer}
   * @readonly
   */
  image: {
    get: function () {
      return this._image;
    },
  },
});

/**
 * Loads the resource.
 */
GltfImageCacheResource.prototype.load = function () {
  if (defined(this._buffer)) {
    loadFromBuffer(this);
  } else {
    loadFromUri(this);
  }
};

function getBufferCacheResource(imageCacheResource) {
  var resourceCache = imageCacheResource._resourceCache;
  var buffer = imageCacheResource._buffer;
  if (defined(buffer.uri)) {
    var baseResource = imageCacheResource._baseResource;
    var resource = baseResource.getDerivedResource({
      url: buffer.uri,
    });
    return resourceCache.loadExternalBuffer({
      resource: resource,
      keepResident: false,
    });
  }
  return resourceCache.loadEmbeddedBuffer({
    parentResource: imageCacheResource._gltfResource,
    bufferId: imageCacheResource._bufferId,
    keepResident: false,
  });
}

function loadFromBuffer(imageCacheResource) {
  var bufferCacheResource = getBufferCacheResource(imageCacheResource);
  imageCacheResource._bufferCacheResource = bufferCacheResource;
  imageCacheResource._state = CacheResourceState.LOADING;

  bufferCacheResource.promise
    .then(function () {
      if (imageCacheResource._state === CacheResourceState.UNLOADED) {
        unload(imageCacheResource);
        return;
      }
      var typedArray = bufferCacheResource.typedArray;
      return loadImageFromBufferTypedArray(typedArray).then(function (image) {
        if (imageCacheResource._state === CacheResourceState.UNLOADED) {
          unload(imageCacheResource);
          return;
        }
        imageCacheResource._resourceCache.unload(bufferCacheResource);
        imageCacheResource._bufferCacheResource = undefined;
        imageCacheResource._image = image;
        imageCacheResource._state = CacheResourceState.READY;
        imageCacheResource._promise.resolve(imageCacheResource);
      });
    })
    .otherwise(function (error) {
      unload(imageCacheResource);
      imageCacheResource._state = CacheResourceState.FAILED;
      var errorMessage = "Failed to load embedded image";
      imageCacheResource._promise.reject(
        ResourceCache.getError(error, errorMessage)
      );
    });
}

function loadFromUri(imageCacheResource) {
  var baseResource = imageCacheResource._baseResource;
  var uri = imageCacheResource._uri;
  var resource = baseResource.getDerivedResource({
    url: uri,
  });
  imageCacheResource._state = CacheResourceState.LOADING;
  loadImageFromUri(resource)
    .then(function (image) {
      if (imageCacheResource._state === CacheResourceState.UNLOADED) {
        unload(imageCacheResource);
        return;
      }
      imageCacheResource._uri = undefined; // Free in case the uri is a data uri
      imageCacheResource._image = image;
      imageCacheResource._state = CacheResourceState.READY;
      imageCacheResource._promise.resolve(imageCacheResource);
    })
    .otherwise(function (error) {
      imageCacheResource._state = CacheResourceState.FAILED;
      var errorMessage = "Failed to load image:" + uri;
      imageCacheResource._promise.reject(
        ResourceCache.getError(error, errorMessage)
      );
    });
}

function getMimeTypeFromTypedArray(typedArray) {
  var header = typedArray.subarray(0, 2);
  var webpHeaderRIFFChars = typedArray.subarray(0, 4);
  var webpHeaderWEBPChars = typedArray.subarray(8, 12);

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

function loadImageFromBufferTypedArray(typedArray) {
  var mimeType = getMimeTypeFromTypedArray(typedArray);
  if (mimeType === "image/ktx") {
    // Resolves to a CompressedTextureBuffer
    return loadKTX(typedArray);
  } else if (mimeType === "image/crn") {
    // Resolves to a CompressedTextureBuffer
    return loadCRN(typedArray);
  }
  // Resolves to an Image or ImageBitmap
  return loadImageFromTypedArray({
    uint8Array: typedArray,
    format: mimeType,
    flipY: false,
  });
}

var ktxRegex = /(^data:image\/ktx)|(\.ktx$)/i;
var crnRegex = /(^data:image\/crn)|(\.crn$)/i;

function loadImageFromUri(resource) {
  var uri = resource.url;
  if (ktxRegex.test(uri)) {
    // Resolves to a CompressedTextureBuffer
    return loadKTX(resource);
  } else if (crnRegex.test(uri)) {
    // Resolves to a CompressedTextureBuffer
    return loadCRN(resource);
  }
  // Resolves to an ImageBitmap or Image
  return resource.fetchImage();
}

function unload(imageCacheResource) {
  if (defined(imageCacheResource._bufferCacheResource)) {
    // Unload the buffer resource from the cache
    imageCacheResource._resourceCache.unload(
      imageCacheResource._bufferCacheResource
    );
  }

  imageCacheResource._uri = undefined; // Free in case the uri is a data uri
  imageCacheResource._bufferCacheResource = undefined;
  imageCacheResource._image = undefined;
}

/**
 * Unloads the resource.
 */
GltfImageCacheResource.prototype.unload = function () {
  unload(this);
  this._state = CacheResourceState.UNLOADED;
};
