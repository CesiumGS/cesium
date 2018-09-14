define([
        './Bitmap',
        './reprojectImage',
        './Resource'
    ], function(
        Bitmap,
        reprojectImage,
        Resource
    ) {
    'use strict';

    var cachedBitmaps = {};

    var AsynchronousReprojectionWorker = {};

    AsynchronousReprojectionWorker.runTask = function(parameters, transferableObjects) {
        if (parameters.upload) {
            return upload(parameters);
        }
        if (parameters.load) {
            return load(parameters);
        }
    };

    function upload(parameters) {
        cachedBitmaps[parameters.url] = new Bitmap(parameters.imageData);
    }

    function load(parameters) {
        var url = parameters.url;
        var resource = Resource.createIfNeeded(url);
        return resource.fetchBlob()
            .then(function(imageBlob) {
                return createImageBitmap(imageBlob);
            })
            .then(function(imageBitmap) {
                var canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
                var context = canvas.getContext('2d');
                context.drawImage(imageBitmap, 0, 0);
                var imagedata = context.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
                cachedBitmaps[url] = new Bitmap(imagedata);

                return true;
            })
            .otherwise(function(error) {
                return error;
            });
    }

    return AsynchronousReprojectionWorker;
});
