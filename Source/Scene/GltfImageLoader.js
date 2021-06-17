import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import loadImageFromTypedArray from "../Core/loadImageFromTypedArray.js";
import loadKTX2 from "../Core/loadKTX2.js";
import RuntimeError from "../Core/RuntimeError.js";
import when from "../ThirdParty/when.js";
import GltfLoaderUtil from "./GltfLoaderUtil.js";
import ResourceLoader from "./ResourceLoader.js";
import ResourceLoaderState from "./ResourceLoaderState.js";

/**
 * Loads a glTF image.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias GltfImageLoader
 * @constructor
 * @augments ResourceLoader
 *
 * @param {Object} options Object with the following properties:
 * @param {ResourceCache} options.resourceCache The {@link ResourceCache} (to avoid circular dependencies).
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.imageId The image ID.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {SupportedImageFormats} options.supportedImageFormats The supported image formats.
 * @param {String} [options.cacheKey] The cache key of the resource.
 *
 * @private
 */
export default function GltfImageLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resourceCache = options.resourceCache;
  var gltf = options.gltf;
  var imageId = options.imageId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var supportedImageFormats = options.supportedImageFormats;
  var cacheKey = options.cacheKey;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.func("options.resourceCache", resourceCache);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.imageId", imageId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.object("options.supportedImageFormats", supportedImageFormats);
  //>>includeEnd('debug');

  var results = GltfLoaderUtil.getImageUriOrBufferView({
    gltf: gltf,
    imageId: imageId,
    supportedImageFormats: supportedImageFormats,
  });

  var bufferViewId = results.bufferViewId;
  var uri = results.uri;

  this._resourceCache = resourceCache;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._gltf = gltf;
  this._bufferViewId = bufferViewId;
  this._uri = uri;
  this._cacheKey = cacheKey;
  this._bufferViewLoader = undefined;
  this._image = undefined;
  this._state = ResourceLoaderState.UNLOADED;
  this._promise = when.defer();
}

if (defined(Object.create)) {
  GltfImageLoader.prototype = Object.create(ResourceLoader.prototype);
  GltfImageLoader.prototype.constructor = GltfImageLoader;
}

Object.defineProperties(GltfImageLoader.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof GltfImageLoader.prototype
   *
   * @type {Promise.<GltfImageLoader>}
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
   * @memberof GltfImageLoader.prototype
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
   * The image.
   *
   * @memberof GltfImageLoader.prototype
   *
   * @type {Image|ImageBitmap|CompressedTextureBuffer}
   * @readonly
   * @private
   */
  image: {
    get: function () {
      return this._image;
    },
  },
});

/**
 * Loads the resource.
 * @private
 */
GltfImageLoader.prototype.load = function () {
  if (defined(this._bufferViewId)) {
    loadFromBufferView(this);
  } else {
    loadFromUri(this);
  }
};

function loadFromBufferView(imageLoader) {
  var resourceCache = imageLoader._resourceCache;
  var bufferViewLoader = resourceCache.loadBufferView({
    gltf: imageLoader._gltf,
    bufferViewId: imageLoader._bufferViewId,
    gltfResource: imageLoader._gltfResource,
    baseResource: imageLoader._baseResource,
  });

  imageLoader._bufferViewLoader = bufferViewLoader;
  imageLoader._state = ResourceLoaderState.LOADING;

  bufferViewLoader.promise
    .then(function () {
      if (imageLoader.isDestroyed()) {
        return;
      }

      var typedArray = bufferViewLoader.typedArray;
      return loadImageFromBufferTypedArray(typedArray).then(function (image) {
        if (imageLoader.isDestroyed()) {
          return;
        }

        // Unload everything except the image
        imageLoader.unload();

        imageLoader._image = image;
        imageLoader._state = ResourceLoaderState.READY;
        imageLoader._promise.resolve(imageLoader);
      });
    })
    .otherwise(function (error) {
      if (imageLoader.isDestroyed()) {
        return;
      }
      handleError(imageLoader, error, "Failed to load embedded image");
    });
}

function loadFromUri(imageLoader) {
  var baseResource = imageLoader._baseResource;
  var uri = imageLoader._uri;
  var resource = baseResource.getDerivedResource({
    url: uri,
  });
  imageLoader._state = ResourceLoaderState.LOADING;
  loadImageFromUri(resource)
    .then(function (image) {
      if (imageLoader.isDestroyed()) {
        return;
      }

      // Unload everything except the image
      imageLoader.unload();

      imageLoader._image = image;
      imageLoader._state = ResourceLoaderState.READY;
      imageLoader._promise.resolve(imageLoader);
    })
    .otherwise(function (error) {
      if (imageLoader.isDestroyed()) {
        return;
      }
      handleError(imageLoader, error, "Failed to load image: " + uri);
    });
}

function handleError(imageLoader, error, errorMessage) {
  imageLoader.unload();
  imageLoader._state = ResourceLoaderState.FAILED;
  imageLoader._promise.reject(imageLoader.getError(errorMessage, error));
}

function getMimeTypeFromTypedArray(typedArray) {
  var header = typedArray.subarray(0, 2);
  var webpHeaderRIFFChars = typedArray.subarray(0, 4);
  var webpHeaderWEBPChars = typedArray.subarray(8, 12);

  if (header[0] === 0xff && header[1] === 0xd8) {
    // See https://en.wikipedia.org/wiki/JPEG_File_Interchange_Format
    return "image/jpeg";
  } else if (header[0] === 0x89 && header[1] === 0x50) {
    // See http://www.libpng.org/pub/png/spec/1.2/PNG-Structure.html
    return "image/png";
  } else if (header[0] === 0xab && header[1] === 0x4b) {
    // See http://github.khronos.org/KTX-Specification/#_identifier
    return "image/ktx2";
  } else if (header[0] === 0x73 && header[1] === 0x42) {
    // See https://github.com/BinomialLLC/basis_universal/blob/ed135f03a05de315dd7ec7c1b8ef0589099b3e52/spec/basis_spec.txt#L125
    return "image/basis";
  } else if (
    // See https://developers.google.com/speed/webp/docs/riff_container#webp_file_header
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

  throw new RuntimeError("Image format is not recognized");
}

function loadImageFromBufferTypedArray(typedArray) {
  var mimeType = getMimeTypeFromTypedArray(typedArray);
  if (mimeType === "image/ktx2") {
    // Resolves to a CompressedTextureBuffer
    return loadKTX2(typedArray);
  }
  // Resolves to an Image or ImageBitmap
  return GltfImageLoader._loadImageFromTypedArray({
    uint8Array: typedArray,
    format: mimeType,
    flipY: false,
  });
}

var ktx2Regex = /(^data:image\/ktx2)|(\.ktx2$)/i;

function loadImageFromUri(resource) {
  var uri = resource.url;
  if (ktx2Regex.test(uri)) {
    // Resolves to a CompressedTextureBuffer
    return loadKTX2(resource);
  }
  // Resolves to an ImageBitmap or Image
  return resource.fetchImage();
}

/**
 * Unloads the resource.
 * @private
 */
GltfImageLoader.prototype.unload = function () {
  if (defined(this._bufferViewLoader)) {
    this._resourceCache.unload(this._bufferViewLoader);
  }

  this._bufferViewLoader = undefined;
  this._uri = undefined; // Free in case the uri is a data uri
  this._image = undefined;
  this._gltf = undefined;
};

//Exposed for testing
GltfImageLoader._loadImageFromTypedArray = loadImageFromTypedArray;
