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
        './ImageryProvider',
        './ImageryState',
        './Projections',
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
        ImageryProvider,
        ImageryState,
        Projections,
        WebMercatorTilingScheme,
        GeographicTilingScheme,
        when) {
    "use strict";

    /**
     * Provides tiled imagery hosted by a Web Map Service (WMS) server.
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

        this._url = description.url;
        this._layerName = description.layerName;
        this._proxy = description.proxy;

        this._tileWidth = 256;
        this._tileHeight = 256;
        this._maximumLevel = 18;
        this._tilingScheme = new GeographicTilingScheme();

        // Create the copyright message.
        if (typeof description.copyrightText !== 'undefined') {
            // Create the copyright message.
            this._logo = writeTextToCanvas(description.copyrightText, {
                font : '12px sans-serif'
            });
        }

        this._ready = true;
    };

    /**
     * Gets the URL of the WMS server.
     * @returns {String} The URL.
     */
    WebMapServiceImageryProvider.prototype.getUrl = function() {
        return this._url;
    };

    /**
     * Gets the name of the WMS layer.
     * @returns {String} The layer name.
     */
    WebMapServiceImageryProvider.prototype.getLayerName = function() {
        return this._layerName;
    };

    /**
     * Gets the width of each tile, in pixels.
     *
     * @returns {Number} The width.
     */
    WebMapServiceImageryProvider.prototype.getTileWidth = function() {
        return this._tileWidth;
    };

    /**
     * Gets the height of each tile, in pixels.
     *
     * @returns {Number} The height.
     */
    WebMapServiceImageryProvider.prototype.getTileHeight = function() {
        return this._tileHeight;
    };

    /**
     * Gets the maximum level-of-detail that can be requested.
     *
     * @returns {Number} The maximum level.
     */
    WebMapServiceImageryProvider.prototype.getMaximumLevel = function() {
        return this._maximumLevel;
    };

    /**
     * Gets the tiling scheme used by this provider.
     *
     * @returns {TilingScheme} The tiling scheme.
     * @see WebMercatorTilingScheme
     * @see GeographicTilingScheme
     */
    WebMapServiceImageryProvider.prototype.getTilingScheme = function() {
        return this._tilingScheme;
    };

    /**
     * Gets the extent, in radians, of the imagery provided by this instance.
     *
     * @returns {Extent} The extent.
     */
    WebMapServiceImageryProvider.prototype.getExtent = function() {
        return this._tilingScheme.extent;
    };

    /**
     * Gets a value indicating whether or not the provider is ready for use.
     *
     * @returns {Boolean} True if the provider is ready to use; otherwise, false.
     */
    WebMapServiceImageryProvider.prototype.isReady = function() {
        return this._ready;
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
    WebMapServiceImageryProvider.prototype._buildImageUrl = function(x, y, level) {
        var nativeExtent = this._tilingScheme.tileXYToNativeExtent(x, y, level);
        var bbox = nativeExtent.west + '%2C' + nativeExtent.south + '%2C' + nativeExtent.east + '%2C' + nativeExtent.north;
        var srs = 'EPSG:4326';
        var url = this._url + '?service=WMS&version=1.1.0&request=GetMap&layers=' + this.layerName + '&bbox='  + bbox + '&width=256&height=256&srs=' + srs + '&format=image%2Fjpeg&styles=';

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
    WebMapServiceImageryProvider.prototype.requestImage = function(hostnames, hostnameIndex, x, y, level) {
        var imageUrl = this._buildImageUrl(hostnameIndex, x, y, level);
        return loadImage(imageUrl);
    };

    /**
     * DOC_TBA
     * @memberof WebMapServiceImageryProvider
     */
    WebMapServiceImageryProvider.prototype.getLogo = function() {
        return this._logo;
    };

    return WebMapServiceImageryProvider;
});