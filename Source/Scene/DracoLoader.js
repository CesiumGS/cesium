import arraySlice from "../Core/arraySlice.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defined from "../Core/defined.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import TaskProcessor from "../Core/TaskProcessor.js";
import ForEach from "../ThirdParty/GltfPipeline/ForEach.js";
import when from "../ThirdParty/when.js";

/**
 * @private
 */
function DracoLoader() {}

// Maximum concurrency to use when decoding draco models
DracoLoader._maxDecodingConcurrency = Math.max(
  FeatureDetection.hardwareConcurrency - 1,
  1
);

// Exposed for testing purposes
DracoLoader._decoderTaskProcessor = undefined;
DracoLoader._taskProcessorReady = false;
DracoLoader._getDecoderTaskProcessor = function () {
  if (!defined(DracoLoader._decoderTaskProcessor)) {
    var processor = new TaskProcessor(
      "decodeDraco",
      DracoLoader._maxDecodingConcurrency
    );
    processor
      .initWebAssemblyModule({
        modulePath: "ThirdParty/Workers/draco_wasm_wrapper.js",
        wasmBinaryFile: "ThirdParty/draco_decoder.wasm",
        fallbackModulePath: "ThirdParty/Workers/draco_decoder.js",
      })
      .then(function () {
        DracoLoader._taskProcessorReady = true;
      });
    DracoLoader._decoderTaskProcessor = processor;
  }

  return DracoLoader._decoderTaskProcessor;
};

/**
 * Returns true if the model uses or requires KHR_draco_mesh_compression.
 *
 * @private
 */
DracoLoader.hasExtension = function (model) {
  return (
    defined(model.extensionsRequired.KHR_draco_mesh_compression) ||
    defined(model.extensionsUsed.KHR_draco_mesh_compression)
  );
};

function addBufferToLoadResources(loadResources, typedArray) {
  // Create a new id to differentiate from original glTF bufferViews
  var bufferViewId =
    "runtime." + Object.keys(loadResources.createdBufferViews).length;

  var loadResourceBuffers = loadResources.buffers;
  var id = Object.keys(loadResourceBuffers).length;
  loadResourceBuffers[id] = typedArray;
  loadResources.createdBufferViews[bufferViewId] = {
    buffer: id,
    byteOffset: 0,
    byteLength: typedArray.byteLength,
  };

  return bufferViewId;
}

function addNewVertexBuffer(typedArray, model, context) {
  var loadResources = model._loadResources;
  var id = addBufferToLoadResources(loadResources, typedArray);
  loadResources.vertexBuffersToCreate.enqueue(id);
  return id;
}

function addNewIndexBuffer(indexArray, model, context) {
  var typedArray = indexArray.typedArray;
  var loadResources = model._loadResources;
  var id = addBufferToLoadResources(loadResources, typedArray);
  loadResources.indexBuffersToCreate.enqueue({
    id: id,
    componentType: ComponentDatatype.fromTypedArray(typedArray),
  });

  return {
    bufferViewId: id,
    numberOfIndices: indexArray.numberOfIndices,
  };
}

function scheduleDecodingTask(
  decoderTaskProcessor,
  model,
  loadResources,
  context
) {
  if (!DracoLoader._taskProcessorReady) {
    // The task processor is not ready to schedule tasks
    return;
  }

  var taskData = loadResources.primitivesToDecode.peek();
  if (!defined(taskData)) {
    // All primitives are processing
    return;
  }

  var promise = decoderTaskProcessor.scheduleTask(taskData, [
    taskData.array.buffer,
  ]);
  if (!defined(promise)) {
    // Cannot schedule another task this frame
    return;
  }

  loadResources.activeDecodingTasks++;
  loadResources.primitivesToDecode.dequeue();
  return promise.then(function (result) {
    loadResources.activeDecodingTasks--;

    var decodedIndexBuffer = addNewIndexBuffer(
      result.indexArray,
      model,
      context
    );

    var attributes = {};
    var decodedAttributeData = result.attributeData;
    for (var attributeName in decodedAttributeData) {
      if (decodedAttributeData.hasOwnProperty(attributeName)) {
        var attribute = decodedAttributeData[attributeName];
        var vertexArray = attribute.array;
        var vertexBufferView = addNewVertexBuffer(vertexArray, model, context);

        var data = attribute.data;
        data.bufferView = vertexBufferView;

        attributes[attributeName] = data;
      }
    }

    model._decodedData[taskData.mesh + ".primitive." + taskData.primitive] = {
      bufferView: decodedIndexBuffer.bufferViewId,
      numberOfIndices: decodedIndexBuffer.numberOfIndices,
      attributes: attributes,
    };
  });
}

DracoLoader._decodedModelResourceCache = undefined;

/**
 * Parses draco extension on model primitives and
 * adds the decoding data to the model's load resources.
 *
 * @private
 */
