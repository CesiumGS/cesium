import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import GltfBufferCacheResource from "./GltfBufferCacheResource.js";
import GltfCacheKey from "./GltfCacheKey.js";
import GltfCacheResource from "./GltfCacheResource.js";
import GltfImageCacheResource from "./GltfImageCacheResource.js";
import GltfIndexBufferCacheResource from "./GltfIndexBufferCacheResource.js";
import GltfTextureCacheResource from "./GltfTextureCacheResource.js";
import GltfVertexBufferCacheResource from "./GltfVertexBufferCacheResource.js";
import ResourceCache from "./ResourceCache.js";

/**
 * Functions for caching resources shared across glTF models.
 *
 * @namespace GltfCache
 *
 * @private
 */
function GltfCache() {}

/**
 * Loads a glTF from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.keepResident=false] Whether the glTF JSON and embedded buffers should stay in the cache indefinitely.
 *
 * @returns {GltfCacheResource} The glTF cache resource.
 */
GltfCache.loadGltf = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var keepResident = defaultValue(options.keepResident, false);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  var cacheKey = GltfCacheKey.getGltfCacheKey({
    gltfResource: gltfResource,
  });

  var gltfCacheResource = ResourceCache.get(cacheKey);
  if (defined(gltfCacheResource)) {
    return gltfCacheResource;
  }

  gltfCacheResource = new GltfCacheResource({
    gltfCache: GltfCache,
    gltfResource: gltfResource,
    baseResource: baseResource,
    cacheKey: cacheKey,
    keepResident: keepResident,
  });

  ResourceCache.load({
    resource: gltfCacheResource,
    keepResident: keepResident,
  });

  return gltfCacheResource;
};

/**
 * Unloads a glTF from the cache.
 *
 * @param {GltfCacheResource} gltfCacheResource The glTF cache resource.
 */
GltfCache.unloadGltf = function (gltfCacheResource) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("gltfCacheResource", gltfCacheResource);
  //>>includeEnd('debug');

  ResourceCache.unload(gltfCacheResource);
};

/**
 * Loads a buffer from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.buffer The glTF buffer.
 * @param {Number} options.bufferId The buffer ID.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.keepResident=false] Whether the buffer should stay in the cache indefinitely.
 * @param {Uint8Array} [options.typedArray] A typed array containing buffer data. Only defined for buffers embedded in the glTF.
 *
 * @returns {GltfBufferCacheResource} The buffer cache resource.
 */
GltfCache.loadBuffer = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var buffer = options.buffer;
  var bufferId = options.bufferId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var keepResident = defaultValue(options.keepResident, false);
  var typedArray = options.typedArray;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.buffer", buffer);
  Check.typeOf.number("options.bufferId", bufferId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  var cacheKey = GltfCacheKey.getBufferCacheKey({
    buffer: buffer,
    bufferId: bufferId,
    gltfResource: gltfResource,
    baseResource: baseResource,
  });

  var bufferCacheResource = ResourceCache.get(cacheKey);
  if (defined(bufferCacheResource)) {
    return bufferCacheResource;
  }

  bufferCacheResource = new GltfBufferCacheResource({
    buffer: buffer,
    baseResource: baseResource,
    cacheKey: cacheKey,
    typedArray: typedArray,
  });

  ResourceCache.load({
    resource: bufferCacheResource,
    keepResident: keepResident,
  });

  return bufferCacheResource;
};

/**
 * Unloads a buffer from the cache.
 *
 * @param {GltfBufferCacheResource} bufferCacheResource The buffer cache resource.
 */
GltfCache.unloadBuffer = function (bufferCacheResource) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("bufferCacheResource", bufferCacheResource);
  //>>includeEnd('debug');

  ResourceCache.unload(bufferCacheResource);
};

/**
 * Load a vertex buffer from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.bufferViewId The bufferView ID corresponding to the vertex buffer.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @returns {GltfVertexBufferCacheResource} The vertex buffer cache resource.
 */
GltfCache.loadVertexBuffer = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var bufferViewId = options.bufferViewId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.bufferViewId", bufferViewId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  var cacheKey = GltfCacheKey.getVertexBufferCacheKey({
    gltf: gltf,
    bufferViewId: bufferViewId,
    gltfResource: gltfResource,
    baseResource: baseResource,
  });

  var vertexBufferCacheResource = ResourceCache.get(cacheKey);
  if (defined(vertexBufferCacheResource)) {
    return vertexBufferCacheResource;
  }

  vertexBufferCacheResource = new GltfVertexBufferCacheResource({
    gltfCache: GltfCache,
    gltf: gltf,
    bufferViewId: bufferViewId,
    gltfResource: gltfResource,
    baseResource: baseResource,
    cacheKey: cacheKey,
    asynchronous: asynchronous,
  });

  ResourceCache.load({
    resource: vertexBufferCacheResource,
    keepResident: false,
  });

  return vertexBufferCacheResource;
};

/**
 * Unload a vertex buffer from the cache.
 *
 * @param {GltfVertexBufferCacheResource} vertexBufferCacheResource The vertex buffer cache resource.
 */
GltfCache.unloadVertexBuffer = function (vertexBufferCacheResource) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("vertexBufferCacheResource", vertexBufferCacheResource);
  //>>includeEnd('debug');

  ResourceCache.unload(vertexBufferCacheResource);
};

/**
 * Load an index buffer from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.accessorId The accessor ID corresponding to the index buffer.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @returns {GltfIndexBufferCacheResource} The index buffer cache resource.
 */
