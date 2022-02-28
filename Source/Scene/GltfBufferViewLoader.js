import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import hasExtension from "./hasExtension.js";
import when from "../ThirdParty/when.js";
import MeshoptDecoder from "../ThirdParty/meshoptimizer.js";
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
 * @param {Object} options Object with the following properties:
 * @param {ResourceCache} options.resourceCache The {@link ResourceCache} (to avoid circular dependencies).
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.bufferViewId The buffer view ID.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {String} [options.cacheKey] The cache key of the resource.
 *
 * @private
 */
export default function GltfBufferViewLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
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
    byteOffset = defaultValue(meshopt.byteOffset, 0);
    byteLength = meshopt.byteLength;

    hasMeshopt = true;
    meshoptByteStride = meshopt.byteStride;
    meshoptCount = meshopt.count;
    meshoptMode = meshopt.mode;
    meshoptFilter = defaultValue(meshopt.filter, "NONE");
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
  this._promise = when.defer();
}

if (defined(Object.create)) {
  GltfBufferViewLoader.prototype = Object.create(ResourceLoader.prototype);
  GltfBufferViewLoader.prototype.constructor = GltfBufferViewLoader;
}

Object.defineProperties(GltfBufferViewLoader.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof GltfBufferViewLoader.prototype
   *
   * @type {Promise.<GltfBufferViewLoader>}
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
   * @memberof GltfBufferViewLoader.prototype
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

/**
 * Loads the resource.
 * @private
 */
GltfBufferViewLoader.prototype.load = function () {
  const bufferLoader = getBufferLoader(this);
  this._bufferLoader = bufferLoader;
  this._state = ResourceLoaderState.LOADING;

  const that = this;

  bufferLoader.promise
    .then(function () {
      if (that.isDestroyed()) {
        return;
      }
      const bufferTypedArray = bufferLoader.typedArray;
      const bufferViewTypedArray = new Uint8Array(
        bufferTypedArray.buffer,
        bufferTypedArray.byteOffset + that._byteOffset,
        that._byteLength
      );

      // Unload the buffer
      that.unload();

      that._typedArray = bufferViewTypedArray;
      if (that._hasMeshopt) {
        that._state = ResourceLoaderState.PROCESSING;
      } else {
        that._state = ResourceLoaderState.READY;
        that._promise.resolve(that);
      }
    })
    .otherwise(function (error) {
      if (that.isDestroyed()) {
        return;
      }
      that.unload();
      that._state = ResourceLoaderState.FAILED;
      const errorMessage = "Failed to load buffer view";
      that._promise.reject(that.getError(errorMessage, error));
    });
};

function getBufferLoader(bufferViewLoader) {
  const resourceCache = bufferViewLoader._resourceCache;
  const buffer = bufferViewLoader._buffer;
  if (defined(buffer.uri)) {
    const baseResource = bufferViewLoader._baseResource;
    const resource = baseResource.getDerivedResource({
      url: buffer.uri,
    });
    return resourceCache.loadExternalBuffer({
      resource: resource,
    });
  }
  return resourceCache.loadEmbeddedBuffer({
    parentResource: bufferViewLoader._gltfResource,
    bufferId: bufferViewLoader._bufferId,
  });
}

/**
 * Processes the resources. For a BufferView that does not have the EXT_meshopt_compression extension, there
 * is no processing that needs to happen, so this function returns immediately.
 *
 * @param {FrameState} frameState The frame state.
 */
GltfBufferViewLoader.prototype.process = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  if (!this._hasMeshopt) {
    return;
  }

  if (!defined(this._typedArray)) {
    return;
  }

  if (this._state !== ResourceLoaderState.PROCESSING) {
    return;
  }

  const count = this._meshoptCount;
  const byteStride = this._meshoptByteStride;
  const result = new Uint8Array(count * byteStride);
  MeshoptDecoder.decodeGltfBuffer(
    result,
    count,
    byteStride,
    this._typedArray,
    this._meshoptMode,
    this._meshoptFilter
  );

  this._typedArray = result;
  this._state = ResourceLoaderState.READY;
  this._promise.resolve(this);
};

/**
 * Unloads the resource.
 * @private
 */
GltfBufferViewLoader.prototype.unload = function () {
  if (defined(this._bufferLoader)) {
    this._resourceCache.unload(this._bufferLoader);
  }

  this._bufferLoader = undefined;
  this._typedArray = undefined;
};
