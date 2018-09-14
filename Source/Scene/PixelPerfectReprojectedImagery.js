define([
        '../Core/Check',
        '../Core/Credit',
        '../Core/defined',
        '../Core/FeatureDetection',
        '../Core/getAbsoluteUri',
        '../Core/Rectangle',
        '../Core/Resource',
        '../Core/TaskProcessor',
        '../Core/SerializedMapProjection',
        './BitmapImageryProvider'
    ], function(
        Check,
        Credit,
        defined,
        FeatureDetection,
        getAbsoluteUri,
        Rectangle,
        Resource,
        TaskProcessor,
        SerializedMapProjection,
        BitmapImageryProvider) {
    'use strict';

    /**
     * Manages imagery layers for asynchronous pixel-perfect imagery reprojection.
     *
     * @alias PixelPerfectReprojectedImagery
     * @constructor
     *
     * @param {Object} options Object with the following properties: TODO: a bunch of these options should become arrs
     * @param {String} options.url the url for the imagery source.
     * @param {Rectangle} options.projectedRectangle The rectangle covered by the image in the source SRS.
     * @param {MapProjection} options.projection The map projection for the source SRS.
     * @param {Credit|String} [options.credit] A credit for the data source, which is displayed on the canvas.
     * @param {Scene} options.scene The current Cesium scene.
     */
    function PixelPerfectReprojectedImagery(options) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('options', options);
        Check.typeOf.string('options.url', options.url);
        Check.defined('options.projectedRectangle', options.projectedRectangle);
        Check.defined('options.projection', options.projection);
        Check.defined('options.scene', options.scene);
        //>>includeEnd('debug');

        this._projectedRectangle = Rectangle.clone(options.projectedRectangle);
        this._rectangle = Rectangle.unproject(options.projectedRectangle, options.projection);
        this._projection = options.projection;
        var credit = options.credit;
        var scene = options.scene;

        var absoluteUrl = getAbsoluteUri(options.url);
        this._url = absoluteUrl;

        if (typeof credit === 'string') {
            credit = new Credit(credit);
        }
        this._credit = credit;

        var taskProcessor = new TaskProcessor('createReprojectedImagery');
        this._taskProcessor = taskProcessor;

        this._renderingBoundsScratch = new Rectangle();
        this._localRenderingBounds = new Rectangle();

        this._fullCoverageImageryLayer = undefined;
        this._localImageryLayer = undefined;
        this._reprojectionPromise = undefined;
        this._iteration = 0;

        this._serializedMapProjection = new SerializedMapProjection(options.projection);

        var that = this;

        var startupPromise;
        if (FeatureDetection.isChrome() && FeatureDetection.chromeVersion()[0] >= 69) {
            startupPromise = taskProcessor.scheduleTask({
                load : true,
                url : absoluteUrl
            }); // TODO: check for errors?
        } else {
            var resource = Resource.createIfNeeded(absoluteUrl);
            startupPromise = resource.fetchImage()
                .then(function(image) {
                    return that.uploadImageToWorker(image);
                });
        }
        startupPromise
            .then(function() {
                // Create the full-coverage version
                return taskProcessor.scheduleTask({
                    reproject : true,
                    width : 1024,
                    height : 1024,
                    url : that._url,
                    serializedMapProjection : that._serializedMapProjection,
                    rectangle : that._rectangle,
                    projectedRectangle : that._projectedRectangle
                });
            })
            .then(function(reprojectedBitmap) {
                that._fullCoverageImageryLayer = scene.imageryLayers.addImageryProvider(new BitmapImageryProvider({
                    bitmap : reprojectedBitmap,
                    rectangle : that._rectangle,
                    credit : that._credit
                }));
            })
            .then(function() {
                // Listen for camera changes
                scene.camera.moveEnd.addEventListener(function() {
                    that.refresh(scene);
                });

                scene.camera.moveStart.addEventListener(function() {
                    that.showApproximation();
                });

                // Refresh now that we're loaded
                that.refresh(scene);
            })
            .otherwise(function(error) {
                console.log(error);
            });
        }

    PixelPerfectReprojectedImagery.prototype.uploadImageToWorker = function(image) {
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

    PixelPerfectReprojectedImagery.prototype.showApproximation = function() {
        this._fullCoverageImageryLayer.show = true;
        if (defined(this._localImageryLayer)) {
            this._localImageryLayer.show = false;
        }
    };

    PixelPerfectReprojectedImagery.prototype.refresh = function(scene) {
        // Compute an approximate geographic rectangle that we're rendering
        var quadtreePrimitive = scene.globe._surface;
        var quadtreeTilesToRender = quadtreePrimitive._tilesToRender;
        var quadtreeTilesToRenderLength = quadtreeTilesToRender.length;
        if (quadtreeTilesToRenderLength < 1) {
            return;
        }

        var renderingBounds = this._renderingBoundsScratch;
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
        if (renderingBounds.north < renderingBounds.south || renderingBounds.east < renderingBounds.west) {
            return;
        }

        // Don't bother projecting if we're looking at the whole thing, just show the approximation
        if (Rectangle.equals(renderingBounds, this._rectangle)) {
            this.showApproximation();
            return;
        }

        // Don't bother projecting if bounds haven't changed
        if (defined(this._localImageryLayer) && Rectangle.equals(renderingBounds, this._localRenderingBounds)) {
            this._fullCoverageImageryLayer.show = false;
            this._localImageryLayer.show = true;
            return;
        }

        var that = this;
        this._iteration++;
        var iteration = this._iteration;
        this._taskProcessor.scheduleTask({
            reproject : true,
            width : 1024,
            height : 1024,
            url : this._url,
            serializedMapProjection : this._serializedMapProjection,
            rectangle : renderingBounds,
            projectedRectangle : this._projectedRectangle
        })
        .then(function(reprojectedBitmap) {
            if (that._iteration !== iteration) {
                return;
            }
            if (defined(that._localImageryLayer)) {
                scene.imageryLayers.remove(that._localImageryLayer);
            }
            that._localImageryLayer = scene.imageryLayers.addImageryProvider(new BitmapImageryProvider({
                bitmap : reprojectedBitmap,
                rectangle : renderingBounds,
                credit : that._credit
            }));
            that._fullCoverageImageryLayer.show = false;
            that._localRenderingBounds = Rectangle.clone(renderingBounds, that._localRenderingBounds);
        })
        .otherwise(function(e) {
            console.log(e); // TODO: handle or throw?
        });
    };

    return PixelPerfectReprojectedImagery;
});
