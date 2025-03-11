import Check from "../Core/Check.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import hasExtension from "./hasExtension.js";
import { MeshoptDecoder } from "meshoptimizer";
import ResourceLoader from "./ResourceLoader.js";
import ResourceLoaderState from "./ResourceLoaderState.js";

/**
 * Loads a glTF buffer view.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias GltfBufferViewLoader
 * @constructor
 * @augments ResourceLoader
 *
 * @param {object} options Object with the following properties:
 * @param {ResourceCache} options.resourceCache The {@link ResourceCache} (to avoid circular dependencies).
 * @param {object} options.gltf The glTF JSON.
 * @param {number} options.bufferViewId The buffer view ID.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {string} [options.cacheKey] The cache key of the resource.
 *
 * @private
 */
function GltfBufferViewLoader(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const resourceCache = options.resourceCache;
  const gltf = options.gltf;
  const bufferViewId = options.bufferViewId;
  const gltfResource = options.gltfResource;
  const baseResource = options.baseResource;
  const cacheKey = options.cacheKey;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.func("options.resourceCache", resourceCache);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.bufferViewId", bufferViewId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  const bufferView = gltf.bufferViews[bufferViewId];
  let bufferId = bufferView.buffer;
  let byteOffset = bufferView.byteOffset;
  let byteLength = bufferView.byteLength;

  let hasMeshopt = false;
  let meshoptByteStride;
  let meshoptCount;
  let meshoptMode;
  let meshoptFilter;

  if (hasExtension(bufferView, "EXT_meshopt_compression")) {
    const meshopt = bufferView.extensions.EXT_meshopt_compression;
    bufferId = meshopt.buffer;
    byteOffset = meshopt.byteOffset ?? 0;
    byteLength = meshopt.byteLength;

    hasMeshopt = true;
    meshoptByteStride = meshopt.byteStride;
    meshoptCount = meshopt.count;
    meshoptMode = meshopt.mode;
    meshoptFilter = meshopt.filter ?? "NONE";
  }

  const buffer = gltf.buffers[bufferId];

  this._hasMeshopt = hasMeshopt;
  this._meshoptByteStride = meshoptByteStride;
  this._meshoptCount = meshoptCount;
  this._meshoptMode = meshoptMode;
  this._meshoptFilter = meshoptFilter;

  this._resourceCache = resourceCache;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._buffer = buffer;
  this._bufferId = bufferId;
  this._byteOffset = byteOffset;
  this._byteLength = byteLength;
  this._cacheKey = cacheKey;
  this._bufferLoader = undefined;
  this._typedArray = undefined;
  this._state = ResourceLoaderState.UNLOADED;
  this._promise = undefined;
}

if (defined(Object.create)) {
  GltfBufferViewLoader.prototype = Object.create(ResourceLoader.prototype);
  GltfBufferViewLoader.prototype.constructor = GltfBufferViewLoader;
}

Object.defineProperties(GltfBufferViewLoader.prototype, {
  /**
   * The cache key of the resource.
   *
   * @memberof GltfBufferViewLoader.prototype
   *
   * @type {string}
   * @readonly
   * @private
   */
  cacheKey: {
    get: function () {
      return this._cacheKey;
    },
  },
  /**
   * The typed array containing buffer view data.
   *
   * @memberof GltfBufferViewLoader.prototype
   *
   * @type {Uint8Array}
   * @readonly
   * @private
   */
  typedArray: {
    get: function () {
      return this._typedArray;
    },
  },
});

async function loadResources(loader) {
  try {
    const bufferLoader = getBufferLoader(loader);
    loader._bufferLoader = bufferLoader;
    await bufferLoader.load();

    if (loader.isDestroyed()) {
      return;
    }

    const bufferTypedArray = bufferLoader.typedArray;
    const bufferViewTypedArray = new Uint8Array(
      bufferTypedArray.buffer,
      bufferTypedArray.byteOffset + loader._byteOffset,
      loader._byteLength,
    );

    // Unload the buffer
    loader.unload();

    loader._typedArray = bufferViewTypedArray;
    if (loader._hasMeshopt) {
      const count = loader._meshoptCount;
      const byteStride = loader._meshoptByteStride;
      const result = new Uint8Array(count * byteStride);
      MeshoptDecoder.decodeGltfBuffer(
        result,
        count,
        byteStride,
        loader._typedArray,
        loader._meshoptMode,
        loader._meshoptFilter,
      );
      loader._typedArray = result;
    }

    loader._state = ResourceLoaderState.READY;
    return loader;
  } catch (error) {
    if (loader.isDestroyed()) {
      return;
    }

    loader.unload();
    loader._state = ResourceLoaderState.FAILED;
    const errorMessage = "Failed to load buffer view";
    throw loader.getError(errorMessage, error);
  }
}

/**
 * Loads the resource.
 * @returns {Promise<GltfBufferViewLoader>} A promise which resolves to the loader when the resource loading is completed.
 * @private
 */
GltfBufferViewLoader.prototype.load = async function () {
  if (defined(this._promise)) {
    return this._promise;
  }

  this._state = ResourceLoaderState.LOADING;
  this._promise = loadResources(this);
  return this._promise;
};

function getBufferLoader(bufferViewLoader) {
  const resourceCache = bufferViewLoader._resourceCache;
  const buffer = bufferViewLoader._buffer;
  if (defined(buffer.uri)) {
    const baseResource = bufferViewLoader._baseResource;
    const resource = baseResource.getDerivedResource({
      url: buffer.uri,
    });
    return resourceCache.getExternalBufferLoader({
      resource: resource,
    });
  }
  return resourceCache.getEmbeddedBufferLoader({
    parentResource: bufferViewLoader._gltfResource,
    bufferId: bufferViewLoader._bufferId,
  });
}

/**
 * Unloads the resource.
 * @private
 */
GltfBufferViewLoader.prototype.unload = function () {
  if (defined(this._bufferLoader) && !this._bufferLoader.isDestroyed()) {
    this._resourceCache.unload(this._bufferLoader);
  }

  this._bufferLoader = undefined;
  this._typedArray = undefined;
};

export default GltfBufferViewLoader;
