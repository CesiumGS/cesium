import Check from "../Core/Check.js";
import CesiumMath from "../Core/Math.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Texture from "../Renderer/Texture.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";
import TextureWrap from "../Renderer/TextureWrap.js";
import when from "../ThirdParty/when.js";
import CacheResource from "./CacheResource.js";
import CacheResourceState from "./CacheResourceState.js";
import GltfLoaderUtil from "./GltfLoaderUtil.js";
import JobType from "./JobType.js";

/**
 * A glTF texture cache resource.
 * <p>
 * Implements the {@link CacheResource} interface.
 * </p>
 *
 * @alias GltfTextureCacheResource
 * @constructor
 * @augments CacheResource
 *
 * @param {Object} options Object with the following properties:
 * @param {ResourceCache} options.resourceCache The {@link ResourceCache} (to avoid circular dependencies).
 * @param {Object} options.gltf The glTF JSON.
 * @param {Object} options.textureInfo The texture info object.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Object.<String, Boolean>} options.supportedImageFormats The supported image formats.
 * @param {Boolean} options.supportedImageFormats.webp Whether the browser supports WebP images.
 * @param {Boolean} options.supportedImageFormats.s3tc Whether the browser supports s3tc compressed images.
 * @param {Boolean} options.supportedImageFormats.pvrtc Whether the browser supports pvrtc compressed images.
 * @param {Boolean} options.supportedImageFormats.etc1 Whether the browser supports etc1 compressed images.
 * @param {String} options.cacheKey The cache key of the resource.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @private
 */
export default function GltfTextureCacheResource(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resourceCache = options.resourceCache;
  var gltf = options.gltf;
  var textureInfo = options.textureInfo;
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
  var asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.resourceCache", resourceCache);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.textureInfo", textureInfo);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.boolean("options.supportedImageFormats.webp", supportsWebP);
  Check.typeOf.boolean("options.supportedImageFormats.s3tc", supportsS3tc);
  Check.typeOf.boolean("options.supportedImageFormats.pvrtc", supportsPvrtc);
  Check.typeOf.boolean("options.supportedImageFormats.etc1", supportsEtc1);
  Check.typeOf.string("options.cacheKey", cacheKey);
  //>>includeEnd('debug');

  var textureId = textureInfo.index;
  var imageId = GltfLoaderUtil.getImageIdFromTexture({
    gltf: gltf,
    textureId: textureId,
    supportedImageFormats: supportedImageFormats,
  });

  // TODO: imageId is not always defined

  this._resourceCache = resourceCache;
  this._gltf = gltf;
  this._textureInfo = textureInfo;
  this._imageId = imageId;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._supportedImageFormats = supportedImageFormats;
  this._cacheKey = cacheKey;
  this._asynchronous = asynchronous;
  this._imageCacheResource = undefined;
  this._image = undefined;
  this._texture = undefined;
  this._state = CacheResourceState.UNLOADED;
  this._promise = when.defer();
}

Object.defineProperties(GltfTextureCacheResource.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof GltfTextureCacheResource.prototype
   *
   * @type {Promise.<GltfTextureCacheResource>}
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
   * @memberof GltfTextureCacheResource.prototype
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
   * The texture.
   *
   * @memberof GltfTextureCacheResource.prototype
   *
   * @type {Texture}
   * @readonly
   */
  texture: {
    get: function () {
      return this._texture;
    },
  },
});

/**
 * Loads the resource.
 */
GltfTextureCacheResource.prototype.load = function () {
  var that = this;
  var imageCacheResource = this._resourceCache.loadImage({
    gltf: this._gltf,
    imageId: this._imageId,
    gltfResource: this._gltfResource,
    baseResource: this._baseResource,
    supportedImageFormats: this._supportedImageFormats,
    keepResident: false,
  });
  this._imageCacheResource = imageCacheResource;
  this._state = CacheResourceState.LOADING;

  imageCacheResource.promise
    .then(function () {
      if (that._state === CacheResourceState.UNLOADED) {
        unload(that);
        return;
      }
      // Loaded image from the cache.
      // Now wait for the GPU texture to be created in the update loop.
      that._image = imageCacheResource.image;
    })
    .otherwise(function (error) {
      unload(that);
      that._state = CacheResourceState.FAILED;
      var errorMessage = "Failed to load texture";
      that._promise.reject(CacheResource.getError(error, errorMessage));
    });
};

function unload(textureCacheResource) {
  if (defined(textureCacheResource._texture)) {
    // Destroy the GPU resources
    textureCacheResource._texture.destroy();
  }

  if (defined(textureCacheResource._imageCacheResource)) {
    // Unload the image cache resource
    var resourceCache = textureCacheResource._resourceCache;
    resourceCache.unload(textureCacheResource._imageCacheResource);
  }

  textureCacheResource._imageCacheResource = undefined;
  textureCacheResource._image = undefined;
  textureCacheResource._texture = undefined;
  textureCacheResource._gltf = undefined;
}

