define([
        '../Core/arraySlice',
        '../Core/ComponentDatatype',
        '../Core/defined',
        '../Core/IndexDatatype',
        '../Core/RuntimeError',
        '../ThirdParty/draco-decoder-gltf',
        './createTaskProcessorWorker'
    ], function(
        arraySlice,
        ComponentDatatype,
        defined,
        IndexDatatype,
        RuntimeError,
        draco,
        createTaskProcessorWorker) {
    'use strict';

    var dracoDecoder;

    function decodeIndexArray(dracoGeometry) {
        var numPoints = dracoGeometry.num_points();
        var numFaces = dracoGeometry.num_faces();

        var faceIndices = new draco.DracoInt32Array();
        var indexArray = IndexDatatype.createTypedArray(numPoints, numFaces * 3);

        for (var i = 0; i < numFaces; ++i) {
            dracoDecoder.GetFaceFromMesh(dracoGeometry, i, faceIndices);

            var offset = i * 3;
            indexArray[offset + 0] = faceIndices.GetValue(0);
            indexArray[offset + 1] = faceIndices.GetValue(1);
            indexArray[offset + 2] = faceIndices.GetValue(2);
        }

        draco.destroy(faceIndices);

        return indexArray;
    }

    function decodeAttributeData(dracoGeometry, compressedAttributes) {
        var numPoints = dracoGeometry.num_points();
        var decodedAttributeData = {};
        var attributeData;
        var vertexArray;
        for (var attributeName in compressedAttributes) {
            if (compressedAttributes.hasOwnProperty(attributeName)) {
                var compressedAttribute = compressedAttributes[attributeName];
                var attribute = dracoDecoder.GetAttributeByUniqueId(dracoGeometry, compressedAttribute);
                var numComponents = attribute.num_components();

                if (attribute.data_type() === 4) {
                    attributeData = new draco.DracoInt32Array();
                    vertexArray = new Uint16Array(numPoints * numComponents);
                    dracoDecoder.GetAttributeInt32ForAllPoints(dracoGeometry, attribute, attributeData);
                } else {
                    attributeData = new draco.DracoFloat32Array();
                    vertexArray = new Float32Array(numPoints * numComponents);
                    dracoDecoder.GetAttributeFloatForAllPoints(dracoGeometry, attribute, attributeData);
                }

                for (var i = 0; i < vertexArray.length; ++i) {
                    vertexArray[i] = attributeData.GetValue(i);
                }

                draco.destroy(attributeData);

                decodedAttributeData[attributeName] = {
                    array : vertexArray,
                    data : {
                        componentsPerAttribute : numComponents,
                        byteOffset : attribute.byte_offset(),
                        byteStride : attribute.byte_stride(),
                        normalized : attribute.normalized(),
                        componentDatatype : ComponentDatatype.fromTypedArray(vertexArray)
                    }
                };
            }
        }

        return decodedAttributeData;
    }

    function decodeDracoPrimitive(parameters, transferableObjects) {
        if (!defined(dracoDecoder)) {
            dracoDecoder = new draco.Decoder();
        }

        var bufferView = parameters.bufferView;
        var typedArray = arraySlice(parameters.array, bufferView.byteOffset, bufferView.byteOffset + bufferView.byteLength);

        var buffer = new draco.DecoderBuffer();
        buffer.Init(typedArray, bufferView.byteLength);

        var geometryType = dracoDecoder.GetEncodedGeometryType(buffer);
        if (geometryType !== draco.TRIANGULAR_MESH) {
            throw new RuntimeError('Unsupported draco mesh geometry type.');
        }

        var dracoGeometry = new draco.Mesh();
        var decodingStatus = dracoDecoder.DecodeBufferToMesh(buffer, dracoGeometry);
        if (!decodingStatus.ok() || dracoGeometry.ptr === 0) {
            throw new RuntimeError('Error decoding draco mesh geometry: ' + decodingStatus.error_msg());
        }

        draco.destroy(buffer);

        var result = {
            indexArray : decodeIndexArray(dracoGeometry),
            attributeData : decodeAttributeData(dracoGeometry, parameters.compressedAttributes)
        };

        draco.destroy(dracoGeometry);

        return result;
    }

    return createTaskProcessorWorker(decodeDracoPrimitive);
});