GltfCache.loadIndexBuffer = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var accessorId = options.accessorId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.accessorId", accessorId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  var cacheKey = GltfCacheKey.getIndexBufferCacheKey({
    gltf: gltf,
    accessorId: accessorId,
    gltfResource: gltfResource,
    baseResource: baseResource,
  });

  var indexBufferCacheResource = ResourceCache.get(cacheKey);
  if (defined(indexBufferCacheResource)) {
    return indexBufferCacheResource;
  }

  indexBufferCacheResource = new GltfIndexBufferCacheResource({
    gltfCache: GltfCache,
    gltf: gltf,
    accessorId: accessorId,
    gltfResource: gltfResource,
    baseResource: baseResource,
    cacheKey: cacheKey,
    asynchronous: asynchronous,
  });

  ResourceCache.load({
    resource: indexBufferCacheResource,
    keepResident: false,
  });

  return indexBufferCacheResource;
};

/**
 * Unload an index buffer from the cache.
 *
 * @param {GltfIndexBufferCacheResource} indexBufferCacheResource The index buffer cache resource.
 */
GltfCache.unloadIndexBuffer = function (indexBufferCacheResource) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("indexBufferCacheResource", indexBufferCacheResource);
  //>>includeEnd('debug');

  ResourceCache.unload(indexBufferCacheResource);
};

/**
 * Load an image from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.imageId The image ID.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Object.<String, Boolean>} options.supportedImageFormats The supported image formats.
 * @param {Boolean} options.supportedImageFormats.webp Whether the browser supports WebP images.
 * @param {Boolean} options.supportedImageFormats.s3tc Whether the browser supports s3tc compressed images.
 * @param {Boolean} options.supportedImageFormats.pvrtc Whether the browser supports pvrtc compressed images.
 * @param {Boolean} options.supportedImageFormats.etc1 Whether the browser supports etc1 compressed images.
 *
 * @returns {GltfImageCacheResource} The image cache resource.
 */
GltfCache.loadImage = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
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

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.imageId", imageId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.boolean("options.supportedImageFormats.webp", supportsWebP);
  Check.typeOf.boolean("options.supportedImageFormats.s3tc", supportsS3tc);
  Check.typeOf.boolean("options.supportedImageFormats.pvrtc", supportsPvrtc);
  Check.typeOf.boolean("options.supportedImageFormats.etc1", supportsEtc1);
  //>>includeEnd('debug');

  var cacheKey = GltfCacheKey.getImageCacheKey({
    gltf: gltf,
    imageId: imageId,
    gltfResource: gltfResource,
    baseResource: baseResource,
  });

  var imageCacheResource = ResourceCache.get(cacheKey);
  if (defined(imageCacheResource)) {
    return imageCacheResource;
  }

  imageCacheResource = new GltfImageCacheResource({
    gltfCache: GltfCache,
    gltf: gltf,
    imageId: imageId,
    gltfResource: gltfResource,
    baseResource: baseResource,
    supportedImageFormats: supportedImageFormats,
    cacheKey: cacheKey,
  });

  ResourceCache.load({
    resource: imageCacheResource,
    keepResident: false,
  });

  return imageCacheResource;
};

/**
 * Unload an image from the cache.
 *
 * @param {GltfImageCacheResource} imageCacheResource The image cache resource.
 */
GltfCache.unloadImage = function (imageCacheResource) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("imageCacheResource", imageCacheResource);
  //>>includeEnd('debug');

  ResourceCache.unload(imageCacheResource);
};

/**
 * Load a texture from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Object} options.textureInfo The texture info object.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Object.<String, Boolean>} options.supportedImageFormats The supported image formats.
 * @param {Boolean} options.supportedImageFormats.webp Whether the browser supports WebP images.
 * @param {Boolean} options.supportedImageFormats.s3tc Whether the browser supports s3tc compressed images.
 * @param {Boolean} options.supportedImageFormats.pvrtc Whether the browser supports pvrtc compressed images.
 * @param {Boolean} options.supportedImageFormats.etc1 Whether the browser supports etc1 compressed images.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @returns {GltfTextureCacheResource} The texture cache resource.
 */
GltfCache.loadTexture = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
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
  var asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.textureInfo", textureInfo);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.boolean("options.supportedImageFormats.webp", supportsWebP);
  Check.typeOf.boolean("options.supportedImageFormats.s3tc", supportsS3tc);
  Check.typeOf.boolean("options.supportedImageFormats.pvrtc", supportsPvrtc);
  Check.typeOf.boolean("options.supportedImageFormats.etc1", supportsEtc1);
  //>>includeEnd('debug');

  var cacheKey = GltfCacheKey.getTextureCacheKey({
    gltf: gltf,
    textureInfo: textureInfo,
    gltfResource: gltfResource,
    baseResource: baseResource,
    supportedImageFormats: supportedImageFormats,
  });

  var textureCacheResource = ResourceCache.get(cacheKey);
  if (defined(textureCacheResource)) {
    return textureCacheResource;
  }

  textureCacheResource = new GltfTextureCacheResource({
    gltfCache: GltfCache,
    gltf: gltf,
    textureInfo: textureInfo,
    gltfResource: gltfResource,
    baseResource: baseResource,
    cacheKey: cacheKey,
    supportedImageFormats: supportedImageFormats,
    asynchronous: asynchronous,
  });

  ResourceCache.load({
    resource: textureCacheResource,
    keepResident: false,
  });

  return textureCacheResource;
};

/**
 * Unload a texture from the cache.
 *
 * @param {GltfTextureCacheResource} textureCacheResource The texture cache resource.
 */
GltfCache.unloadTexture = function (textureCacheResource) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("textureCacheResource", textureCacheResource);
  //>>includeEnd('debug');

  ResourceCache.unload(textureCacheResource);
};

export default GltfCache;
