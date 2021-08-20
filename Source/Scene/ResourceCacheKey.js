import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import getAbsoluteUri from "../Core/getAbsoluteUri.js";
import GltfLoaderUtil from "./GltfLoaderUtil.js";
import hasExtension from "./hasExtension.js";

/**
 * Compute cache keys for resources in {@link ResourceCache}.
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

  if (hasExtension(bufferView, "EXT_meshopt_compression")) {
    var meshopt = bufferView.extensions.EXT_meshopt_compression;
    byteOffset = defaultValue(meshopt.byteOffset, 0);
    byteLength = meshopt.byteLength;
  }

  return byteOffset + "-" + (byteOffset + byteLength);
}

function getAccessorCacheKey(accessor, bufferView) {
  var byteOffset = bufferView.byteOffset + accessor.byteOffset;
  var componentType = accessor.componentType;
  var type = accessor.type;
  var count = accessor.count;
  return byteOffset + "-" + componentType + "-" + type + "-" + count;
}

function getExternalBufferCacheKey(resource) {
  return getExternalResourceCacheKey(resource);
}

function getEmbeddedBufferCacheKey(parentResource, bufferId) {
  var parentCacheKey = getExternalResourceCacheKey(parentResource);
  return parentCacheKey + "-buffer-id-" + bufferId;
}

function getBufferCacheKey(buffer, bufferId, gltfResource, baseResource) {
  if (defined(buffer.uri)) {
    var resource = baseResource.getDerivedResource({
      url: buffer.uri,
    });
    return getExternalBufferCacheKey(resource);
  }

  return getEmbeddedBufferCacheKey(gltfResource, bufferId);
}

function getDracoCacheKey(gltf, draco, gltfResource, baseResource) {
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

  return bufferCacheKey + "-range-" + bufferViewCacheKey;
}

function getImageCacheKey(gltf, imageId, gltfResource, baseResource) {
  var image = gltf.images[imageId];
  var bufferViewId = image.bufferView;
  var uri = image.uri;

  if (defined(uri)) {
    var resource = baseResource.getDerivedResource({
      url: uri,
    });
    return getExternalResourceCacheKey(resource);
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

  return bufferCacheKey + "-range-" + bufferViewCacheKey;
}

function getSamplerCacheKey(gltf, textureInfo) {
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
}

/**
 * Gets the schema cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} [options.schema] An object that explicitly defines a schema JSON. Mutually exclusive with options.resource.
 * @param {Resource} [options.resource] The {@link Resource} pointing to the schema JSON. Mutually exclusive with options.schema.
 *
 * @returns {String} The schema cache key.
 *
 * @exception {DeveloperError} One of options.schema and options.resource must be defined.
 * @private
 */
ResourceCacheKey.getSchemaCacheKey = function (options) {
  var schema = options.schema;
  var resource = options.resource;

  //>>includeStart('debug', pragmas.debug);
  if (defined(schema) === defined(resource)) {
    throw new DeveloperError(
      "One of options.schema and options.resource must be defined."
    );
  }
  //>>includeEnd('debug');

  if (defined(schema)) {
    return "embedded-schema:" + JSON.stringify(schema);
  }

  return "external-schema:" + getExternalResourceCacheKey(resource);
};

/**
 * Gets the external buffer cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.resource The {@link Resource} pointing to the external buffer.
 *
 * @returns {String} The external buffer cache key.
 * @private
 */
ResourceCacheKey.getExternalBufferCacheKey = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resource = options.resource;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.resource", resource);
  //>>includeEnd('debug');

  return "external-buffer:" + getExternalBufferCacheKey(resource);
};

/**
 * Gets the embedded buffer cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.parentResource The {@link Resource} containing the embedded buffer.
 * @param {Number} options.bufferId A unique identifier of the embedded buffer within the parent resource.
 *
 * @returns {String} The embedded buffer cache key.
 * @private
 */
ResourceCacheKey.getEmbeddedBufferCacheKey = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var parentResource = options.parentResource;
  var bufferId = options.bufferId;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.parentResource", parentResource);
  Check.typeOf.number("options.bufferId", bufferId);
  //>>includeEnd('debug');

  return (
    "embedded-buffer:" + getEmbeddedBufferCacheKey(parentResource, bufferId)
  );
};

/**
 * Gets the glTF cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 *
 * @returns {String} The glTF cache key.
 * @private
 */
ResourceCacheKey.getGltfCacheKey = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltfResource = options.gltfResource;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltfResource", gltfResource);
  //>>includeEnd('debug');

  return "gltf:" + getExternalResourceCacheKey(gltfResource);
};

