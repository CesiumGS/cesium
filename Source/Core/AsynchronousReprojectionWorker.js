define([
        './Bitmap',
        './defined',
        './reprojectImage',
        './Rectangle',
        './Resource',
        './SerializedMapProjection',
        '../ThirdParty/lru',
        '../ThirdParty/when'
    ], function(
        Bitmap,
        defined,
        reprojectImage,
        Rectangle,
        Resource,
        SerializedMapProjection,
        LRUMap,
        when
    ) {
    'use strict';

    function AsynchronousReprojectionWorker() {
        this.projections = [];
        this.urls = [];
        this.projectedRectangles = [];
        this.unprojectedRectangles = [];
        this.cachedBuffers = undefined;
        this.targetBitmap = new Bitmap({
            data : new Uint8ClampedArray(1024 * 1024 * 4),
            width : 1024,
            height : 1024
        });
        this._rectangle = undefined;
    }

    AsynchronousReprojectionWorker.prototype.runTask = function(parameters, transferableObjects) {
        if (parameters.initialize) {
            return this.initialize(parameters);
        }
        if (parameters.reproject) {
            return this.reproject(parameters);
        }
    };

    /**
     *
     * @param {Object} parameters
     * @param {Number} parameters.entries
     * @param {String[]} parameters.urls
     * @param {SerializedMapProjection[]} parameters.serializedMapProjections
     * @param {Rectangle[]} parameters.projectedRectangles
     */
    AsynchronousReprojectionWorker.prototype.initialize = function(parameters) {
        var serializedMapProjections = parameters.serializedMapProjections;
        var imagesLength = serializedMapProjections.length;

        var projections = this.projections;
        projections.length = imagesLength;
        var projectedRectangles = this.projectedRectangles = parameters.projectedRectangles;
        var unprojectedRectangles = this.unprojectedRectangles;

        this.urls = parameters.urls;
        var that = this;

        this.cachedBuffers = new LRUMap(parameters.imageCacheSize);

        return getProjections(projections, serializedMapProjections)
            .then(function() {
                // Compute rectangle over all images in mosaic
                var north = Number.NEGATIVE_INFINITY;
                var south = Number.POSITIVE_INFINITY;
                var east = Number.NEGATIVE_INFINITY;
                var west = Number.POSITIVE_INFINITY;

                for (var i = 0; i < imagesLength; i++) {
                    var projectedRectangle = projectedRectangles[i] = Rectangle.clone(projectedRectangles[i]);
                    var unprojected = Rectangle.approximateCartographicExtents(projectedRectangle, projections[i]);
                    north = Math.max(north, unprojected.north);
                    south = Math.min(south, unprojected.south);
                    east = Math.max(east, unprojected.east);
                    west = Math.min(west, unprojected.west);
                    unprojectedRectangles[i] = unprojected;
                }

                var rectangle = new Rectangle(west, south, east, north);
                that._rectangle = rectangle;
                return rectangle;
            });
    };

    // TODO: investigate other LRUs? memory based LRU?
    AsynchronousReprojectionWorker.prototype.load = function(url) {
        var cachedBufferPromise;
        var cachedBuffers = this.cachedBuffers;
        var wasCached = cachedBuffers.has(url);
        if (wasCached) {
            cachedBufferPromise = when.resolve(cachedBuffers.get(url));
        } else {
            var resource = Resource.createIfNeeded(url);
            cachedBufferPromise = resource.fetchBlob();
        }

        return cachedBufferPromise
            .then(function(imageBlob) {
                if (wasCached) {
                    cachedBuffers.set(url, imageBlob);
                }
                return createImageBitmap(imageBlob);
            })
            .then(function(imageBitmap) {
                var canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
                var context = canvas.getContext('2d');
                context.drawImage(imageBitmap, 0, 0);
                var imagedata = context.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
                return new Bitmap(imagedata);
            })
            .otherwise(function(error) {
                return error;
            });
    };

    var rectangleIntersectionScratch = new Rectangle();
    /**
     *
     * @param {Object} parameters
     * @param {Rectangle} rectangle
     * @param {Number} width
     * @param {Number} height
     */
    AsynchronousReprojectionWorker.prototype.reproject = function(parameters) {
        var requestRectangle = parameters.rectangle;
        var width = parameters.width;
        var height = parameters.height;

        var unprojectedRectangles = this.unprojectedRectangles;
        var urls = this.urls;

        var imagesLength = urls.length;
        var i;

        var targetBitmap = this.targetBitmap;
        if (width !== targetBitmap.width || height !== targetBitmap.height) {
            var typedArray = new Uint8ClampedArray(width * height * 4);
            this.targetBitmap = targetBitmap = new Bitmap({
                data : typedArray,
                width : width,
                height : height
            });
        }
        targetBitmap.clear();

        // Compute which images we need for the given reprojection
        // TODO: don't be a dummy, use rbush here
        var intersectedImageIndices = [];
        for (i = 0; i < imagesLength; i++) {
            if (defined(Rectangle.simpleIntersection(unprojectedRectangles[i], requestRectangle, rectangleIntersectionScratch))) {
                intersectedImageIndices.push(i);
            }
        }

        return projectEach(requestRectangle, intersectedImageIndices, this)
            .then(function() {
                return targetBitmap;
            })
            .otherwise(function(error) {
                console.log(error);
                return error;
            });
    };

    function getProjections(projectionsArray, serializedMapProjections, index) {
        if (!defined(index)) {
            index = 0;
        }
        if (index === serializedMapProjections.length) {
            return when.resolve();
        }
        return SerializedMapProjection.deserialize(serializedMapProjections[index])
            .then(function(projection) {
                projectionsArray[index] = projection;

                return getProjections(projectionsArray, serializedMapProjections, index + 1);
            });
    }

    function projectEach(requestRectangle, intersectImageIndices, workerClass, index) {
        if (!defined(index)) {
            index = 0;
        }
        if (index === intersectImageIndices.length) {
            return when.resolve();
        }
        var imageIndex = intersectImageIndices[index];
        return workerClass.load(workerClass.urls[imageIndex])
            .then(function(sourceBitmap) {
                var targetBitmap = workerClass.targetBitmap;
                var sourceRectangle = workerClass.unprojectedRectangles[imageIndex];
                var sourceProjectedRectangle = workerClass.projectedRectangles[imageIndex];
                var projection = workerClass.projections[imageIndex];
                reprojectImage(targetBitmap, requestRectangle, sourceBitmap, sourceRectangle, sourceProjectedRectangle, projection);

                return projectEach(requestRectangle, intersectImageIndices, workerClass, index + 1);
            });
    }

    return AsynchronousReprojectionWorker;
});
