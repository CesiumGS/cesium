/*global define*/
define([
        '../Core/defaultValue',
        '../Core/jsonp',
        '../Core/loadImage',
        '../Core/writeTextToCanvas',
        '../Core/DeveloperError',
        '../Core/Cartesian2',
        '../Core/Extent',
        '../Core/Math',
        './DiscardMissingTileImagePolicy',
        './ImageryProvider',
        './Projections',
        './TileState',
        './WebMercatorTilingScheme',
        './GeographicTilingScheme',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        jsonp,
        loadImage,
        writeTextToCanvas,
        DeveloperError,
        Cartesian2,
        Extent,
        CesiumMath,
        DiscardMissingTileImagePolicy,
        ImageryProvider,
        Projections,
        TileState,
        WebMercatorTilingScheme,
        GeographicTilingScheme,
        when) {
    "use strict";

    /**
     * Provides tiled imagery hosted by a WMS server.
     *
     * @alias WebMapServiceImageryProvider
     * @constructor
     *
     * @param {String} description.url The URL of the WMS service.
     * @param {String} description.layerName The name of the layer.
     * @param {Object} [description.proxy] A proxy to use for requests. This object is
     *        expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @exception {DeveloperError} <code>description.url</code> is required.
     *
     * @see SingleTileImageryProvider
     * @see BingMapsImageryProvider
     * @see OpenStreetMapTileProvider
     * @see CompositeTileProvider
     *
     * @see <a href='http://resources.esri.com/help/9.3/arcgisserver/apis/rest/'>ArcGIS Server REST API</a>
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     *
     * @example
     * var esri = new ArcGisMapServerImageryProvider({
     *     url: 'http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
     * });
     */
    var WebMapServiceImageryProvider = function(description) {
        description = defaultValue(description, {});

        if (typeof description.url === 'undefined') {
            throw new DeveloperError('description.url is required.');
        }

        if (typeof description.layerName === 'undefined') {
            throw new DeveloperError('description.layerName is required.');
        }

        /**
         * The URL of the WMS server.
         * @type {String}
         */
        this.url = description.url;

        /**
         * The name of the layer to access on the WMS server.
         * @type {String}
         */
        this.layerName = description.layerName;

        this._proxy = description.proxy;

        /**
         * The cartographic extent of this provider's imagery,
         * with north, south, east and west properties in radians.
         *
         * @type {Extent}
         */
        this.extent = undefined;

        /**
         * The width of every image loaded.
         *
         * @type {Number}
         */
        this.tileWidth = 256;

        /**
         * The height of every image loaded.
         *
         * @type {Number}
         */
        this.tileHeight = 256;

        /**
         * The maximum level-of-detail that can be requested.
         *
         * @type {Number}
         */
        this.maxLevel = undefined;

        /**
         * The map projection of the image.
         *
         * @type {Enumeration}
         * @see Projections
         */
        this.projection = undefined;

        /**
         * The tiling scheme used by this provider.
         *
         * @type {TilingScheme}
         * @see WebMercatorTilingScheme
         * @see GeographicTilingScheme
         */
        this.tilingScheme = undefined;

        /**
         * True if the provider is ready for use; otherwise, false.
         *
         * @type {Boolean}
         */
        this.ready = false;

        // Create the copyright message.
        if (typeof description.copyrightText !== 'undefined') {
            // Create the copyright message.
            this._logo = writeTextToCanvas(description.copyrightText, {
                font : '12px sans-serif'
            });
        }

//        this.projection = Projections.MERCATOR;
//        this.tilingScheme = new WebMercatorTilingScheme();
//        this.extent = new Extent(-CesiumMath.PI,
//                CesiumMath.toRadians(-85.05112878),
//                CesiumMath.PI,
//                CesiumMath.toRadians(85.05112878));

        this.projection = Projections.WGS84;
        this.tilingScheme = new GeographicTilingScheme();
        this.extent = new Extent(-CesiumMath.PI,
                -CesiumMath.PI_OVER_TWO,
                CesiumMath.PI,
                CesiumMath.PI_OVER_TWO);

        this.maxLevel = 18;

        this.ready = true;
    };

    /**
     * Creates a {@link DiscardMissingTileImagePolicy} that compares tiles
     * against the tile at coordinate (0, 0), at the maximum level of detail, which is
     * assumed to be missing.  Only a subset of the pixels are compared to improve performance.
     * These pixels were chosen based on the current visual appearance of the tile on the ESRI servers at
     * <a href="http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/0/0">http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/0/0</a>.
     *
     * Before using this discard policy, check to make sure that the ArcGIS service actually has
     * missing tiles.  In particular, overlay maps may just provide fully transparent tiles, in
     * which case no discard policy is necessary.
     */
    WebMapServiceImageryProvider.prototype.createDiscardMissingTilePolicy = function() {
        var that = this;
        var missingTileUrl = when(this._isReady, function() {
            return that.buildImageUrl(0, 0, that.maxLevel);
        });
        var pixelsToCheck = [new Cartesian2(0, 0), new Cartesian2(200, 20), new Cartesian2(20, 200), new Cartesian2(80, 110), new Cartesian2(160, 130)];

        return new DiscardMissingTileImagePolicy(missingTileUrl, pixelsToCheck);
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
    WebMapServiceImageryProvider.prototype.buildImageUrl = function(x, y, level) {
        var nativeExtent = this.tilingScheme.tileXYToNativeExtent(x, y, level);
        var bbox = nativeExtent.west + '%2C' + nativeExtent.south + '%2C' + nativeExtent.east + '%2C' + nativeExtent.north;
        var srs = 'EPSG:4326';
        var url = this.url + '?service=WMS&version=1.1.0&request=GetMap&layers=' + this.layerName + '&bbox='  + bbox + '&width=256&height=256&srs=' + srs + '&format=image%2Fjpeg&styles=';

        if (typeof this._proxy !== 'undefined') {
            url = this._proxy.getURL(url);
        }

        return url;
    };

    /**
     * Request the image for a given tile.
     *
     * @param {String} url The tile image URL.
     *
     * @return A promise for the image that will resolve when the image is available.
     *         If the image is not suitable for display, the promise can resolve to undefined.
     */
    WebMapServiceImageryProvider.prototype.requestImage = function(url) {
        return loadImage(url);
    };

    /**
     * Transform the tile imagery from the format requested from the remote server
     * into a format suitable for resource creation.  Once complete, the tile imagery
     * state should be set to TRANSFORMED.  Alternatively, tile imagery state can be set to
     * RECEIVED to indicate that the transformation should be attempted again next update, if the tile
     * is still needed.
     *
     * @param {Context} context The context to use to create resources.
     * @param {Imagery} imagery The imagery to transform.
     */
    WebMapServiceImageryProvider.prototype.transformImagery = function(context, imagery) {
        imagery.transformedImage = imagery.image;
        imagery.image = undefined;
        imagery.state = TileState.TRANSFORMED;
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
    WebMapServiceImageryProvider.prototype.createResources = ImageryProvider.prototype.createResources;

    /**
     * DOC_TBA
     * @memberof WebMapServiceImageryProvider
     */
    WebMapServiceImageryProvider.prototype.getLogo = function() {
        return this._logo;
    };

    return WebMapServiceImageryProvider;
});