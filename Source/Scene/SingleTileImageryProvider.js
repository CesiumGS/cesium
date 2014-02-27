/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/loadImage',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/Extent',
        './Credit',
        './GeographicTilingScheme',
        './TileProviderError',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        defined,
        loadImage,
        DeveloperError,
        Event,
        Extent,
        Credit,
        GeographicTilingScheme,
        TileProviderError,
        when) {
    "use strict";

    /**
     * Provides a single, top-level imagery tile.  The single image is assumed to use a
     * {@link GeographicTilingScheme}.
     *
     * @alias SingleTileImageryProvider
     * @constructor
     *
     * @param {String} description.url The url for the tile.
     * @param {Extent} [description.extent=Extent.MAX_VALUE] The extent, in radians, covered by the image.
     * @param {Credit|String} [description.credit] A credit for the data source, which is displayed on the canvas.
     * @param {Object} [description.proxy] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @see ArcGisMapServerImageryProvider
     * @see BingMapsImageryProvider
     * @see GoogleEarthImageryProvider
     * @see OpenStreetMapImageryProvider
     * @see TileMapServiceImageryProvider
     * @see WebMapServiceImageryProvider
     */
    var SingleTileImageryProvider = function(description) {
        description = defaultValue(description, {});
        var url = description.url;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(url)) {
            throw new DeveloperError('url is required.');
        }
        //>>includeEnd('debug');

        this._url = url;

        var proxy = description.proxy;
        this._proxy = proxy;

        var extent = defaultValue(description.extent, Extent.MAX_VALUE);
        var tilingScheme = new GeographicTilingScheme({
            extent : extent,
            numberOfLevelZeroTilesX : 1,
            numberOfLevelZeroTilesY : 1
        });
        this._tilingScheme = tilingScheme;

        this._image = undefined;
        this._texture = undefined;
        this._tileWidth = 0;
        this._tileHeight = 0;

        this._errorEvent = new Event();

        this._ready = false;

        var imageUrl = url;
        if (defined(proxy)) {
            imageUrl = proxy.getURL(imageUrl);
        }

        var credit = description.credit;
        if (typeof credit === 'string') {
            credit = new Credit(credit);
        }
        this._credit = credit;

        var that = this;
        var error;

        function success(image) {
            that._image = image;
            that._tileWidth = image.width;
            that._tileHeight = image.height;
            that._ready = true;
            TileProviderError.handleSuccess(that._errorEvent);
        }

        function failure(e) {
            var message = 'Failed to load image ' + imageUrl + '.';
            error = TileProviderError.handleError(
                    error,
                    that,
                    that._errorEvent,
                    message,
                    0, 0, 0,
                    doRequest);
        }

        function doRequest() {
            when(loadImage(imageUrl), success, failure);
        }

        doRequest();
    };

    /**
     * Gets the URL of the single, top-level imagery tile.
     *
     * @memberof SingleTileImageryProvider
     *
     * @returns {String} The URL.
     */
    SingleTileImageryProvider.prototype.getUrl = function() {
        return this._url;
    };

    /**
     * Gets the proxy used by this provider.
     *
     * @memberof SingleTileImageryProvider
     *
     * @returns {Proxy} The proxy.
     *
     * @see DefaultProxy
     */
    SingleTileImageryProvider.prototype.getProxy = function() {
        return this._proxy;
    };

    /**
     * Gets the width of each tile, in pixels.  This function should
     * not be called before {@link SingleTileImageryProvider#isReady} returns true.
     *
     * @memberof SingleTileImageryProvider
     *
     * @returns {Number} The width.
     *
     * @exception {DeveloperError} <code>getTileWidth</code> must not be called before the imagery provider is ready.
     */
    SingleTileImageryProvider.prototype.getTileWidth = function() {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('getTileWidth must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        return this._tileWidth;
    };

    /**
     * Gets the height of each tile, in pixels.  This function should
     * not be called before {@link SingleTileImageryProvider#isReady} returns true.
     *
     * @memberof SingleTileImageryProvider
     *
     * @returns {Number} The height.
     *
     * @exception {DeveloperError} <code>getTileHeight</code> must not be called before the imagery provider is ready.
     */
    SingleTileImageryProvider.prototype.getTileHeight = function() {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('getTileHeight must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        return this._tileHeight;
    };

    /**
     * Gets the maximum level-of-detail that can be requested.  This function should
     * not be called before {@link SingleTileImageryProvider#isReady} returns true.
     *
     * @memberof SingleTileImageryProvider
     *
     * @returns {Number} The maximum level.
     *
     * @exception {DeveloperError} <code>getMaximumLevel</code> must not be called before the imagery provider is ready.
     */
    SingleTileImageryProvider.prototype.getMaximumLevel = function() {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('getMaximumLevel must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        return 0;
    };

    /**
     * Gets the minimum level-of-detail that can be requested.  This function should
     * not be called before {@link SingleTileImageryProvider#isReady} returns true.
     *
     * @memberof SingleTileImageryProvider
     *
     * @returns {Number} The minimum level.
     *
     * @exception {DeveloperError} <code>getMinimumLevel</code> must not be called before the imagery provider is ready.
     */
    SingleTileImageryProvider.prototype.getMinimumLevel = function() {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('getMinimumLevel must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        return 0;
    };

    /**
     * Gets the tiling scheme used by this provider.  This function should
     * not be called before {@link SingleTileImageryProvider#isReady} returns true.
     *
     * @memberof SingleTileImageryProvider
     *
     * @returns {TilingScheme} The tiling scheme.
     * @see WebMercatorTilingScheme
     * @see GeographicTilingScheme
     *
     * @exception {DeveloperError} <code>getTilingScheme</code> must not be called before the imagery provider is ready.
     */
    SingleTileImageryProvider.prototype.getTilingScheme = function() {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('getTilingScheme must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        return this._tilingScheme;
    };

    /**
     * Gets the extent, in radians, of the imagery provided by this instance.  This function should
     * not be called before {@link SingleTileImageryProvider#isReady} returns true.
     *
     * @memberof SingleTileImageryProvider
     *
     * @returns {Extent} The extent.
     */
    SingleTileImageryProvider.prototype.getExtent = function() {
        return this._tilingScheme.getExtent();
    };

    /**
     * Gets the tile discard policy.  If not undefined, the discard policy is responsible
     * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
     * returns undefined, no tiles are filtered.  This function should
     * not be called before {@link SingleTileImageryProvider#isReady} returns true.
     *
     * @memberof SingleTileImageryProvider
     *
     * @returns {TileDiscardPolicy} The discard policy.
     *
     * @see DiscardMissingTileImagePolicy
     * @see NeverTileDiscardPolicy
     *
     * @exception {DeveloperError} <code>getTileDiscardPolicy</code> must not be called before the imagery provider is ready.
     */
    SingleTileImageryProvider.prototype.getTileDiscardPolicy = function() {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('getTileDiscardPolicy must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        return undefined;
    };

    /**
     * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
     * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
     * are passed an instance of {@link TileProviderError}.
     *
     * @memberof SingleTileImageryProvider
     *
     * @returns {Event} The event.
     */
    SingleTileImageryProvider.prototype.getErrorEvent = function() {
        return this._errorEvent;
    };

    /**
     * Gets a value indicating whether or not the provider is ready for use.
     *
     * @memberof SingleTileImageryProvider
     *
     * @returns {Boolean} True if the provider is ready to use; otherwise, false.
     */
    SingleTileImageryProvider.prototype.isReady = function() {
        return this._ready;
    };

    /**
     * Gets the credits to be displayed when a given tile is displayed.
     *
     * @memberof SingleTileImageryProvider
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level;
     *
     * @returns {Credit[]} The credits to be displayed when the tile is displayed.
     *
     * @exception {DeveloperError} <code>getTileCredits</code> must not be called before the imagery provider is ready.
     */
    SingleTileImageryProvider.prototype.getTileCredits = function(x, y, level) {
        return undefined;
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link SingleTileImageryProvider#isReady} returns true.
     *
     * @memberof SingleTileImageryProvider
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
    SingleTileImageryProvider.prototype.requestImage = function(x, y, level) {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('requestImage must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        return this._image;
    };

    /**
     * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
     * the source of the imagery.  This function should not be called before {@link SingleTileImageryProvider#isReady} returns true.
     *
     * @memberof SingleTileImageryProvider
     *
     * @returns {Credit} The credit, or undefined if no credit exists
     */
    SingleTileImageryProvider.prototype.getCredit = function() {
        return this._credit;
    };

    return SingleTileImageryProvider;
});
