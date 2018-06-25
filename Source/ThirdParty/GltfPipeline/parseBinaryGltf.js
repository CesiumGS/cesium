define([
        './addPipelineExtras',
        './removeExtensionsUsed',
        './updateVersion',
        '../../Core/defined',
        '../../Core/DeveloperError',
        '../../Core/getMagic',
        '../../Core/getStringFromTypedArray'
    ], function(
        addPipelineExtras,
        removeExtensionsUsed,
        updateVersion,
        defined,
        DeveloperError,
        getMagic,
        getStringFromTypedArray) {
    'use strict';

    /**
     * Parses a binary glTF buffer into glTF JSON.
     *
     * @param {Uint8Array} data The binary glTF data to parse.
     * @returns {Object} The parsed binary glTF.
     */
    function parseBinaryGltf(data) {
        var headerView = new DataView(data.buffer, data.byteOffset, 20);

        // Check that the magic string is present
        var magic = getMagic(data);
        if (magic !== 'glTF') {
            throw new DeveloperError('File is not valid binary glTF');
        }

        // Check that the version is 1 or 2
        var version = headerView.getInt32(4,true);
        if (version !== 1 && version !== 2) {
            throw new DeveloperError('Binary glTF version is not 1 or 2');
        }

        var gltf;
        var buffers;
        var length;
        // Load binary glTF version 1
        if (version === 1) {
            length = headerView.getInt32(8,true);
            var contentLength = headerView.getInt32(12,true);
            var contentFormat = headerView.getInt32(16, true);

            // Check that the content format is 0, indicating that it is JSON
            if (contentFormat !== 0) {
                throw new DeveloperError('Binary glTF scene format is not JSON');
            }

            var jsonStart = 20;
            var binaryStart = jsonStart + contentLength;

            var contentString = getStringFromTypedArray(data, jsonStart, contentLength);
            gltf = JSON.parse(contentString);

            var binaryData = data.subarray(binaryStart, length);

            buffers = gltf.buffers;
            if (defined(buffers) && Object.keys(buffers).length > 0) {
                var binaryGltfBuffer = buffers.binary_glTF;
                // In some older models, the binary glTF buffer is named KHR_binary_glTF
                if (!defined(binaryGltfBuffer)) {
                    binaryGltfBuffer = buffers.KHR_binary_glTF;
                }
                if (defined(binaryGltfBuffer)) {
                    binaryGltfBuffer.extras = {
                        _pipeline: {
                            source: binaryData
                        }
                    };
                }
            }
            // Update to glTF 2.0
            updateVersion(gltf);
            // Remove the KHR_binary_glTF extension
            removeExtensionsUsed(gltf, 'KHR_binary_glTF');
            addPipelineExtras(gltf);
        }

        // Load binary glTF version 2
        if (version === 2) {
            length = headerView.getInt32(8, true);
            var byteOffset = 12;
            var binaryBuffer;
            while (byteOffset < length) {
                var chunkHeaderView = new DataView(data.buffer, data.byteOffset + byteOffset, 8);
                var chunkLength = chunkHeaderView.getInt32(0, true);
                var chunkType = chunkHeaderView.getInt32(4, true);
                byteOffset += 8;
                var chunkBuffer = data.subarray(byteOffset, byteOffset + chunkLength);
                byteOffset += chunkLength;
                // Load JSON chunk
                if (chunkType === 0x4E4F534A) {
                    var jsonString = getStringFromTypedArray(chunkBuffer);
                    gltf = JSON.parse(jsonString);
                    addPipelineExtras(gltf);
                }
                // Load Binary chunk
                else if (chunkType === 0x004E4942) {
                    binaryBuffer = chunkBuffer;
                }
            }
            if (defined(gltf) && defined(binaryBuffer)) {
                buffers = gltf.buffers;
                if (defined(buffers) && buffers.length > 0) {
                    var buffer = buffers[0];
                    buffer.extras._pipeline.source = binaryBuffer;
                }
            }
        }
        return gltf;
    }
    return parseBinaryGltf;
});
