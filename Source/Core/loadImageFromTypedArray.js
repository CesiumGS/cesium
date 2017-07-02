define([
        '../ThirdParty/when',
        './Check',
        './defined',
        './DeveloperError',
        './loadImage'
    ], function(
        when,
        Check,
        defined,
        DeveloperError,
        loadImage) {
    'use strict';

    /**
     * @private
     */
    function loadImageFromTypedArray(uint8Array, format, request) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('uint8Array', uint8Array);
        Check.typeOf.string('format', format);
        //>>includeEnd('debug');

        var blob = new Blob([uint8Array], {
            type : format
        });

        var blobUrl = window.URL.createObjectURL(blob);
        return loadImage(blobUrl, false, request).then(function(image) {
            window.URL.revokeObjectURL(blobUrl);
            return image;
        }, function(error) {
            window.URL.revokeObjectURL(blobUrl);
            return when.reject(error);
        });
    }

    return loadImageFromTypedArray;
});
