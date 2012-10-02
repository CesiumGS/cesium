/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/writeTextToCanvas',
        './ImageryProvider',
        './WebMercatorTilingScheme'
    ], function(
        defaultValue,
        DeveloperError,
        writeTextToCanvas,
        ImageryProvider,
        WebMercatorTilingScheme) {
    "use strict";

    var trailingSlashRegex = /\/$/;

    /**
     * Provides tiled imagery hosted by OpenStreetMap or another provider of Slippy tiles.  Please be aware
     * that a default-constructed instance of this class will connect to OpenStreetMap's volunteer-run
     * servers, so you must conform to their
     * <a href='http://wiki.openstreetmap.org/wiki/Tile_usage_policy'>Tile Usage Policy</a>.
     *
     * @alias OpenStreetMapImageryProvider
     * @constructor
     *
     * @param {String} [description.url='http://tile.openstreetmap.org'] The OpenStreetMap server url.
     * @param {String} [description.fileExtension='png'] The file extension for images on the server.
     * @param {Object} [description.proxy] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL.
     * @param {String} [description.credit='MapQuest, Open Street Map and contributors, CC-BY-SA'] A string crediting the data source, which is displayed on the canvas.
     * @param {Number} [description.maximumLevel=18] The maximum level-of-detail supported by the imagery provider.
     *
     * @see ArcGisMapServerImageryProvider
     * @see BingMapsImageryProvider
     * @see SingleTileImageryProvider
     * @see WebMapServiceImageryProvider
     *
     * @see <a href='http://wiki.openstreetmap.org/wiki/Main_Page'>OpenStreetMap Wiki</a>
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     *
     * @example
     * // OpenStreetMap tile provider
     * var osm = new OpenStreetMapImageryProvider({
     *     url : 'http://tile.openstreetmap.org/'
     * });
     */
    var OpenStreetMapImageryProvider = function OpenStreetMapImageryProvider(description) {
        description = defaultValue(description, {});

        var url = defaultValue(description.url, 'http://tile.openstreetmap.org/');

        if (!trailingSlashRegex.test(url)) {
            url = url + '/';
        }

        this._url = url;
        this._fileExtension = defaultValue(description.fileExtension, 'png');
        this._proxy = description.proxy;
        this._tileDiscardPolicy = description.tileDiscardPolicy;

        this._tilingScheme = new WebMercatorTilingScheme();

        this._tileWidth = 256;
        this._tileHeight = 256;

        this._maximumLevel = defaultValue(description.maximumLevel, 18);

        this._ready = true;

        // TODO: should not hard-code, get from server?
        var credit = defaultValue(description.credit, 'MapQuest, Open Street Map and contributors, CC-BY-SA');
        this._logo = writeTextToCanvas(credit, {
            font : '12px sans-serif'
        });
    };

    function buildImageUrl(imageryProvider, x, y, level) {
        var url = imageryProvider._url + level + '/' + x + '/' + y + '.' + imageryProvider._fileExtension;

        var proxy = imageryProvider._proxy;
        if (typeof proxy !== 'undefined') {
            url = proxy.getURL(url);
        }

        return url;
    }

    /**
     * Gets the URL of the service hosting the imagery.
     *
     * @memberof OpenStreetMapImageryProvider
     *
     * @returns {String} The URL.
     */
    OpenStreetMapImageryProvider.prototype.getUrl = function() {
        return this._url;
    };

    /**
     * Gets the width of each tile, in pixels.  This function should
     * not be called before {@link OpenStreetMapImageryProvider#isReady} returns true.
     *
     * @memberof OpenStreetMapImageryProvider
     *
     * @returns {Number} The width.
     */
    OpenStreetMapImageryProvider.prototype.getTileWidth = function() {
        return this._tileWidth;
    };

    /**
     * Gets the height of each tile, in pixels.  This function should
     * not be called before {@link OpenStreetMapImageryProvider#isReady} returns true.
     *
     * @memberof OpenStreetMapImageryProvider
     *
     * @returns {Number} The height.
     */
    OpenStreetMapImageryProvider.prototype.getTileHeight = function() {
        return this._tileHeight;
    };

    /**
     * Gets the maximum level-of-detail that can be requested.  This function should
     * not be called before {@link OpenStreetMapImageryProvider#isReady} returns true.
     *
     * @memberof OpenStreetMapImageryProvider
     *
     * @returns {Number} The maximum level.
     */
    OpenStreetMapImageryProvider.prototype.getMaximumLevel = function() {
        return this._maximumLevel;
    };

    /**
     * Gets the tiling scheme used by this provider.  This function should
     * not be called before {@link OpenStreetMapImageryProvider#isReady} returns true.
     *
     * @memberof OpenStreetMapImageryProvider
     *
     * @returns {TilingScheme} The tiling scheme.
     * @see WebMercatorTilingScheme
     * @see GeographicTilingScheme
     */
    OpenStreetMapImageryProvider.prototype.getTilingScheme = function() {
        return this._tilingScheme;
    };

    /**
     * Gets the extent, in radians, of the imagery provided by this instance.  This function should
     * not be called before {@link OpenStreetMapImageryProvider#isReady} returns true.
     *
     * @memberof OpenStreetMapImageryProvider
     *
     * @returns {Extent} The extent.
     */
    OpenStreetMapImageryProvider.prototype.getExtent = function() {
        return this._tilingScheme.getExtent();
    };

    /**
     * Gets the tile discard policy.  If not undefined, the discard policy is responsible
     * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
     * returns undefined, no tiles are filtered.  This function should
     * not be called before {@link OpenStreetMapImageryProvider#isReady} returns true.
     *
     * @memberof OpenStreetMapImageryProvider
     *
     * @returns {TileDiscardPolicy} The discard policy.
     *
     * @see DiscardMissingTileImagePolicy
     * @see NeverTileDiscardPolicy
     */
    OpenStreetMapImageryProvider.prototype.getTileDiscardPolicy = function() {
        return this._tileDiscardPolicy;
    };

    /**
     * Gets a value indicating whether or not the provider is ready for use.
     *
     * @memberof OpenStreetMapImageryProvider
     *
     * @returns {Boolean} True if the provider is ready to use; otherwise, false.
     */
    OpenStreetMapImageryProvider.prototype.isReady = function() {
        return this._ready;
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link OpenStreetMapImageryProvider#isReady} returns true.
     *
     * @memberof OpenStreetMapImageryProvider
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     *
     * @returns {Promise} A promise for the image that will resolve when the image is available, or
     *          undefined if there are too many active requests to the server, and the request
     *          should be retried later.  The resolved image may be either an
     *          Image or a Canvas DOM object.
     */
    OpenStreetMapImageryProvider.prototype.requestImage = function(x, y, level) {
        var url = buildImageUrl(this, x, y, level);
        return ImageryProvider.loadImage(url);
    };

    /**
     * Gets the logo to display when this imagery provider is active.  Typically this is used to credit
     * the source of the imagery.  This function should not be called before {@link OpenStreetMapImageryProvider#isReady} returns true.
     *
     * @memberof OpenStreetMapImageryProvider
     *
     * @returns {Image|Canvas} A canvas or image containing the log to display, or undefined if there is no logo.
     */
    OpenStreetMapImageryProvider.prototype.getLogo = function() {
        return this._logo;
    };

    return OpenStreetMapImageryProvider;
});