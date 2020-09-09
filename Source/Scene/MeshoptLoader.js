import arraySlice from "../Core/arraySlice.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defined from "../Core/defined.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import MeshoptDecoder from "../ThirdParty/meshopt_decoder.js";
import numberOfComponentsForType from "../ThirdParty/GltfPipeline/numberOfComponentsForType.js";
import ForEach from "../ThirdParty/GltfPipeline/ForEach.js";
import when from "../ThirdParty/when.js";
import RuntimeError from "../Core/RuntimeError.js";

/**
 * @private
 */
function MeshoptLoader() {}

// var t0 = performance.now();

MeshoptLoader._maxDecodingConcurrency = Math.max(
  FeatureDetection.hardwareConcurrency - 1,
  1
);

// // Exposed for testing purposes
MeshoptLoader._decoderTaskProcessor = undefined;
MeshoptLoader._taskProcessorReady = false;
MeshoptLoader._getDecoderTaskProcessor = function () {
  if (!defined(MeshoptLoader._decoderTaskProcessor)) {
    var decoder = MeshoptDecoder;
    decoder.ready.then(function () {
      MeshoptLoader._taskProcessorReady = true;
    });
    MeshoptLoader._decoderTaskProcessor = decoder;
  }

  return MeshoptLoader._decoderTaskProcessor;
};

/**
 * Returns true if the model uses or requires KHR_draco_mesh_compression.
 *
 * @private
 */
