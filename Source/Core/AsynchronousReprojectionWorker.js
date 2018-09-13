define([
        './Bitmap',
        './reprojectImage'
    ], function(
        Bitmap,
        reprojectImage
    ) {
    'use strict';

    var cachedBitmaps = {};

    var AsynchronousReprojectionWorker = {};

    AsynchronousReprojectionWorker.runTask = function(parameters, transferableObjects) {
        if (parameters.load) {
            return load(parameters);
        }
    };

    function load(parameters) {
        cachedBitmaps[parameters.url] = new Bitmap(parameters.imageData);
    }

    return AsynchronousReprojectionWorker;
});
