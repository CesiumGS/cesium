define([
        '../Core/arraySlice',
        '../Core/ComponentDatatype',
        '../Core/defined',
        '../Core/FeatureDetection',
        '../Core/TaskProcessor',
        '../Renderer/Buffer',
        '../Renderer/BufferUsage',
        '../ThirdParty/GltfPipeline/ForEach',
        '../ThirdParty/when'
    ], function(
        arraySlice,
        ComponentDatatype,
        defined,
        FeatureDetection,
        TaskProcessor,
        Buffer,
        BufferUsage,
        ForEach,
        when) {
    'use strict';

    /**
     * @private
     */
    function DracoLoader() {}

    // Maximum concurrency to use when deocding draco models
    DracoLoader._maxDecodingConcurrency = Math.max(FeatureDetection.hardwareConcurrency - 1, 1);

    // Exposed for testing purposes
    DracoLoader._decoderTaskProcessor = undefined;
    DracoLoader._getDecoderTaskProcessor = function () {
        if (!defined(DracoLoader._decoderTaskProcessor)) {
            DracoLoader._decoderTaskProcessor = new TaskProcessor('decodeDraco', DracoLoader._maxDecodingConcurrency);
        }

        return DracoLoader._decoderTaskProcessor;
    };

    function hasExtension(model) {
        return (defined(model.extensionsRequired.KHR_draco_mesh_compression)
            || defined(model.extensionsUsed.KHR_draco_mesh_compression));
    }

    function addBufferToModelResources(model, buffer) {
        var resourceBuffers = model._rendererResources.buffers;
        var id = Object.keys(resourceBuffers).length;
        resourceBuffers[id] = buffer;
        model._geometryByteLength += buffer.sizeInBytes;

        return id;
    }

    function addNewVertexBuffer(typedArray, model, context) {
        var vertexBuffer = Buffer.createVertexBuffer({
            context : context,
            typedArray : typedArray,
            usage : BufferUsage.STATIC_DRAW
        });
        vertexBuffer.vertexArrayDestroyable = false;

        return addBufferToModelResources(model, vertexBuffer);
    }

    function addNewIndexBuffer(typedArray, model, context) {
        var indexBuffer = Buffer.createIndexBuffer({
            context : context,
            typedArray : typedArray,
            usage : BufferUsage.STATIC_DRAW,
            indexDatatype : ComponentDatatype.fromTypedArray(typedArray)
        });
        indexBuffer.vertexArrayDestroyable = false;

        return addBufferToModelResources(model, indexBuffer);
    }

    function addDecodededBuffers(primitive, model, context) {
        return function (result) {
            var decodedBufferView = addNewIndexBuffer(result.indexArray, model, context);

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

            model._decodedData[primitive.mesh + '.primitive.' + primitive.primitive] = {
                bufferView : decodedBufferView,
                attributes : attributes
            };
        };
    }

    function scheduleDecodingTask(decoderTaskProcessor, model, loadResources, context) {
        var taskData = loadResources.primitivesToDecode.peek();
        if (!defined(taskData)) {
            // All primitives are processing
            return;
        }

        loadResources.decoding = true;
        var promise = decoderTaskProcessor.scheduleTask(taskData, [taskData.array.buffer]);
        if (!defined(promise)) {
            // Cannot schedule another task this frame
            return;
        }

        loadResources.primitivesToDecode.dequeue();
        return promise.then(addDecodededBuffers(taskData, model, context));
    }

    /**
     * Parses draco extension on model primitives and
     * adds the decoding data to the model's load resources.
     *
     * @private
     */
    DracoLoader.parse = function(model) {
        if (!hasExtension(model)) {
            return;
        }

        var loadResources = model._loadResources;
        loadResources.decoding = true;

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
                    compressedAttributes : compressionData.attributes
                });
            });
        });
    };

    /**
     * Schedules decoding tasks available this frame.
     * @private
     */
    DracoLoader.decode = function(model, context) {
        if (!hasExtension(model)) {
            return when.resolve();
        }

        var loadResources = model._loadResources;
        if (loadResources.primitivesToDecode.length === 0) {
            // Done decoding
            return when.resolve();
        }

        var decoderTaskProcessor = DracoLoader._getDecoderTaskProcessor();
        var decodingPromises = [];

        var promise = scheduleDecodingTask(decoderTaskProcessor, model, loadResources, context);
        while (defined(promise)) {
            decodingPromises.push(promise);
            promise = scheduleDecodingTask(decoderTaskProcessor, model, loadResources, context);
        }

        return when.all(decodingPromises).then(function () {
            loadResources.decoding = false;
        });
    };

    return DracoLoader;
});
