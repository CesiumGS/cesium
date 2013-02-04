/*global define*/
define([
        '../Core/defaultValue',
        '../Core/jsonp',
        '../Core/loadImage',
        '../Core/DeveloperError',
        '../Core/Cartesian2',
        '../Core/Extent',
        '../Core/Math',
        '../Renderer/MipmapHint',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        './ImageryProvider',
        './Projections',
        './TileState',
        './GeographicTilingScheme'
    ], function(
        defaultValue,
        jsonp,
        loadImage,
        DeveloperError,
        Cartesian2,
        Extent,
        CesiumMath,
        MipmapHint,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        ImageryProvider,
        Projections,
        TileState,
        GeographicTilingScheme) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias WideAreaMotionImageryProvider
     * @constructor
     *
     * @param {String} description.url The url of the WAMI image service.
     * @param {String} description.cid The Collection ID (CID).
     * @param {Extent} [description.extent=Extent.MAX_VALUE] The cartographic extent of this provider's imagery, with north, south, east and west properties in radians.
     * @param {Number} [description.maxLevel=18] The maximum level-of-detail that can be requested.
     * @param {Object} [description.proxy] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL.
     *
     * @exception {DeveloperError} <code>description.server</code> is required.
     *
     * @see SingleTileImageryProvider
     * @see ArcGisMapServerImageryProvider
     * @see OpenStreetMapTileProvider
     * @see CompositeTileProvider
     *
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     */
    var WideAreaMotionImageryProvider = function(description) {
        description = defaultValue(description, {});

        if (typeof description.url === 'undefined') {
            throw new DeveloperError('description.url is required.');
        }
        if (typeof description.cid === 'undefined') {
            throw new DeveloperError('description.cid is required.');
        }

        /**
         * The url of the WAMI image service.
         * @type {String}
         */
        this.url = description.url;

        /**
         * The Collection ID (CID).
         * @type {String}
         */
        this.cid = description.cid;

        this._proxy = description.proxy;

        /**
         * The cartographic extent of this provider's imagery,
         * with north, south, east and west properties in radians.
         *
         * @type {Extent}
         */
        this.extent = defaultValue(description.extent, Extent.MAX_VALUE);
        this.currentExtent = this.extent;
        this.nextExtent = this.extent;

        /**
         * The maximum level-of-detail that can be requested.
         *
         * @type {Number}
         */
        this.maxLevel = 0;

        /**
         * The map projection of the image.
         *
         * @type {Enumeration}
         * @see Projections
         */
        this.projection = Projections.WGS84;

        /**
         * The tiling scheme used by this provider.
         *
         * @type {TilingScheme}
         * @see WebMercatorTilingScheme
         * @see GeographicTilingScheme
         */
        this._tilingScheme = new GeographicTilingScheme({
            numberOfLevelZeroTilesX : 1,
            numberOfLevelZeroTilesY : 1
        });
        this._tilingScheme.extent = this.extent;

        var ellipsoid = this._tilingScheme.getEllipsoid();
        this._tilingScheme.levelZeroMaximumGeometricError = ellipsoid.getRadii().x * (this.extent.east - this.extent.west) / 1024;

        this._currentTime = undefined;
        this._nextTime = undefined;
        this._replacingImage = false;

        /**
         * True if the provider is ready for use; otherwise, false.
         *
         * @type {Boolean}
         */
        this._ready = true;

        this._tileUrl = this.url + '?';
        this._tileUrl += '&CID=' + this.cid;
        this._tileUrl += '&Request=GetMap&Service=IS&Version=1.0.1&Transparent=TRUE&BGCOLOR=0xFFFFFFFF&CRS=EPSG:4326&Options.jpeg_quality=70&Format=image/png&Exceptions=IMAGE&Width=1024&Height=1024';
    };

    /**
     * Gets a value indicating whether or not the provider is ready for use.
     *
     * @returns {Boolean} True if the provider is ready to use; otherwise, false.
     */
    WideAreaMotionImageryProvider.prototype.isReady = function() {
        return this._ready;
    };

    /**
     * Gets the tiling scheme used by this provider.
     *
     * @returns {TilingScheme} The tiling scheme.
     * @see WebMercatorTilingScheme
     * @see GeographicTilingScheme
     */
    WideAreaMotionImageryProvider.prototype.getTilingScheme = function() {
        return this._tilingScheme;
    };

    /**
     * Gets the extent, in radians, of the imagery provided by this instance.
     *
     * @returns {Extent} The extent.
     */
    WideAreaMotionImageryProvider.prototype.getExtent = function() {
        return this.extent;
    };

    /**
     * Gets the width of each tile, in pixels.
     *
     * @returns {Number} The width.
     */
    WideAreaMotionImageryProvider.prototype.getTileWidth = function() {
        return 1024;
    };

    /**
     * Gets the height of each tile, in pixels.
     *
     * @returns {Number} The height.
     */
    WideAreaMotionImageryProvider.prototype.getTileHeight = function() {
        return 1024;
    };

    /**
     * Gets the maximum level-of-detail that can be requested.
     *
     * @returns {Number} The maximum level.
     */
    WideAreaMotionImageryProvider.prototype.getMaximumLevel = function() {
        return this.maxLevel;
    };

    WideAreaMotionImageryProvider.prototype.update = function(context, sceneState, tilesToRenderByTextureCount) {
        if (this._replacingImage) {
            return;
        }

        if (typeof this._nextTime === 'undefined') {
            return;
        }

        if (tilesToRenderByTextureCount.length === 0) {
            return;
        }

        var tileExtent;
        var extent;
        var texture;

        for (var tileSetIndex = 0, tileSetLength = tilesToRenderByTextureCount.length; tileSetIndex < tileSetLength; ++tileSetIndex) {
            var tileSet = tilesToRenderByTextureCount[tileSetIndex];
            if (typeof tileSet === 'undefined' || tileSet.length === 0) {
                continue;
            }

            for (var i = 0, len = tileSet.length; i < len; i++) {
                var tile = tileSet[i];
                tileExtent = tile.extent;

                for (var imageryIndex = 0; imageryIndex < tile.imagery.length; ++imageryIndex) {
                    if (tile.imagery[imageryIndex].imagery.imageryLayer._imageryProvider === this) {
                        texture = tile.imagery[imageryIndex].imagery.texture;
                    }
                }

                if (typeof extent === 'undefined') {
                    extent = new Extent(tileExtent.west, tileExtent.south, tileExtent.east, tileExtent.north);
                } else {
                    extent = extent.unionWith(tileExtent);
                }
            }
        }

        if (typeof texture === 'undefined') {
            return;
        }

        this.nextExtent = extent.intersectWith(this.extent);

        if ((typeof this._currentTime !== 'undefined' && this._nextTime.equals(this._currentTime)) &&
            Extent.equals(this.nextExtent, this.currentExtent)) {

            return;
        }

        var that = this;
        this._replacingImage = true;
        this.requestImage(0, 0, 0).then(function(image) {
            texture.copyFrom(image);
            texture.generateMipmap(MipmapHint.NICEST);
            that._replacingImage = false;
            that.currentExtent = that.nextExtent;
            that._currentTime = that._nextTime;
        }, function() {
            that._replacingImage = false;
        });
    };

    /**
     * Build a URL to retrieve the image for a tile.
     *
     * @param {Number} x The x coordinate of the tile.
     * @param {Number} y The y coordinate of the tile.
     * @param {Number} level The level-of-detail of the tile.
     *
     * @return {String|Promise} Either a string containing the URL, or a Promise for a string
     *                          if the URL needs to be built asynchronously.
     */
    WideAreaMotionImageryProvider.prototype.buildImageUrl = function(x, y, level) {
        var imageUrl = this._tileUrl;

        if (typeof this._proxy !== 'undefined') {
            imageUrl = this._proxy.getURL(imageUrl);
        }

        return imageUrl;
    };

    /**
     * Requests the image for a given tile.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     *
     * @return {Promise} A promise for the image that will resolve when the image is available, or
     *         undefined if there are too many active requests to the server, and the request
     *         should be retried later.  If the resulting image is not suitable for display,
     *         the promise can resolve to undefined.  The resolved image may be either an
     *         Image or a Canvas DOM object.
     */
    WideAreaMotionImageryProvider.prototype.requestImage = function(x, y, level) {
        var imageUrl = this._tileUrl;

        if (typeof this._nextTime === 'undefined') {
            imageUrl += '&TIME=F1';
        } else {
            imageUrl += '&TIME=' + this._nextTime.toDate().toISOString();
        }

        imageUrl += '&BBOX=' +
            CesiumMath.toDegrees(this.nextExtent.west) + "," +
            CesiumMath.toDegrees(this.nextExtent.south) + "," +
            CesiumMath.toDegrees(this.nextExtent.east) + "," +
            CesiumMath.toDegrees(this.nextExtent.north);

        if (typeof this._proxy !== 'undefined') {
            imageUrl = this._proxy.getURL(imageUrl);
        }

        return ImageryProvider.loadImage(imageUrl);
    };

    WideAreaMotionImageryProvider.prototype.setTime = function(time) {
        this._nextTime = time;
    };

    return WideAreaMotionImageryProvider;
});