/*global define*/
define([
        '../Core/defaultValue',
        '../Core/jsonp',
        '../Core/loadImage',
        '../Core/DeveloperError',
        '../Core/Cartesian2',
        '../Core/Extent',
        '../Core/Math',
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
        this.tilingScheme = new GeographicTilingScheme({
            numberOfLevelZeroTilesX : 1,
            numberOfLevelZeroTilesY : 1
        });
        this.tilingScheme.extent = this.extent;

        var ellipsoid = this.tilingScheme.ellipsoid;
        this.tilingScheme.levelZeroMaximumGeometricError = ellipsoid.getRadii().x * (this.extent.east - this.extent.west) / 1024;

        this._currentTime = undefined;
        this._nextTime = undefined;
        this._replacingImage = false;

        /**
         * True if the provider is ready for use; otherwise, false.
         *
         * @type {Boolean}
         */
        this.ready = true;

        this._tileUrl = this.url + '?';
        this._tileUrl += 'SERVICE=IS&VERSION=1.0.0&REQUEST=GetMap&CRS=EPSG:4326';
        this._tileUrl += '&WIDTH=' + 1024 + '&HEIGHT=' + 1024;
        this._tileUrl += '&CID=' + this.cid;
        this._tileUrl += '&TRANSPARENT=TRUE&BGCOLOR=0xFFFFFF&FORMAT=image/png';
    };

    WideAreaMotionImageryProvider.prototype.update = function(context, sceneState, tiles) {
        if (this._replacingImage) {
            return;
        }

        if (typeof this._texture === 'undefined') {
            return;
        }

        if (typeof this._nextTime === 'undefined') {
            return;
        }

        if (tiles.length === 0) {
            return;
        }

        var tileExtent = tiles[0].extent;
        var extent = new Extent(tileExtent.west, tileExtent.south, tileExtent.east, tileExtent.north);
        for (var i = 1, len = tiles.length; i < len; ++i) {
            tileExtent = tiles[i].extent;
            extent = extent.unionWith(tileExtent);
        }
        this.nextExtent = extent.intersectWith(this.extent);

        if ((typeof this._currentTime !== 'undefined' && this._nextTime.equals(this._currentTime)) &&
            Extent.equals(this.nextExtent, this.currentExtent)) {

            return;
        }

        var that = this;
        this._replacingImage = true;
        this.requestImage().then(function(image) {
            that._texture.copyFrom(image);
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
     * Request the image for a given tile.
     *
     * @param {String} url The tile image URL.
     *
     * @return A promise for the image that will resolve when the image is available.
     *         If the image is not suitable for display, the promise can resolve to undefined.
     */
    WideAreaMotionImageryProvider.prototype.requestImage = function(url) {
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

        return loadImage(imageUrl);
    };

    /**
     * Transform the tile imagery from the format requested from the remote server
     * into a format suitable for resource creation.  Once complete, the tile imagery
     * state should be set to TRANSFORMED.  Alternatively, tile imagery state can be set to
     * RECEIVED to indicate that the transformation should be attempted again next update, if the tile
     * is still needed.
     *
     * @param {Context} context The context to use to create resources.
     * @param {TileImagery} tileImagery The tile imagery to transform.
     */
    WideAreaMotionImageryProvider.prototype.transformImagery = function(context, tileImagery) {
        tileImagery.transformedImage = tileImagery.image;
        tileImagery.image = undefined;
        tileImagery.state = TileState.TRANSFORMED;
    };

    /**
     * Create WebGL resources for the tile imagery using whatever data the transformImagery step produced.
     * Once complete, the tile imagery state should be set to READY.  Alternatively, tile imagery state can be set to
     * TRANSFORMED to indicate that resource creation should be attempted again next update, if the tile
     * is still needed.
     *
     * @param {Context} context The context to use to create resources.
     * @param {TileImagery} tileImagery The tile imagery to create resources for.
     * @param {TexturePool} texturePool A texture pool to use to create textures.
     */
    WideAreaMotionImageryProvider.prototype.createResources = function(context, tileImagery, texturePool) {
        if (typeof this._texture === 'undefined') {
            var texture = texturePool.createTexture2D(context, {
                source : tileImagery.transformedImage
            });

            texture.setSampler({
                wrapS : TextureWrap.CLAMP,
                wrapT : TextureWrap.CLAMP,
                minificationFilter : TextureMinificationFilter.LINEAR,
                magnificationFilter : TextureMagnificationFilter.LINEAR,

                // TODO: Remove Chrome work around
                maximumAnisotropy : context.getMaximumTextureFilterAnisotropy() || 8
            });

            this._texture = texture;
        }

        tileImagery.texture = this._texture;
        tileImagery.transformedImage = undefined;
        tileImagery.state = TileState.READY;
    };

    WideAreaMotionImageryProvider.prototype.setTime = function(time) {
        this._nextTime = time;
    };

    return WideAreaMotionImageryProvider;
});