/**
 * Gets the buffer view cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.bufferViewId The bufferView ID.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 *
 * @returns {String} The buffer view cache key.
 * @private
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
  if (hasExtension(bufferView, "EXT_meshopt_compression")) {
    var meshopt = bufferView.extensions.EXT_meshopt_compression;
    bufferId = meshopt.buffer;
  }

  var bufferCacheKey = getBufferCacheKey(
    buffer,
    bufferId,
    gltfResource,
    baseResource
  );

  var bufferViewCacheKey = getBufferViewCacheKey(bufferView);

  return "buffer-view:" + bufferCacheKey + "-range-" + bufferViewCacheKey;
};

/**
 * Gets the Draco cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Object} options.draco The Draco extension object.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 *
 * @returns {String} The Draco cache key.
 * @private
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

  return "draco:" + getDracoCacheKey(gltf, draco, gltfResource, baseResource);
};

/**
 * Gets the vertex buffer cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Number} [options.bufferViewId] The bufferView ID corresponding to the vertex buffer.
 * @param {Object} [options.draco] The Draco extension object.
 * @param {String} [options.attributeSemantic] The attribute semantic, e.g. POSITION or NORMAL.
 *
 * @exception {DeveloperError} One of options.bufferViewId and options.draco must be defined.
 * @exception {DeveloperError} When options.draco is defined options.attributeSemantic must also be defined.
 *
 * @returns {String} The vertex buffer cache key.
 * @private
 */
ResourceCacheKey.getVertexBufferCacheKey = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var bufferViewId = options.bufferViewId;
  var draco = options.draco;
  var attributeSemantic = options.attributeSemantic;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);

  var hasBufferViewId = defined(bufferViewId);
  var hasDraco = defined(draco);
  var hasAttributeSemantic = defined(attributeSemantic);

  if (hasBufferViewId === hasDraco) {
    throw new DeveloperError(
      "One of options.bufferViewId and options.draco must be defined."
    );
  }

  if (hasDraco && !hasAttributeSemantic) {
    throw new DeveloperError(
      "When options.draco is defined options.attributeSemantic must also be defined."
    );
  }

  if (hasDraco) {
    Check.typeOf.object("options.draco", draco);
    Check.typeOf.string("options.attributeSemantic", attributeSemantic);
  }
  //>>includeEnd('debug');

  if (defined(draco)) {
    var dracoCacheKey = getDracoCacheKey(
      gltf,
      draco,
      gltfResource,
      baseResource
    );
    return "vertex-buffer:" + dracoCacheKey + "-draco-" + attributeSemantic;
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

  return "vertex-buffer:" + bufferCacheKey + "-range-" + bufferViewCacheKey;
};

/**
 * Gets the index buffer cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.accessorId The accessor ID corresponding to the index buffer.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Object} [options.draco] The Draco extension object.
 *
 * @returns {String} The index buffer cache key.
 * @private
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
    var dracoCacheKey = getDracoCacheKey(
      gltf,
      draco,
      gltfResource,
      baseResource
    );
    return "index-buffer:" + dracoCacheKey + "-draco";
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

  return "index-buffer:" + bufferCacheKey + "-accessor-" + accessorCacheKey;
};

/**
 * Gets the image cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.imageId The image ID.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 *
 * @returns {String} The image cache key.
 * @private
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

  var imageCacheKey = getImageCacheKey(
    gltf,
    imageId,
    gltfResource,
    baseResource
  );

  return "image:" + imageCacheKey;
};

/**
 * Gets the texture cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Object} options.textureInfo The texture info object.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {SupportedImageFormats} options.supportedImageFormats The supported image formats.
 *
 * @returns {String} The texture cache key.
 * @private
 */
ResourceCacheKey.getTextureCacheKey = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var textureInfo = options.textureInfo;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var supportedImageFormats = options.supportedImageFormats;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.textureInfo", textureInfo);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.object("options.supportedImageFormats", supportedImageFormats);
  //>>includeEnd('debug');

  var textureId = textureInfo.index;

  var imageId = GltfLoaderUtil.getImageIdFromTexture({
    gltf: gltf,
    textureId: textureId,
    supportedImageFormats: supportedImageFormats,
  });

  var imageCacheKey = getImageCacheKey(
    gltf,
    imageId,
    gltfResource,
    baseResource
  );

  // Include the sampler cache key in the texture cache key since textures and
  // samplers are coupled in WebGL 1. When upgrading to WebGL 2 consider
  // removing the sampleCacheKey here.
  var samplerCacheKey = getSamplerCacheKey(gltf, textureInfo);

  return "texture:" + imageCacheKey + "-sampler-" + samplerCacheKey;
};

export default ResourceCacheKey;
