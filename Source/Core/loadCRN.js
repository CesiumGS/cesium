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

    /**
     * Asynchronously loads and parses the given URL to a CRN file or parses the raw binary data of a CRN file.
     * Returns a promise that will resolve to an object containing the image buffer, width, height and format once loaded,
     * or reject if the URL failed to load or failed to parse the data.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
     *
     * @exports loadCRN
     *
     * @param {String|Promise.<String>|ArrayBuffer} urlOrBuffer The URL of the binary data, a promise for the URL, or an ArrayBuffer.
     * @param {Object} [headers] HTTP headers to send with the requests.
     * @returns {Promise.<CompressedTextureBuffer>} A promise that will resolve to the requested data when loaded.
     *
     * @exception {RuntimeError} Unsupported compressed format.
     *
     * @example
     * // load a single URL asynchronously
     * Cesium.loadCRN('some/url').then(function(textureData) {
     *     var width = textureData.width;
     *     var height = textureData.height;
     *     var format = textureData.internalFormat;
     *     var arrayBufferView = textureData.bufferView;
     *     // use the data to create a texture
     * }).otherwise(function(error) {
     *     // an error occurred
     * });
     *
     * @see {@link https://github.com/BinomialLLC/crunch|crunch DXTc texture compression and transcoding library}
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
     */
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