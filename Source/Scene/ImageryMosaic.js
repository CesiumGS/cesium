define([
        '../Core/Check',
        '../Core/Credit',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/FeatureDetection',
        '../Core/getAbsoluteUri',
        '../Core/Rectangle',
        '../Core/TaskProcessor',
        '../Core/SerializedMapProjection',
        './BitmapImageryProvider',
        './ImageryLayer'
    ], function(
        Check,
        Credit,
        defined,
        defineProperties,
        FeatureDetection,
        getAbsoluteUri,
        Rectangle,
        TaskProcessor,
        SerializedMapProjection,
        BitmapImageryProvider,
        ImageryLayer) {
    'use strict';

    var insetWaitFrames = 3;
    /**
     * Manages imagery layers for asynchronous pixel-perfect imagery reprojection.
     * TODO: only available in Chrome 69+, support coming for Firefox: https://bugzilla.mozilla.org/show_bug.cgi?id=801176
     *
     * @alias ImageryMosaic
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {String[]} options.urls the url for the imagery sources.
     * // TODO: add optional parallel list of IDs for Z order and show/hide
     * @param {Rectangle[]} options.projectedRectangles The rectangles covered by the images in their source Spatial Reference Systems
     * @param {MapProjection[]} options.projections The map projections for each image.
     * @param {Credit|String} [options.credit] A credit for all the images, which is displayed on the canvas.
     * @param {Scene} options.scene The current Cesium scene.
     */
    function ImageryMosaic(options, viewer) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('options', options);
        Check.defined('options.urls', options.urls);
        Check.defined('options.projectedRectangles', options.projectedRectangles);
        Check.defined('options.projections', options.projections);
        Check.defined('options.scene', options.scene);
        //>>includeEnd('debug');

        var urls = options.urls;
        var projectedRectangles = options.projectedRectangles;
        var projections = options.projections;

        var imagesLength = urls.length;

        // Make URLs absolute, serialize projections
        var absoluteUrls = new Array(imagesLength);
        var serializedMapProjections = new Array(imagesLength);
        for (var i = 0; i < imagesLength; i++) {
            absoluteUrls[i] = getAbsoluteUri(urls[i]);
            serializedMapProjections[i] = new SerializedMapProjection(projections[i]);
        }

        this._projectedRectangles = projectedRectangles;
        this._projections = projections;
        this._urls = absoluteUrls;

        var credit = options.credit;
        var scene = options.scene;

        if (typeof credit === 'string') {
            credit = new Credit(credit);
        }
        this._credit = credit;
        this._rectangle = new Rectangle();

        var taskProcessor = new TaskProcessor('createReprojectedImagery');
        this._taskProcessor = taskProcessor;

        this._localRenderingBounds = new Rectangle();

        this._fullCoverageImageryLayer = undefined;
        this._localImageryLayer = undefined;
        this._reprojectionPromise = undefined;
        this._iteration = 0;

        this._freeze = false;

        this._scene = scene;

        this._waitedFrames = 0;

        var that = this;

        var startupPromise;
        if (FeatureDetection.isChrome() && FeatureDetection.chromeVersion()[0] >= 69) {
            startupPromise = taskProcessor.scheduleTask({
                initialize : true,
                urls : absoluteUrls,
                serializedMapProjections : serializedMapProjections,
                projectedRectangles : projectedRectangles
            }); // TODO: check for errors?
        }
        startupPromise
            .then(function(rectangle) {
                Rectangle.clone(rectangle, that._rectangle);

                // Create the full-coverage version
                return taskProcessor.scheduleTask({
                    reproject : true,
                    width : 1024,
                    height : 1024,
                    rectangle : that._rectangle
                });
            })
            .then(function(reprojectedBitmap) {
                var bitmapImageryProvider = new BitmapImageryProvider({
                    bitmap : reprojectedBitmap,
                    rectangle : that._rectangle,
                    credit : that._credit
                });
                var imageryLayer = new ImageryLayer(bitmapImageryProvider, {rectangle : bitmapImageryProvider.rectangle});

                that._fullCoverageImageryLayer = imageryLayer;
                scene.imageryLayers.add(imageryLayer);
            })
            .then(function() {
                // Listen for camera changes
                scene.camera.moveEnd.addEventListener(function() {
                    if (that._freeze) {
                        return;
                    }
                    that.refresh(scene);
                });

                scene.postRender.addEventListener(function() {
                    if (that._waitedFrames < insetWaitFrames) {
                        that._waitedFrames++;
                        if (that._waitedFrames === insetWaitFrames) {
                            that._fullCoverageImageryLayer.cutoutRectangle = that._localRenderingBounds;
                        }
                    }
                });

                // Refresh now that we're loaded
                that.refresh(scene);
            })
            .otherwise(function(error) {
                console.log(error);
            });
        }

    defineProperties(ImageryMosaic.prototype, {
        freeze : {
            get: function() {
                return this._freeze;
            },
            set: function(value) {
                this._freeze = value;
                if (value === false) {
                    this.refresh(this._scene);
                }
            }
        }
    });

    ImageryMosaic.prototype.uploadImageToWorker = function(image) {
        // Read pixels and upload to web worker
        var canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        var context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        var imagedata = context.getImageData(0, 0, image.width, image.height);

        return this._taskProcessor.scheduleTask({
            upload : true,
            url : this._url,
            imageData : imagedata
        });
    };

    ImageryMosaic.prototype.refresh = function(scene) {
        // Compute an approximate geographic rectangle that we're rendering
        var quadtreePrimitive = scene.globe._surface;
        var quadtreeTilesToRender = quadtreePrimitive._tilesToRender;
        var quadtreeTilesToRenderLength = quadtreeTilesToRender.length;
        if (quadtreeTilesToRenderLength < 1) {
            return;
        }

        var renderingBounds = new Rectangle(); // Create new to avoid race condition with in-flight refreshes
        renderingBounds.west = Number.POSITIVE_INFINITY;
        renderingBounds.east = Number.NEGATIVE_INFINITY;
        renderingBounds.south = Number.POSITIVE_INFINITY;
        renderingBounds.north = Number.NEGATIVE_INFINITY;

        for (var i = 0; i < quadtreeTilesToRenderLength; i++) {
            var tileRectangle = quadtreeTilesToRender[i].rectangle;
            renderingBounds.west = Math.min(renderingBounds.west, tileRectangle.west);
            renderingBounds.east = Math.max(renderingBounds.east, tileRectangle.east);
            renderingBounds.south = Math.min(renderingBounds.south, tileRectangle.south);
            renderingBounds.north = Math.max(renderingBounds.north, tileRectangle.north);
        }

        var imageryBounds = this._rectangle;
        renderingBounds.west = Math.max(renderingBounds.west, imageryBounds.west);
        renderingBounds.east = Math.min(renderingBounds.east, imageryBounds.east);
        renderingBounds.south = Math.max(renderingBounds.south, imageryBounds.south);
        renderingBounds.north = Math.min(renderingBounds.north, imageryBounds.north);

        // Don't bother projecting if the view is out-of-bounds
        if (renderingBounds.north <= renderingBounds.south || renderingBounds.east <= renderingBounds.west) {
            return;
        }

        // Don't bother projecting if we're looking at the whole thing
        if (Rectangle.equals(renderingBounds, this._rectangle)) {
            return;
        }

        // Don't bother projecting if bounds haven't changed
        if (defined(this._localImageryLayer) && Rectangle.equals(renderingBounds, this._localRenderingBounds)) {
            return;
        }

        var that = this;
        this._iteration++;
        var iteration = this._iteration;
        this._taskProcessor.scheduleTask({
            reproject : true,
            width : 1024,
            height : 1024,
            rectangle : renderingBounds
        })
        .then(function(reprojectedBitmap) {
            if (that._iteration !== iteration) {
                // cancel
                return;
            }

            var bitmapImageryProvider = new BitmapImageryProvider({
                bitmap : reprojectedBitmap,
                rectangle : renderingBounds,
                credit : that._credit
            });

            var newLocalImageryLayer = new ImageryLayer(bitmapImageryProvider, {rectangle : bitmapImageryProvider.rectangle});
            scene.imageryLayers.add(newLocalImageryLayer);

            if (defined(that._localImageryLayer)) {
                scene.imageryLayers.remove(that._localImageryLayer);
            }
            that._localImageryLayer = newLocalImageryLayer;
            that._localRenderingBounds = Rectangle.clone(renderingBounds, that._localRenderingBounds);
            that._fullCoverageImageryLayer.cutoutRectangle = undefined;
            that._waitedFrames = 0;
        })
        .otherwise(function(e) {
            console.log(e); // TODO: handle or throw?
        });
    };

    return ImageryMosaic;
});
