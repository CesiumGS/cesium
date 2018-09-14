define([
        './Bitmap',
        './reprojectImage',
        './Resource',
        './SerializedMapProjection'
    ], function(
        Bitmap,
        reprojectImage,
        Resource,
        SerializedMapProjection
    ) {
    'use strict';

    var cachedBitmaps = {};

    var AsynchronousReprojectionWorker = {};

    AsynchronousReprojectionWorker.targetBitmap = new Bitmap({
        data : new Uint8ClampedArray(1024 * 1024 * 4),
        width : 1024,
        height : 1024
    });

    AsynchronousReprojectionWorker.runTask = function(parameters, transferableObjects) {
        if (parameters.upload) {
            return upload(parameters);
        }
        if (parameters.load) {
            return load(parameters);
        }
        if (parameters.reproject) {
            return reproject(parameters);
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

    function reproject(parameters) {
        var sourceBitmap = cachedBitmaps[parameters.url];
        var height = parameters.height;
        var width = parameters.width;
        var targetBitmap = AsynchronousReprojectionWorker.targetBitmap;
        if (width !== targetBitmap.width || height !== targetBitmap.height) {
            var typedArray = new Uint8ClampedArray(width * height * 4);
            AsynchronousReprojectionWorker.targetBitmap = targetBitmap = new Bitmap({
                data : typedArray,
                width : width,
                height : height
            });
        }

        return SerializedMapProjection.deserialize(parameters.serializedMapProjection)
            .then(function(projection) {
                return reprojectImage(targetBitmap, sourceBitmap, parameters.rectangle, parameters.projectedRectangle, projection);
            })
            .otherwise(function(error) {
                console.log(error);
                return error;
            });
    }

    return AsynchronousReprojectionWorker;
});
