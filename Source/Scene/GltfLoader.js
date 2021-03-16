import Check from "./Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import Resource from "../Core/Resource.js";
import ForEach from "../ThirdParty/GltfPipeline/ForEach.js";
import hasExtension from "../ThirdParty/GltfPipeline/hasExtension.js";
import GltfCache from "./GltfCache.js";
import GltfLoadResources from "./GltfLoadResources.js";

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
 * @param {Resource|String} options.uri The uri to the glTF file.
 * @param {Resource|String} [options.basePath] The base path that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 * @param {Boolean} [options.keepResident=false] Whether the glTF JSON and embedded buffers should stay in the cache indefinitely.
 *
 * @alias GltfLoader
 * @constructor
 *
 * @private
 */
function GltfLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var uri = options.uri;
  var basePath = options.basePath;
  var asynchronous = defaultValue(options.asynchronous, true);
  var keepResident = defaultValue(options.keepResident, false);

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.uri", uri);
  //>>includeEnd('debug');

  var gltfResource = Resource.createIfNeeded(uri);

  if (!defined(gltfResource.headers.Accept)) {
    gltfResource.headers.Accept = defaultAccept;
  }

  var baseResource = defined(basePath)
    ? Resource.createIfNeeded(basePath)
    : gltfResource.clone();

  this._uri = uri;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._asynchronous = asynchronous;
  this._keepResident = keepResident;
  this._gltf = undefined;
  this._loadResources = new GltfLoadResources();
  this._gltfCacheResource = undefined;
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
   */
  error: {
    get: function () {
      return this._error;
    },
  },
});

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
    this._loadResources.update(frameState);
  }
};

function handleModelDestroyed(loader, model) {
  if (model.isDestroyed()) {
    unload(loader);
    loader._state = GltfLoaderState.FAILED;
    return true;
  }
  return false;
}

function loadGltf(loader, model) {
  var gltfCacheResource = GltfCache.loadGltf({
    gltfResource: loader._gltfResource,
    baseResource: loader._baseResource,
    keepResident: loader._keepResident,
  });

  this._gltfCacheResource = gltfCacheResource;

  gltfCacheResource.promise
    .then(function () {
      if (handleModelDestroyed(loader, model)) {
        return;
      }

      var gltf = gltfCacheResource.gltf;

      loader._gltf = gltf;
      loader._state = GltfLoaderState.PROCESSING;

      var vertexBuffers = loadVertexBuffers(loader, gltf);
      var indexBuffers = loadIndexBuffers(loader, gltf);

      return loader._loadResources
        .load({
          vertexBuffers: vertexBuffers,
          indexBuffers: indexBuffers,
        })
        .then(function () {
          if (handleModelDestroyed(loader, model)) {
            return;
          }
          createModel(loader, model);
          loader._state = GltfLoaderState.READY;
        });
    })
    .otherwise(function (error) {
      unload(loader);
      loader._error = error;
      loader._state = GltfLoaderState.FAILED;
    });
}

function loadVertexBuffers(loader, gltf) {
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

  var vertexBuffers = {};
  for (var bufferViewId in bufferViewIds) {
    if (bufferViewIds.hasOwnProperty(bufferViewId)) {
      vertexBuffers[bufferViewId] = GltfCache.loadVertexBuffer({
        gltf: gltf,
        bufferViewId: bufferViewId,
        gltfResource: loader._gltfResource,
        baseResource: loader._baseResource,
        asynchronous: loader._asynchronous,
      });
    }
  }
  return vertexBuffers;
}

function unload(loader) {
  if (defined(loader._gltfCacheResource)) {
    GltfCache.unloadGltf(loader._gltfCacheResource);
  }
  loader._loadResources.unload();
}

GltfLoader.prototype.isDestroyed = function () {
  return false;
};

GltfLoader.prototype.destroy = function () {
  unload(this);
  return destroyObject(this);
};
