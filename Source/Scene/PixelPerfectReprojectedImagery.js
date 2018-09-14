define([
        '../Core/Check',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/Credit',
        '../Core/defined',
        '../Core/FeatureDetection',
        '../Core/GeometryInstance',
        '../Core/getAbsoluteUri',
        '../Core/Rectangle',
        '../Core/RectangleGeometry',
        '../Core/Resource',
        '../Core/TaskProcessor',
        './PerInstanceColorAppearance',
        './Primitive'
    ], function(
        Check,
        Color,
        ColorGeometryInstanceAttribute,
        Credit,
        defined,
        FeatureDetection,
        GeometryInstance,
        getAbsoluteUri,
        Rectangle,
        RectangleGeometry,
        Resource,
        TaskProcessor,
        PerInstanceColorAppearance,
        Primitive) {
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
        this._visibleRenderingBounds = new Rectangle();

        // Primitives for debugging plumbing
        this._visiblePrimitive;
        this._standbyPrimitive;

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
                // Listen for camera changes
                scene.camera.moveEnd.addEventListener(function() {
                    that.refresh(scene);
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
        var context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        var imagedata = context.getImageData(0, 0, image.width, image.height);

        return this._taskProcessor.scheduleTask({
            upload : true,
            url : this._url,
            imageData : imagedata
        });
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

        if (renderingBounds.north < renderingBounds.south || renderingBounds.east < renderingBounds.west) {
            return;
        }

        if (defined(this._visiblePrimitive) && Rectangle.equals(renderingBounds, this._visibleRenderingBounds)) {
            return;
        }

        // DEBUG: Create a primitive
        var redRectangleInstance = new GeometryInstance({
            geometry : new RectangleGeometry({
                rectangle : renderingBounds,
                vertexFormat : PerInstanceColorAppearance.VERTEX_FORMAT
            }),
            attributes: {
                color: ColorGeometryInstanceAttribute.fromColor(new Color(1.0, 0.0, 0.0, 0.5))
            }
        });
        var standbyPrimitive = new Primitive({
            geometryInstances : [redRectangleInstance],
            appearance : new PerInstanceColorAppearance({
                closed : true
            }),
            show : false
        });

        if (defined(this._standbyPrimitive)) {
            scene.primitives.remove(this._standbyPrimitive);
        }
        this._standbyPrimitive = standbyPrimitive;
        scene.primitives.add(standbyPrimitive);

        var that = this;
        standbyPrimitive.readyPromise
            .then(function() {
                if (defined(that._visiblePrimitive)) {
                    scene.primitives.remove(that._visiblePrimitive);
                }

                that._visiblePrimitive = standbyPrimitive;
                that._visibleRenderingBounds = Rectangle.clone(renderingBounds, that._visibleRenderingBounds);
                standbyPrimitive.show = true;
                that._standbyPrimitive = undefined;
            })
            .otherwise(function(e) {
                console.log(e);
                debugger;
            });
    };

    return PixelPerfectReprojectedImagery;
});
