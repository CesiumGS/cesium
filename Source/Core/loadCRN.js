/*global define*/
define([
    './CompressedTextureBuffer',
    './defined',
    './DeveloperError',
    './loadArrayBuffer',
    './TaskProcessor',
    '../ThirdParty/when'
], function(
    CompressedTextureBuffer,
    defined,
    DeveloperError,
    loadArrayBuffer,
    TaskProcessor,
    when) {
    'use strict';

    var transcodeTaskProcessor = new TaskProcessor('transcodeCRNToDXT', Number.POSITIVE_INFINITY);

    function loadCRN(urlOrBuffer, headers) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(urlOrBuffer)) {
            throw new DeveloperError('urlOrBuffer is required.');
        }
        //>>includeEnd('debug');

        var loadPromise;
        if (urlOrBuffer instanceof ArrayBuffer || ArrayBuffer.isView(urlOrBuffer)) {
            loadPromise = when.resolve(urlOrBuffer);
        } else {
            loadPromise = loadArrayBuffer(urlOrBuffer, headers);
        }

        return loadPromise.then(function(data) {
            var transferrableObjects = [];
            if (data instanceof ArrayBuffer) {
                transferrableObjects.push(data);
            } else if (data.byteOffset === 0 && data.byteLength === data.buffer.byteLength) {
                transferrableObjects.push(data.buffer);
            } else {
                // data is a view of an array buffer. need to copy so it is transferrable to web worker
                data = data.slice(0, data.length);
                transferrableObjects.push(data.buffer);
            }

            return transcodeTaskProcessor.scheduleTask(data, transferrableObjects);
        }).then(function(compressedTextureBuffer) {
            return CompressedTextureBuffer.clone(compressedTextureBuffer);
        });
    }

    return loadCRN;
});