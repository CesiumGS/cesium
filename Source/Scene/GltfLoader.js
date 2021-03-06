import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import RuntimeError from "../Core/RuntimeError.js";

var cache = GltfLoaderCache();

function GltfLoader(options) {
  var gltf = options.gltf;
  if (gltf instanceof Uint8Array) {
    // Binary glTF
    var parsedGltf = parseGlb(gltf);

    cachedGltf = new CachedGltf({
      gltf: parsedGltf,
      ready: true,
    });
  } else {
}

function LoadResources() {
  this.buffers = {};
}

function getFailedLoadMessage (error, type, path) {
  var message = "Failed to load " + type + ": " + path;
  if (defined(error)) {
    message += "\n" + error.message;
  }
  return message;
};

function loadBuffers(promises) {
  ForEach.buffer(gltf, function (buffer) {
    if (!defined(buffer.extras._pipeline.source)) {
      var promise = cache.loadBuffer(buffer.uri).then(function(typedArray) {
        buffer.extras._pipeline.source = typedArray;
      }).otherwise(function(error) {
        throw new RuntimeError(getFailedLoadMessage(error, "buffer", buffer.uri));
      });
      promises.push(promise);
    }
  });
}

function loadShaders(promises) {
  ForEach.shader(gltf, function (shader) {
    var promise = cache.loadShader(shader.uri).then(function(text) {
      shader.extras._pipeline.source = text;
    }).otherwise(function(error) {
      throw new RuntimeError(getFailedLoadMessage(error, "shader", shader.uri));
    });
    promises.push(promise);
  });
}

function loadTextures(promises) {
  ForEach.image(gltf, function (image) {
    var promise = cache.loadImage(image.uri).then(function(text) {
      image.extras._pipeline.source = text;
    }).otherwise(function(error) {
      throw new RuntimeError(getFailedLoadMessage(error, "image", image.uri));
    });
    promises.push(promise);
  });
}

function processGltf(gltf) {
  var gltf = options.gltf;
  if (gltf instanceof Uint8Array) {
    gltf = parseGlb(gltf);
  }

  var promises = [];

  loadBuffers(promises);
  loadShaders()

  // Need to load buffers so that the upgrade step can work

  updateVersion(gltf);
  addDefaults(gltf);

  removePipelineExtras;

  // Cache buffers that are used 
  // Each extension loops over the model and does it's thing?

  //var getBuffers = 
}

var defaultModelAccept = 'model/gltf-binary,model/gltf+json;q=0.8,application/json;q=0.2,*/*;q=0.01';

/**
 * Loads a glTF model from a uri.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource|String} options.uri The uri to the glTF file.
 * @param {Resource|String} [options.basePath] The base path that paths in the glTF JSON are relative to.
 *
 * @returns {Model} The newly created model.
 */
GltfLoader.fromUri = function(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var uri = options.uri;

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.uri", uri);
  //>>includeEnd('debug');

  // Create resource for the model file
  var modelResource = Resource.createIfNeeded(uri);

  // Setup basePath to get dependent files
  var basePath = defined(options.basePath) ? options.basePath : modelResource.clone();
  var resource = Resource.createIfNeeded(basePath);

  // If no cache key is provided, use a GUID.
  // Check using a URI to GUID dictionary that we have not already added this model.
  var cacheKey = defaultValue(
    options.cacheKey,
    uriToGuid[getAbsoluteUri(modelResource.url)]
  );
  if (!defined(cacheKey)) {
    cacheKey = createGuid();
    uriToGuid[getAbsoluteUri(modelResource.url)] = cacheKey;
  }

  if (defined(options.basePath) && !defined(options.cacheKey)) {
    cacheKey += resource.url;
  }
  options.cacheKey = cacheKey;
  options.basePath = resource;

  var model = new Model(options);

  var cachedGltf = gltfCache[cacheKey];
  if (!defined(cachedGltf)) {
    cachedGltf = new CachedGltf({
      ready: false,
    });
    cachedGltf.count = 1;
    cachedGltf.modelsToLoad.push(model);
    setCachedGltf(model, cachedGltf);
    gltfCache[cacheKey] = cachedGltf;

    // Add Accept header if we need it
    if (!defined(modelResource.headers.Accept)) {
      modelResource.headers.Accept = defaultModelAccept;
    }

    modelResource
      .fetchArrayBuffer()
      .then(function (arrayBuffer) {
        var array = new Uint8Array(arrayBuffer);
        if (containsGltfMagic(array)) {
          // Load binary glTF
          var parsedGltf = parseGlb(array);
          cachedGltf.makeReady(parsedGltf);
        } else {
          // Load text (JSON) glTF
          var json = getStringFromTypedArray(array);
          cachedGltf.makeReady(JSON.parse(json));
        }

        var resourceCredits = model._resourceCredits;
        var credits = modelResource.credits;
        if (defined(credits)) {
          var length = credits.length;
          for (var i = 0; i < length; i++) {
            resourceCredits.push(credits[i]);
          }
        }
      })
      .otherwise(
        ModelUtility.getFailedLoadFunction(model, "model", modelResource.url)
      );
  } else if (!cachedGltf.ready) {
    // Cache hit but the fetchArrayBuffer() or fetchText() request is still pending
    ++cachedGltf.count;
    cachedGltf.modelsToLoad.push(model);
  }
  // else if the cached glTF is defined and ready, the
  // model constructor will pick it up using the cache key.

  return model;

}