/*global define*/
define([
        '../Core/defaultValue',
        '../Core/loadImage',
        '../Core/writeTextToCanvas',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/Extent',
        './GeographicTilingScheme',
        './TileProviderError',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        loadImage,
        writeTextToCanvas,
        DeveloperError,
        Event,
        Extent,
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
     * @param {String} [description.credit] A string crediting the data source, which is displayed on the canvas.
     * @param {Object} [description.proxy] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @exception {DeveloperError} description.url is required.
     *
     * @see ArcGisMapServerImageryProvider
     * @see BingMapsImageryProvider
     * @see OpenStreetMapImageryProvider
     * @see TileMapServiceImageryProvider
     * @see WebMapServiceImageryProvider
     */
    var SingleTileImageryProvider = function(description) {
        description = defaultValue(description, {});

        var url = description.url;
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }

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
        if (typeof proxy !== 'undefined') {
            imageUrl = proxy.getURL(imageUrl);
        }

        if (typeof description.credit !== 'undefined') {
            this._logo = writeTextToCanvas(description.credit, {
                font : '12px sans-serif'
            });
        }

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
        if (!this._ready) {
            throw new DeveloperError('getTileWidth must not be called before the imagery provider is ready.');
        }
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
        if (!this._ready) {
            throw new DeveloperError('getTileHeight must not be called before the imagery provider is ready.');
        }
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
        if (!this._ready) {
            throw new DeveloperError('getMaximumLevel must not be called before the imagery provider is ready.');
        }
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
        if (!this._ready) {
            throw new DeveloperError('getTilingScheme must not be called before the imagery provider is ready.');
        }
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
        if (!this._ready) {
            throw new DeveloperError('getTileDiscardPolicy must not be called before the imagery provider is ready.');
        }
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
        if (!this._ready) {
            throw new DeveloperError('requestImage must not be called before the imagery provider is ready.');
        }
        return this._image;
    };

    /**
     * Gets the logo to display when this imagery provider is active.  Typically this is used to credit
     * the source of the imagery.  This function should not be called before {@link SingleTileImageryProvider#isReady} returns true.
     *
     * @memberof SingleTileImageryProvider
     *
     * @returns {Image|Canvas} A canvas or image containing the log to display, or undefined if there is no logo.
     *
     * @exception {DeveloperError} <code>getLogo</code> must not be called before the imagery provider is ready.
     */
    SingleTileImageryProvider.prototype.getLogo = function() {
        if (!this._ready) {
            throw new DeveloperError('getLogo must not be called before the imagery provider is ready.');
        }
        return this._logo;
    };

    return SingleTileImageryProvider;
});