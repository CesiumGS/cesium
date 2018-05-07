define([
        '../Core/arraySlice',
        '../Core/ComponentDatatype',
        '../Core/defined',
        '../Core/FeatureDetection',
        '../Core/RuntimeError',
        '../Core/TaskProcessor',
        '../ThirdParty/GltfPipeline/ForEach',
        '../ThirdParty/when'
    ], function(
        arraySlice,
        ComponentDatatype,
        defined,
        FeatureDetection,
        RuntimeError,
        TaskProcessor,
        ForEach,
        when) {
    'use strict';

    /**
     * @private
     */
    function DracoLoader() {}

    // Maximum concurrency to use when decoding draco models
    DracoLoader._maxDecodingConcurrency = Math.max(FeatureDetection.hardwareConcurrency - 1, 1);

    // Exposed for testing purposes
    DracoLoader._decoderTaskProcessor = undefined;
    DracoLoader._taskProcessorReady = false;
    DracoLoader._getDecoderTaskProcessor = function () {
        if (!defined(DracoLoader._decoderTaskProcessor)) {
            var processor = new TaskProcessor('decodeDraco', DracoLoader._maxDecodingConcurrency);
            processor.initWebAssemblyModule({
                modulePath : 'ThirdParty/Workers/draco_wasm_wrapper.js',
                wasmBinaryFile : 'ThirdParty/draco_decoder.wasm',
                fallbackModulePath : 'ThirdParty/Workers/draco_decoder.js'
            }).then(function () {
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
    DracoLoader.hasExtension = function(model) {
        return (defined(model.extensionsRequired.KHR_draco_mesh_compression)
            || defined(model.extensionsUsed.KHR_draco_mesh_compression));
    };

    function addBufferToLoadResources(loadResources, typedArray) {
        // Create a new id to differentiate from original glTF bufferViews
        var bufferViewId = 'runtime.' + Object.keys(loadResources.createdBufferViews).length;

        var loadResourceBuffers = loadResources.buffers;
        var id = Object.keys(loadResourceBuffers).length;
        loadResourceBuffers[id] = typedArray;
        loadResources.createdBufferViews[bufferViewId] = {
            buffer : id,
            byteOffset : 0,
            byteLength : typedArray.byteLength
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
            id : id,
            componentType : ComponentDatatype.fromTypedArray(typedArray)
        });

        return {
            bufferViewId : id,
            numberOfIndices : indexArray.numberOfIndices
        };
    }

    function scheduleDecodingTask(decoderTaskProcessor, model, loadResources, context) {
        if (!DracoLoader._taskProcessorReady) {
            // The task processor is not ready to schedule tasks
            return;
        }

        var taskData = loadResources.primitivesToDecode.peek();
        if (!defined(taskData)) {
            // All primitives are processing
            return;
        }

        var promise = decoderTaskProcessor.scheduleTask(taskData, [taskData.array.buffer]);
        if (!defined(promise)) {
            // Cannot schedule another task this frame
            return;
        }

        loadResources.activeDecodingTasks++;
        loadResources.primitivesToDecode.dequeue();
        return promise.then(function (result) {
            loadResources.activeDecodingTasks--;

            var decodedIndexBuffer = addNewIndexBuffer(result.indexArray, model, context);

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

            model._decodedData[taskData.mesh + '.primitive.' + taskData.primitive] = {
                bufferView : decodedIndexBuffer.bufferViewId,
                numberOfIndices : decodedIndexBuffer.numberOfIndices,
                attributes : attributes
            };
        });
    }

    /**
     * Parses draco extension on model primitives and
     * adds the decoding data to the model's load resources.
     *
     * @private
     */
    DracoLoader.parse = function(model) {
        if (!DracoLoader.hasExtension(model)) {
            return;
        }

        var loadResources = model._loadResources;
        var dequantizeInShader = model._dequantizeInShader;
        var gltf = model.gltf;
        ForEach.mesh(gltf, function(mesh, meshId) {
            ForEach.meshPrimitive(mesh, function(primitive, primitiveId) {
                if (!defined(primitive.extensions)) {
                    return;
                }

                var compressionData = primitive.extensions.KHR_draco_mesh_compression;
                if (!defined(compressionData)) {
                    return;
                }

                var bufferView = gltf.bufferViews[compressionData.bufferView];
                var typedArray = arraySlice(gltf.buffers[bufferView.buffer].extras._pipeline.source, bufferView.byteOffset, bufferView.byteOffset + bufferView.byteLength);
                loadResources.primitivesToDecode.enqueue({
                    mesh : meshId,
                    primitive : primitiveId,
                    array : typedArray,
                    bufferView : bufferView,
                    compressedAttributes : compressionData.attributes,
                    dequantizeInShader : dequantizeInShader
                });
            });
        });
    };

    /**
     * Schedules decoding tasks available this frame.
     * @private
     */
    DracoLoader.decode = function(model, context) {
        if (!DracoLoader.hasExtension(model)) {
            return when.resolve();
        }

        if (FeatureDetection.isInternetExplorer()) {
            return when.reject(new RuntimeError('Draco decoding is not currently supported in Internet Explorer.'));
        }

        var loadResources = model._loadResources;
        if (loadResources.primitivesToDecode.length === 0) {
            // No more tasks to schedule
            return when.resolve();
        }

        var decoderTaskProcessor = DracoLoader._getDecoderTaskProcessor();
        var decodingPromises = [];

        var promise = scheduleDecodingTask(decoderTaskProcessor, model, loadResources, context);
        while (defined(promise)) {
            decodingPromises.push(promise);
            promise = scheduleDecodingTask(decoderTaskProcessor, model, loadResources, context);
        }

        return when.all(decodingPromises);
    };

    return DracoLoader;
});