/**
 * Unloads the resource.
 */
GltfTextureCacheResource.prototype.unload = function () {
  unload(this);
  this._state = CacheResourceState.UNLOADED;
};

function CreateTextureJob() {
  this.gltf = undefined;
  this.textureInfo = undefined;
  this.image = undefined;
  this.context = undefined;
  this.texture = undefined;
}

CreateTextureJob.prototype.set = function (gltf, textureInfo, image, context) {
  this.gltf = gltf;
  this.textureInfo = textureInfo;
  this.image = image;
  this.context = context;
};

CreateTextureJob.prototype.execute = function () {
  this.texture = createTexture(
    this.gltf,
    this.textureInfo,
    this.image,
    this.context
  );
};

function resizeImageToNextPowerOfTwo(image) {
  var canvas = document.createElement("canvas");
  canvas.width = CesiumMath.nextPowerOfTwo(image.width);
  canvas.height = CesiumMath.nextPowerOfTwo(image.height);
  var canvasContext = canvas.getContext("2d");
  canvasContext.drawImage(
    image,
    0,
    0,
    image.width,
    image.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return canvas;
}

function createTexture(gltf, textureInfo, image, context) {
  var sampler = GltfLoaderUtil.createSampler({
    gltf: gltf,
    textureInfo: textureInfo,
  });

  var minFilter = sampler.minificationFilter;
  var wrapS = sampler.wrapS;
  var wrapT = sampler.wrapT;

  // internalFormat is only defined for CompressedTextureBuffer
  var internalFormat = image.internalFormat;

  var samplerRequiresMipmap =
    minFilter === TextureMinificationFilter.NEAREST_MIPMAP_NEAREST ||
    minFilter === TextureMinificationFilter.NEAREST_MIPMAP_LINEAR ||
    minFilter === TextureMinificationFilter.LINEAR_MIPMAP_NEAREST ||
    minFilter === TextureMinificationFilter.LINEAR_MIPMAP_LINEAR;

  // TODO: according to MDN compressed textures can be mipmapped, so why does the old code do this? https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Compressed_texture_formats#examples
  var generateMipmap = !defined(internalFormat) && samplerRequiresMipmap;

  // WebGL 1 requires power-of-two texture dimensions for mipmapping and REPEAT/MIRRORED_REPEAT wrap modes.
  // TODO: check rules for WebGL 2
  var requiresPowerOfTwo =
    generateMipmap ||
    wrapS === TextureWrap.REPEAT ||
    wrapS === TextureWrap.MIRRORED_REPEAT ||
    wrapT === TextureWrap.REPEAT ||
    wrapT === TextureWrap.MIRRORED_REPEAT;

  var nonPowerOfTwo =
    !CesiumMath.isPowerOfTwo(image.width) ||
    !CesiumMath.isPowerOfTwo(image.height);

  var requiresResize = requiresPowerOfTwo && nonPowerOfTwo;

  var texture;
  if (defined(internalFormat)) {
    texture = new Texture({
      context: context,
      source: {
        arrayBufferView: image.bufferView, // Only defined for CompressedTextureBuffer
      },
      width: image.width,
      height: image.height,
      pixelFormat: image.internalFormat,
      sampler: sampler,
    });
  } else {
    if (requiresResize) {
      image = resizeImageToNextPowerOfTwo(image);
    }
    texture = new Texture({
      context: context,
      source: image,
      pixelFormat: texture.internalFormat, // TODO: pretty sure this is a glTF 1 property that was removed, check
      pixelDatatype: texture.type, // TODO: same as above
      sampler: sampler,
      flipY: false,
    });
  }

  if (generateMipmap) {
    texture.generateMipmap();
  }

  return texture;
}

var scratchTextureJob = new CreateTextureJob();

/**
 * Updates the resource.
 *
 * @param {FrameState} frameState The frame state.
 */
GltfTextureCacheResource.prototype.update = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  if (defined(this._texture)) {
    // Already created texture
    return;
  }

  if (!defined(this._image)) {
    // Not ready to create texture
    return;
  }

  var texture;

  if (this._asynchronous) {
    var textureJob = scratchTextureJob;
    textureJob.set(
      this._gltf,
      this._textureInfo,
      this._image,
      frameState.context
    );
    var jobScheduler = frameState.jobScheduler;
    if (!jobScheduler.execute(textureJob, JobType.TEXTURE)) {
      // Job scheduler is full. Try again next frame.
      return;
    }
    texture = textureJob.texture;
  } else {
    texture = createTexture(
      this._gltf,
      this._textureInfo,
      this._image,
      frameState.context
    );
  }

  unload(this);
  this._texture = texture;
  this._state = CacheResourceState.READY;
  this._promise.resolve(this);
};
