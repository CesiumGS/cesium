define([
        './Bitmap',
        './defined',
        './GeographicProjection',
        './reprojectImage',
        './Rectangle',
        './RectangleCollisionChecker',
        './Resource',
        './deserializeMapProjection',
        '../ThirdParty/lru',
        '../ThirdParty/when'
    ], function(
        Bitmap,
        defined,
        GeographicProjection,
        reprojectImage,
        Rectangle,
        RectangleCollisionChecker,
        Resource,
        deserializeMapProjection,
        LRUMap,
        when
    ) {
    'use strict';

    function AsynchronousReprojectionWorker(stbModule) {
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
        this.iteration = 0;

        this._stb = stbModule;
        this._rectangleChecker = new RectangleCollisionChecker(new GeographicProjection());
        this.flipY = false;

        this.sampleCount = 0;
        this.stbTime = 0.0;
        this.projTime = 0.0;
        this.id = 0.0;
    }

    AsynchronousReprojectionWorker.prototype.runTask = function(parameters, transferableObjects) {
        if (parameters.initialize) {
            return this.initialize(parameters);
        }
        if (parameters.reproject) {
            //var that = this;
            return this.reproject(parameters)
                .then(function(result) {
                    //console.log(that.id + '  samples: ' + that.sampleCount);
                    //console.log(that.id + '    avg stbTime ' + (that.stbTime / that.sampleCount));
                    //console.log(that.id + '    avg projTime ' + (that.projTime / that.sampleCount));
                    //console.log(that.id + '  total time: ' + (that.stbTime + that.projTime));
                    return result;
                });
        }
    };

    /**
     *
     * @param {Object} parameters
     * @param {Number} parameters.entries
     * @param {String[]} parameters.urls
     * @param {SerializedMapProjection[]} parameters.serializedMapProjections
     * @param {Rectangle[]} parameters.projectedRectangles
     * @param {Boolean} parameters.flipY
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
        this.id = parameters.id;

        this.cachedBuffers = new LRUMap(parameters.imageCacheSize);
        this.flipY = parameters.flipY;

        var rectangleChecker = this._rectangleChecker;

        return getProjections(projections, serializedMapProjections)
            .then(function() {
                // Compute rectangle over all images in mosaic
                var north = Number.NEGATIVE_INFINITY;
                var south = Number.POSITIVE_INFINITY;
                var east = Number.NEGATIVE_INFINITY;
                var west = Number.POSITIVE_INFINITY;

                for (var i = 0; i < imagesLength; i++) {
                    var projectedRectangle = projectedRectangles[i] = Rectangle.clone(projectedRectangles[i]);
                    var unprojected = Rectangle.approximateCartographicExtents({
                        projectedRectangle : projectedRectangle,
                        mapProjection : projections[i]
                    });
                    north = Math.max(north, unprojected.north);
                    south = Math.min(south, unprojected.south);
                    east = Math.max(east, unprojected.east);
                    west = Math.min(west, unprojected.west);
                    unprojectedRectangles[i] = unprojected;

                    rectangleChecker.insert(i, unprojected);
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
            cachedBufferPromise = resource.fetchArrayBuffer();
        }

        this.sampleCount++;
        var stb = this._stb;

        var that = this;
        var imageArrayBuffer;
        return cachedBufferPromise
            .then(function(result) {
                imageArrayBuffer = result;
                if (wasCached) {
                    cachedBuffers.set(url, imageArrayBuffer);
                }

                var stbTime = performance.now();

                var byteLength = imageArrayBuffer.byteLength;
                var dimmsPntr = stb._malloc(8);
                var encodedPntr = stb._malloc(byteLength);
                stb.HEAPU8.set(new Uint8Array(imageArrayBuffer), encodedPntr);

                var decodedPntr = stb._decode(encodedPntr, byteLength, 3, dimmsPntr);

                var dimms = new Uint32Array(stb.HEAPU32.buffer, dimmsPntr, 2);
                var width = dimms[0];
                var height = dimms[1];

                var decoded = new Uint8Array(stb.HEAPU8.buffer, decodedPntr, width * height * 3);

                var imagedata = {
                    width : width,
                    height : height,
                    data : decoded
                };

                stb._free(dimmsPntr);
                stb._free(encodedPntr);
                stb._free(decodedPntr);

                that.stbTime += performance.now() - stbTime;

                return new Bitmap(imagedata);
            })
            .otherwise(function(error) {
                return error;
            });
    };

    var requestCloneRectangleScratch = new Rectangle();
    /**
     *
     * @param {Object} parameters
     * @param {Rectangle} rectangle
     * @param {Number} width
     * @param {Number} height
     * @param {Number} iteration
     */
    AsynchronousReprojectionWorker.prototype.reproject = function(parameters) {
        var requestRectangle = Rectangle.clone(parameters.rectangle, requestCloneRectangleScratch);
        var width = parameters.width;
        var height = parameters.height;

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
        var intersectedImageIndices = this._rectangleChecker.search(requestRectangle);
        var iteration = this.iteration = parameters.iteration;

        return projectEach(requestRectangle, intersectedImageIndices, iteration, this)
            .then(function(complete) {
                return {
                    iteration : iteration,
                    bitmap : complete ? targetBitmap : undefined
                };
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
        return deserializeMapProjection(serializedMapProjections[index])
            .then(function(projection) {
                projectionsArray[index] = projection;

                return getProjections(projectionsArray, serializedMapProjections, index + 1);
            });
    }

    function projectEach(requestRectangle, intersectImageIndices, iteration, workerClass, index) {
        if (workerClass.iteration !== iteration) {
            return when.resolve(false);
        }
        if (!defined(index)) {
            index = 0;
        }
        if (index === intersectImageIndices.length) {
            return when.resolve(true);
        }
        var imageIndex = intersectImageIndices[index];
        return workerClass.load(workerClass.urls[imageIndex])
            .then(function(sourceBitmap) {
                if (workerClass.iteration !== iteration) {
                    return when.resolve(false);
                }

                var targetBitmap = workerClass.targetBitmap;
                var sourceRectangle = workerClass.unprojectedRectangles[imageIndex];
                var sourceProjectedRectangle = workerClass.projectedRectangles[imageIndex];
                var projection = workerClass.projections[imageIndex];

                var projTime = performance.now();
                reprojectImage(targetBitmap, requestRectangle, sourceBitmap, sourceRectangle, sourceProjectedRectangle, projection, workerClass.flipY);
                workerClass.projTime += performance.now() - projTime;

                return projectEach(requestRectangle, intersectImageIndices, iteration, workerClass, index + 1);
            });
    }

    return AsynchronousReprojectionWorker;
});
