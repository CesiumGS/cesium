import defined from "../Core/defined.js";
import getAbsoluteUri from "../Core/getAbsoluteUri.js";

/**
 * Gets cache keys for various glTF resources.
 *
 * @exports GltfCacheKey
 * @alias GltfCacheKey
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
 * @param {Resource} options.gltfResource The glTF resource.
 *
 * @returns {String} The glTF cache key.
 *
 * @private
 */
GltfCacheKey.getGltfCacheKey = function (options) {
  return getAbsoluteUri(options.gltfResource.url);
};

/**
 * Gets the buffer cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.buffer The glTF buffer.
 * @param {Number} options.bufferId The buffer ID.
 * @param {Resource} options.gltfResource The glTF resource.
 * @param {Resource} options.baseResource The base resource that paths in the glTF JSON are relative to.
 *
 * @returns {String} The buffer cache key.
 *
 * @private
 */
GltfCacheKey.getBufferCacheKey = function (options) {
  var buffer = options.buffer;
  var bufferId = options.bufferId;

  if (defined(buffer.uri)) {
    return getExternalResourceCacheKey(options.baseResource, buffer.uri);
  }
  var gltfCacheKey = GltfCacheKey.getGltfCacheKey({
    gltfResource: options.gltfResource,
  });
  return getEmbeddedBufferCacheKey(gltfCacheKey, bufferId);
};

/**
 * Gets the vertex buffer cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.bufferViewId The bufferView ID corresponding to the vertex buffer.
 * @param {Resource} options.gltfResource The glTF resource.
 * @param {Resource} options.baseResource The base resource that paths in the glTF JSON are relative to.
 *
 * @returns {String} The vertex buffer cache key.
 *
 * @private
 */
GltfCacheKey.getVertexBufferCacheKey = function (options) {
  var gltf = options.gltf;
  var bufferViewId = options.bufferViewId;
  var bufferView = gltf.bufferViews[bufferViewId];
  var bufferId = bufferView.buffer;
  var buffer = gltf.buffers[bufferId];

  var bufferCacheKey = GltfCacheKey.getBufferCacheKey({
    gltfResource: options.gltfResource,
    baseResource: options.baseResource,
    buffer: buffer,
    bufferId: bufferId,
  });

  var byteOffset = bufferView.byteOffset;
  var byteLength = bufferView.byteLength;
  var bufferViewKey = byteOffset + "-" + byteLength;
  return bufferCacheKey + "-vertex-buffer-" + bufferViewKey;
};

/**
 * Gets the index buffer cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.accessorId The accessor ID corresponding to the index buffer.
 * @param {Resource} options.gltfResource The glTF resource.
 * @param {Resource} options.baseResource The base resource that paths in the glTF JSON are relative to.
 *
 * @returns {String} The index buffer cache key.
 *
 * @private
 */
GltfCacheKey.getIndexBufferCacheKey = function (options) {
  var gltf = options.gltf;
  var accessor = gltf.accessors[options.accessorId];
  var bufferViewId = accessor.bufferView;
  var bufferView = gltf.bufferViews[bufferViewId];
  var bufferId = bufferView.buffer;
  var buffer = gltf.buffers[bufferId];

  var bufferCacheKey = GltfCacheKey.getBufferCacheKey({
    gltfResource: options.gltfResource,
    baseResource: options.baseResource,
    buffer: buffer,
    bufferId: bufferId,
  });

  var byteOffset = bufferView.byteOffset + accessor.byteOffset;
  var componentType = accessor.componentType;
  var type = accessor.type;
  var count = accessor.count;
  var accessorKey = componentType + "-" + type + "-" + count;
  return bufferCacheKey + "-index-buffer-" + byteOffset + "-" + accessorKey;
};

/**
 * Gets the Draco vertex buffer cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.bufferViewId The bufferView ID corresponding to the Draco buffer.
 * @param {Number} options.dracoAttributeId The Draco attribute ID.
 * @param {Resource} options.gltfResource The glTF resource.
 * @param {Resource} options.baseResource The base resource that paths in the glTF JSON are relative to.
 *
 * @returns {String} The Draco vertex buffer cache key.
 *
 * @private
 */
GltfCacheKey.getDracoVertexBufferCacheKey = function (options) {
  var gltf = options.gltf;
  var bufferViewId = options.bufferViewId;
  var bufferView = gltf.bufferViews[bufferViewId];
  var bufferId = bufferView.buffer;
  var buffer = gltf.buffers[bufferId];

  var bufferCacheKey = GltfCacheKey.getBufferCacheKey({
    gltfResource: options.gltfResource,
    baseResource: options.baseResource,
    buffer: buffer,
    bufferId: bufferId,
  });

  var byteOffset = bufferView.byteOffset;
  var byteLength = bufferView.byteLength;
  var bufferViewKey = byteOffset + "-" + byteLength;

  var dracoKey = options.dracoAttributeId;

  return (
    bufferCacheKey + "-draco-vertex-buffer-" + bufferViewKey + "-" + dracoKey
  );
};

export default GltfCacheKey;
