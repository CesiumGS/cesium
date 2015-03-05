/*global define*/
define([
        '../ThirdParty/when',
        './defined',
        './DeveloperError'
    ], function(
        when,
        defined,
        DeveloperError) {
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

        return when(blob, function(blob) {
            var deferred = when.defer();
            var blobUrl = window.URL.createObjectURL(blob);
            var image = new Image();

            image.onload = function() {
                window.URL.revokeObjectURL(blobUrl);
                deferred.resolve(image);
            };

            image.onerror = function(e) {
                window.URL.revokeObjectURL(blobUrl);
                deferred.reject(e);
            };

            image.src = blobUrl;

            return deferred.promise;
        });
    };

    return loadImageFromTypedArray;
});
