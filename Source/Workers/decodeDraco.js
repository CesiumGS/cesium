define([
        '../Core/ComponentDatatype',
        '../Core/defined',
        '../Core/IndexDatatype',
        '../Core/RuntimeError',
        '../ThirdParty/draco-decoder-gltf',
        './createTaskProcessorWorker'
    ], function(
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
        var numIndices = numFaces * 3;
        var indexArray = IndexDatatype.createTypedArray(numPoints, numIndices);

        var offset = 0;
        for (var i = 0; i < numFaces; ++i) {
            dracoDecoder.GetFaceFromMesh(dracoGeometry, i, faceIndices);

            indexArray[offset + 0] = faceIndices.GetValue(0);
            indexArray[offset + 1] = faceIndices.GetValue(1);
            indexArray[offset + 2] = faceIndices.GetValue(2);
            offset += 3;
        }

        draco.destroy(faceIndices);

        return {
            typedArray : indexArray,
            numberOfIndices : numIndices
        };
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
                    // Uint16Array is used becasue there is not currently a way to retreive the maximum
                    // value up front via the draco decoder API.  Max values over 65535 require a Uint32Array.
                    vertexArray = new Uint16Array(numPoints * numComponents);
                    dracoDecoder.GetAttributeInt32ForAllPoints(dracoGeometry, attribute, attributeData);
                } else {
                    attributeData = new draco.DracoFloat32Array();
                    vertexArray = new Float32Array(numPoints * numComponents);
                    dracoDecoder.GetAttributeFloatForAllPoints(dracoGeometry, attribute, attributeData);
                }

                var vertexArrayLength = vertexArray.length;
                for (var i = 0; i < vertexArrayLength; ++i) {
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

    function decodeDracoPrimitive(parameters) {
        if (!defined(dracoDecoder)) {
            dracoDecoder = new draco.Decoder();
        }

        var bufferView = parameters.bufferView;
        var buffer = new draco.DecoderBuffer();
        buffer.Init(parameters.array, bufferView.byteLength);

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
