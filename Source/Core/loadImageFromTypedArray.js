/*global define*/
define([
        '../ThirdParty/when',
        './defined',
        './DeveloperError',
        './loadImageViaBlob'
    ], function(
        when,
        defined,
        DeveloperError,
        loadImageViaBlob) {
    "use strict";

    /**
     * @private
     */
    var loadImageFromTypedArray = function(buffer, byteOffset, length, format) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(buffer)) {
            throw new DeveloperError('buffer is required.');
        }

        if (!defined(byteOffset)) {
            throw new DeveloperError('byteOffset is required.');
        }

        if (!defined(length)) {
            throw new DeveloperError('length is required.');
        }

        if (!defined(format)) {
            throw new DeveloperError('format is required.');
        }
        //>>includeEnd('debug');

        var bytes = new Uint8Array(buffer, byteOffset, length);
        var blob = new Blob([bytes], {
            type : format
        });

        var blobUrl = window.URL.createObjectURL(blob);
        return loadImageViaBlob(blobUrl).then(function(image){
            window.URL.revokeObjectURL(blobUrl);
            return image;
        });
    };

    return loadImageFromTypedArray;
});
