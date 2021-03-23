import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import getAbsoluteUri from "../Core/getAbsoluteUri.js";
import GltfLoaderUtil from "./GltfLoaderUtil.js";

/**
 * Gets cache keys for {@link GltfCacheResource}.
 *
 * @namespace ResourceCacheKey
 *
 * @private
 */
var ResourceCacheKey = {};

function getExternalResourceCacheKey(resource) {
  return getAbsoluteUri(resource.url);
}

function getBufferViewCacheKey(bufferView) {
  var byteOffset = bufferView.byteOffset;
  var byteLength = bufferView.byteLength;
  return byteOffset + "-" + byteLength;
}

function getAccessorCacheKey(accessor, bufferView) {
  var byteOffset = bufferView.byteOffset + accessor.byteOffset;
  var componentType = accessor.componentType;
  var type = accessor.type;
  var count = accessor.count;
  return byteOffset + "-" + componentType + "-" + type + "-" + count;
}

function getBufferCacheKey(buffer, bufferId, gltfResource, baseResource) {
  if (defined(buffer.uri)) {
    var resource = baseResource.getDerivedResource({
      url: buffer.uri,
    });
    return ResourceCacheKey.getExternalBufferCacheKey({
      resource: resource,
    });
  }
  return ResourceCacheKey.getEmbeddedBufferCacheKey({
    parentResource: gltfResource,
    bufferId: bufferId,
  });
}

/**
 * Gets the JSON cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.resource The {@link Resource} pointing to the JSON file.
 *
 * @returns {String} The JSON cache key.
 */
ResourceCacheKey.getJsonCacheKey = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resource = options.resource;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.resource", resource);
  //>>includeEnd('debug');

  return getExternalResourceCacheKey(resource);
};

/**
 * Gets the glTF cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 *
 * @returns {String} The glTF cache key.
 */
ResourceCacheKey.getGltfCacheKey = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltfResource = options.gltfResource;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltfResource", gltfResource);
  //>>includeEnd('debug');

  return getExternalResourceCacheKey(gltfResource);
};

/**
 * Gets the external buffer cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.resource The {@link Resource} pointing to the external buffer.
 *
 * @returns {String} The external buffer cache key.
 */
ResourceCacheKey.getExternalBufferCacheKey = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resource = options.resource;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.resource", resource);
  //>>includeEnd('debug');

  return getExternalResourceCacheKey(resource);
};

/**
 * Gets the embedded buffer cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.parentResource The {@link Resource} containing the embedded buffer.
 * @param {Number} options.bufferId A unique identifier of the embedded buffer within the parent resource.
 *
 * @returns {String} The embedded buffer cache key.
 */
ResourceCacheKey.getEmbeddedBufferCacheKey = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var parentResource = options.parentResource;
  var bufferId = options.bufferId;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.parentResource", parentResource);
  Check.typeOf.number("options.bufferId", bufferId);
  //>>includeEnd('debug');

  var parentCacheKey = getExternalResourceCacheKey(parentResource);
  return parentCacheKey + "-buffer-" + bufferId;
};

/**
 * Gets the buffer view cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.bufferViewId The bufferView ID corresponding to the vertex buffer.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 *
 * @returns {String} The buffer view cache key.
 */
ResourceCacheKey.getBufferViewCacheKey = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var bufferViewId = options.bufferViewId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.bufferViewId", bufferViewId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  var bufferView = gltf.bufferViews[bufferViewId];
  var bufferId = bufferView.buffer;
  var buffer = gltf.buffers[bufferId];

  var bufferCacheKey = getBufferCacheKey(
    buffer,
    bufferId,
    gltfResource,
    baseResource
  );

  var bufferViewCacheKey = getBufferViewCacheKey(bufferView);

  var cacheKey = bufferCacheKey + "-buffer-view-" + bufferViewCacheKey;

  return cacheKey;
};

/**
 * Gets the vertex buffer cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Number} [options.bufferViewId] The bufferView ID corresponding to the vertex buffer.
 * @param {Object} [options.draco] The Draco extension object.
 * @param {String} [options.dracoAttributeSemantic] The Draco attribute semantic, e.g. POSITION or NORMAL.
 *
 * @exception {DeveloperError} One of options.bufferViewId and options.draco must be defined.
 * @exception {DeveloperError} When options.draco is defined options.dracoAttributeSemantic must also be defined.
 *
 * @returns {String} The vertex buffer cache key.
 */
ResourceCacheKey.getVertexBufferCacheKey = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var bufferViewId = options.bufferViewId;
  var draco = options.draco;
  var dracoAttributeSemantic = options.dracoAttributeSemantic;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);

  var hasBufferViewId = defined(bufferViewId);
  var hasDraco = defined(draco);
  var hasDracoAttributeSemantic = defined(dracoAttributeSemantic);

  if (hasBufferViewId === hasDraco) {
    throw new DeveloperError(
      "One of options.bufferViewId and options.draco must be defined."
    );
  }

  if (hasDraco && !hasDracoAttributeSemantic) {
    throw new DeveloperError(
      "When options.draco is defined options.dracoAttributeSemantic must also be defined."
    );
  }

  if (hasDraco) {
    Check.typeOf.object(draco);
    Check.typeOf.string(dracoAttributeSemantic);
  }
  //>>includeEnd('debug');

  if (defined(draco)) {
    var dracoCacheKey = ResourceCacheKey.getDracoCacheKey({
      gltf: gltf,
      draco: draco,
      gltfResource: gltfResource,
      baseResource: baseResource,
    });
    return dracoCacheKey + "-vertex-buffer-" + dracoAttributeSemantic;
  }

  var bufferView = gltf.bufferViews[bufferViewId];
  var bufferId = bufferView.buffer;
  var buffer = gltf.buffers[bufferId];

  var bufferCacheKey = getBufferCacheKey(
    buffer,
    bufferId,
    gltfResource,
    baseResource
  );

  var bufferViewCacheKey = getBufferViewCacheKey(bufferView);

  return bufferCacheKey + "-vertex-buffer-" + bufferViewCacheKey;
};

