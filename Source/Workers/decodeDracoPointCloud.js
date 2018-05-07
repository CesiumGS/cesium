define([
        '../Core/defined',
        '../Core/RuntimeError',
        './createTaskProcessorWorker'
    ], function(
        defined,
        RuntimeError,
        createTaskProcessorWorker) {
    'use strict';

    var draco;
    var dracoDecoder;

    function getAttributeTypeFromSemantic(draco, semantic) {
        switch (semantic) {
            case 'POSITION':
                return draco.POSITION;
            case 'NORMAL':
                return draco.NORMAL;
            case 'RGB':
            case 'RGBA':
                return draco.COLOR;
            case 'BATCH_ID':
                return draco.GENERIC;
        }
    }

    function decodeQuantizedDracoTypedArray(dracoGeometry, attribute, quantization, vertexArrayLength) {
        var vertexArray;
        var attributeData;
        if (quantization.quantizationBits <= 8) {
            attributeData = new draco.DracoUInt8Array();
            vertexArray = new Uint8Array(vertexArrayLength);
            dracoDecoder.GetAttributeUInt8ForAllPoints(dracoGeometry, attribute, attributeData);
        } else {
            attributeData = new draco.DracoUInt16Array();
            vertexArray = new Uint16Array(vertexArrayLength);
            dracoDecoder.GetAttributeUInt16ForAllPoints(dracoGeometry, attribute, attributeData);
        }

        for (var i = 0; i < vertexArrayLength; ++i) {
            vertexArray[i] = attributeData.GetValue(i);
        }

        draco.destroy(attributeData);
        return vertexArray;
    }

    function decodeDracoTypedArray(dracoGeometry, attribute, vertexArrayLength) {
        var vertexArray;
        var attributeData;

        // Some attribute types are casted down to 32 bit since Draco only returns 32 bit values
        switch (attribute.data_type()) {
            case 1: case 11: // DT_INT8 or DT_BOOL
                attributeData = new draco.DracoInt8Array();
                vertexArray = new Int8Array(vertexArrayLength);
                dracoDecoder.GetAttributeInt8ForAllPoints(dracoGeometry, attribute, attributeData);
                break;
            case 2: // DT_UINT8
                attributeData = new draco.DracoUInt8Array();
                vertexArray = new Uint8Array(vertexArrayLength);
                dracoDecoder.GetAttributeUInt8ForAllPoints(dracoGeometry, attribute, attributeData);
                break;
            case 3: // DT_INT16
                attributeData = new draco.DracoInt16Array();
                vertexArray = new Int16Array(vertexArrayLength);
                dracoDecoder.GetAttributeInt16ForAllPoints(dracoGeometry, attribute, attributeData);
                break;
            case 4: // DT_UINT16
                attributeData = new draco.DracoUInt16Array();
                vertexArray = new Uint16Array(vertexArrayLength);
                dracoDecoder.GetAttributeUInt16ForAllPoints(dracoGeometry, attribute, attributeData);
                break;
            case 5: case 7: // DT_INT32 or DT_INT64
                attributeData = new draco.DracoInt32Array();
                vertexArray = new Int32Array(vertexArrayLength);
                dracoDecoder.GetAttributeInt32ForAllPoints(dracoGeometry, attribute, attributeData);
                break;
            case 6: case 8: // DT_UINT32 or DT_UINT64
                attributeData = new draco.DracoUInt32Array();
                vertexArray = new Uint32Array(vertexArrayLength);
                dracoDecoder.GetAttributeUInt32ForAllPoints(dracoGeometry, attribute, attributeData);
                break;
            case 9: case 10: // DT_FLOAT32 or DT_FLOAT64
                attributeData = new draco.DracoFloat32Array();
                vertexArray = new Float32Array(vertexArrayLength);
                dracoDecoder.GetAttributeFloatForAllPoints(dracoGeometry, attribute, attributeData);
                break;
        }

        for (var i = 0; i < vertexArrayLength; ++i) {
            vertexArray[i] = attributeData.GetValue(i);
        }

        draco.destroy(attributeData);
        return vertexArray;
    }

    f

    function decodeDraco(parameters) {
        var dequantizeInShader = parameters.dequantizeInShader;
        var results = {};

        if (dequantizeInShader) {
            dracoDecoder.SkipAttributeTransform(draco.POSITION);
            dracoDecoder.SkipAttributeTransform(draco.NORMAL);
        }

        var buffer = new draco.DecoderBuffer();
        buffer.Init(parameters.buffer, parameters.buffer.length);

        var geometryType = dracoDecoder.GetEncodedGeometryType(buffer);
        if (geometryType !== draco.POINT_CLOUD) {
            throw new RuntimeError('Draco geometry type must be POINT_CLOUD.');
        }

        var dracoPointCloud = new draco.PointCloud();
        var decodingStatus = dracoDecoder.DecodeBufferToPointCloud(buffer, dracoPointCloud);
        if (!decodingStatus.ok() || dracoPointCloud.ptr === 0) {
            throw new RuntimeError('Error decoding draco point cloud: ' + decodingStatus.error_msg());
        }

        draco.destroy(buffer);

        var numPoints = dracoPointCloud.num_points();

        var semantics = parameters.semantics;
        var semanticsLength = semantics.length;
        for (var i = 0; i < semanticsLength; ++i) {
            var semantic = semantics[i];
            var attributeType = getAttributeTypeFromSemantic(draco, semantic);
            if (!defined(attributeType)) {
                throw new RuntimeError('Error decoding draco point cloud: ' + semantic + ' is not a valid draco semantic');
            }
            var attributeId = dracoDecoder.GetAttributeId(dracoPointCloud, attributeType);
            var attribute = dracoDecoder.GetAttribute(dracoPointCloud, attributeId);
            var numComponents = attribute.num_components();

            /*eslint-disable no-undef-init*/
            var quantization = undefined;
            var transform = new draco.AttributeQuantizationTransform();
            if (transform.InitFromAttribute(attribute)) {
                var minValues = new Array(numComponents);
                for (var j = 0; j < numComponents; ++j) {
                    minValues[j] = transform.min_value(j);
                }
                quantization = {
                    quantizationBits: transform.quantization_bits(),
                    minValues: minValues,
                    range: transform.range()
                };
            }
            draco.destroy(transform);

            transform = new draco.AttributeOctahedronTransform();
            if (transform.InitFromAttribute(attribute)) {
                quantization = {
                    quantizationBits : transform.quantization_bits()
                };
            }
            draco.destroy(transform);

            var vertexArrayLength = numPoints * numComponents;
            var vertexArray;
            if (defined(quantization)) {
                vertexArray = decodeQuantizedDracoTypedArray(dracoPointCloud, attribute, quantization, vertexArrayLength);
            } else {
                vertexArray = decodeDracoTypedArray(dracoPointCloud, attribute, vertexArrayLength);
            }

            results[semantic] = {
                buffer : vertexArray,
                quantization : quantization
            };
        }

        draco.destroy(dracoPointCloud);
        return results;
    }

    function initWorker(dracoModule) {
        draco = dracoModule;
        dracoDecoder = new draco.Decoder();
        self.onmessage = createTaskProcessorWorker(decodeDraco);
        self.postMessage(true);
    }

    function decodeDracoPointCloud(event) {
        var data = event.data;

        // Expect the first message to be to load a web assembly module
        var wasmConfig = data.webAssemblyConfig;
        if (defined(wasmConfig)) {
            // Require and compile WebAssembly module, or use fallback if not supported
            return require([wasmConfig.modulePath], function(dracoModule) {
                if (defined(wasmConfig.wasmBinaryFile)) {
                    if (!defined(dracoModule)) {
                        dracoModule = self.DracoDecoderModule;
                    }

                    dracoModule(wasmConfig).then(function (compiledModule) {
                        initWorker(compiledModule);
                    });
                } else {
                    initWorker(dracoModule());
                }
            });
        }
    }

    return decodeDracoPointCloud;
});
