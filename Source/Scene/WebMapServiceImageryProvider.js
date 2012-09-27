/*global define*/
define([
        '../Core/defaultValue',
        '../Core/writeTextToCanvas',
        '../Core/DeveloperError',
        '../Core/Extent',
        './ImageryProvider',
        './WebMercatorTilingScheme',
        './GeographicTilingScheme'
    ], function(
        defaultValue,
        writeTextToCanvas,
        DeveloperError,
        Extent,
        ImageryProvider,
        WebMercatorTilingScheme,
        GeographicTilingScheme) {
    "use strict";

    /**
     * Provides tiled imagery hosted by a Web Map Service (WMS) server.
     *
     * @alias WebMapServiceImageryProvider
     * @constructor
     *
     * @param {String} description.url The URL of the WMS service.
     * @param {String} description.layerName The name of the layer.
     * @param {Extent} description.extent The extent of the layer.
     * @param {Object} [description.proxy] A proxy to use for requests. This object is
     *        expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @exception {DeveloperError} <code>description.url</code> is required.
     *
     * @see SingleTileImageryProvider
     * @see BingMapsImageryProvider
     * @see OpenStreetMapImageryProvider
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
        this._tileDiscardPolicy = description.tileDiscardPolicy;
        this._proxy = description.proxy;
        this._layerName = description.layerName;

        this._tileWidth = 256;
        this._tileHeight = 256;
        this._maximumLevel = 18;

        var extent = defaultValue(description.extent, Extent.MAX_VALUE);
        this._tilingScheme = new GeographicTilingScheme({
            extent : extent
        });

        // Create the copyright message.
        if (typeof description.copyrightText !== 'undefined') {
            // Create the copyright message.
            this._logo = writeTextToCanvas(description.copyrightText, {
                font : '12px sans-serif'
            });
        }

        this._ready = true;
    };

    function buildImageUrl(imageryProvider, x, y, level) {
        var nativeExtent = imageryProvider._tilingScheme.tileXYToNativeExtent(x, y, level);
        var bbox = nativeExtent.west + '%2C' + nativeExtent.south + '%2C' + nativeExtent.east + '%2C' + nativeExtent.north;
        var srs = 'EPSG:4326';

        var url = imageryProvider._url;
        url += '?service=WMS&version=1.1.0&request=GetMap&format=image%2Fjpeg&styles=&width=256&height=256';
        url += '&layers=' + imageryProvider._layerName;
        url += '&bbox=' + bbox;
        url += '&srs=' + srs;

        var proxy = imageryProvider._proxy;
        if (typeof proxy !== 'undefined') {
            url = proxy.getURL(url);
        }

        return url;
    }

    /**
     * Gets the URL of the WMS server.
     *
     * @returns {String} The URL.
     */
    WebMapServiceImageryProvider.prototype.getUrl = function() {
        return this._url;
    };

    /**
     * Gets the name of the WMS layer.
     *
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
     * Gets the tile discard policy.  If not undefined, the discard policy is responsible
     * for filtering out "missing" tiles via its shouldDiscardImage function.
     * By default, no tiles will be filtered.
     *
     * @returns {TileDiscardPolicy} The discard policy.
     */
    WebMapServiceImageryProvider.prototype.getTileDiscardPolicy = function() {
        return this._tileDiscardPolicy;
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
    WebMapServiceImageryProvider.prototype.requestImage = function(x, y, level) {
        var url = buildImageUrl(this, x, y, level);
        return ImageryProvider.loadImage(url);
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