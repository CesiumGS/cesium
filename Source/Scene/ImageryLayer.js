/*global define*/
define([
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/BoundingRectangle',
        '../Core/ComponentDatatype',
        '../Core/Cartesian2',
        '../Core/Cartesian4',
        '../Core/Color',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/Extent',
        '../Core/Math',
        '../Core/PrimitiveType',
        '../Renderer/BufferUsage',
        '../Renderer/MipmapHint',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        '../Renderer/ClearCommand',
        './GeographicTilingScheme',
        './Imagery',
        './TileProviderError',
        './ImageryState',
        './TileImagery',
        './TexturePool',
        '../ThirdParty/when',
        '../Shaders/ReprojectWebMercatorFS',
        '../Shaders/ReprojectWebMercatorVS'
    ], function(
        defaultValue,
        destroyObject,
        BoundingRectangle,
        ComponentDatatype,
        Cartesian2,
        Cartesian4,
        Color,
        DeveloperError,
        Event,
        Extent,
        CesiumMath,
        PrimitiveType,
        BufferUsage,
        MipmapHint,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        ClearCommand,
        GeographicTilingScheme,
        Imagery,
        TileProviderError,
        ImageryState,
        TileImagery,
        TexturePool,
        when,
        ReprojectWebMercatorFS,
        ReprojectWebMercatorVS) {
    "use strict";

    /**
     * An imagery layer that displays tiled image data from a single imagery provider
     * on a {@link CentralBody}.
     *
     * @alias ImageryLayer
     * @constructor
     *
     * @param {ImageryProvider} imageryProvider The imagery provider to use.
     * @param {Extent} [description.extent=imageryProvider.extent] The extent of the layer.  This extent
     *        can limit the visible portion of the imagery provider.
     * @param {Number|Function} [description.alpha=1.0] The alpha blending value of this layer, from 0.0 to 1.0.
     *                          This can either be a simple number or a function with the signature
     *                          <code>function(frameState, layer, x, y, level)</code>.  The function is passed the
     *                          current {@link FrameState}, this layer, and the x, y, and level coordinates of the
     *                          imagery tile for which the alpha is required, and it is expected to return
     *                          the alpha value to use for the tile.
     * @param {Number|Function} [description.brightness=1.0] The brightness of this layer.  1.0 uses the unmodified imagery
     *                          color.  Less than 1.0 makes the imagery darker while greater than 1.0 makes it brighter.
     *                          This can either be a simple number or a function with the signature
     *                          <code>function(frameState, layer, x, y, level)</code>.  The function is passed the
     *                          current {@link FrameState}, this layer, and the x, y, and level coordinates of the
     *                          imagery tile for which the brightness is required, and it is expected to return
     *                          the brightness value to use for the tile.  The function is executed for every
     *                          frame and for every tile, so it must be fast.
     * @param {Number|Function} [description.contrast=1.0] The contrast of this layer.  1.0 uses the unmodified imagery color.
     *                          Less than 1.0 reduces the contrast while greater than 1.0 increases it.
     *                          This can either be a simple number or a function with the signature
     *                          <code>function(frameState, layer, x, y, level)</code>.  The function is passed the
     *                          current {@link FrameState}, this layer, and the x, y, and level coordinates of the
     *                          imagery tile for which the contrast is required, and it is expected to return
     *                          the contrast value to use for the tile.  The function is executed for every
     *                          frame and for every tile, so it must be fast.
     * @param {Number|Function} [description.hue=0.0] The hue of this layer.  0.0 uses the unmodified imagery color.
     *                          This can either be a simple number or a function with the signature
     *                          <code>function(frameState, layer, x, y, level)</code>.  The function is passed the
     *                          current {@link FrameState}, this layer, and the x, y, and level coordinates
     *                          of the imagery tile for which the hue is required, and it is expected to return
     *                          the contrast value to use for the tile.  The function is executed for every
     *                          frame and for every tile, so it must be fast.
     * @param {Number|Function} [description.saturation=1.0] The saturation of this layer.  1.0 uses the unmodified imagery color.
     *                          Less than 1.0 reduces the saturation while greater than 1.0 increases it.
     *                          This can either be a simple number or a function with the signature
     *                          <code>function(frameState, layer, x, y, level)</code>.  The function is passed the
     *                          current {@link FrameState}, this layer, and the x, y, and level coordinates
     *                          of the imagery tile for which the saturation is required, and it is expected to return
     *                          the contrast value to use for the tile.  The function is executed for every
     *                          frame and for every tile, so it must be fast.
     * @param {Number|Function} [description.gamma=1.0] The gamma correction to apply to this layer.  1.0 uses the unmodified imagery color.
     *                          This can either be a simple number or a function with the signature
     *                          <code>function(frameState, layer, x, y, level)</code>.  The function is passed the
     *                          current {@link FrameState}, this layer, and the x, y, and level coordinates of the
     *                          imagery tile for which the gamma is required, and it is expected to return
     *                          the gamma value to use for the tile.  The function is executed for every
     *                          frame and for every tile, so it must be fast.
     * @param {Boolean} [description.show=true] True if the layer is shown; otherwise, false.
     * @param {Number} [description.maximumAnisotropy=maximum supported] The maximum anisotropy level to use
     *        for texture filtering.  If this parameter is not specified, the maximum anisotropy supported
     *        by the WebGL stack will be used.  Larger values make the imagery look better in horizon
     *        views.
     */
    var ImageryLayer = function ImageryLayer(imageryProvider, description) {
        this._imageryProvider = imageryProvider;

        description = defaultValue(description, {});

        /**
         * The alpha blending value of this layer, usually from 0.0 to 1.0.
         * This can either be a simple number or a function with the signature
         * <code>function(frameState, layer, x, y, level)</code>.  The function is passed the
         * current {@link FrameState}, this layer, and the x, y, and level coordinates of the
         * imagery tile for which the alpha is required, and it is expected to return
         * the alpha value to use for the tile.  The function is executed for every
         * frame and for every tile, so it must be fast.
         *
         * @type {Number}
         */
        this.alpha = defaultValue(description.alpha, defaultValue(imageryProvider.defaultAlpha, 1.0));

        /**
         * The brightness of this layer.  1.0 uses the unmodified imagery color.  Less than 1.0
         * makes the imagery darker while greater than 1.0 makes it brighter.
         * This can either be a simple number or a function with the signature
         * <code>function(frameState, layer, x, y, level)</code>.  The function is passed the
         * current {@link FrameState}, this layer, and the x, y, and level coordinates of the
         * imagery tile for which the brightness is required, and it is expected to return
         * the brightness value to use for the tile.  The function is executed for every
         * frame and for every tile, so it must be fast.
         *
         * @type {Number}
         */
        this.brightness = defaultValue(description.brightness, defaultValue(imageryProvider.defaultBrightness, ImageryLayer.DEFAULT_BRIGHTNESS));

        /**
         * The contrast of this layer.  1.0 uses the unmodified imagery color.  Less than 1.0 reduces
         * the contrast while greater than 1.0 increases it.
         * This can either be a simple number or a function with the signature
         * <code>function(frameState, layer, x, y, level)</code>.  The function is passed the
         * current {@link FrameState}, this layer, and the x, y, and level coordinates of the
         * imagery tile for which the contrast is required, and it is expected to return
         * the contrast value to use for the tile.  The function is executed for every
         * frame and for every tile, so it must be fast.
         *
         * @type {Number}
         */
        this.contrast = defaultValue(description.contrast, defaultValue(imageryProvider.defaultContrast, ImageryLayer.DEFAULT_CONTRAST));

        /**
         * The hue of this layer in radians. 0.0 uses the unmodified imagery color. This can either be a
         * simple number or a function with the signature <code>function(frameState, layer, x, y, level)</code>.
         * The function is passed the current {@link FrameState}, this layer, and the x, y, and level
         * coordinates of the imagery tile for which the hue is required, and it is expected to return
         * the hue value to use for the tile.  The function is executed for every
         * frame and for every tile, so it must be fast.
         *
         * @type {Number}
         */
        this.hue = defaultValue(description.hue, defaultValue(imageryProvider.defaultHue, ImageryLayer.DEFAULT_HUE));

        /**
         * The saturation of this layer. 1.0 uses the unmodified imagery color. Less than 1.0 reduces the
         * saturation while greater than 1.0 increases it. This can either be a simple number or a function
         * with the signature <code>function(frameState, layer, x, y, level)</code>.  The function is passed the
         * current {@link FrameState}, this layer, and the x, y, and level coordinates of the
         * imagery tile for which the saturation is required, and it is expected to return
         * the saturation value to use for the tile.  The function is executed for every
         * frame and for every tile, so it must be fast.
         *
         * @type {Number}
         */
        this.saturation = defaultValue(description.saturation, defaultValue(imageryProvider.defaultSaturation, ImageryLayer.DEFAULT_SATURATION));

        /**
         * The gamma correction to apply to this layer.  1.0 uses the unmodified imagery color.
         * This can either be a simple number or a function with the signature
         * <code>function(frameState, layer, x, y, level)</code>.  The function is passed the
         * current {@link FrameState}, this layer, and the x, y, and level coordinates of the
         * imagery tile for which the gamma is required, and it is expected to return
         * the gamma value to use for the tile.  The function is executed for every
         * frame and for every tile, so it must be fast.
         *
         * @type {Number}
         */
        this.gamma = defaultValue(description.gamma, defaultValue(imageryProvider.defaultGamma, ImageryLayer.DEFAULT_GAMMA));

        /**
         * Determines if this layer is shown.
         *
         * @type {Boolean}
         */
        this.show = defaultValue(description.show, true);

        this._extent = defaultValue(description.extent, Extent.MAX_VALUE);
        this._maximumAnisotropy = description.maximumAnisotropy;

        this._imageryCache = {};
        this._texturePool = new TexturePool();

        this._skeletonPlaceholder = new TileImagery(Imagery.createPlaceholder(this));

        // The value of the show property on the last update.
        this._show = false;

        // The index of this layer in the ImageryLayerCollection.
        this._layerIndex = -1;

        // true if this is the base (lowest shown) layer.
        this._isBaseLayer = false;

        this._requestImageError = undefined;
    };

    /**
     * This value is used as the default brightness for the imagery layer if one is not provided during construction
     * or by the imagery provider. This value does not modify the brightness of the imagery.
     * @type {number}
     */
    ImageryLayer.DEFAULT_BRIGHTNESS = 1.0;
    /**
     * This value is used as the default contrast for the imagery layer if one is not provided during construction
     * or by the imagery provider. This value does not modify the contrast of the imagery.
     * @type {number}
     */
    ImageryLayer.DEFAULT_CONTRAST = 1.0;
    /**
     * This value is used as the default hue for the imagery layer if one is not provided during construction
     * or by the imagery provider. This value does not modify the hue of the imagery.
     * @type {number}
     */
    ImageryLayer.DEFAULT_HUE = 0.0;
    /**
     * This value is used as the default saturation for the imagery layer if one is not provided during construction
     * or by the imagery provider. This value does not modify the saturation of the imagery.
     * @type {number}
     */
    ImageryLayer.DEFAULT_SATURATION = 1.0;
    /**
     * This value is used as the default gamma for the imagery layer if one is not provided during construction
     * or by the imagery provider. This value does not modify the gamma of the imagery.
     * @type {number}
     */
    ImageryLayer.DEFAULT_GAMMA = 1.0;

    /**
     * Gets the imagery provider for this layer.
     *
     * @memberof ImageryLayer
     *
     * @returns {ImageryProvider} The imagery provider.
     */
    ImageryLayer.prototype.getImageryProvider = function() {
        return this._imageryProvider;
    };

    /**
     * Gets the extent of this layer.  If this extent is smaller than the extent of the
     * {@link ImageryProvider}, only a portion of the imagery provider is shown.
     *
     * @memberof ImageryLayer
     *
     * @returns {Extent} The extent.
     */
    ImageryLayer.prototype.getExtent = function() {
        return this._extent;
    };

    /**
     * Gets a value indicating whether this layer is the base layer in the
     * {@link ImageryLayerCollection}.  The base layer is the one that underlies all
     * others.  It is special in that it is treated as if it has global extent, even if
     * it actually does not, by stretching the texels at the edges over the entire
     * globe.
     *
     * @memberof ImageryLayer
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
     * @memberof ImageryLayer
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
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
     * @memberof ImageryLayer
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see ImageryLayer#isDestroyed
     *
     * @example
     * imageryLayer = imageryLayer && imageryLayer.destroy();
     */
    ImageryLayer.prototype.destroy = function() {
        this._texturePool = this._texturePool && this._texturePool.destroy();

        return destroyObject(this);
    };

    /**
     * Create skeletons for the imagery tiles that partially or completely overlap a given terrain
     * tile.
     *
     * @memberof ImageryLayer
     * @private
     *
     * @param {Tile} tile The terrain tile.
     * @param {TerrainProvider} terrainProvider The terrain provider associated with the terrain tile.
     * @param {Number} insertionPoint The position to insert new skeletons before in the tile's imagery lsit.
     * @returns {Boolean} true if this layer overlaps any portion of the terrain tile; otherwise, false.
     */
    ImageryLayer.prototype._createTileImagerySkeletons = function(tile, terrainProvider, insertionPoint) {
        var imageryProvider = this._imageryProvider;

        if (typeof insertionPoint === 'undefined') {
            insertionPoint = tile.imagery.length;
        }

        if (!imageryProvider.isReady()) {
            // The imagery provider is not ready, so we can't create skeletons, yet.
            // Instead, add a placeholder so that we'll know to create
            // the skeletons once the provider is ready.
            this._skeletonPlaceholder.imagery.addReference();
            tile.imagery.splice(insertionPoint, 0, this._skeletonPlaceholder);
            return true;
        }

        // Compute the extent of the imagery from this imageryProvider that overlaps
        // the geometry tile.  The ImageryProvider and ImageryLayer both have the
        // opportunity to constrain the extent.  The imagery TilingScheme's extent
        // always fully contains the ImageryProvider's extent.
        var extent = tile.extent.intersectWith(imageryProvider.getExtent());
        extent = extent.intersectWith(this._extent);

        if (extent.east <= extent.west || extent.north <= extent.south) {
            // There is no overlap between this terrain tile and this imagery
            // provider.  Unless this is the base layer, no skeletons need to be created.
            // We stretch texels at the edge of the base layer over the entire globe.
            if (!this.isBaseLayer()) {
                return false;
            }

            var baseImageryExtent = imageryProvider.getExtent().intersectWith(this._extent);
            var baseTerrainExtent = tile.extent;

            if (baseTerrainExtent.south >= baseImageryExtent.north) {
                extent.north = extent.south = baseImageryExtent.north;
            } else if (baseTerrainExtent.north <= baseImageryExtent.south) {
                extent.north = extent.south = baseImageryExtent.south;
            }

            if (baseTerrainExtent.west >= baseImageryExtent.east) {
                extent.west = extent.east = baseImageryExtent.east;
            } else if (baseTerrainExtent.east <= baseImageryExtent.west) {
                extent.west = extent.east = baseImageryExtent.west;
            }
        }

        var latitudeClosestToEquator = 0.0;
        if (extent.south > 0.0) {
            latitudeClosestToEquator = extent.south;
        } else if (extent.north < 0.0) {
            latitudeClosestToEquator = extent.north;
        }

        // Compute the required level in the imagery tiling scheme.
        // The errorRatio should really be imagerySSE / terrainSSE rather than this hard-coded value.
        // But first we need configurable imagery SSE and we need the rendering to be able to handle more
        // images attached to a terrain tile than there are available texture units.  So that's for the future.
        var errorRatio = 1.0;
        var targetGeometricError = errorRatio * terrainProvider.getLevelMaximumGeometricError(tile.level);
        var imageryLevel = getLevelWithMaximumTexelSpacing(this, targetGeometricError, latitudeClosestToEquator);
        imageryLevel = Math.max(0, imageryLevel);
        var maximumLevel = imageryProvider.getMaximumLevel();
        if (imageryLevel > maximumLevel) {
            imageryLevel = maximumLevel;
        }

        var imageryTilingScheme = imageryProvider.getTilingScheme();
        var northwestTileCoordinates = imageryTilingScheme.positionToTileXY(extent.getNorthwest(), imageryLevel);
        var southeastTileCoordinates = imageryTilingScheme.positionToTileXY(extent.getSoutheast(), imageryLevel);

        // If the southeast corner of the extent lies very close to the north or west side
        // of the southeast tile, we don't actually need the southernmost or easternmost
        // tiles.
        // Similarly, if the northwest corner of the extent lies very close to the south or east side
        // of the northwest tile, we don't actually need the northernmost or westernmost tiles.

        // We define "very close" as being within 1/512 of the width of the tile.
        var veryCloseX = (tile.extent.north - tile.extent.south) / 512.0;
        var veryCloseY = (tile.extent.east - tile.extent.west) / 512.0;

        var northwestTileExtent = imageryTilingScheme.tileXYToExtent(northwestTileCoordinates.x, northwestTileCoordinates.y, imageryLevel);
        if (Math.abs(northwestTileExtent.south - extent.north) < veryCloseY && northwestTileCoordinates.y < southeastTileCoordinates.y) {
            ++northwestTileCoordinates.y;
        }
        if (Math.abs(northwestTileExtent.east - extent.west) < veryCloseX && northwestTileCoordinates.x < southeastTileCoordinates.x) {
            ++northwestTileCoordinates.x;
        }

        var southeastTileExtent = imageryTilingScheme.tileXYToExtent(southeastTileCoordinates.x, southeastTileCoordinates.y, imageryLevel);
        if (Math.abs(southeastTileExtent.north - extent.south) < veryCloseY && southeastTileCoordinates.y > northwestTileCoordinates.y) {
            --southeastTileCoordinates.y;
        }
        if (Math.abs(southeastTileExtent.west - extent.east) < veryCloseX && southeastTileCoordinates.x > northwestTileCoordinates.x) {
            --southeastTileCoordinates.x;
        }

        var imageryMaxX = imageryTilingScheme.getNumberOfXTilesAtLevel(imageryLevel);
        var imageryMaxY = imageryTilingScheme.getNumberOfYTilesAtLevel(imageryLevel);

        // Create TileImagery instances for each imagery tile overlapping this terrain tile.
        // We need to do all texture coordinate computations in the imagery tile's tiling scheme.

        var terrainExtent = tile.extent;
        var imageryExtent = imageryTilingScheme.tileXYToExtent(northwestTileCoordinates.x, northwestTileCoordinates.y, imageryLevel);

        var minU;
        var maxU = 0.0;

        var minV = 1.0;
        var maxV;

        // If this is the northern-most or western-most tile in the imagery tiling scheme,
        // it may not start at the northern or western edge of the terrain tile.
        // Calculate where it does start.
        if (!this.isBaseLayer() && northwestTileCoordinates.x === 0) {
            maxU = Math.min(1.0, (imageryExtent.west - terrainExtent.west) / (terrainExtent.east - terrainExtent.west));
        }

        if (!this.isBaseLayer() && northwestTileCoordinates.y === 0) {
            minV = Math.max(0.0, (imageryExtent.north - terrainExtent.south) / (terrainExtent.north - terrainExtent.south));
        }

        var initialMinV = minV;

        for ( var i = northwestTileCoordinates.x; i <= southeastTileCoordinates.x; i++) {
            minU = maxU;

            imageryExtent = imageryTilingScheme.tileXYToExtent(i, northwestTileCoordinates.y, imageryLevel);
            maxU = Math.min(1.0, (imageryExtent.east - terrainExtent.west) / (terrainExtent.east - terrainExtent.west));

            // If this is the eastern-most imagery tile mapped to this terrain tile,
            // and there are more imagery tiles to the east of this one, the maxU
            // should be 1.0 to make sure rounding errors don't make the last
            // image fall shy of the edge of the terrain tile.
            if (i === southeastTileCoordinates.x && (this.isBaseLayer() || i < imageryMaxX - 1)) {
                maxU = 1.0;
            }

            minV = initialMinV;

            for ( var j = northwestTileCoordinates.y; j <= southeastTileCoordinates.y; j++) {
                maxV = minV;

                imageryExtent = imageryTilingScheme.tileXYToExtent(i, j, imageryLevel);
                minV = Math.max(0.0, (imageryExtent.south - terrainExtent.south) / (terrainExtent.north - terrainExtent.south));

                // If this is the southern-most imagery tile mapped to this terrain tile,
                // and there are more imagery tiles to the south of this one, the minV
                // should be 0.0 to make sure rounding errors don't make the last
                // image fall shy of the edge of the terrain tile.
                if (j === southeastTileCoordinates.y && (this.isBaseLayer() || j < imageryMaxY - 1)) {
                    minV = 0.0;
                }

                var texCoordsExtent = new Cartesian4(minU, minV, maxU, maxV);
                var imagery = this.getImageryFromCache(i, j, imageryLevel, imageryExtent);
                tile.imagery.splice(insertionPoint, 0, new TileImagery(imagery, texCoordsExtent));
                ++insertionPoint;
            }
        }

        return true;
    };

    /**
     * Calculate the translation and scale for a particular {@link TileImagery} attached to a
     * particular terrain {@link Tile}.
     *
     * @memberof ImageryLayer
     * @private
     *
     * @param {Tile} tile The terrain tile.
     * @param {TileImagery} tileImagery The imagery tile mapping.
     * @returns {Cartesian4} The translation and scale where X and Y are the translation and Z and W
     *          are the scale.
     */
    ImageryLayer.prototype._calculateTextureTranslationAndScale = function(tile, tileImagery) {
        var imageryExtent = tileImagery.imagery.extent;
        var terrainExtent = tile.extent;
        var terrainWidth = terrainExtent.east - terrainExtent.west;
        var terrainHeight = terrainExtent.north - terrainExtent.south;

        var scaleX = terrainWidth / (imageryExtent.east - imageryExtent.west);
        var scaleY = terrainHeight / (imageryExtent.north - imageryExtent.south);
        return new Cartesian4(
                scaleX * (terrainExtent.west - imageryExtent.west) / terrainWidth,
                scaleY * (terrainExtent.south - imageryExtent.south) / terrainHeight,
                scaleX,
                scaleY);
    };

    /**
     * Request a particular piece of imagery from the imagery provider.  This method handles raising an
     * error event if the request fails, and retrying the request if necessary.
     *
     * @memberof ImageryLayer
     * @private
     *
     * @param {Imagery} imagery The imagery to request.
     */
    ImageryLayer.prototype._requestImagery = function(imagery) {
        var imageryProvider = this._imageryProvider;

        var that = this;

        function success(image) {
            if (typeof image === 'undefined') {
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
                    imageryProvider.getErrorEvent(),
                    message,
                    imagery.x, imagery.y, imagery.level,
                    doRequest);
        }

        function doRequest() {
            imagery.state = ImageryState.TRANSITIONING;
            var imagePromise = imageryProvider.requestImage(imagery.x, imagery.y, imagery.level);

            if (typeof imagePromise === 'undefined') {
                // Too many parallel requests, so postpone loading tile.
                imagery.state = ImageryState.UNLOADED;
                return;
            }

            when(imagePromise, success, failure);
        }

        doRequest();
    };

    /**
     * Create a WebGL texture for a given {@link Imagery} instance.
     *
     *  @memberof ImageryLayer
     *  @private
     *
     *  @param {Context} context The rendered context to use to create textures.
     *  @param {Imagery} imagery The imagery for which to create a texture.
     */
    ImageryLayer.prototype._createTexture = function(context, imagery) {
        var imageryProvider = this._imageryProvider;

        // If this imagery provider has a discard policy, use it to check if this
        // image should be discarded.
        if (typeof imageryProvider.getTileDiscardPolicy !== 'undefined') {
            var discardPolicy = imageryProvider.getTileDiscardPolicy();
            if (typeof discardPolicy !== 'undefined') {
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
        var texture = this._texturePool.createTexture2D(context, {
            source : imagery.image
        });

        imagery.texture = texture;
        imagery.image = undefined;
        imagery.state = ImageryState.TEXTURE_LOADED;
    };

    /**
     * Reproject a texture to a {@link GeographicProjection}, if necessary, and generate
     * mipmaps for the geographic texture.
     *
     * @memberof ImageryLayer
     * @private
     *
     * @param {Context} context The rendered context to use.
     * @param {Imagery} imagery The imagery instance to reproject.
     */
    ImageryLayer.prototype._reprojectTexture = function(context, imagery) {
        var texture = imagery.texture;
        var extent = imagery.extent;

        // Reproject this texture if it is not already in a geographic projection and
        // the pixels are more than 1e-5 radians apart.  The pixel spacing cutoff
        // avoids precision problems in the reprojection transformation while making
        // no noticeable difference in the georeferencing of the image.
        if (!(this._imageryProvider.getTilingScheme() instanceof GeographicTilingScheme) &&
            (extent.east - extent.west) / texture.getWidth() > 1e-5) {
                var reprojectedTexture = reprojectToGeographic(this, context, texture, imagery.extent);
                texture.destroy();
                imagery.texture = texture = reprojectedTexture;
        }

        // Use mipmaps if this texture has power-of-two dimensions.
        if (CesiumMath.isPowerOfTwo(texture.getWidth()) && CesiumMath.isPowerOfTwo(texture.getHeight())) {
            var mipmapSampler = context.cache.imageryLayer_mipmapSampler;
            if (typeof mipmapSampler === 'undefined') {
                var maximumSupportedAnisotropy = context.getMaximumTextureFilterAnisotropy();
                mipmapSampler = context.cache.imageryLayer_mipmapSampler = context.createSampler({
                    wrapS : TextureWrap.CLAMP,
                    wrapT : TextureWrap.CLAMP,
                    minificationFilter : TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
                    magnificationFilter : TextureMagnificationFilter.LINEAR,
                    maximumAnisotropy : Math.min(maximumSupportedAnisotropy, defaultValue(this._maximumAnisotropy, maximumSupportedAnisotropy))
                });
            }
            texture.generateMipmap(MipmapHint.NICEST);
            texture.setSampler(mipmapSampler);
        } else {
            var nonMipmapSampler = context.cache.imageryLayer_nonMipmapSampler;
            if (typeof nonMipmapSampler === 'undefined') {
                nonMipmapSampler = context.cache.imageryLayer_nonMipmapSampler = context.createSampler({
                    wrapS : TextureWrap.CLAMP,
                    wrapT : TextureWrap.CLAMP,
                    minificationFilter : TextureMinificationFilter.LINEAR,
                    magnificationFilter : TextureMagnificationFilter.LINEAR
                });
            }
            texture.setSampler(nonMipmapSampler);
        }

        imagery.state = ImageryState.READY;
    };

    ImageryLayer.prototype.getImageryFromCache = function(x, y, level, imageryExtent) {
        var cacheKey = getImageryCacheKey(x, y, level);
        var imagery = this._imageryCache[cacheKey];

        if (typeof imagery === 'undefined') {
            imagery = new Imagery(this, x, y, level, imageryExtent);
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
        u_northLatitude : function() {
            return this.northLatitude;
        },
        u_southLatitude : function() {
            return this.southLatitude;
        },
        u_southMercatorYLow : function() {
            return this.southMercatorYLow;
        },
        u_southMercatorYHigh : function() {
            return this.southMercatorYHigh;
        },
        u_oneOverMercatorHeight : function() {
            return this.oneOverMercatorHeight;
        },

        textureDimensions : new Cartesian2(),
        texture : undefined,
        northLatitude : 0,
        southLatitude : 0,
        southMercatorYHigh : 0,
        southMercatorYLow : 0,
        oneOverMercatorHeight : 0
    };

    var float32ArrayScratch = typeof Float32Array === 'undefined' ? undefined : new Float32Array(1);

    function reprojectToGeographic(imageryLayer, context, texture, extent) {
        var reproject = context.cache.imageryLayer_reproject;

        if (typeof reproject === 'undefined') {
            reproject = context.cache.imageryLayer_reproject = {
                    framebuffer : undefined,
                    vertexArray : undefined,
                    shaderProgram : undefined,
                    renderState : undefined,
                    sampler : undefined,
                    destroy : function() {
                        if (typeof this.framebuffer !== 'undefined') {
                            this.frameBuffer.destroy();
                        }
                        if (typeof this.vertexArray !== 'undefined') {
                            this.vertexArray.destroy();
                        }
                        if (typeof this.shaderProgram !== 'undefined') {
                            this.shaderProgram.destroy();
                        }
                    }
            };

            reproject.framebuffer = context.createFramebuffer();
            reproject.framebuffer.destroyAttachments = false;

            var reprojectMesh = {
                attributes : {
                    position : {
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 2,
                        values : [0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0]
                    }
                }
            };

            var reprojectAttribInds = {
                position : 0
            };

            reproject.vertexArray = context.createVertexArrayFromMesh({
                mesh : reprojectMesh,
                attributeIndices : reprojectAttribInds,
                bufferUsage : BufferUsage.STATIC_DRAW
            });

            reproject.shaderProgram = context.getShaderCache().getShaderProgram(
                ReprojectWebMercatorVS,
                ReprojectWebMercatorFS,
                reprojectAttribInds);

            reproject.renderState = context.createRenderState();

            var maximumSupportedAnisotropy = context.getMaximumTextureFilterAnisotropy();
            reproject.sampler = context.createSampler({
                wrapS : TextureWrap.CLAMP,
                wrapT : TextureWrap.CLAMP,
                minificationFilter : TextureMinificationFilter.LINEAR,
                magnificationFilter : TextureMagnificationFilter.LINEAR,
                maximumAnisotropy : Math.min(maximumSupportedAnisotropy, defaultValue(imageryLayer._maximumAnisotropy, maximumSupportedAnisotropy))
            });
        }

        texture.setSampler(reproject.sampler);

        var width = texture.getWidth();
        var height = texture.getHeight();

        uniformMap.textureDimensions.x = width;
        uniformMap.textureDimensions.y = height;
        uniformMap.texture = texture;

        uniformMap.northLatitude = extent.north;
        uniformMap.southLatitude = extent.south;

        var sinLatitude = Math.sin(extent.south);
        var southMercatorY = 0.5 * Math.log((1 + sinLatitude) / (1 - sinLatitude));

        float32ArrayScratch[0] = southMercatorY;
        uniformMap.southMercatorYHigh = float32ArrayScratch[0];
        uniformMap.southMercatorYLow = southMercatorY - float32ArrayScratch[0];

        sinLatitude = Math.sin(extent.north);
        var northMercatorY = 0.5 * Math.log((1 + sinLatitude) / (1 - sinLatitude));
        uniformMap.oneOverMercatorHeight = 1.0 / (northMercatorY - southMercatorY);

        var outputTexture = imageryLayer._texturePool.createTexture2D(context, {
            width : width,
            height : height,
            pixelFormat : texture.getPixelFormat(),
            pixelDatatype : texture.getPixelDatatype(),
            preMultiplyAlpha : texture.getPreMultiplyAlpha()
        });

        // Allocate memory for the mipmaps.  Failure to do this before rendering
        // to the texture via the FBO, and calling generateMipmap later,
        // will result in the texture appearing blank.  I can't pretend to
        // understand exactly why this is.
        outputTexture.generateMipmap(MipmapHint.NICEST);

        reproject.framebuffer.setColorTexture(outputTexture);

        context.clear(new ClearCommand(context.createClearState({
            color : Color.BLACK
        }), reproject.framebuffer));

        var renderState = reproject.renderState;
        var viewport = renderState.viewport;
        if (typeof viewport === 'undefined') {
            viewport = new BoundingRectangle();
            renderState.viewport = viewport;
        }
        viewport.width = width;
        viewport.height = height;

        context.draw({
            framebuffer : reproject.framebuffer,
            shaderProgram : reproject.shaderProgram,
            renderState : renderState,
            primitiveType : PrimitiveType.TRIANGLE_FAN,
            vertexArray : reproject.vertexArray,
            uniformMap : uniformMap
        });

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
        var tilingScheme = imageryProvider.getTilingScheme();
        var ellipsoid = tilingScheme.getEllipsoid();
        var latitudeFactor = Math.cos(latitudeClosestToEquator);
        var tilingSchemeExtent = tilingScheme.getExtent();
        var levelZeroMaximumTexelSpacing = ellipsoid.getMaximumRadius() * (tilingSchemeExtent.east - tilingSchemeExtent.west) * latitudeFactor / (imageryProvider.getTileWidth() * tilingScheme.getNumberOfXTilesAtLevel(0));

        var twoToTheLevelPower = levelZeroMaximumTexelSpacing / texelSpacing;
        var level = Math.log(twoToTheLevelPower) / Math.log(2);
        var rounded = Math.round(level);
        return rounded | 0;
    }

    return ImageryLayer;
});