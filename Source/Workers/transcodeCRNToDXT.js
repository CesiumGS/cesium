/*global define*/
define([
    '../Core/CompressedTextureBuffer',
    '../Core/defined',
    '../Core/PixelFormat',
    '../Core/RuntimeError',
    '../ThirdParty/crunch',
    './createTaskProcessorWorker'
], function(
    CompressedTextureBuffer,
    defined,
    PixelFormat,
    RuntimeError,
    crunch,
    createTaskProcessorWorker
) {
    'use strict';

    // Modified from texture-tester
    // See:
    //     https://github.com/toji/texture-tester/blob/master/js/webgl-texture-util.js
    //     http://toji.github.io/texture-tester/

    // Taken from crnlib.h
    var CRN_FORMAT = {
        cCRNFmtInvalid: -1,

        cCRNFmtDXT1: 0,
        // cCRNFmtDXT3 is not currently supported when writing to CRN - only DDS.
        cCRNFmtDXT3: 1,
        cCRNFmtDXT5: 2

        // Crunch supports more formats than this, but we can't use them here.
    };

    // Mapping of Crunch formats to DXT formats.
    var DXT_FORMAT_MAP = {};
    DXT_FORMAT_MAP[CRN_FORMAT.cCRNFmtDXT1] = PixelFormat.RGB_DXT1;
    DXT_FORMAT_MAP[CRN_FORMAT.cCRNFmtDXT3] = PixelFormat.RGBA_DXT3;
    DXT_FORMAT_MAP[CRN_FORMAT.cCRNFmtDXT5] = PixelFormat.RGBA_DXT5;

    var dst;
    var dxtData;
    var cachedDstSize = 0;

    // Copy an array of bytes into or out of the emscripten heap.
    function arrayBufferCopy(src, dst, dstByteOffset, numBytes) {
        var i;
        var dst32Offset = dstByteOffset / 4;
        var tail = (numBytes % 4);
        var src32 = new Uint32Array(src.buffer, 0, (numBytes - tail) / 4);
        var dst32 = new Uint32Array(dst.buffer);
        for (i = 0; i < src32.length; i++) {
            dst32[dst32Offset + i] = src32[i];
        }
        for (i = numBytes - tail; i < numBytes; i++) {
            dst[dstByteOffset + i] = src[i];
        }
    }

    /**
     * @private
     */
    function transcodeCRNToDXT(arrayBuffer, transferableObjects) {
        // Copy the contents of the arrayBuffer into emscriptens heap.
        var srcSize = arrayBuffer.byteLength;
        var bytes = new Uint8Array(arrayBuffer);
        var src = crunch._malloc(srcSize);
        arrayBufferCopy(bytes, crunch.HEAPU8, src, srcSize);

        // Determine what type of compressed data the file contains.
        var crnFormat = crunch._crn_get_dxt_format(src, srcSize);
        var format = DXT_FORMAT_MAP[crnFormat];
        if (!defined(format)) {
            throw new RuntimeError('Unsupported compressed format.');
        }

        // Gather basic metrics about the DXT data.
        var levels = crunch._crn_get_levels(src, srcSize);
        var width = crunch._crn_get_width(src, srcSize);
        var height = crunch._crn_get_height(src, srcSize);

        // Determine the size of the decoded DXT data.
        var dstSize = 0;
        var i;
        for (i = 0; i < levels; ++i) {
            dstSize += PixelFormat.compressedTextureSize(format, width >> i, height >> i);
        }

        // Allocate enough space on the emscripten heap to hold the decoded DXT data
        // or reuse the existing allocation if a previous call to this function has
        // already acquired a large enough buffer.
        if(cachedDstSize < dstSize) {
            if(defined(dst)) {
                crunch._free(dst);
            }
            dst = crunch._malloc(dstSize);
            dxtData = new Uint8Array(crunch.HEAPU8.buffer, dst, dstSize);
            cachedDstSize = dstSize;
        }

        // Decompress the DXT data from the Crunch file into the allocated space.
        crunch._crn_decompress(src, srcSize, dst, dstSize, 0, levels);

        // Release the crunch file data from the emscripten heap.
        crunch._free(src);

        // Mipmaps are unsupported, so copy the level 0 texture
        // When mipmaps are supported, a copy will still be necessary as dxtData is a view on the heap.
        var level0DXTData = dxtData.slice(0, PixelFormat.compressedTextureSize(format, width, height));
        transferableObjects.push(level0DXTData.buffer);
        return new CompressedTextureBuffer(format, width, height, level0DXTData);
    }

    return createTaskProcessorWorker(transcodeCRNToDXT);
});