MeshoptLoader.hasExtension = function (model) {
  return (
    defined(model.extensionsRequired.KHR_mesh_quantization) &&
    (defined(model.extensionsUsed.EXT_meshopt_compression) ||
      defined(model.extensionsUsed.MESHOPT_compression))
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

function addNewVertexBuffer(typedArray, model) {
  var loadResources = model._loadResources;
  var id = addBufferToLoadResources(loadResources, typedArray);
  loadResources.vertexBuffersToCreate.enqueue(id);
  return id;
}

function addNewIndexBuffer(typedArray, count, model) {
  var loadResources = model._loadResources;
  var id = addBufferToLoadResources(loadResources, typedArray);
  loadResources.indexBuffersToCreate.enqueue({
    id: id,
    componentType: ComponentDatatype.fromTypedArray(typedArray),
  });

  return {
    bufferViewId: id,
    numberOfIndices: count,
  };
}

// function scheduleDecodingTask(
//   model,
//   loadResources
// ) {
//   var taskData = loadResources.primitivesToDecode.peek();
//   if (!defined(taskData)) {
//     // All primitives are processing
//     return;
//   }

//   var byteOffset = taskData.byteOffset || 0;
// 	var byteLength = taskData.byteLength || 0;

// 	var count = taskData.count;
// 	var stride = taskData.byteStride;

// 	var result = new ArrayBuffer(count * stride);
// 	var source = new Uint8Array(taskData.buffer, byteOffset, byteLength);

// 	MeshoptLoader._decoder.decodeGltfBuffer(new Uint8Array(result), count, stride, source, taskData.mode, taskData.filter);

//   model._decodedData[taskData.mesh + ".primitive." + taskData.primitive] = {
//       bufferView: result
//   };
// }

MeshoptLoader._decodedModelResourceCache = undefined;

/**
 * Parses draco extension on model primitives and
 * adds the decoding data to the model's load resources.
 *
 * @private
 */
MeshoptLoader.parse = function (model, context) {
  if (!MeshoptLoader.hasExtension(model)) {
    return;
  }

  var loadResources = model._loadResources;
  var cacheKey = model.cacheKey;
  if (defined(cacheKey)) {
    if (!defined(MeshoptLoader._decodedModelResourceCache)) {
      if (!defined(context.cache.modelDecodingCache)) {
        context.cache.modelDecodingCache = {};
      }

      MeshoptLoader._decodedModelResourceCache =
        context.cache.modelDecodingCache;
    }

    // Decoded data for model will be loaded from cache
    var cachedData = MeshoptLoader._decodedModelResourceCache[cacheKey];
    if (defined(cachedData)) {
      cachedData.count++;
      loadResources.pendingDecodingCache = true;
      return;
    }
  }

  var gltf = model.gltf;
  // This extension operates on bufferViews
  ForEach.mesh(gltf, function (mesh, meshId) {
    ForEach.meshPrimitive(mesh, function (primitive, primitiveId) {
      // We only need the meshID and primitiveId.  We will handle MESHOPT compatibility later
      // We will decode each of the buffers and attributes in the decode step (if they are MESHOPT)
      loadResources.primitivesToDecode.enqueue({
        mesh: meshId,
        primitive: primitiveId,
      });
    });
  });
};

/**
 * Schedules decoding tasks available this frame.
 * @private
 */
MeshoptLoader.decodeModel = function (model, context) {
  if (!MeshoptLoader.hasExtension(model)) {
    return when.resolve();
  }

  var loadResources = model._loadResources;
  var cacheKey = model.cacheKey;
  if (defined(cacheKey) && defined(MeshoptLoader._decodedModelResourceCache)) {
    var cachedData = MeshoptLoader._decodedModelResourceCache[cacheKey];
    // Load decoded data for model when cache is ready
    if (defined(cachedData) && loadResources.pendingDecodingCache) {
      return when(cachedData.ready, function () {
        model._decodedData = cachedData.data;
        loadResources.pendingDecodingCache = false;
      });
    }

    // Decoded data for model should be cached when ready
    MeshoptLoader._decodedModelResourceCache[cacheKey] = {
      ready: false,
      count: 1,
      data: undefined,
    };
  }

  if (loadResources.primitivesToDecode.length === 0) {
    // No more tasks to schedule
    return when.resolve();
  }

  var meshData = loadResources.primitivesToDecode.peek();
  if (!defined(meshData)) {
    // All primitives are processing
    return;
  }

  loadResources.primitivesToDecode.dequeue();
  var decoder = MeshoptLoader._getDecoderTaskProcessor();

  var gltf = model.gltf;
  var accessors = gltf.accessors;
  var bufferViews = gltf.bufferViews;
  var primitive = gltf.meshes[meshData.mesh].primitives[meshData.primitive];
  var attributes = {};

  // Decode Attributes One By One
  ForEach.meshPrimitiveAttribute(primitive, function (
    accessorId,
    attributeName
  ) {
    // Get BufferView from Accessor
    var accessor = accessors[accessorId];
    var bufferViewIdx = accessor.bufferView;
    var bufferView = bufferViews[bufferViewIdx];

    // Check Extension Support
    var extensionData = bufferView.extensions.EXT_meshopt_compression;
    if (!defined(extensionData)) {
      extensionData = bufferView.extensions.MESHOPT_compression; // Hacky way to handle multiple extension names
      if (!defined(extensionData)) {
        return;
      }
    }

    // Sanity Check: The attributes from the meshPrimitive should always be in ATTRIBUTES mode if they're meshopt
    if (extensionData.mode !== "ATTRIBUTES" && extensionData.mode !== 0) {
      throw new RuntimeError(
        "Unexpected Mode for MESHOPT attribute:" + extensionData.mode
      );
    }

    // Get the buffer slice to read from
    var buffer = loadResources.buffers[extensionData.buffer];
    var source = Uint8Array.from(
      arraySlice(
        buffer,
        extensionData.byteOffset,
        extensionData.byteOffset + extensionData.byteLength
      )
    );

    // Create empty buffer to write to
    var result = new ArrayBuffer(
      extensionData.count * extensionData.byteStride
    );

    // Add to load Resources now
    decoder.decodeGltfBuffer(
      new Uint8Array(result),
      extensionData.count,
      extensionData.byteStride,
      source,
      extensionData.mode,
      extensionData.filter
    );
    var vertexBufferView = addNewVertexBuffer(
      new Uint16Array(result),
      model,
      context
    );

    var data = {};
    data.bufferView = vertexBufferView;
    data.componentDatatype = accessor.componentType;
    data.componentsPerAttribute = numberOfComponentsForType(accessor.type); // not 100% sure with this
    data.normalized = accessor.normalized;
    data.byteOffset = extensionData.byteOffset;
    data.byteStride = extensionData.byteStride;
    attributes[attributeName] = data;
  });

  // Parse in IndexBuffer
  var indicesAccessor = accessors[primitive.indices];
  var indexBufferViewIdx = indicesAccessor.bufferView;
  var indexBufferView = bufferViews[indexBufferViewIdx];

  // Confirm Extension Support for the indexBuffer
  var extensionData = indexBufferView.extensions.EXT_meshopt_compression;
  if (!defined(extensionData)) {
    extensionData = indexBufferView.extensions.MESHOPT_compression; // Hacky way to handle multiple extension names
    if (!defined(extensionData)) {
      return;
    }
  }

  var indexBuffer = new ArrayBuffer(
    extensionData.count * extensionData.byteStride
  );
  // Get the buffer slice to read from
  var buffer = loadResources.buffers[extensionData.buffer];
  var source = Uint8Array.from(
    arraySlice(
      buffer,
      extensionData.byteOffset,
      extensionData.byteOffset + extensionData.byteLength
    )
  );
  decoder.decodeGltfBuffer(
    new Uint8Array(indexBuffer),
    extensionData.count,
    extensionData.byteStride,
    source,
    extensionData.mode,
    extensionData.filter
  );
  var decodedIndexBuffer = addNewIndexBuffer(
    new Uint16Array(indexBuffer),
    extensionData.count,
    model,
    indicesAccessor.type
  );

  // Add all the decoded data
  model._decodedData[meshData.mesh + ".primitive." + meshData.primitive] = {
    bufferView: decodedIndexBuffer.bufferViewId,
    numberOfIndices: decodedIndexBuffer.numberOfIndices,
    attributes: attributes,
  };

  return when.resolve();
};

// /**
//  * Decodes a compressed point cloud. Returns undefined if the task cannot be scheduled.
//  * @private
//  */
// MeshoptLoader.decodePointCloud = function (parameters) {
//   var decoderTaskProcessor = MeshoptLoader._getDecoderTaskProcessor();
//   if (!MeshoptLoader._taskProcessorReady) {
//     // The task processor is not ready to schedule tasks
//     return;
//   }
//   return decoderTaskProcessor.scheduleTask(parameters, [
//     parameters.buffer.buffer,
//   ]);
// };

/**
 * Caches a models decoded data so it doesn't need to decode more than once.
 * @private
 */
MeshoptLoader.cacheDataForModel = function (model) {
  var cacheKey = model.cacheKey;
  if (defined(cacheKey) && defined(MeshoptLoader._decodedModelResourceCache)) {
    var cachedData = MeshoptLoader._decodedModelResourceCache[cacheKey];
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
MeshoptLoader.destroyCachedDataForModel = function (model) {
  var cacheKey = model.cacheKey;
  if (defined(cacheKey) && defined(MeshoptLoader._decodedModelResourceCache)) {
    var cachedData = MeshoptLoader._decodedModelResourceCache[cacheKey];
    if (defined(cachedData) && --cachedData.count === 0) {
      delete MeshoptLoader._decodedModelResourceCache[cacheKey];
    }
  }
};
export default MeshoptLoader;
