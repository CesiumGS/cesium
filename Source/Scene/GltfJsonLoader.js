import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import getJsonFromTypedArray from "../Core/getJsonFromTypedArray.js";
import getMagic from "../Core/getMagic.js";
import isDataUri from "../Core/isDataUri.js";
import Resource from "../Core/Resource.js";
import addDefaults from "./GltfPipeline/addDefaults.js";
import addPipelineExtras from "./GltfPipeline/addPipelineExtras.js";
import ForEach from "./GltfPipeline/ForEach.js";
import parseGlb from "./GltfPipeline/parseGlb.js";
import removePipelineExtras from "./GltfPipeline/removePipelineExtras.js";
import updateVersion from "./GltfPipeline/updateVersion.js";
import ResourceLoader from "./ResourceLoader.js";
import ResourceLoaderState from "./ResourceLoaderState.js";

/**
 * Loads a glTF JSON from a glTF or glb.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias GltfJsonLoader
 * @constructor
 * @augments ResourceLoader
 *
 * @param {Object} options Object with the following properties:
 * @param {ResourceCache} options.resourceCache The {@link ResourceCache} (to avoid circular dependencies).
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Uint8Array} [options.typedArray] The typed array containing the glTF contents.
 * @param {Object} [options.gltfJson] The parsed glTF JSON contents.
 * @param {String} [options.cacheKey] The cache key of the resource.
 *
 * @private
 */
export default function GltfJsonLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const resourceCache = options.resourceCache;
  const gltfResource = options.gltfResource;
  const baseResource = options.baseResource;
  const typedArray = options.typedArray;
  const gltfJson = options.gltfJson;
  const cacheKey = options.cacheKey;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.func("options.resourceCache", resourceCache);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  this._resourceCache = resourceCache;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._typedArray = typedArray;
  this._gltfJson = gltfJson;
  this._cacheKey = cacheKey;
  this._gltf = undefined;
  this._bufferLoaders = [];
  this._state = ResourceLoaderState.UNLOADED;
  this._promise = undefined;
}

if (defined(Object.create)) {
  GltfJsonLoader.prototype = Object.create(ResourceLoader.prototype);
  GltfJsonLoader.prototype.constructor = GltfJsonLoader;
}

Object.defineProperties(GltfJsonLoader.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready, or undefined if the resource hasn't started loading.
   *
   * @memberof GltfJsonLoader.prototype
   *
   * @type {Promise.<GltfJsonLoader>|undefined}
   * @readonly
   * @private
   */
  promise: {
    get: function () {
      return this._promise;
    },
  },
  /**
   * The cache key of the resource.
   *
   * @memberof GltfJsonLoader.prototype
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
   * The glTF JSON.
   *
   * @memberof GltfJsonLoader.prototype
   *
   * @type {Object}
   * @readonly
   * @private
   */
  gltf: {
    get: function () {
      return this._gltf;
    },
  },
});

/**
 * Loads the resource.
 * @returns {Promise.<GltfJsonLoader>} A promise which resolves to the loader when the resource loading is completed.
 * @private
 */
GltfJsonLoader.prototype.load = function () {
  this._state = ResourceLoaderState.LOADING;

  let processPromise;
  if (defined(this._gltfJson)) {
    processPromise = processGltfJson(this, this._gltfJson);
  } else if (defined(this._typedArray)) {
    processPromise = processGltfTypedArray(this, this._typedArray);
  } else {
    processPromise = loadFromUri(this);
  }

  const that = this;
  this._promise = processPromise
    .then(function (gltf) {
      if (that.isDestroyed()) {
        return;
      }
      that._gltf = gltf;
      that._state = ResourceLoaderState.READY;
      return that;
    })
    .catch(function (error) {
      if (that.isDestroyed()) {
        return;
      }
      return handleError(that, error);
    });

  return this._promise;
};

function loadFromUri(gltfJsonLoader) {
  return gltfJsonLoader._fetchGltf().then(function (arrayBuffer) {
    if (gltfJsonLoader.isDestroyed()) {
      return;
    }
    const typedArray = new Uint8Array(arrayBuffer);
    return processGltfTypedArray(gltfJsonLoader, typedArray);
  });
}

