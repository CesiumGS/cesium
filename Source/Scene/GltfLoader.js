import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import getAbsoluteUri from "../Core/getAbsoluteUri.js";
import RuntimeError from "../Core/RuntimeError.js";
import ForEach from "../ThirdParty/GltfPipeline/ForEach.js";
import when from "../ThirdParty/when.js";
import GltfCache from "./GltfCache.js";

var cache = new GltfCache();

var GltfLoaderState = {
  UNLOADED: 0,
  LOADING: 1,
  PROCESSING: 2,
  READY: 3,
  FAILED: 4,
};

var defaultAccept =
  "model/gltf-binary,model/gltf+json;q=0.8,application/json;q=0.2,*/*;q=0.01";

/**
 * TODO: from ArrayBuffer
 * TODO: accessors that don't have a buffer view
 *
 * Loads a glTF model.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource|String} options.uri The uri to the .gltf file.
 * @param {Resource|String} [options.basePath] The base path that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 * @param {Boolean} [options.keepResident=true] Whether the glTF JSON and other resources should stay in the cache indefinitely.
 *
 * @alias GltfLoader
 * @constructor
 *
 * @private
 */
function GltfLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var uri = options.uri;
  var keepResident = defaultValue(options.keepResident, true);
  var asynchronous = defaultValue(options.asynchronous, true);

  // Create resource for the glTF file
  var gltfResource = Resource.createIfNeeded(uri);

  // Add Accept header if we need it
  if (!defined(gltfResource.headers.Accept)) {
    gltfResource.headers.Accept = defaultAccept;
  }

  // Set up baseResource to get dependent files
  var baseResource = defined(basePath)
    ? Resource.createIfNeeded(basePath)
    : gltfResource.clone();

  this._uri = uri;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._keepResident = keepResident;
  this._asynchronous = asynchronous;
  this._gltf = undefined;
  this._gltfCacheKey = getAbsoluteUri(gltfResource.url);
  this._loadResources = new GltfLoadResources(asynchronous);
  this._error = undefined;
  this._state = GltfLoaderState.UNLOADED;
}

Object.defineProperties(GltfLoader.prototype, {
  /**
   * Whether the loader is ready.
   *
   * @memberof GltfLoader.prototype
   * @type {Boolean}
   * @readonly
   * @private
   */
  ready: {
    get: function () {
      return this._state === GltfLoaderState.READY;
    },
  },
  /**
   * The error message if the glTF failed to load.
   *
   * @memberof GltfLoader.prototype
   * @type {Error}
   * @readonly
   * @private
   */
  error: {
    get: function () {
      return this._error;
    },
  },
});

function loadVertexBuffers(loader, cache, gltf) {
  var bufferViewIds = {};
  ForEach.mesh(gltf, function (mesh) {
    ForEach.meshPrimitive(mesh, function (primitive) {
      var dracoAttributes = defaultValue.EMPTY_OBJECT;
      if (
        defined(primitive.extensions) &&
        defined(primitive.extensions.KHR_draco_mesh_compression)
      ) {
        dracoAttributes = primitive.extensions.KHR_draco_mesh_compression;
      }
      ForEach.meshPrimitiveAttribute(primitive, function (
        accessorId,
        semantic
      ) {
        // Ignore accessors that may contain uncompressed fallback data since we only care about the compressed data
        if (!defined(dracoAttributes[semantic])) {
          var accessor = gltf.accessors[accessorId];
          var bufferViewId = accessor.bufferView;
          if (defined(bufferViewId)) {
            bufferViewIds[bufferViewId] = true;
          }
        }
      });
      ForEach.meshPrimitiveTarget(primitive, function (target) {
        ForEach.meshPrimitiveTargetAttribute(target, function (accessorId) {
          var accessor = gltf.accessors[accessorId];
          var bufferViewId = accessor.bufferView;
          if (defined(bufferViewId)) {
            bufferViewIds[bufferViewId] = true;
          }
        });
      });
    });
  });

  if (hasExtension(gltf, "EXT_mesh_gpu_instancing")) {
    ForEach.node(gltf, function (node) {
      if (
        defined(node.extensions) &&
        defined(node.extensions.EXT_mesh_gpu_instancing)
      ) {
        var attributes = node.extensions.EXT_mesh_gpu_instancing.attributes;
        if (defined(attributes)) {
          for (var attributeId in attributes) {
            if (attributes.hasOwnProperty(attributeId)) {
              var accessorId = attributes[attributeId];
              var accessor = gltf.accessors[accessorId];
              var bufferViewId = accessor.bufferView;
              if (defined(bufferViewId)) {
                bufferViewIds[bufferViewId] = true;
              }
            }
          }
        }
      }
    });
  }

  var vertexBuffersToLoad = {};
  for (var bufferViewId in bufferViewIds) {
    if (bufferViewIds.hasOwnProperty(bufferViewId)) {
      vertexBuffersToLoad[bufferViewId] = cache.loadVertexBuffer({
        bufferViewId: bufferViewId,
        gltfResource: loader._gltfResource,
        baseResource: loader._baseResource,
        gltf: gltf,
      });
    }
  }
  return vertexBuffersToLoad;
}

function handleModelDestroyed(loader, model) {
  if (model.isDestroyed()) {
    cache.release(loader._gltfCacheKey);
    loader._state = GltfLoaderState.FAILED;
    return true;
  }
  return false;
}

function GltfLoadResources(asynchronous) {
  this.asynchronous = asynchronous;
  this.promise = undefined;
  this.vertexBuffersToLoad = undefined;
  this.indexBuffersToLoad = undefined;
}

function loadGltf(loader, model) {
  cache
    .loadGltf(
      loader._gltfCacheKey,
      loader._gltfResource,
      loader._baseResource,
      loader._keepResident
    )
    .then(function (gltf) {
      if (handleModelDestroyed(loader, model)) {
        return;
      }

      var loadResources = new GltfLoadResources(loader._asynchronous);

      var vertexBuffersToLoad = loadVertexBuffers(loader, cache, gltf);
      var indexBuffersToLoad = loadIndexBuffers(loader, cache, gltf);
      var loadResources = getLoadResources(loader);

      loader._gltf = gltf;
      loader._state = GltfLoaderState.PROCESSING;

      return loadResources.readyPromise.then(function () {
        loader._state = GltfLoaderState.READY;
      });
    })
    .otherwise(function (error) {
      loader._error = error;
      loader._state = GltfLoaderState.FAILED;
    });
}

GltfLoader.prototype.update = function (model, frameState) {
  if (!FeatureDetection.supportsWebP.initialized) {
    FeatureDetection.supportsWebP.initialize();
    return;
  }
  var supportsWebP = FeatureDetection.supportsWebP();

  if (this._state === GltfLoaderState.UNLOADED) {
    loadGltf(this, model);
    this._state = GltfLoaderState.LOADING;
  }

  if (this._state === GltfLoaderState.PROCESSING) {
    processGltf(this, model, frameState);
  }
};

function unload(loader) {
  cache.unload(loader._gltfResource);

  var loadResources = loader._loadResources;
  loadResources.vertexBufferResources.forEach(function (vertexBufferResource) {
    cache.unloadVertexBuffer(vertexBufferResource);
  });
}

GltfLoader.prototype.isDestroyed = function () {
  return false;
};

GltfLoader.prototype.destroy = function () {
  unload(this);
  return destroyObject(this);
};
