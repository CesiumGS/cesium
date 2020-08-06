import addPipelineExtras from './addPipelineExtras.js'
import removeExtensionsUsed from './removeExtensionsUsed.js'
import defaultValue from '../../Core/defaultValue.js'
import defined from '../../Core/defined.js'
import getMagic from '../../Core/getMagic.js'
import getStringFromTypedArray from '../../Core/getStringFromTypedArray.js'
import RuntimeError from '../../Core/RuntimeError.js'

    var sizeOfUint32 = 4;

    /**
     * Convert a binary glTF to glTF.
     *
     * The returned glTF has pipeline extras included. The embedded binary data is stored in gltf.buffers[0].extras._pipeline.source.
     *
     * @param {Buffer} glb The glb data to parse.
     * @returns {Object} A javascript object containing a glTF asset with pipeline extras included.
     *
     * @private
     */
    function parseGlb(glb) {
        // Check that the magic string is present
        var magic = getMagic(glb);
        if (magic !== 'glTF') {
            throw new RuntimeError('File is not valid binary glTF');
        }

        var header = readHeader(glb, 0, 5);
        var version = header[1];
        if (version !== 1 && version !== 2) {
            throw new RuntimeError('Binary glTF version is not 1 or 2');
        }

        if (version === 1) {
            return parseGlbVersion1(glb, header);
        }

        return parseGlbVersion2(glb, header);
    }

    function readHeader(glb, byteOffset, count) {
        var dataView = new DataView(glb.buffer);
        var header = new Array(count);
        for (var i = 0; i < count; ++i) {
            header[i] = dataView.getUint32(glb.byteOffset + byteOffset + i * sizeOfUint32, true);
        }
        return header;
    }

    function parseGlbVersion1(glb, header) {
        var length = header[2];
        var contentLength = header[3];
        var contentFormat = header[4];

        // Check that the content format is 0, indicating that it is JSON
        if (contentFormat !== 0) {
            throw new RuntimeError('Binary glTF scene format is not JSON');
        }

        var jsonStart = 20;
        var binaryStart = jsonStart + contentLength;

        var contentString = getStringFromTypedArray(glb, jsonStart, contentLength);
        var gltf = JSON.parse(contentString);
        addPipelineExtras(gltf);

        var binaryBuffer = glb.subarray(binaryStart, length);

        var buffers = gltf.buffers;
        if (defined(buffers) && Object.keys(buffers).length > 0) {
            // In some older models, the binary glTF buffer is named KHR_binary_glTF
            var binaryGltfBuffer = defaultValue(buffers.binary_glTF, buffers.KHR_binary_glTF);
            if (defined(binaryGltfBuffer)) {
                binaryGltfBuffer.extras._pipeline.source = binaryBuffer;
            }
        }
        // Remove the KHR_binary_glTF extension
        removeExtensionsUsed(gltf, 'KHR_binary_glTF');
        return gltf;
    }

    function parseGlbVersion2(glb, header) {
        var length = header[2];
        var byteOffset = 12;
        var gltf;
        var binaryBuffer;
        while (byteOffset < length) {
            var chunkHeader = readHeader(glb, byteOffset, 2);
            var chunkLength = chunkHeader[0];
            var chunkType = chunkHeader[1];
            byteOffset += 8;
            var chunkBuffer = glb.subarray(byteOffset, byteOffset + chunkLength);
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
            var buffers = gltf.buffers;
            if (defined(buffers) && buffers.length > 0) {
                var buffer = buffers[0];
                buffer.extras._pipeline.source = binaryBuffer;
            }
        }
        return gltf;
    }

    export default parseGlb;