function handleError(gltfJsonLoader, error) {
  gltfJsonLoader.unload();
  gltfJsonLoader._state = ResourceLoaderState.FAILED;
  const errorMessage = `Failed to load glTF: ${gltfJsonLoader._gltfResource.url}`;
  return Promise.reject(gltfJsonLoader.getError(errorMessage, error));
}

function upgradeVersion(gltfJsonLoader, gltf) {
  if (defined(gltf.asset) && gltf.asset.version === "2.0") {
    return Promise.resolve();
  }

  // Load all buffers into memory. updateVersion will read and in some cases modify
  // the buffer data, which it accesses from buffer.extras._pipeline.source
  const promises = [];
  ForEach.buffer(gltf, function (buffer) {
    if (
      !defined(buffer.extras._pipeline.source) && // Ignore uri if this buffer uses the glTF 1.0 KHR_binary_glTF extension
      defined(buffer.uri)
    ) {
      const resource = gltfJsonLoader._baseResource.getDerivedResource({
        url: buffer.uri,
      });
      const resourceCache = gltfJsonLoader._resourceCache;
      const bufferLoader = resourceCache.loadExternalBuffer({
        resource: resource,
      });

      gltfJsonLoader._bufferLoaders.push(bufferLoader);

      promises.push(
        bufferLoader.promise.then(function (bufferLoader) {
          buffer.extras._pipeline.source = bufferLoader.typedArray;
        })
      );
    }
  });

  return Promise.all(promises).then(function () {
    updateVersion(gltf);
  });
}

function decodeDataUris(gltf) {
  const promises = [];
  ForEach.buffer(gltf, function (buffer) {
    const bufferUri = buffer.uri;
    if (
      !defined(buffer.extras._pipeline.source) && // Ignore uri if this buffer uses the glTF 1.0 KHR_binary_glTF extension
      defined(bufferUri) &&
      isDataUri(bufferUri)
    ) {
      delete buffer.uri; // Delete the data URI to keep the cached glTF JSON small
      promises.push(
        Resource.fetchArrayBuffer(bufferUri).then(function (arrayBuffer) {
          buffer.extras._pipeline.source = new Uint8Array(arrayBuffer);
        })
      );
    }
  });
  return Promise.all(promises);
}

function loadEmbeddedBuffers(gltfJsonLoader, gltf) {
  const promises = [];
  ForEach.buffer(gltf, function (buffer, bufferId) {
    const source = buffer.extras._pipeline.source;
    if (defined(source) && !defined(buffer.uri)) {
      const resourceCache = gltfJsonLoader._resourceCache;
      const bufferLoader = resourceCache.loadEmbeddedBuffer({
        parentResource: gltfJsonLoader._gltfResource,
        bufferId: bufferId,
        typedArray: source,
      });

      gltfJsonLoader._bufferLoaders.push(bufferLoader);
      promises.push(bufferLoader.promise);
    }
  });
  return Promise.all(promises);
}

function processGltfJson(gltfJsonLoader, gltf) {
  addPipelineExtras(gltf);

  return decodeDataUris(gltf)
    .then(function () {
      return upgradeVersion(gltfJsonLoader, gltf);
    })
    .then(function () {
      addDefaults(gltf);
      return loadEmbeddedBuffers(gltfJsonLoader, gltf);
    })
    .then(function () {
      removePipelineExtras(gltf);
      return gltf;
    });
}

function processGltfTypedArray(gltfJsonLoader, typedArray) {
  let gltf;
  if (getMagic(typedArray) === "glTF") {
    gltf = parseGlb(typedArray);
  } else {
    gltf = getJsonFromTypedArray(typedArray);
  }

  return processGltfJson(gltfJsonLoader, gltf);
}

/**
 * Unloads the resource.
 * @private
 */
GltfJsonLoader.prototype.unload = function () {
  const bufferLoaders = this._bufferLoaders;
  const bufferLoadersLength = bufferLoaders.length;
  for (let i = 0; i < bufferLoadersLength; ++i) {
    this._resourceCache.unload(bufferLoaders[i]);
  }
  this._bufferLoaders.length = 0;

  this._gltf = undefined;
};

/**
 * Exposed for testing
 *
 * @private
 */
GltfJsonLoader.prototype._fetchGltf = function () {
  return this._gltfResource.fetchArrayBuffer();
};
