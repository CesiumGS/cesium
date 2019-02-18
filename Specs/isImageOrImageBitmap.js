define([
        'Core/FeatureDetection'
    ], function(
        FeatureDetection) {
    'use strict';

    function isImageOrImageBitmap(image) {
        // Many ImageryProvider specs will test if the requested image
        // succeeded by checking its instance. Since this may be an Image
        // or ImageBitmap, we abstract this check here.
        if (FeatureDetection.supportsCreateImageBitmap()) {
            return image instanceof ImageBitmap;
        }

        return image instanceof Image;
    }

    return isImageOrImageBitmap;
});
