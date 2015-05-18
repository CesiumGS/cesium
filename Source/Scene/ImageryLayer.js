/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/Cartesian2',
        '../Core/Cartesian4',
        '../Core/Color',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/FeatureDetection',
        '../Core/GeographicTilingScheme',
        '../Core/IndexDatatype',
        '../Core/Math',
        '../Core/PixelFormat',
        '../Core/PrimitiveType',
        '../Core/Rectangle',
        '../Core/TerrainProvider',
        '../Core/TileProviderError',
        '../Renderer/BufferUsage',
        '../Renderer/ClearCommand',
        '../Renderer/DrawCommand',
        '../Renderer/MipmapHint',
        '../Renderer/ShaderSource',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        '../Shaders/ReprojectWebMercatorFS',
        '../Shaders/ReprojectWebMercatorVS',
        '../ThirdParty/when',
        './Imagery',
        './ImageryState',
        './TileImagery'
    ], function(
        BoundingRectangle,
        Cartesian2,
        Cartesian4,
        Color,
        ComponentDatatype,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        FeatureDetection,
        GeographicTilingScheme,
        IndexDatatype,
        CesiumMath,
        PixelFormat,
        PrimitiveType,
        Rectangle,
        TerrainProvider,
        TileProviderError,
        BufferUsage,
        ClearCommand,
        DrawCommand,
        MipmapHint,
        ShaderSource,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        ReprojectWebMercatorFS,
        ReprojectWebMercatorVS,
        when,
        Imagery,
        ImageryState,
        TileImagery) {
    "use strict";

    /**
     * An imagery layer that displays tiled image data from a single imagery provider
     * on a {@link Globe}.
     *
     * @alias ImageryLayer
     * @constructor
     *
     * @param {ImageryProvider} imageryProvider The imagery provider to use.
     * @param {Object} [options] Object with the following properties:
     * @param {Rectangle} [options.rectangle=imageryProvider.rectangle] The rectangle of the layer.  This rectangle
     *        can limit the visible portion of the imagery provider.
     * @param {Number|Function} [options.alpha=1.0] The alpha blending value of this layer, from 0.0 to 1.0.
     *                          This can either be a simple number or a function with the signature
     *                          <code>function(frameState, layer, x, y, level)</code>.  The function is passed the
     *                          current frame state, this layer, and the x, y, and level coordinates of the
     *                          imagery tile for which the alpha is required, and it is expected to return
     *                          the alpha value to use for the tile.
     * @param {Number|Function} [options.brightness=1.0] The brightness of this layer.  1.0 uses the unmodified imagery
     *                          color.  Less than 1.0 makes the imagery darker while greater than 1.0 makes it brighter.
     *                          This can either be a simple number or a function with the signature
     *                          <code>function(frameState, layer, x, y, level)</code>.  The function is passed the
     *                          current frame state, this layer, and the x, y, and level coordinates of the
     *                          imagery tile for which the brightness is required, and it is expected to return
     *                          the brightness value to use for the tile.  The function is executed for every
     *                          frame and for every tile, so it must be fast.
     * @param {Number|Function} [options.contrast=1.0] The contrast of this layer.  1.0 uses the unmodified imagery color.
     *                          Less than 1.0 reduces the contrast while greater than 1.0 increases it.
     *                          This can either be a simple number or a function with the signature
     *                          <code>function(frameState, layer, x, y, level)</code>.  The function is passed the
     *                          current frame state, this layer, and the x, y, and level coordinates of the
     *                          imagery tile for which the contrast is required, and it is expected to return
     *                          the contrast value to use for the tile.  The function is executed for every
     *                          frame and for every tile, so it must be fast.
     * @param {Number|Function} [options.hue=0.0] The hue of this layer.  0.0 uses the unmodified imagery color.
     *                          This can either be a simple number or a function with the signature
     *                          <code>function(frameState, layer, x, y, level)</code>.  The function is passed the
     *                          current frame state, this layer, and the x, y, and level coordinates
     *                          of the imagery tile for which the hue is required, and it is expected to return
     *                          the contrast value to use for the tile.  The function is executed for every
     *                          frame and for every tile, so it must be fast.
     * @param {Number|Function} [options.saturation=1.0] The saturation of this layer.  1.0 uses the unmodified imagery color.
     *                          Less than 1.0 reduces the saturation while greater than 1.0 increases it.
     *                          This can either be a simple number or a function with the signature
     *                          <code>function(frameState, layer, x, y, level)</code>.  The function is passed the
     *                          current frame state, this layer, and the x, y, and level coordinates
     *                          of the imagery tile for which the saturation is required, and it is expected to return
     *                          the contrast value to use for the tile.  The function is executed for every
     *                          frame and for every tile, so it must be fast.
     * @param {Number|Function} [options.gamma=1.0] The gamma correction to apply to this layer.  1.0 uses the unmodified imagery color.
     *                          This can either be a simple number or a function with the signature
     *                          <code>function(frameState, layer, x, y, level)</code>.  The function is passed the
     *                          current frame state, this layer, and the x, y, and level coordinates of the
     *                          imagery tile for which the gamma is required, and it is expected to return
     *                          the gamma value to use for the tile.  The function is executed for every
     *                          frame and for every tile, so it must be fast.
     * @param {Boolean} [options.show=true] True if the layer is shown; otherwise, false.
     * @param {Number} [options.maximumAnisotropy=maximum supported] The maximum anisotropy level to use
     *        for texture filtering.  If this parameter is not specified, the maximum anisotropy supported
     *        by the WebGL stack will be used.  Larger values make the imagery look better in horizon
     *        views.
     * @param {Number} [options.minimumTerrainLevel] The minimum terrain level-of-detail at which to show this imagery layer,
     *                 or undefined to show it at all levels.  Level zero is the least-detailed level.
     * @param {Number} [options.maximumTerrainLevel] The maximum terrain level-of-detail at which to show this imagery layer,
     *                 or undefined to show it at all levels.  Level zero is the least-detailed level.
     */
    var ImageryLayer = function ImageryLayer(imageryProvider, options) {
        this._imageryProvider = imageryProvider;

        options = defaultValue(options, {});

        /**
         * The alpha blending value of this layer, with 0.0 representing fully transparent and
         * 1.0 representing fully opaque.
         *
         * @type {Number}
         * @default 1.0
         */
        this.alpha = defaultValue(options.alpha, defaultValue(imageryProvider.defaultAlpha, 1.0));

        /**
         * The brightness of this layer.  1.0 uses the unmodified imagery color.  Less than 1.0
         * makes the imagery darker while greater than 1.0 makes it brighter.
         *
         * @type {Number}
         * @default {@link ImageryLayer.DEFAULT_BRIGHTNESS}
         */
        this.brightness = defaultValue(options.brightness, defaultValue(imageryProvider.defaultBrightness, ImageryLayer.DEFAULT_BRIGHTNESS));

        /**
         * The contrast of this layer.  1.0 uses the unmodified imagery color.  Less than 1.0 reduces
         * the contrast while greater than 1.0 increases it.
         *
         * @type {Number}
         * @default {@link ImageryLayer.DEFAULT_CONTRAST}
         */
        this.contrast = defaultValue(options.contrast, defaultValue(imageryProvider.defaultContrast, ImageryLayer.DEFAULT_CONTRAST));

        /**
         * The hue of this layer in radians. 0.0 uses the unmodified imagery color.
         *
         * @type {Number}
         * @default {@link ImageryLayer.DEFAULT_HUE}
         */
        this.hue = defaultValue(options.hue, defaultValue(imageryProvider.defaultHue, ImageryLayer.DEFAULT_HUE));

        /**
         * The saturation of this layer. 1.0 uses the unmodified imagery color. Less than 1.0 reduces the
         * saturation while greater than 1.0 increases it.
         *
         * @type {Number}
         * @default {@link ImageryLayer.DEFAULT_SATURATION}
         */
        this.saturation = defaultValue(options.saturation, defaultValue(imageryProvider.defaultSaturation, ImageryLayer.DEFAULT_SATURATION));

        /**
         * The gamma correction to apply to this layer.  1.0 uses the unmodified imagery color.
         *
         * @type {Number}
         * @default {@link ImageryLayer.DEFAULT_GAMMA}
         */
        this.gamma = defaultValue(options.gamma, defaultValue(imageryProvider.defaultGamma, ImageryLayer.DEFAULT_GAMMA));

        /**
         * Determines if this layer is shown.
         *
         * @type {Boolean}
         * @default true
         */
        this.show = defaultValue(options.show, true);

        this._minimumTerrainLevel = options.minimumTerrainLevel;
        this._maximumTerrainLevel = options.maximumTerrainLevel;

        this._rectangle = defaultValue(options.rectangle, Rectangle.MAX_VALUE);
        this._maximumAnisotropy = options.maximumAnisotropy;

        this._imageryCache = {};

        this._skeletonPlaceholder = new TileImagery(Imagery.createPlaceholder(this));

        // The value of the show property on the last update.
        this._show = true;

        // The index of this layer in the ImageryLayerCollection.
        this._layerIndex = -1;

        // true if this is the base (lowest shown) layer.
        this._isBaseLayer = false;

        this._requestImageError = undefined;
    };

    defineProperties(ImageryLayer.prototype, {

        /**
         * Gets the imagery provider for this layer.
         * @memberof ImageryLayer.prototype
         * @type {ImageryProvider}
         * @readonly
         */
        imageryProvider : {
            get: function() {
                return this._imageryProvider;
            }
        },

        /**
         * Gets the rectangle of this layer.  If this rectangle is smaller than the rectangle of the
         * {@link ImageryProvider}, only a portion of the imagery provider is shown.
         * @memberof ImageryLayer.prototype
         * @type {Rectangle}
         * @readonly
         */
        rectangle: {
            get: function() {
                return this._rectangle;
            }
        }
    });


    /**
     * This value is used as the default brightness for the imagery layer if one is not provided during construction
     * or by the imagery provider. This value does not modify the brightness of the imagery.
     * @type {Number}
     * @default 1.0
     */
    ImageryLayer.DEFAULT_BRIGHTNESS = 1.0;
    /**
     * This value is used as the default contrast for the imagery layer if one is not provided during construction
     * or by the imagery provider. This value does not modify the contrast of the imagery.
     * @type {Number}
     * @default 1.0
     */
    ImageryLayer.DEFAULT_CONTRAST = 1.0;
    /**
     * This value is used as the default hue for the imagery layer if one is not provided during construction
     * or by the imagery provider. This value does not modify the hue of the imagery.
     * @type {Number}
     * @default 0.0
     */
    ImageryLayer.DEFAULT_HUE = 0.0;
    /**
     * This value is used as the default saturation for the imagery layer if one is not provided during construction
     * or by the imagery provider. This value does not modify the saturation of the imagery.
     * @type {Number}
     * @default 1.0
     */
    ImageryLayer.DEFAULT_SATURATION = 1.0;
    /**
     * This value is used as the default gamma for the imagery layer if one is not provided during construction
     * or by the imagery provider. This value does not modify the gamma of the imagery.
     * @type {Number}
     * @default 1.0
     */
    ImageryLayer.DEFAULT_GAMMA = 1.0;

    /**
     * Gets a value indicating whether this layer is the base layer in the
     * {@link ImageryLayerCollection}.  The base layer is the one that underlies all
     * others.  It is special in that it is treated as if it has global rectangle, even if
     * it actually does not, by stretching the texels at the edges over the entire
     * globe.
     *
     * @returns {Boolean} true if this is the base layer; otherwise, false.
     */
    ImageryLayer.prototype.isBaseLayer = function() {
        return this._isBaseLayer;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see ImageryLayer#destroy
     */
    ImageryLayer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see ImageryLayer#isDestroyed
     *
     * @example
     * imageryLayer = imageryLayer && imageryLayer.destroy();
     */
    ImageryLayer.prototype.destroy = function() {
        return destroyObject(this);
    };

    var imageryBoundsScratch = new Rectangle();
    var tileImageryBoundsScratch = new Rectangle();
    var clippedRectangleScratch = new Rectangle();

    /**
     * Create skeletons for the imagery tiles that partially or completely overlap a given terrain
     * tile.
     *
     * @private
     *
     * @param {Tile} tile The terrain tile.
     * @param {TerrainProvider} terrainProvider The terrain provider associated with the terrain tile.
     * @param {Number} insertionPoint The position to insert new skeletons before in the tile's imagery list.
     * @returns {Boolean} true if this layer overlaps any portion of the terrain tile; otherwise, false.
     */
    ImageryLayer.prototype._createTileImagerySkeletons = function(tile, terrainProvider, insertionPoint) {
        var surfaceTile = tile.data;

        if (defined(this._minimumTerrainLevel) && tile.level < this._minimumTerrainLevel) {
            return false;
        }
        if (defined(this._maximumTerrainLevel) && tile.level > this._maximumTerrainLevel) {
            return false;
        }

        var imageryProvider = this._imageryProvider;

        if (!defined(insertionPoint)) {
            insertionPoint = surfaceTile.imagery.length;
        }

        if (!imageryProvider.ready) {
            // The imagery provider is not ready, so we can't create skeletons, yet.
            // Instead, add a placeholder so that we'll know to create
            // the skeletons once the provider is ready.
            this._skeletonPlaceholder.loadingImagery.addReference();
            surfaceTile.imagery.splice(insertionPoint, 0, this._skeletonPlaceholder);
            return true;
        }

        // Compute the rectangle of the imagery from this imageryProvider that overlaps
        // the geometry tile.  The ImageryProvider and ImageryLayer both have the
        // opportunity to constrain the rectangle.  The imagery TilingScheme's rectangle
        // always fully contains the ImageryProvider's rectangle.
        var imageryBounds = Rectangle.intersection(imageryProvider.rectangle, this._rectangle, imageryBoundsScratch);
        var rectangle = Rectangle.intersection(tile.rectangle, imageryBounds, tileImageryBoundsScratch);

        if (!defined(rectangle)) {
            // There is no overlap between this terrain tile and this imagery
            // provider.  Unless this is the base layer, no skeletons need to be created.
            // We stretch texels at the edge of the base layer over the entire globe.
            if (!this.isBaseLayer()) {
                return false;
            }

            var baseImageryRectangle = imageryBounds;
            var baseTerrainRectangle = tile.rectangle;
            rectangle = tileImageryBoundsScratch;

            if (baseTerrainRectangle.south >= baseImageryRectangle.north) {
                rectangle.north = rectangle.south = baseImageryRectangle.north;
            } else if (baseTerrainRectangle.north <= baseImageryRectangle.south) {
                rectangle.north = rectangle.south = baseImageryRectangle.south;
            }

            if (baseTerrainRectangle.west >= baseImageryRectangle.east) {
                rectangle.west = rectangle.east = baseImageryRectangle.east;
            } else if (baseTerrainRectangle.east <= baseImageryRectangle.west) {
                rectangle.west = rectangle.east = baseImageryRectangle.west;
            }
        }

        var latitudeClosestToEquator = 0.0;
        if (rectangle.south > 0.0) {
            latitudeClosestToEquator = rectangle.south;
        } else if (rectangle.north < 0.0) {
            latitudeClosestToEquator = rectangle.north;
        }

        // Compute the required level in the imagery tiling scheme.
        // The errorRatio should really be imagerySSE / terrainSSE rather than this hard-coded value.
        // But first we need configurable imagery SSE and we need the rendering to be able to handle more
        // images attached to a terrain tile than there are available texture units.  So that's for the future.
        var errorRatio = 1.0;
        var targetGeometricError = errorRatio * terrainProvider.getLevelMaximumGeometricError(tile.level);
        var imageryLevel = getLevelWithMaximumTexelSpacing(this, targetGeometricError, latitudeClosestToEquator);
        imageryLevel = Math.max(0, imageryLevel);
        var maximumLevel = imageryProvider.maximumLevel;
        if (imageryLevel > maximumLevel) {
            imageryLevel = maximumLevel;
        }

        if (defined(imageryProvider.minimumLevel)) {
            var minimumLevel = imageryProvider.minimumLevel;
            if (imageryLevel < minimumLevel) {
                imageryLevel = minimumLevel;
            }
        }

        var imageryTilingScheme = imageryProvider.tilingScheme;
        var northwestTileCoordinates = imageryTilingScheme.positionToTileXY(Rectangle.northwest(rectangle), imageryLevel);
        var southeastTileCoordinates = imageryTilingScheme.positionToTileXY(Rectangle.southeast(rectangle), imageryLevel);

        // If the southeast corner of the rectangle lies very close to the north or west side
        // of the southeast tile, we don't actually need the southernmost or easternmost
        // tiles.
        // Similarly, if the northwest corner of the rectangle lies very close to the south or east side
        // of the northwest tile, we don't actually need the northernmost or westernmost tiles.

        // We define "very close" as being within 1/512 of the width of the tile.
        var veryCloseX = tile.rectangle.height / 512.0;
        var veryCloseY = tile.rectangle.width / 512.0;

        var northwestTileRectangle = imageryTilingScheme.tileXYToRectangle(northwestTileCoordinates.x, northwestTileCoordinates.y, imageryLevel);
        if (Math.abs(northwestTileRectangle.south - tile.rectangle.north) < veryCloseY && northwestTileCoordinates.y < southeastTileCoordinates.y) {
            ++northwestTileCoordinates.y;
        }
        if (Math.abs(northwestTileRectangle.east - tile.rectangle.west) < veryCloseX && northwestTileCoordinates.x < southeastTileCoordinates.x) {
            ++northwestTileCoordinates.x;
        }

        var southeastTileRectangle = imageryTilingScheme.tileXYToRectangle(southeastTileCoordinates.x, southeastTileCoordinates.y, imageryLevel);
        if (Math.abs(southeastTileRectangle.north - tile.rectangle.south) < veryCloseY && southeastTileCoordinates.y > northwestTileCoordinates.y) {
            --southeastTileCoordinates.y;
        }
        if (Math.abs(southeastTileRectangle.west - tile.rectangle.east) < veryCloseX && southeastTileCoordinates.x > northwestTileCoordinates.x) {
            --southeastTileCoordinates.x;
        }

        // Create TileImagery instances for each imagery tile overlapping this terrain tile.
        // We need to do all texture coordinate computations in the imagery tile's tiling scheme.

        var terrainRectangle = tile.rectangle;
        var imageryRectangle = imageryTilingScheme.tileXYToRectangle(northwestTileCoordinates.x, northwestTileCoordinates.y, imageryLevel);
        var clippedImageryRectangle = Rectangle.intersection(imageryRectangle, imageryBounds, clippedRectangleScratch);

        var minU;
        var maxU = 0.0;

        var minV = 1.0;
        var maxV;

        // If this is the northern-most or western-most tile in the imagery tiling scheme,
        // it may not start at the northern or western edge of the terrain tile.
        // Calculate where it does start.
        if (!this.isBaseLayer() && Math.abs(clippedImageryRectangle.west - tile.rectangle.west) >= veryCloseX) {
            maxU = Math.min(1.0, (clippedImageryRectangle.west - terrainRectangle.west) / terrainRectangle.width);
        }

        if (!this.isBaseLayer() && Math.abs(clippedImageryRectangle.north - tile.rectangle.north) >= veryCloseY) {
            minV = Math.max(0.0, (clippedImageryRectangle.north - terrainRectangle.south) / terrainRectangle.height);
        }

        var initialMinV = minV;

        for ( var i = northwestTileCoordinates.x; i <= southeastTileCoordinates.x; i++) {
            minU = maxU;

            imageryRectangle = imageryTilingScheme.tileXYToRectangle(i, northwestTileCoordinates.y, imageryLevel);
            clippedImageryRectangle = Rectangle.intersection(imageryRectangle, imageryBounds, clippedRectangleScratch);

            maxU = Math.min(1.0, (clippedImageryRectangle.east - terrainRectangle.west) / terrainRectangle.width);

            // If this is the eastern-most imagery tile mapped to this terrain tile,
            // and there are more imagery tiles to the east of this one, the maxU
            // should be 1.0 to make sure rounding errors don't make the last
            // image fall shy of the edge of the terrain tile.
            if (i === southeastTileCoordinates.x && (this.isBaseLayer() || Math.abs(clippedImageryRectangle.east - tile.rectangle.east) < veryCloseX)) {
                maxU = 1.0;
            }

            minV = initialMinV;

            for ( var j = northwestTileCoordinates.y; j <= southeastTileCoordinates.y; j++) {
                maxV = minV;

                imageryRectangle = imageryTilingScheme.tileXYToRectangle(i, j, imageryLevel);
                clippedImageryRectangle = Rectangle.intersection(imageryRectangle, imageryBounds, clippedRectangleScratch);
                minV = Math.max(0.0, (clippedImageryRectangle.south - terrainRectangle.south) / terrainRectangle.height);

                // If this is the southern-most imagery tile mapped to this terrain tile,
                // and there are more imagery tiles to the south of this one, the minV
                // should be 0.0 to make sure rounding errors don't make the last
                // image fall shy of the edge of the terrain tile.
                if (j === southeastTileCoordinates.y && (this.isBaseLayer() || Math.abs(clippedImageryRectangle.south - tile.rectangle.south) < veryCloseY)) {
                    minV = 0.0;
                }

                var texCoordsRectangle = new Cartesian4(minU, minV, maxU, maxV);
                var imagery = this.getImageryFromCache(i, j, imageryLevel, imageryRectangle);
                surfaceTile.imagery.splice(insertionPoint, 0, new TileImagery(imagery, texCoordsRectangle));
                ++insertionPoint;
            }
        }

        return true;
    };

    /**
     * Calculate the translation and scale for a particular {@link TileImagery} attached to a
     * particular terrain tile.
     *
     * @private
     *
     * @param {Tile} tile The terrain tile.
     * @param {TileImagery} tileImagery The imagery tile mapping.
     * @returns {Cartesian4} The translation and scale where X and Y are the translation and Z and W
     *          are the scale.
     */
    ImageryLayer.prototype._calculateTextureTranslationAndScale = function(tile, tileImagery) {
        var imageryRectangle = tileImagery.readyImagery.rectangle;
        var terrainRectangle = tile.rectangle;
        var terrainWidth = terrainRectangle.width;
        var terrainHeight = terrainRectangle.height;

        var scaleX = terrainWidth / imageryRectangle.width;
        var scaleY = terrainHeight / imageryRectangle.height;
        return new Cartesian4(
                scaleX * (terrainRectangle.west - imageryRectangle.west) / terrainWidth,
                scaleY * (terrainRectangle.south - imageryRectangle.south) / terrainHeight,
                scaleX,
                scaleY);
    };

    /**
     * Request a particular piece of imagery from the imagery provider.  This method handles raising an
     * error event if the request fails, and retrying the request if necessary.
     *
     * @private
     *
     * @param {Imagery} imagery The imagery to request.
     */
    ImageryLayer.prototype._requestImagery = function(imagery) {
        var imageryProvider = this._imageryProvider;

        var that = this;

        function success(image) {
            if (!defined(image)) {
                return failure();
            }

            imagery.image = image;
            imagery.state = ImageryState.RECEIVED;

            TileProviderError.handleSuccess(that._requestImageError);
        }

        function failure(e) {
            // Initially assume failure.  handleError may retry, in which case the state will
            // change to TRANSITIONING.
            imagery.state = ImageryState.FAILED;

            var message = 'Failed to obtain image tile X: ' + imagery.x + ' Y: ' + imagery.y + ' Level: ' + imagery.level + '.';
            that._requestImageError = TileProviderError.handleError(
                    that._requestImageError,
                    imageryProvider,
                    imageryProvider.errorEvent,
                    message,
                    imagery.x, imagery.y, imagery.level,
                    doRequest,
                    e);
        }

        function doRequest() {
            imagery.state = ImageryState.TRANSITIONING;
            var imagePromise = imageryProvider.requestImage(imagery.x, imagery.y, imagery.level);

            if (!defined(imagePromise)) {
                // Too many parallel requests, so postpone loading tile.
                imagery.state = ImageryState.UNLOADED;
                return;
            }

            if (defined(imageryProvider.getTileCredits)) {
                imagery.credits = imageryProvider.getTileCredits(imagery.x, imagery.y, imagery.level);
            }

            when(imagePromise, success, failure);
        }

        doRequest();
    };

    /**
     * Create a WebGL texture for a given {@link Imagery} instance.
     *
     * @private
     *
     * @param {Context} context The rendered context to use to create textures.
     * @param {Imagery} imagery The imagery for which to create a texture.
     */
    ImageryLayer.prototype._createTexture = function(context, imagery) {
        var imageryProvider = this._imageryProvider;

        // If this imagery provider has a discard policy, use it to check if this
        // image should be discarded.
        if (defined(imageryProvider.tileDiscardPolicy)) {
            var discardPolicy = imageryProvider.tileDiscardPolicy;
            if (defined(discardPolicy)) {
                // If the discard policy is not ready yet, transition back to the
                // RECEIVED state and we'll try again next time.
                if (!discardPolicy.isReady()) {
                    imagery.state = ImageryState.RECEIVED;
                    return;
                }

                // Mark discarded imagery tiles invalid.  Parent imagery will be used instead.
                if (discardPolicy.shouldDiscardImage(imagery.image)) {
                    imagery.state = ImageryState.INVALID;
                    return;
                }
            }
        }

        // Imagery does not need to be discarded, so upload it to WebGL.
        var texture = context.createTexture2D({
            source : imagery.image,
            pixelFormat : imageryProvider.hasAlphaChannel ? PixelFormat.RGBA : PixelFormat.RGB
        });

        imagery.texture = texture;
        imagery.image = undefined;
        imagery.state = ImageryState.TEXTURE_LOADED;
    };

    /**
     * Reproject a texture to a {@link GeographicProjection}, if necessary, and generate
     * mipmaps for the geographic texture.
     *
     * @private
     *
     * @param {Context} context The rendered context to use.
     * @param {Imagery} imagery The imagery instance to reproject.
     */
    ImageryLayer.prototype._reprojectTexture = function(context, imagery) {
        var texture = imagery.texture;
        var rectangle = imagery.rectangle;

        // Reproject this texture if it is not already in a geographic projection and
        // the pixels are more than 1e-5 radians apart.  The pixel spacing cutoff
        // avoids precision problems in the reprojection transformation while making
        // no noticeable difference in the georeferencing of the image.
        if (!(this._imageryProvider.tilingScheme instanceof GeographicTilingScheme) &&
            rectangle.width / texture.width > 1e-5) {
                var reprojectedTexture = reprojectToGeographic(this, context, texture, imagery.rectangle);
                texture.destroy();
                imagery.texture = texture = reprojectedTexture;
        }

        // Use mipmaps if this texture has power-of-two dimensions.
        if (CesiumMath.isPowerOfTwo(texture.width) && CesiumMath.isPowerOfTwo(texture.height)) {
            var mipmapSampler = context.cache.imageryLayer_mipmapSampler;
            if (!defined(mipmapSampler)) {
                var maximumSupportedAnisotropy = context.maximumTextureFilterAnisotropy;
                mipmapSampler = context.cache.imageryLayer_mipmapSampler = context.createSampler({
                    wrapS : TextureWrap.CLAMP_TO_EDGE,
                    wrapT : TextureWrap.CLAMP_TO_EDGE,
                    minificationFilter : TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
                    magnificationFilter : TextureMagnificationFilter.LINEAR,
                    maximumAnisotropy : Math.min(maximumSupportedAnisotropy, defaultValue(this._maximumAnisotropy, maximumSupportedAnisotropy))
                });
            }
            texture.generateMipmap(MipmapHint.NICEST);
            texture.sampler = mipmapSampler;
        } else {
            var nonMipmapSampler = context.cache.imageryLayer_nonMipmapSampler;
            if (!defined(nonMipmapSampler)) {
                nonMipmapSampler = context.cache.imageryLayer_nonMipmapSampler = context.createSampler({
                    wrapS : TextureWrap.CLAMP_TO_EDGE,
                    wrapT : TextureWrap.CLAMP_TO_EDGE,
                    minificationFilter : TextureMinificationFilter.LINEAR,
                    magnificationFilter : TextureMagnificationFilter.LINEAR
                });
            }
            texture.sampler = nonMipmapSampler;
        }

        imagery.state = ImageryState.READY;
    };

    ImageryLayer.prototype.getImageryFromCache = function(x, y, level, imageryRectangle) {
        var cacheKey = getImageryCacheKey(x, y, level);
        var imagery = this._imageryCache[cacheKey];

        if (!defined(imagery)) {
            imagery = new Imagery(this, x, y, level, imageryRectangle);
            this._imageryCache[cacheKey] = imagery;
        }

        imagery.addReference();
        return imagery;
    };

    ImageryLayer.prototype.removeImageryFromCache = function(imagery) {
        var cacheKey = getImageryCacheKey(imagery.x, imagery.y, imagery.level);
        delete this._imageryCache[cacheKey];
    };

    function getImageryCacheKey(x, y, level) {
        return JSON.stringify([x, y, level]);
    }

    var uniformMap = {
        u_textureDimensions : function() {
            return this.textureDimensions;
        },
        u_texture : function() {
            return this.texture;
        },

        textureDimensions : new Cartesian2(),
        texture : undefined
    };

    var float32ArrayScratch = FeatureDetection.supportsTypedArrays() ? new Float32Array(2 * 64) : undefined;

    function reprojectToGeographic(imageryLayer, context, texture, rectangle) {
        // This function has gone through a number of iterations, because GPUs are awesome.
        //
        // Originally, we had a very simple vertex shader and computed the Web Mercator texture coordinates
        // per-fragment in the fragment shader.  That worked well, except on mobile devices, because
        // fragment shaders have limited precision on many mobile devices.  The result was smearing artifacts
        // at medium zoom levels because different geographic texture coordinates would be reprojected to Web
        // Mercator as the same value.
        //
        // Our solution was to reproject to Web Mercator in the vertex shader instead of the fragment shader.
        // This required far more vertex data.  With fragment shader reprojection, we only needed a single quad.
        // But to achieve the same precision with vertex shader reprojection, we needed a vertex for each
        // output pixel.  So we used a grid of 256x256 vertices, because most of our imagery
        // tiles are 256x256.  Fortunately the grid could be created and uploaded to the GPU just once and
        // re-used for all reprojections, so the performance was virtually unchanged from our original fragment
        // shader approach.  See https://github.com/AnalyticalGraphicsInc/cesium/pull/714.
        //
        // Over a year later, we noticed (https://github.com/AnalyticalGraphicsInc/cesium/issues/2110)
        // that our reprojection code was creating a rare but severe artifact on some GPUs (Intel HD 4600
        // for one).  The problem was that the GLSL sin function on these GPUs had a discontinuity at fine scales in
        // a few places.
        //
        // We solved this by implementing a more reliable sin function based on the CORDIC algorithm
        // (https://github.com/AnalyticalGraphicsInc/cesium/pull/2111).  Even though this was a fair
        // amount of code to be executing per vertex, the performance seemed to be pretty good on most GPUs.
        // Unfortunately, on some GPUs, the performance was absolutely terrible
        // (https://github.com/AnalyticalGraphicsInc/cesium/issues/2258).
        //
        // So that brings us to our current solution, the one you see here.  Effectively, we compute the Web
        // Mercator texture coordinates on the CPU and store the T coordinate with each vertex (the S coordinate
        // is the same in Geographic and Web Mercator).  To make this faster, we reduced our reprojection mesh
        // to be only 2 vertices wide and 64 vertices high.  We should have reduced the width to 2 sooner,
        // because the extra vertices weren't buying us anything.  The height of 64 means we are technically
        // doing a slightly less accurate reprojection than we were before, but we can't see the difference
        // so it's worth the 4x speedup.

        var reproject = context.cache.imageryLayer_reproject;

        if (!defined(reproject)) {
            reproject = context.cache.imageryLayer_reproject = {
                framebuffer : undefined,
                vertexArray : undefined,
                shaderProgram : undefined,
                renderState : undefined,
                sampler : undefined,
                destroy : function() {
                    if (defined(this.framebuffer)) {
                        this.framebuffer.destroy();
                    }
                    if (defined(this.vertexArray)) {
                        this.vertexArray.destroy();
                    }
                    if (defined(this.shaderProgram)) {
                        this.shaderProgram.destroy();
                    }
                }
            };

            var positions = new Float32Array(2 * 64 * 2);
            var index = 0;
            for (var j = 0; j < 64; ++j) {
                var y = j / 63.0;
                positions[index++] = 0.0;
                positions[index++] = y;
                positions[index++] = 1.0;
                positions[index++] = y;
            }

            var reprojectAttributeIndices = {
                position : 0,
                webMercatorT : 1
            };

            var indices = TerrainProvider.getRegularGridIndices(2, 64);
            var indexBuffer = context.createIndexBuffer(indices, BufferUsage.STATIC_DRAW, IndexDatatype.UNSIGNED_SHORT);

            reproject.vertexArray = context.createVertexArray([
                {
                    index : reprojectAttributeIndices.position,
                    vertexBuffer : context.createVertexBuffer(positions, BufferUsage.STATIC_DRAW),
                    componentsPerAttribute : 2
                },
                {
                    index : reprojectAttributeIndices.webMercatorT,
                    vertexBuffer : context.createVertexBuffer(64 * 2 * 4, BufferUsage.STREAM_DRAW),
                    componentsPerAttribute : 1
                }
            ], indexBuffer);

            var vs = new ShaderSource({
                sources : [ReprojectWebMercatorVS]
            });

            reproject.shaderProgram = context.createShaderProgram(vs, ReprojectWebMercatorFS, reprojectAttributeIndices);

            reproject.sampler = context.createSampler({
                wrapS : TextureWrap.CLAMP_TO_EDGE,
                wrapT : TextureWrap.CLAMP_TO_EDGE,
                minificationFilter : TextureMinificationFilter.LINEAR,
                magnificationFilter : TextureMagnificationFilter.LINEAR
            });
        }

        texture.sampler = reproject.sampler;

        var width = texture.width;
        var height = texture.height;

        uniformMap.textureDimensions.x = width;
        uniformMap.textureDimensions.y = height;
        uniformMap.texture = texture;

        var sinLatitude = Math.sin(rectangle.south);
        var southMercatorY = 0.5 * Math.log((1 + sinLatitude) / (1 - sinLatitude));

        sinLatitude = Math.sin(rectangle.north);
        var northMercatorY = 0.5 * Math.log((1 + sinLatitude) / (1 - sinLatitude));
        var oneOverMercatorHeight = 1.0 / (northMercatorY - southMercatorY);

        var outputTexture = context.createTexture2D({
            width : width,
            height : height,
            pixelFormat : texture.pixelFormat,
            pixelDatatype : texture.pixelDatatype,
            preMultiplyAlpha : texture.preMultiplyAlpha
        });

        // Allocate memory for the mipmaps.  Failure to do this before rendering
        // to the texture via the FBO, and calling generateMipmap later,
        // will result in the texture appearing blank.  I can't pretend to
        // understand exactly why this is.
        if (CesiumMath.isPowerOfTwo(width) && CesiumMath.isPowerOfTwo(height)) {
            outputTexture.generateMipmap(MipmapHint.NICEST);
        }

        if (defined(reproject.framebuffer)) {
            reproject.framebuffer.destroy();
        }

        reproject.framebuffer = context.createFramebuffer({
            colorTextures : [outputTexture]
        });
        reproject.framebuffer.destroyAttachments = false;

        var south = rectangle.south;
        var north = rectangle.north;

        var webMercatorT = float32ArrayScratch;

        var outputIndex = 0;
        for (var webMercatorTIndex = 0; webMercatorTIndex < 64; ++webMercatorTIndex) {
            var fraction = webMercatorTIndex / 63.0;
            var latitude = CesiumMath.lerp(south, north, fraction);
            sinLatitude = Math.sin(latitude);
            var mercatorY = 0.5 * Math.log((1.0 + sinLatitude) / (1.0 - sinLatitude));
            var mercatorFraction = (mercatorY - southMercatorY) * oneOverMercatorHeight;
            webMercatorT[outputIndex++] = mercatorFraction;
            webMercatorT[outputIndex++] = mercatorFraction;
        }

        reproject.vertexArray.getAttribute(1).vertexBuffer.copyFromArrayView(webMercatorT);

        var command = new ClearCommand({
            color : Color.BLACK,
            framebuffer : reproject.framebuffer
        });
        command.execute(context);

        if ((!defined(reproject.renderState)) ||
                (reproject.renderState.viewport.width !== width) ||
                (reproject.renderState.viewport.height !== height)) {

            reproject.renderState = context.createRenderState({
                viewport : new BoundingRectangle(0, 0, width, height)
            });
        }

        var drawCommand = new DrawCommand({
            framebuffer : reproject.framebuffer,
            shaderProgram : reproject.shaderProgram,
            renderState : reproject.renderState,
            primitiveType : PrimitiveType.TRIANGLES,
            vertexArray : reproject.vertexArray,
            uniformMap : uniformMap
        });
        drawCommand.execute(context);

        return outputTexture;
    }

    /**
     * Gets the level with the specified world coordinate spacing between texels, or less.
     *
     * @param {Number} texelSpacing The texel spacing for which to find a corresponding level.
     * @param {Number} latitudeClosestToEquator The latitude closest to the equator that we're concerned with.
     * @returns {Number} The level with the specified texel spacing or less.
     */
    function getLevelWithMaximumTexelSpacing(layer, texelSpacing, latitudeClosestToEquator) {
        // PERFORMANCE_IDEA: factor out the stuff that doesn't change.
        var imageryProvider = layer._imageryProvider;
        var tilingScheme = imageryProvider.tilingScheme;
        var ellipsoid = tilingScheme.ellipsoid;
        var latitudeFactor = !(layer._imageryProvider.tilingScheme instanceof GeographicTilingScheme) ? Math.cos(latitudeClosestToEquator) : 1.0;
        var tilingSchemeRectangle = tilingScheme.rectangle;
        var levelZeroMaximumTexelSpacing = ellipsoid.maximumRadius * tilingSchemeRectangle.width * latitudeFactor / (imageryProvider.tileWidth * tilingScheme.getNumberOfXTilesAtLevel(0));

        var twoToTheLevelPower = levelZeroMaximumTexelSpacing / texelSpacing;
        var level = Math.log(twoToTheLevelPower) / Math.log(2);
        var rounded = Math.round(level);
        return rounded | 0;
    }

    return ImageryLayer;
});
