define([
        '../Core/defaultValue',
        '../Core/WebMercatorTilingScheme',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Rectangle',
        '../Scene/ImageryProvider',
        '../Core/defined',
        '../Core/Event',
        '../Core/Math',
        '../Core/Credit',
        '../Core/TileProviderError',
        '../Core/RuntimeError',
        '../ThirdParty/when',
        '../Core/loadJsonp'
    ], function(
        defaultValue,
        WebMercatorTilingScheme,
        defineProperties,
        DeveloperError,
        Rectangle,
        ImageryProvider,
        defined,
        CesiumEvent,
        CesiumMath,
        Credit,
        TileProviderError,
        RuntimeError,
        when,
        loadJsonp) {
    'use strict';

    /**
     * Provides tiled imagery using the Here Maps Imagery REST API. See https://developer.here.com/documentation/map-tile/topics/request-constructing.html
     * for more details on how the query URLs are constructed and acceptable values for each option.
     *
     * @alias HereMapsImageryProvider.js
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {String} [options.baseUrl="aerial.maps.api.here.com"] The URL for accessing tiles, without the Load Balancing prefix.
     *        You may use the *.maps.cit.api.here.com URLs during development. The first part of the URL determines which tileTypes
     *.       are available.
     * @param {String} [options.tileType="maptile"] Determines which type of image will be delivered. E.g. Map, Labels, Streets, etc.
     * @param {String} [options.scheme="satellite.day"] Specifies the view scheme, e.g normal.day, normal.night, terrain.day, etc.
              Note, some schemes will be rejected by certain baseUrls.
     * @param {String} [options.tileFormat="jpg"] Valid values are jpg, png, and png8.
     * @param {Number} [options.tileSize=256] The width and height of each tile in pixels. Supported values are 256 and 512.
     * @param {Boolean} [options.forceUseNewest=false] By default, the current map version will be queried only once at start.
     *        Subsequent tile requests will always use a hash of this version so that tiles are consistent in case the map is updated
     *        while the app is running. Enabling this flag will cause all tiles to always reqeuest the newest version.
     *        See https://developer.here.com/documentation/map-tile/topics/tile-version.html#tile-version for details.
     *
     *
     * @see ArcGisMapServerImageryProvider
     * @see GoogleEarthImageryProvider
     * @see OpenStreetMapImageryProvider
     * @see SingleTileImageryProvider
     * @see TileMapServiceImageryProvider
     * @see WebMapServiceImageryProvider
     *
     * @see {@link https://developer.here.com/documentation/map-tile/topics/overview.html}
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     *
     * @example
     * var here = new Cesium.HereMapsImageryProvider({
     *     url : 'aerial.maps.cit.api.here.com',
     *     appId : 'get-yours-at-https://www.developer.here.com/',
     *     appCode : 'get-yours-at-https://www.developer.here.com/',
     * });
     */
    var HereMapsImageryProvider = function HereMapsImageryProvider(options) {
        options = defaultValue(options, {});

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.url)) {
            throw new DeveloperError('options.url is required.');
        }
        if (!defined(options.appId)) {
            throw new DeveloperError('options.appId is required.');
        }
        if (!defined(options.appCode)) {
            throw new DeveloperError('options.appCode  is required.');
        }
        //>>includeEnd('debug');

        this._proxy = options.proxy;
        this._credit = undefined; // The base credit is always supplied in the attribution list

        this._tilingScheme = new WebMercatorTilingScheme();
        this._tileSize = defaultValue(options.tileSize, 256);

        // Build URL's
        this._urls = {
            copyright: '//1.{baseUrl}/maptile/2.1/copyright/{mapId}?app_id={appId}&app_code={appCode}',
            info: '//1.{baseUrl}/maptile/2.1/info?app_id={appId}&app_code={appCode}',
            tile: '//{subdomain}.{baseUrl}/maptile/2.1/{tileType}/{mapId}/{scheme}/{level}/{x}/{y}/{tileSize}/{tileFormat}?app_id={appId}&app_code={appCode}'
        };

        Object.keys(this._urls).forEach(function(urlKey) {
            var url = this._urls[urlKey];
            url = url.replace('{baseUrl}', defaultValue(options.baseUrl, 'aerial.maps.api.here.com'));
            url = url.replace('{tileType}', defaultValue(options.tileType, 'maptile'));
            // @TODO: Implement mapId locking using hashes. For now we'll just use newest (options.forceUseNewest)
            url = url.replace('{mapId}', 'newest');
            url = url.replace('{scheme}', defaultValue(options.scheme,'satellite.day'));
            url = url.replace('{tileSize}', this._tileSize);
            url = url.replace('{tileFormat}', defaultValue(options.tileFormat, 'jpg'));
            url = url.replace('{appId}', options.appId);
            url = url.replace('{appCode}', options.appCode);
            this._urls[urlKey] = url;
        });

        this._maximumLevel = 20;
        this._urlSubdomains = ['1', '2', '3', '4'];

        this._errorEvent = new CesiumEvent();

        this._ready = false;
        this._readyPromise = when.defer();

        //@TODO: Do we need to support DiscardMissingTileImagePolicy?

        var that = this;
        var metadataError;

        function metadataSuccess(data) {
            var jsonString = data;
            var resource = JSON.parse(jsonString);

            var attributionList = that._attributionList = resource.satellite;
            if (!attributionList) {
                attributionList = that._attributionList = [];
            }

            for (var attributionIndex = 0, attributionLength = attributionList.length; attributionIndex < attributionLength; ++attributionIndex) {
                var attribution = attributionList[attributionIndex];

                attribution.credit = new Credit({
                    text: attribution.alt
                });

                if (attribution.boxes) {
                    var coverageAreas = attribution.boxes;

                    for (var areaIndex = 0, areaLength = attribution.boxes.length; areaIndex < areaLength; ++areaIndex) {
                        var area = coverageAreas[areaIndex];
                        area.bbox = new Rectangle(
                                CesiumMath.toRadians(area[1]),
                                CesiumMath.toRadians(area[0]),
                                CesiumMath.toRadians(area[3]),
                                CesiumMath.toRadians(area[2]));
                    }
                }
            }

            that._ready = true;
            that._readyPromise.resolve(true);
            TileProviderError.handleSuccess(metadataError);
        }

        function metadataFailure(data) {
            var message = 'An error occurred while accessing ' + that._urls.copyright + '.';
            metadataError = TileProviderError.handleError(metadataError, that, that._errorEvent, message, undefined, undefined, undefined, requestMetadata);
            that._readyPromise.reject(new RuntimeError(message));
        }

        function requestMetadata() {
            var metadata = loadJsonp(that._urls.copyright, {
                callbackParameterName : 'callback_func',
                proxy : that._proxy
            });
            when(metadata, metadataSuccess, metadataFailure);
        }

        requestMetadata();
    };

    defineProperties(HereMapsImageryProvider.prototype, {
        /**
         * Gets the name of the HereMaps server url hosting the imagery.
         * @memberof HereMapsImageryProvider.prototype
         * @type {String}
         */
        url : {
            get : function() {
                return this._urls.tile;
            }
        },

        /**
         * Gets the proxy used by this provider.
         * @memberof HereMapsImageryProvider.prototype
         * @type {Proxy}
         */
        proxy : {
            get : function() {
                return this._proxy;
            }
        },


        /**
         * Gets the width of each tile, in pixels. This function should
         * not be called before {@link HereMapsImageryProvider#ready} returns true.
         * @memberof HereMapsImageryProvider.prototype
         * @type {Number}
         */
        tileWidth : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('tileWidth must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._tileSize;
            }
        },

        /**
         * Gets the height of each tile, in pixels.  This function should
         * not be called before {@link HereMapsImageryProvider#ready} returns true.
         * @memberof HereMapsImageryProvider.prototype
         * @type {Number}
         */
        tileHeight: {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('tileHeight must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._tileSize;
            }
        },


        /**
         * Gets the maximum level-of-detail that can be requested.  This function should
         * not be called before {@link HereMapsImageryProvider#ready} returns true.
         * @memberof HereMapsImageryProvider.prototype
         * @type {Number}
         */
        maximumLevel : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('maximumLevel must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._maximumLevel;
            }
        },

        /**
         * Gets the minimum level-of-detail that can be requested.  This function should
         * not be called before {@link HereMapsImageryProvider#ready} returns true.
         * @memberof HereMapsImageryProvider.prototype
         * @type {Number}
         */
        minimumLevel : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('minimumLevel must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return 0;
            }
        },

        /**
         * Gets the tiling scheme used by this provider.  This function should
         * not be called before {@link HereMapsImageryProvider#ready} returns true.
         * @memberof HereMapsImageryProvider.prototype
         * @type {TilingScheme}
         */
        tilingScheme : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('tilingScheme must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._tilingScheme;
            }
        },

        /**
         * Gets the rectangle, in radians, of the imagery provided by this instance. This function should
         * not be called before {@link HereMapsImageryProvider#ready} returns true.
         * @memberof HereMapsImageryProvider.prototype
         * @type {Rectangle}
         */
        rectangle : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('rectangle must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._tilingScheme.rectangle;
            }
        },

        /**
         * Gets the tile discard policy.  If not undefined, the discard policy is responsible
         * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
         * returns undefined, no tiles are filtered.  This function should
         * not be called before {@link HereMapsImageryProvider#ready} returns true.
         * @memberof HereMapsImageryProvider.prototype
         * @type {TileDiscardPolicy}
         */
        tileDiscardPolicy : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('tileDiscardPolicy must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._tileDiscardPolicy;
            }
        },

        /**
         * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
         * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
         * are passed an instance of {@link TileProviderError}.
         * @memberof HereMapsImageryProvider.prototype
         * @type {Event}
         */
        errorEvent : {
            get : function() {
                return this._errorEvent;
            }
        },

        /**
         * Gets a value indicating whether or not the provider is ready for use.
         * @memberof HereMapsImageryProvider.prototype
         * @type {Boolean}
         */
        ready : {
            get : function() {
                return this._ready;
            }
        },

        /**
         * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
         * the source of the imagery.  This function should not be called before {@link HereMapsImageryProvider#ready} returns true.
         * @memberof HereMapsImageryProvider.prototype
         * @type {Credit}
         */
        credit : {
            get : function() {
                return this._credit;
            }
        },

        /**
         * Gets a value indicating whether or not the images provided by this imagery provider
         * include an alpha channel.  If this property is false, an alpha channel, if present, will
         * be ignored.  If this property is true, any images without an alpha channel will be treated
         * as if their alpha is 1.0 everywhere.  Setting this property to false reduces memory usage
         * and texture upload time.
         * @memberof HereMapsImageryProvider.prototype
         * @type {Boolean}
         */
        hasAlphaChannel : {
            get : function() {
                return false;
            }
        }
    });

    var rectangleScratch = new Rectangle();

    /**
     * Gets the credits to be displayed when a given tile is displayed.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level;
     * @returns {Credit[]} The credits to be displayed when the tile is displayed.
     *
     * @exception {DeveloperError} <code>getTileCredits</code> must not be called before the imagery provider is ready.
     */
    HereMapsImageryProvider.prototype.getTileCredits = function(x, y, level) {
        if (!this._ready) {
            throw new DeveloperError('getTileCredits must not be called before the imagery provider is ready.');
        }

        var rectangle = this._tilingScheme.tileXYToRectangle(x, y, level, rectangleScratch);
        var result = getRectangleAttribution(this._attributionList, level, rectangle);

        return result;
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link HereMapsImageryProvider#ready} returns true.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @returns {Promise} A promise for the image that will resolve when the image is available, or
     *          undefined if there are too many active requests to the server, and the request
     *          should be retried later.  The resolved image may be either an
     *          Image or a Canvas DOM object.
     *
     * @exception {DeveloperError} <code>requestImage</code> must not be called before the imagery provider is ready.
     */
    HereMapsImageryProvider.prototype.requestImage = function(x, y, level) {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('requestImage must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        var url = buildImageUrl(this, x, y, level);
        return ImageryProvider.loadImage(this, url);
    };

    function buildImageUrl(imageryProvider, x, y, level) {
        var imageUrl = imageryProvider._urls.tile;

        imageUrl = imageUrl.replace('{level}', level);
        imageUrl = imageUrl.replace('{x}', x);
        imageUrl = imageUrl.replace('{y}', y);

        var subdomains = imageryProvider._urlSubdomains;
        var subdomainIndex = (x + y + level) % subdomains.length;
        imageUrl = imageUrl.replace('{subdomain}', subdomains[subdomainIndex]);

        var proxy = imageryProvider._proxy;
        if (defined(proxy)) {
            imageUrl = proxy.getURL(imageUrl);
        }

        return imageUrl;
    }

    var intersectionScratch = new Rectangle();

    function getRectangleAttribution(attributionList, level, rectangle) {
        var result = [];

        for (var attributionIndex = 0, attributionLength = attributionList.length; attributionIndex < attributionLength; ++attributionIndex) {
            var attribution = attributionList[attributionIndex];
            var coverageAreas = attribution.boxes;

            var included = false;
            if (level >= attribution.minLevel && level <= attribution.maxLevel) {
                if (!attribution.boxes) { included = true; }
                for (var areaIndex = 0; !included && areaIndex < attribution.boxes.length; ++areaIndex) {
                    var area = coverageAreas[areaIndex];
                    var intersection = Rectangle.intersection(rectangle, area.bbox, intersectionScratch);
                    if (defined(intersection)) {
                        included = true;
                        break;
                    }
                }
            }

            if (included) {
                result.push(attribution.credit);
            }
        }

        return result;
    }

    return HereMapsImageryProvider;
});