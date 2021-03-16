import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import getAbsoluteUri from "../Core/getAbsoluteUri.js";

/**
 * Gets cache keys for {@link GltfCacheResource}.
 *
 * @namespace GltfCacheKey
 *
 * @private
 */
var GltfCacheKey = {};

function getExternalResourceCacheKey(baseResource, uri) {
  var resource = baseResource.getDerivedResource({
    url: uri,
  });
  return getAbsoluteUri(resource.url);
}

function getEmbeddedBufferCacheKey(gltfCacheKey, bufferId) {
  return gltfCacheKey + "-buffer-" + bufferId;
}

/**
 * Gets the glTF cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 *
 * @returns {String} The glTF cache key.
 */
GltfCacheKey.getGltfCacheKey = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltfResource = options.gltfResource;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("gltfResource", gltfResource);
  //>>includeEnd('debug');

  return getAbsoluteUri(gltfResource.url);
};

/**
 * Gets the buffer cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.buffer The glTF buffer.
 * @param {Number} options.bufferId The buffer ID.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 *
 * @returns {String} The buffer cache key.
 */
GltfCacheKey.getBufferCacheKey = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var buffer = options.buffer;
  var bufferId = options.bufferId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("buffer", buffer);
  Check.typeOf.number("bufferId", bufferId);
  Check.typeOf.object("gltfResource", gltfResource);
  Check.typeOf.object("baseResource", baseResource);
  //>>includeEnd('debug');

  if (defined(buffer.uri)) {
    return getExternalResourceCacheKey(baseResource, buffer.uri);
  }
  var gltfCacheKey = GltfCacheKey.getGltfCacheKey({
    gltfResource: gltfResource,
  });
  return getEmbeddedBufferCacheKey(gltfCacheKey, bufferId);
};

/**
 * Gets the vertex buffer cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.bufferViewId The bufferView ID corresponding to the vertex buffer.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 *
 * @returns {String} The vertex buffer cache key.
 */
GltfCacheKey.getVertexBufferCacheKey = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var bufferViewId = options.bufferViewId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("gltf", gltf);
  Check.typeOf.number("bufferViewId", bufferViewId);
  Check.typeOf.object("gltfResource", gltfResource);
  Check.typeOf.object("baseResource", baseResource);
  //>>includeEnd('debug');

  var bufferView = gltf.bufferViews[bufferViewId];
  var bufferId = bufferView.buffer;
  var buffer = gltf.buffers[bufferId];

  var bufferCacheKey = GltfCacheKey.getBufferCacheKey({
    buffer: buffer,
    bufferId: bufferId,
    gltfResource: gltfResource,
    baseResource: baseResource,
  });

  var byteOffset = bufferView.byteOffset;
  var byteLength = bufferView.byteLength;
  var bufferViewCacheKey = byteOffset + "-" + byteLength;
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
 *
 * @returns {String} The index buffer cache key.
 */
GltfCacheKey.getIndexBufferCacheKey = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var accessorId = options.accessorId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("gltf", gltf);
  Check.typeOf.number("accessorId", accessorId);
  Check.typeOf.object("gltfResource", gltfResource);
  Check.typeOf.object("baseResource", baseResource);
  //>>includeEnd('debug');

  var accessor = gltf.accessors[accessorId];
  var bufferViewId = accessor.bufferView;
  var bufferView = gltf.bufferViews[bufferViewId];
  var bufferId = bufferView.buffer;
  var buffer = gltf.buffers[bufferId];

  var bufferCacheKey = GltfCacheKey.getBufferCacheKey({
    buffer: buffer,
    bufferId: bufferId,
    gltfResource: gltfResource,
    baseResource: baseResource,
  });

  var byteOffset = bufferView.byteOffset + accessor.byteOffset;
  var componentType = accessor.componentType;
  var type = accessor.type;
  var count = accessor.count;
  var accessorCacheKey = componentType + "-" + type + "-" + count;
  return (
    bufferCacheKey + "-index-buffer-" + byteOffset + "-" + accessorCacheKey
  );
};

/**
 * Gets the Draco vertex buffer cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.bufferViewId The bufferView ID corresponding to the Draco buffer.
 * @param {Number} options.dracoAttributeId The Draco attribute ID.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 *
 * @returns {String} The Draco vertex buffer cache key.
 */
GltfCacheKey.getDracoVertexBufferCacheKey = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var bufferViewId = options.bufferViewId;
  var dracoAttributeId = options.dracoAttributeId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("gltf", gltf);
  Check.typeOf.number("bufferViewId", bufferViewId);
  Check.typeOf.number("dracoAttributeId", dracoAttributeId);
  Check.typeOf.object("gltfResource", gltfResource);
  Check.typeOf.object("baseResource", baseResource);
  //>>includeEnd('debug');

  var bufferView = gltf.bufferViews[bufferViewId];
  var bufferId = bufferView.buffer;
  var buffer = gltf.buffers[bufferId];

  var bufferCacheKey = GltfCacheKey.getBufferCacheKey({
    buffer: buffer,
    bufferId: bufferId,
    gltfResource: gltfResource,
    baseResource: baseResource,
  });

  var byteOffset = bufferView.byteOffset;
  var byteLength = bufferView.byteLength;
  var bufferViewCacheKey = byteOffset + "-" + byteLength;

  var dracoCacheKey = dracoAttributeId;

  return (
    bufferCacheKey +
    "-draco-vertex-buffer-" +
    bufferViewCacheKey +
    "-" +
    dracoCacheKey
  );
};

export default GltfCacheKey;
