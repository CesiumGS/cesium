/*global define*/
define([
        '../ThirdParty/o3dgc'
    ], function(
        o3dgc) {
    'use strict';

    function alignOffset(offset, alignment) {
        offset = offset | 0;
        alignment = alignment | 0;
        return (Math.ceil(offset / alignment) * alignment) | 0;
    }

    function decompressOpen3DGC(decompressedByteLength, compressedBuffer) {
        var decompressedArrayBuffer = new ArrayBuffer(decompressedByteLength);

        // Mostly copied from https://github.com/amd/rest3d/blob/master/server/o3dgc/js/index.php

        var bstream = new o3dgc.BinaryStream(compressedBuffer);
        var decoder = new o3dgc.SC3DMCDecoder();
        var ifs = new o3dgc.IndexedFaceSet();
        //var timer = new o3dgc.Timer();

        // Get metadata about the compression
        //timer.Tic();
        decoder.DecodeHeader(ifs, bstream);
        //timer.Toc();
        //console.log("DecodeHeader: " + timer.GetElapsedTime());

        var i, len;
        var decompressedViewOffset = 0;

        // Point the decoder at the TypedArrays it should write into
        if (ifs.GetNCoordIndex() > 0) {
            len = 3 * ifs.GetNCoordIndex();
            ifs.SetCoordIndex(new Uint16Array(decompressedArrayBuffer, decompressedViewOffset, len));
            decompressedViewOffset += len * Uint16Array.BYTES_PER_ELEMENT;
        }
        decompressedViewOffset = alignOffset(decompressedViewOffset, Float32Array.BYTES_PER_ELEMENT);
        if (ifs.GetNCoord() > 0) {
            len = 3 * ifs.GetNCoord();
            ifs.SetCoord(new Float32Array(decompressedArrayBuffer, decompressedViewOffset, len));
            decompressedViewOffset += len * Float32Array.BYTES_PER_ELEMENT;
        }
        if (ifs.GetNNormal() > 0) {
            len = 3 * ifs.GetNNormal();
            ifs.SetNormal(new Float32Array(decompressedArrayBuffer, decompressedViewOffset, len));
            decompressedViewOffset += len * Float32Array.BYTES_PER_ELEMENT;
        }
        var numFloatAttributes = ifs.GetNumFloatAttributes();
        for (i = 0; i < numFloatAttributes; i++) {
            if (ifs.GetNFloatAttribute(i) > 0) {
                len = ifs.GetFloatAttributeDim(i) * ifs.GetNFloatAttribute(i);
                ifs.SetFloatAttribute(i, new Float32Array(decompressedArrayBuffer, decompressedViewOffset, len));
                decompressedViewOffset += len * Float32Array.BYTES_PER_ELEMENT;
            }
        }
        decompressedViewOffset = alignOffset(decompressedViewOffset, Int32Array.BYTES_PER_ELEMENT);
        var numIntAttributes = ifs.GetNumIntAttributes();
        for (i = 0; i < numIntAttributes; i++) {
            if (ifs.GetNIntAttribute(i) > 0) {
                len = ifs.GetIntAttributeDim(i) * ifs.GetNIntAttribute(i);
                // XXX: Load into an Int16Array because Cesium doesn't seem to actually support int32 attributes.
                ifs.SetIntAttribute(i, new Int16Array(decompressedArrayBuffer, decompressedViewOffset, len));
                decompressedViewOffset += len * Int32Array.BYTES_PER_ELEMENT;
            }
        }

        // Decompress into the specified TypedArrays
        //timer.Tic();
        decoder.DecodePlayload(ifs, bstream);
        //timer.Toc();
        //console.log("DecodePlayload: " + timer.GetElapsedTime());
        //console.log(decoder.GetStats());

        return decompressedArrayBuffer;
    }

    return decompressOpen3DGC;
});