DracoLoader.parse = function (model, context) {
  if (!DracoLoader.hasExtension(model)) {
    return;
  }

  var loadResources = model._loadResources;
  var cacheKey = model.cacheKey;
  if (defined(cacheKey)) {
    if (!defined(DracoLoader._decodedModelResourceCache)) {
      if (!defined(context.cache.modelDecodingCache)) {
        context.cache.modelDecodingCache = {};
      }

      DracoLoader._decodedModelResourceCache = context.cache.modelDecodingCache;
    }

    // Decoded data for model will be loaded from cache
    var cachedData = DracoLoader._decodedModelResourceCache[cacheKey];
    if (defined(cachedData)) {
      cachedData.count++;
      loadResources.pendingDecodingCache = true;
      return;
    }
  }

  var dequantizeInShader = model._dequantizeInShader;
  var gltf = model.gltf;
  ForEach.mesh(gltf, function (mesh, meshId) {
    ForEach.meshPrimitive(mesh, function (primitive, primitiveId) {
      if (!defined(primitive.extensions)) {
        return;
      }

      var compressionData = primitive.extensions.KHR_draco_mesh_compression;
      if (!defined(compressionData)) {
        return;
      }

      var bufferView = gltf.bufferViews[compressionData.bufferView];
      var typedArray = arraySlice(
        gltf.buffers[bufferView.buffer].extras._pipeline.source,
        bufferView.byteOffset,
        bufferView.byteOffset + bufferView.byteLength
      );
      loadResources.primitivesToDecode.enqueue({
        mesh: meshId,
        primitive: primitiveId,
        array: typedArray,
        bufferView: bufferView,
        compressedAttributes: compressionData.attributes,
        dequantizeInShader: dequantizeInShader,
      });
    });
  });
};

/**
 * Schedules decoding tasks available this frame.
 * @private
 */
DracoLoader.decodeModel = function (model, context) {
  if (!DracoLoader.hasExtension(model)) {
    return when.resolve();
  }

  var loadResources = model._loadResources;
  var cacheKey = model.cacheKey;
  if (defined(cacheKey) && defined(DracoLoader._decodedModelResourceCache)) {
    var cachedData = DracoLoader._decodedModelResourceCache[cacheKey];
    // Load decoded data for model when cache is ready
    if (defined(cachedData) && loadResources.pendingDecodingCache) {
      return when(cachedData.ready, function () {
        model._decodedData = cachedData.data;
        loadResources.pendingDecodingCache = false;
      });
    }

    // Decoded data for model should be cached when ready
    DracoLoader._decodedModelResourceCache[cacheKey] = {
      ready: false,
      count: 1,
      data: undefined,
    };
  }

  if (loadResources.primitivesToDecode.length === 0) {
    // No more tasks to schedule
    return when.resolve();
  }

  var decoderTaskProcessor = DracoLoader._getDecoderTaskProcessor();
  var decodingPromises = [];

  var promise = scheduleDecodingTask(
    decoderTaskProcessor,
    model,
    loadResources,
    context
  );
  while (defined(promise)) {
    decodingPromises.push(promise);
    promise = scheduleDecodingTask(
      decoderTaskProcessor,
      model,
      loadResources,
      context
    );
  }

  return when.all(decodingPromises);
};

/**
 * Decodes a compressed point cloud. Returns undefined if the task cannot be scheduled.
 * @private
 */
DracoLoader.decodePointCloud = function (parameters) {
  var decoderTaskProcessor = DracoLoader._getDecoderTaskProcessor();
  if (!DracoLoader._taskProcessorReady) {
    // The task processor is not ready to schedule tasks
    return;
  }
  return decoderTaskProcessor.scheduleTask(parameters, [
    parameters.buffer.buffer,
  ]);
};

/**
 * Decodes a buffer view. Returns undefined if the task cannot be scheduled.
 *
 * @param {Object} options Object with the following properties:
 * @param {Uint8Array} options.array The typed array containing the buffer view data.
 * @param {Object} options.bufferView The glTF buffer view object.
 * @param {Object.<String, Number>} options.compressedAttributes The compressed attributes.
 * @param {Boolean} options.dequantizeInShader Whether POSITION and NORMAL attributes should be dequantized on the GPU.
 *
 * @returns {Promise} A promise that resolves to the decoded indices and attributes.
 * @private
 */
DracoLoader.decodeBufferView = function (options) {
  var decoderTaskProcessor = DracoLoader._getDecoderTaskProcessor();
  if (!DracoLoader._taskProcessorReady) {
    // The task processor is not ready to schedule tasks
    return;
  }

  return decoderTaskProcessor.scheduleTask(options, [options.array.buffer]);
};

/**
 * Caches a models decoded data so it doesn't need to decode more than once.
 * @private
 */
DracoLoader.cacheDataForModel = function (model) {
  var cacheKey = model.cacheKey;
  if (defined(cacheKey) && defined(DracoLoader._decodedModelResourceCache)) {
    var cachedData = DracoLoader._decodedModelResourceCache[cacheKey];
    if (defined(cachedData)) {
      cachedData.ready = true;
      cachedData.data = model._decodedData;
    }
  }
};

/**
 * Destroys the cached data that this model references if it is no longer in use.
 * @private
 */
DracoLoader.destroyCachedDataForModel = function (model) {
  var cacheKey = model.cacheKey;
  if (defined(cacheKey) && defined(DracoLoader._decodedModelResourceCache)) {
    var cachedData = DracoLoader._decodedModelResourceCache[cacheKey];
    if (defined(cachedData) && --cachedData.count === 0) {
      delete DracoLoader._decodedModelResourceCache[cacheKey];
    }
  }
};
export default DracoLoader;