/**
 * Gets the index buffer cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.accessorId The accessor ID corresponding to the index buffer.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Object} [options.draco] The Draco extension object.
 *
 * @returns {String} The index buffer cache key.
 */
ResourceCacheKey.getIndexBufferCacheKey = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var accessorId = options.accessorId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var draco = options.draco;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.accessorId", accessorId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  if (defined(draco)) {
    var dracoCacheKey = ResourceCacheKey.getDracoCacheKey({
      gltf: gltf,
      draco: draco,
      gltfResource: gltfResource,
      baseResource: baseResource,
    });
    return dracoCacheKey + "-index-buffer";
  }

  var accessor = gltf.accessors[accessorId];
  var bufferViewId = accessor.bufferView;
  var bufferView = gltf.bufferViews[bufferViewId];
  var bufferId = bufferView.buffer;
  var buffer = gltf.buffers[bufferId];

  var bufferCacheKey = getBufferCacheKey(
    buffer,
    bufferId,
    gltfResource,
    baseResource
  );

  var accessorCacheKey = getAccessorCacheKey(accessor, bufferView);

  return bufferCacheKey + "-index-buffer-" + accessorCacheKey;
};

/**
 * Gets the Draco cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Object} options.draco The Draco extension object.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 *
 * @returns {String} The Draco cache key.
 */
ResourceCacheKey.getDracoCacheKey = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var draco = options.draco;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.draco", draco);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  var bufferViewId = draco.bufferView;
  var bufferView = gltf.bufferViews[bufferViewId];
  var bufferId = bufferView.buffer;
  var buffer = gltf.buffers[bufferId];

  var bufferCacheKey = getBufferCacheKey(
    buffer,
    bufferId,
    gltfResource,
    baseResource
  );

  var bufferViewCacheKey = getBufferViewCacheKey(bufferView);

  return bufferCacheKey + "-draco-" + bufferViewCacheKey;
};

/**
 * Gets the image cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.imageId The image ID.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 *
 * @returns {String} The image cache key.
 */
ResourceCacheKey.getImageCacheKey = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var imageId = options.imageId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.imageId", imageId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  var image = gltf.images[imageId];

  if (defined(image.uri)) {
    var resource = baseResource.getDerivedResource({
      url: image.uri,
    });
    return getExternalResourceCacheKey(resource);
  }

  var bufferViewId = image.bufferView;
  var bufferView = gltf.bufferViews[bufferViewId];
  var bufferId = bufferView.buffer;
  var buffer = gltf.buffers[bufferId];

  var bufferCacheKey = getBufferCacheKey(
    buffer,
    bufferId,
    gltfResource,
    baseResource
  );

  var bufferViewCacheKey = getBufferViewCacheKey(bufferView);

  return bufferCacheKey + "-image-" + bufferViewCacheKey;
};

/**
 * Gets the sampler cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Object} options.textureInfo The texture info object.
 *
 * @returns {String} The sampler cache key.
 */
ResourceCacheKey.getSamplerCacheKey = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var textureInfo = options.textureInfo;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.textureInfo", textureInfo);
  //>>includeEnd('debug');

  var sampler = GltfLoaderUtil.createSampler({
    gltf: gltf,
    textureInfo: textureInfo,
  });

  return (
    sampler.wrapS +
    "-" +
    sampler.wrapT +
    "-" +
    sampler.minificationFilter +
    "-" +
    sampler.magnificationFilter
  );
};

/**
 * Gets the texture cache key.
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
 *
 * @returns {String} The texture cache key.
 */
ResourceCacheKey.getTextureCacheKey = function (options) {
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

  var textureId = textureInfo.index;

  var imageId = GltfLoaderUtil.getImageIdFromTexture({
    gltf: gltf,
    textureId: textureId,
    supportedImageFormats: supportedImageFormats,
  });

  // TODO: imageId may not be defined

  var imageCacheKey = ResourceCacheKey.getImageCacheKey({
    gltf: gltf,
    imageId: imageId,
    gltfResource: gltfResource,
    baseResource: baseResource,
  });

  // Include the sampler cache key in the texture cache key since textures and
  // samplers are coupled in WebGL 1. When upgrading to WebGL 2 consider
  // removing the sampleCacheKey here and in GltfLoader#getTextureInfoKey
  var samplerCacheKey = ResourceCacheKey.getSamplerCacheKey({
    gltf: gltf,
    textureInfo: textureInfo,
  });

  return imageCacheKey + "-texture-" + samplerCacheKey;
};

export default ResourceCacheKey;
