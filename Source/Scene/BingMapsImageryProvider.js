/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/jsonp',
        '../Core/BingMapsApi',
        '../Core/Cartesian2',
        '../Core/DeveloperError',
        '../Core/Event',
        './BingMapsStyle',
        './DiscardMissingTileImagePolicy',
        './ImageryProvider',
        './TileProviderError',
        './WebMercatorTilingScheme',
        './Credit',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        defined,
        jsonp,
        BingMapsApi,
        Cartesian2,
        DeveloperError,
        Event,
        BingMapsStyle,
        DiscardMissingTileImagePolicy,
        ImageryProvider,
        TileProviderError,
        WebMercatorTilingScheme,
        Credit,
        when) {
    "use strict";

    /**
     * Provides tiled imagery using the Bing Maps Imagery REST API.
     *
     * @alias BingMapsImageryProvider
     * @constructor
     *
     * @param {String} description.url The url of the Bing Maps server hosting the imagery.
     * @param {String} [description.key] The Bing Maps key for your application, which can be
     *        created at <a href='https://www.bingmapsportal.com/'>https://www.bingmapsportal.com/</a>.
     *        If this parameter is not provided, {@link BingMapsApi.defaultKey} is used.
     *        If {@link BingMapsApi.defaultKey} is undefined as well, a message is
     *        written to the console reminding you that you must create and supply a Bing Maps
     *        key as soon as possible.  Please do not deploy an application that uses
     *        Bing Maps imagery without creating a separate key for your application.
     * @param {Enumeration} [description.mapStyle=BingMapsStyle.AERIAL] The type of Bing Maps
     *        imagery to load.
     * @param {TileDiscardPolicy} [description.tileDiscardPolicy] The policy that determines if a tile
     *        is invalid and should be discarded.  If this value is not specified, a default
     *        {@link DiscardMissingTileImagePolicy} is used which requests
     *        tile 0,0 at the maximum tile level and checks pixels (0,0), (120,140), (130,160),
     *        (200,50), and (200,200).  If all of these pixels are transparent, the discard check is
     *        disabled and no tiles are discarded.  If any of them have a non-transparent color, any
     *        tile that has the same values in these pixel locations is discarded.  The end result of
     *        these defaults should be correct tile discarding for a standard Bing Maps server.  To ensure
     *        that no tiles are discarded, construct and pass a {@link NeverTileDiscardPolicy} for this
     *        parameter.
     * @param {Proxy} [description.proxy] A proxy to use for requests. This object is
     *        expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @exception {DeveloperError} <code>description.url</code> is required.
     *
     * @see ArcGisMapServerImageryProvider
     * @see GoogleEarthImageryProvider
     * @see OpenStreetMapImageryProvider
     * @see SingleTileImageryProvider
     * @see TileMapServiceImageryProvider
     * @see WebMapServiceImageryProvider
     *
     * @see <a href='http://msdn.microsoft.com/en-us/library/ff701713.aspx'>Bing Maps REST Services</a>
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     *
     * @example
     * var bing = new Cesium.BingMapsImageryProvider({
     *     url : 'http://dev.virtualearth.net',
     *     key : 'get-yours-at-https://www.bingmapsportal.com/',
     *     mapStyle : Cesium.BingMapsStyle.AERIAL
     * });
     */
    var BingMapsImageryProvider = function BingMapsImageryProvider(description) {
        description = defaultValue(description, {});

        //>>includeStart('debug', pragmas.debug);
        if (!defined(description.url)) {
            throw new DeveloperError('description.url is required.');
        }
        //>>includeEnd('debug');

        this._key = BingMapsApi.getKey(description.key);

        this._url = description.url;
        this._mapStyle = defaultValue(description.mapStyle, BingMapsStyle.AERIAL);
        this._tileDiscardPolicy = description.tileDiscardPolicy;
        this._proxy = description.proxy;
        this._credit = new Credit('Bing Imagery', BingMapsImageryProvider._logoData, 'http://www.bing.com');

        /**
         * The default {@link ImageryLayer#gamma} to use for imagery layers created for this provider.
         * By default, this is set to 1.3 for the "aerial" and "aerial with labels" map styles and 1.0 for
         * all others.  Changing this value after creating an {@link ImageryLayer} for this provider will have
         * no effect.  Instead, set the layer's {@link ImageryLayer#gamma} property.
         *
         * @type {Number}
         * @default 1.0
         */
        this.defaultGamma = 1.0;
        if (this._mapStyle === BingMapsStyle.AERIAL || this._mapStyle === BingMapsStyle.AERIAL_WITH_LABELS) {
            this.defaultGamma = 1.3;
        }

        this._tilingScheme = new WebMercatorTilingScheme({
            numberOfLevelZeroTilesX : 2,
            numberOfLevelZeroTilesY : 2
        });

        this._tileWidth = undefined;
        this._tileHeight = undefined;
        this._maximumLevel = undefined;
        this._imageUrlTemplate = undefined;
        this._imageUrlSubdomains = undefined;

        this._errorEvent = new Event();

        this._ready = false;

        var metadataUrl = this._url + '/REST/v1/Imagery/Metadata/' + this._mapStyle.imagerySetName + '?key=' + this._key;
        var that = this;
        var metadataError;

        function metadataSuccess(data) {
            var resource = data.resourceSets[0].resources[0];

            that._tileWidth = resource.imageWidth;
            that._tileHeight = resource.imageHeight;
            that._maximumLevel = resource.zoomMax - 1;
            that._imageUrlSubdomains = resource.imageUrlSubdomains;
            that._imageUrlTemplate = resource.imageUrl.replace('{culture}', '');

            // Install the default tile discard policy if none has been supplied.
            if (!defined(that._tileDiscardPolicy)) {
                that._tileDiscardPolicy = new DiscardMissingTileImagePolicy({
                    missingImageUrl : buildImageUrl(that, 0, 0, that._maximumLevel),
                    pixelsToCheck : [new Cartesian2(0, 0), new Cartesian2(120, 140), new Cartesian2(130, 160), new Cartesian2(200, 50), new Cartesian2(200, 200)],
                    disableCheckIfAllPixelsAreTransparent : true
                });
            }

            that._ready = true;
            TileProviderError.handleSuccess(metadataError);
        }

        function metadataFailure(e) {
            var message = 'An error occurred while accessing ' + metadataUrl + '.';
            metadataError = TileProviderError.handleError(metadataError, that, that._errorEvent, message, undefined, undefined, undefined, requestMetadata);
        }

        function requestMetadata() {
            var metadata = jsonp(metadataUrl, {
                callbackParameterName : 'jsonp',
                proxy : that._proxy
            });
            when(metadata, metadataSuccess, metadataFailure);
        }

        requestMetadata();
    };

    /**
     * Gets the name of the Bing Maps server url hosting the imagery.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {String} The url.
     */
    BingMapsImageryProvider.prototype.getUrl = function() {
        return this._url;
    };

    /**
     * Gets the proxy used by this provider.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {Proxy} The proxy.
     *
     * @see DefaultProxy
     */
    BingMapsImageryProvider.prototype.getProxy = function() {
        return this._proxy;
    };

    /**
     * Gets the Bing Maps key.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {String} The key.
     */
    BingMapsImageryProvider.prototype.getKey = function() {
        return this._key;
    };

    /**
     * Gets the type of Bing Maps imagery to load.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {BingMapsStyle} The style.
     */
    BingMapsImageryProvider.prototype.getMapStyle = function() {
        return this._mapStyle;
    };

    /**
     * Gets the width of each tile, in pixels.  This function should
     * not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {Number} The width.
     *
     * @exception {DeveloperError} <code>getTileWidth</code> must not be called before the imagery provider is ready.
     */
    BingMapsImageryProvider.prototype.getTileWidth = function() {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('getTileWidth must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        return this._tileWidth;
    };

    /**
     * Gets the height of each tile, in pixels.  This function should
     * not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {Number} The height.
     *
     * @exception {DeveloperError} <code>getTileHeight</code> must not be called before the imagery provider is ready.
     */
    BingMapsImageryProvider.prototype.getTileHeight = function() {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('getTileHeight must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        return this._tileHeight;
    };

    /**
     * Gets the maximum level-of-detail that can be requested.  This function should
     * not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {Number} The maximum level.
     *
     * @exception {DeveloperError} <code>getMaximumLevel</code> must not be called before the imagery provider is ready.
     */
    BingMapsImageryProvider.prototype.getMaximumLevel = function() {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('getMaximumLevel must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        return this._maximumLevel;
    };

    /**
     * Gets the minimum level-of-detail that can be requested.  This function should
     * not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {Number} The minimum level.
     *
     * @exception {DeveloperError} <code>getMinimumLevel</code> must not be called before the imagery provider is ready.
     */
    BingMapsImageryProvider.prototype.getMinimumLevel = function() {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('getMinimumLevel must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        return 0;
    };

    /**
     * Gets the tiling scheme used by this provider.  This function should
     * not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {TilingScheme} The tiling scheme.
     * @see WebMercatorTilingScheme
     * @see GeographicTilingScheme
     *
     * @exception {DeveloperError} <code>getTilingScheme</code> must not be called before the imagery provider is ready.
     */
    BingMapsImageryProvider.prototype.getTilingScheme = function() {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('getTilingScheme must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        return this._tilingScheme;
    };

    /**
     * Gets the extent, in radians, of the imagery provided by this instance.  This function should
     * not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {Extent} The extent.
     *
     * @exception {DeveloperError} <code>getExtent</code> must not be called before the imagery provider is ready.
     */
    BingMapsImageryProvider.prototype.getExtent = function() {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('getExtent must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        return this._tilingScheme.getExtent();
    };

    /**
     * Gets the tile discard policy.  If not undefined, the discard policy is responsible
     * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
     * returns undefined, no tiles are filtered.  This function should
     * not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {TileDiscardPolicy} The discard policy.
     *
     * @see DiscardMissingTileImagePolicy
     * @see NeverTileDiscardPolicy
     *
     * @exception {DeveloperError} <code>getTileDiscardPolicy</code> must not be called before the imagery provider is ready.
     */
    BingMapsImageryProvider.prototype.getTileDiscardPolicy = function() {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('getTileDiscardPolicy must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        return this._tileDiscardPolicy;
    };

    /**
     * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
     * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
     * are passed an instance of {@link TileProviderError}.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {Event} The event.
     */
    BingMapsImageryProvider.prototype.getErrorEvent = function() {
        return this._errorEvent;
    };

    /**
     * Gets a value indicating whether or not the provider is ready for use.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {Boolean} True if the provider is ready to use; otherwise, false.
     */
    BingMapsImageryProvider.prototype.isReady = function() {
        return this._ready;
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof BingMapsImageryProvider
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
     * @exception {DeveloperError} <code>getTileDiscardPolicy</code> must not be called before the imagery provider is ready.
     */
    BingMapsImageryProvider.prototype.requestImage = function(x, y, level) {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('requestImage must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        var url = buildImageUrl(this, x, y, level);
        return ImageryProvider.loadImage(this, url);
    };

    /**
     * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
     * the source of the imagery.  This function should not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {Credit} The credit, or undefined if no credit exists
     */
    BingMapsImageryProvider.prototype.getCredit = function() {
        return this._credit;
    };

    BingMapsImageryProvider._logoData = 'data:image/png;base64,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';

    /**
     * Converts a tiles (x, y, level) position into a quadkey used to request an image
     * from a Bing Maps server.
     *
     * @memberof BingMapsImageryProvider
     *
     * @param {Number} x The tile's x coordinate.
     * @param {Number} y The tile's y coordinate.
     * @param {Number} level The tile's zoom level.
     *
     * @see <a href='http://msdn.microsoft.com/en-us/library/bb259689.aspx'>Bing Maps Tile System</a>
     * @see BingMapsImageryProvider#quadKeyToTileXY
     */
    BingMapsImageryProvider.tileXYToQuadKey = function(x, y, level) {
        var quadkey = '';
        for ( var i = level; i >= 0; --i) {
            var bitmask = 1 << i;
            var digit = 0;

            if ((x & bitmask) !== 0) {
                digit |= 1;
            }

            if ((y & bitmask) !== 0) {
                digit |= 2;
            }

            quadkey += digit;
        }
        return quadkey;
    };

    /**
     * Converts a tile's quadkey used to request an image from a Bing Maps server into the
     * (x, y, level) position.
     *
     * @memberof BingMapsImageryProvider
     *
     * @param {String} quadkey The tile's quad key
     *
     * @see <a href='http://msdn.microsoft.com/en-us/library/bb259689.aspx'>Bing Maps Tile System</a>
     * @see BingMapsImageryProvider#tileXYToQuadKey
     */
    BingMapsImageryProvider.quadKeyToTileXY = function(quadkey) {
        var x = 0;
        var y = 0;
        var level = quadkey.length - 1;
        for ( var i = level; i >= 0; --i) {
            var bitmask = 1 << i;
            var digit = +quadkey[level - i];

            if ((digit & 1) !== 0) {
                x |= bitmask;
            }

            if ((digit & 2) !== 0) {
                y |= bitmask;
            }
        }
        return {
            x : x,
            y : y,
            level : level
        };
    };

    function buildImageUrl(imageryProvider, x, y, level) {
        var imageUrl = imageryProvider._imageUrlTemplate;

        var quadkey = BingMapsImageryProvider.tileXYToQuadKey(x, y, level);
        imageUrl = imageUrl.replace('{quadkey}', quadkey);

        var subdomains = imageryProvider._imageUrlSubdomains;
        var subdomainIndex = (x + y + level) % subdomains.length;
        imageUrl = imageUrl.replace('{subdomain}', subdomains[subdomainIndex]);

        var proxy = imageryProvider._proxy;
        if (defined(proxy)) {
            imageUrl = proxy.getURL(imageUrl);
        }

        return imageUrl;
    }

    return BingMapsImageryProvider;
});
