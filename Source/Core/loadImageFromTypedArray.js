define([
        '../ThirdParty/when',
        './Check',
        './defined',
        './defaultValue',
        './FeatureDetection',
        './Resource'
    ], function(
        when,
        Check,
        defined,
        defaultValue,
        FeatureDetection,
        Resource) {
    'use strict';

    /**
     * @private
     */
    function loadImageFromTypedArray(options) {
        var uint8Array = options.uint8Array;
        var format = options.format;
        var imageBitmapSupported = options.imageBitmapSupported;
        var flipY = defaultValue(options.flipY, false);
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('uint8Array', uint8Array);
        Check.typeOf.string('format', format);
        //>>includeEnd('debug');

        var blob = new Blob([uint8Array], {
            type : format
        });

        if (imageBitmapSupported) {
            return when(createImageBitmap(blob, {
                imageOrientation: flipY ? 'flipY' : 'none'
            }));
        } else {

        }
    }

    return loadImageFromTypedArray;
});
