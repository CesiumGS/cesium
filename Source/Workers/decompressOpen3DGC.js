/*global define*/
define([
        '../Scene/decompressOpen3DGC',
        './createTaskProcessorWorker'
    ], function(
        decompressOpen3DGC,
        createTaskProcessorWorker) {
    "use strict";

    function decompressOpen3DGCWorker(parameters, transferableObjects) {
        var decompressedByteLength = parameters.decompressedByteLength;
        var compressedBuffer = parameters.compressedBuffer;

        var decompressedArrayBuffer = decompressOpen3DGC(decompressedByteLength, compressedBuffer);

        transferableObjects.push(decompressedArrayBuffer);
        return {
            decompressedArrayBuffer : decompressedArrayBuffer
        };
    }

    return createTaskProcessorWorker(decompressOpen3DGCWorker);
});
