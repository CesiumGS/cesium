/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/writeTextToCanvas',
        './ImageryProvider',
        './WebMercatorTilingScheme'
    ], function(
        defaultValue,
        DeveloperError,
        Event,
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
     * @param {Extent} [description.extent=Extent.MAX_VALUE] The extent of the layer.
     * @param {Number} [description.maximumLevel=18] The maximum level-of-detail supported by the imagery provider.
     * @param {String} [description.credit='MapQuest, Open Street Map and contributors, CC-BY-SA'] A string crediting the data source, which is displayed on the canvas.
     *
     * @see ArcGisMapServerImageryProvider
     * @see BingMapsImageryProvider
     * @see SingleTileImageryProvider
     * @see TileMapServiceImageryProvider
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

        this._extent = defaultValue(description.extent, this._tilingScheme.getExtent());

        this._errorEvent = new Event();

        this._ready = true;

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
     * Gets the proxy used by this provider.
     *
     * @memberof OpenStreetMapImageryProvider
     *
     * @returns {Proxy} The proxy.
     *
     * @see DefaultProxy
     */
    OpenStreetMapImageryProvider.prototype.getProxy = function() {
        return this._proxy;
    };

    /**
     * Gets the width of each tile, in pixels.  This function should
     * not be called before {@link OpenStreetMapImageryProvider#isReady} returns true.
     *
     * @memberof OpenStreetMapImageryProvider
     *
     * @returns {Number} The width.
     *
     * @exception {DeveloperError} <code>getTileWidth</code> must not be called before the imagery provider is ready.
     */
    OpenStreetMapImageryProvider.prototype.getTileWidth = function() {
        if (!this._ready) {
            throw new DeveloperError('getTileWidth must not be called before the imagery provider is ready.');
        }
        return this._tileWidth;
    };

    /**
     * Gets the height of each tile, in pixels.  This function should
     * not be called before {@link OpenStreetMapImageryProvider#isReady} returns true.
     *
     * @memberof OpenStreetMapImageryProvider
     *
     * @returns {Number} The height.
     *
     * @exception {DeveloperError} <code>getTileHeight</code> must not be called before the imagery provider is ready.
     */
    OpenStreetMapImageryProvider.prototype.getTileHeight = function() {
        if (!this._ready) {
            throw new DeveloperError('getTileHeight must not be called before the imagery provider is ready.');
        }
        return this._tileHeight;
    };

    /**
     * Gets the maximum level-of-detail that can be requested.  This function should
     * not be called before {@link OpenStreetMapImageryProvider#isReady} returns true.
     *
     * @memberof OpenStreetMapImageryProvider
     *
     * @returns {Number} The maximum level.
     *
     * @exception {DeveloperError} <code>getMaximumLevel</code> must not be called before the imagery provider is ready.
     */
    OpenStreetMapImageryProvider.prototype.getMaximumLevel = function() {
        if (!this._ready) {
            throw new DeveloperError('getMaximumLevel must not be called before the imagery provider is ready.');
        }
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
     *
     * @exception {DeveloperError} <code>getTilingScheme</code> must not be called before the imagery provider is ready.
     */
    OpenStreetMapImageryProvider.prototype.getTilingScheme = function() {
        if (!this._ready) {
            throw new DeveloperError('getTilingScheme must not be called before the imagery provider is ready.');
        }
        return this._tilingScheme;
    };

    /**
     * Gets the extent, in radians, of the imagery provided by this instance.  This function should
     * not be called before {@link OpenStreetMapImageryProvider#isReady} returns true.
     *
     * @memberof OpenStreetMapImageryProvider
     *
     * @returns {Extent} The extent.
     *
     * @exception {DeveloperError} <code>getExtent</code> must not be called before the imagery provider is ready.
     */
    OpenStreetMapImageryProvider.prototype.getExtent = function() {
        if (!this._ready) {
            throw new DeveloperError('getExtent must not be called before the imagery provider is ready.');
        }
        return this._extent;
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
     *
     * @exception {DeveloperError} <code>getTileDiscardPolicy</code> must not be called before the imagery provider is ready.
     */
    OpenStreetMapImageryProvider.prototype.getTileDiscardPolicy = function() {
        if (!this._ready) {
            throw new DeveloperError('getTileDiscardPolicy must not be called before the imagery provider is ready.');
        }
        return this._tileDiscardPolicy;
    };

    /**
     * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
     * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
     * are passed an instance of {@link TileProviderError}.
     *
     * @memberof OpenStreetMapImageryProvider
     *
     * @returns {Event} The event.
     */
    OpenStreetMapImageryProvider.prototype.getErrorEvent = function() {
        return this._errorEvent;
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
     *
     * @exception {DeveloperError} <code>requestImage</code> must not be called before the imagery provider is ready.
     */
    OpenStreetMapImageryProvider.prototype.requestImage = function(x, y, level) {
        if (!this._ready) {
            throw new DeveloperError('requestImage must not be called before the imagery provider is ready.');
        }
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
     *
     * @exception {DeveloperError} <code>getLogo</code> must not be called before the imagery provider is ready.
     */
    OpenStreetMapImageryProvider.prototype.getLogo = function() {
        if (!this._ready) {
            throw new DeveloperError('getLogo must not be called before the imagery provider is ready.');
        }
        return this._logo;
    };

    return OpenStreetMapImageryProvider;
});