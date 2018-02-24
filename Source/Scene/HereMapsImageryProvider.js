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
        '../Core/Resource',
        '../ThirdParty/when',
        '../ThirdParty/Uri'
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
        Resource,
        when,
        Uri ) {
    'use strict';

    /**
     * Provides tiled imagery using the Here Maps Imagery REST API. See {@link https://developer.here.com/documentation/map-tile/topics/request-constructing.html|Here Maps Request Constructing}
     * for more details on how the query URLs are constructed and acceptable values for each option.
     *
     * @alias HereMapsImageryProvider
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {String} options.appId The Here Maps appId for your application, which can be
     *        created at {@link https://developer.here.com/}.
     * @param {String} options.appCode The Here Maps appCode for your application, which can be
     *        created at {@link https://developer.here.com/}.
     * @param {Resource|String} [options.url="http://maps.api.here.com"] The URL for accessing tiles, without the Load Balancing or Map Type prefixes.
     *        You may use the *.maps.cit.api.here.com URLs during development.
     * @param {String} [options.mapType="aerial"] The type of imagery to load. See {@link https://developer.here.com/documentation/map-tile/topics/request-constructing.html|HereMaps Request Constructing}
     * @param {String} [options.tileType="maptile"] Determines which type of image will be delivered. E.g. Map, Labels, Streets, etc.
     * @param {String} [options.scheme="satellite.day"] Specifies the view scheme, e.g normal.day, normal.night, terrain.day, etc.
              Note, some schemes will be rejected by certain baseUrls.
     * @param {String} [options.tileFormat="jpg"] Valid values are jpg, png, and png8.
     * @param {Number} [options.tileSize=256] The width and height of each tile in pixels. Supported values are 256 and 512.
     * @param {Boolean} [options.forceUseNewest=false] By default, the current map version will be queried only once at start.
     *        Subsequent tile requests will always use a hash of this version so that tiles are consistent in case the map is updated
     *        while the app is running. Enabling this flag will cause all tiles to always reqeuest the newest version.
     *        See {@link https://developer.here.com/documentation/map-tile/topics/tile-version.html#tile-version|Here Maps Tile Version} for details.
     *
     *
     * @see ArcGisMapServerImageryProvider
     * @see GoogleEarthEnterpriseMapsProvider
     * @see createOpenStreetMapImageryProvider
     * @see SingleTileImageryProvider
     * @see createTileMapServiceImageryProvider
     * @see WebMapServiceImageryProvider
     * @see WebMapTileServiceImageryProvider
     * @see UrlTemplateImageryProvider
     *
     * @see {@link https://developer.here.com/documentation/map-tile/topics/overview.html|Here Map Tile API }
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
        if (!defined(options.appId)) {
            throw new DeveloperError('options.appId is required.');
        }
        if (!defined(options.appCode)) {
            throw new DeveloperError('options.appCode  is required.');
        }
        //>>includeEnd('debug');

        var that = this;

        this._credit = new Credit({
            text: '2014 DigitalGlobe, Inc.',
            imageUrl: HereMapsImageryProvider._logoData,
            link: 'http://www.here.com'
        });

        this._tilingScheme = new WebMercatorTilingScheme();
        this._tileSize = defaultValue(options.tileSize, 256);

        var rootUrl = Resource.createIfNeeded( defaultValue(options.url, 'http://maps.api.here.com') );
        var mapType = defaultValue(options.mapType, 'aerial');
        var mapId = 'newest';

        this._baseUrl = new Resource({
            url: '//{subdomain}.' + mapType + '.' + new Uri(rootUrl.url).getAuthority(),
            queryParameters: {
                app_id: options.appId,
                app_code: options.appCode
            },
            proxy: options.proxy
        });

        var copyrightResource = this._baseUrl.getDerivedResource({
            url: '/maptile/2.1/copyright/' + mapId,
            templateValues: { subdomain: '1' }
        });

        this._tileResource = this._baseUrl.getDerivedResource({
            url: '/maptile/2.1/{tileType}/{mapId}/{scheme}/{level}/{x}/{y}/{tileSize}/{tileFormat}',
            templateValues: {
                tileType: defaultValue(options.tileType, 'maptile'),
                mapId: mapId,
                scheme: defaultValue(options.scheme,'satellite.day'),
                tileSize: that._tileSize,
                tileFormat: defaultValue(options.tileFormat, 'jpg')
            }
        });

        this._maximumLevel = 20;
        this._urlSubdomains = ['1', '2', '3', '4'];

        this._errorEvent = new CesiumEvent();

        this._ready = false;
        this._readyPromise = when.defer();

        var metadataError;
        function metadataSuccess(data) {
            try {
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
            catch (e)
            {
                metadataFailure(data);
            }
        }

        function metadataFailure(data) {
            var message = 'An error occurred while accessing ' + copyrightResource.url + '.';
            metadataError = TileProviderError.handleError(metadataError, that, that._errorEvent, message, undefined, undefined, undefined, requestMetadata);
            that._readyPromise.reject(new RuntimeError(message));
        }

        function requestMetadata() {
            var metadata = copyrightResource.fetchJsonp('callback_func');
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
                return this._baseUrl.getDerivedResource({templateValues: {subdomain: 1}}).url;
            }
        },

        /**
         * Gets the proxy used by this provider.
         * @memberof HereMapsImageryProvider.prototype
         * @type {Proxy}
         */
        proxy : {
            get : function() {
                return this._tileResource.proxy;
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
         * Gets a promise that resolves to true when the provider is ready for use.
         * @memberof HereMapsImageryProvider.prototype
         * @type {Promise.<Boolean>}
         * @readonly
         */
        readyPromise : {
            get : function() {
                return this._readyPromise.promise;
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
    HereMapsImageryProvider.prototype.requestImage = function(x, y, level, request) {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('requestImage must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        return ImageryProvider.loadImage(this, buildImageResource(this, x, y, level, request));
    };

    /**
     * Picking features is not currently supported by this imagery provider, so this function simply returns
     * undefined.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @param {Number} longitude The longitude at which to pick features.
     * @param {Number} latitude  The latitude at which to pick features.
     * @return {Promise.<ImageryLayerFeatureInfo[]>|undefined} A promise for the picked features that will resolve when the asynchronous
     *                   picking completes.  The resolved value is an array of {@link ImageryLayerFeatureInfo}
     *                   instances.  The array may be empty if no features are found at the given location.
     *                   It may also be undefined if picking is not supported.
     */
    HereMapsImageryProvider.prototype.pickFeatures = function(x, y, level, longitude, latitude) {
        return undefined;
    };

    HereMapsImageryProvider._logoData = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI4MHB4IiBoZWlnaHQ9IjgwcHgiIHZpZXdCb3g9IjAgMCA4MCA4MCIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgODAgODA7IiB4bWw6c3BhY2U9InByZXNlcnZlIj48c3R5bGUgdHlwZT0idGV4dC9jc3MiPi5zdDB7ZGlzcGxheTpub25lO2ZpbGw6IzE2MTkxOTt9LnN0MXtmaWxsOiM2NUMxQzI7fS5zdDJ7ZmlsbDojRkZGRkZGO308L3N0eWxlPjxnIGlkPSJFYmVuZV8xIj48cmVjdCBjbGFzcz0ic3QwIiB3aWR0aD0iNzkuOSIgaGVpZ2h0PSI3OS45Ii8+PGcgaWQ9IkxvZ28iPjxwYXRoIGlkPSJ0cmlhbmdsZSIgY2xhc3M9InN0MSIgZD0iTTIyLjEsNjUuNWwtMTEsMTFsLTExLTExTDIyLjEsNjUuNXoiLz48cGF0aCBpZD0iaGVyZSIgY2xhc3M9InN0MiIgZD0iTTM4LjIsNDAuNWMtMi4zLTIuNy0yLjItNC4yLTAuOC01LjZjMS43LTEuNywzLjUtMSw1LjUsMC45TDM4LjIsNDAuNXogTTYxLjgsMTAuNWMxLjctMS43LDMuNS0xLDUuNSwwLjlsLTQuNyw0LjdDNjAuMiwxMy40LDYwLjMsMTIsNjEuOCwxMC41eiBNNzYsMTUuM2MtMi4xLDMuMi01LjksOC40LTkuOCw0LjVsOS45LTkuOUM3NS4yLDksNzQuNiw4LjIsNzQsNy43Yy01LjMtNS4zLTExLjMtNS40LTE2LTAuN2MtMy4xLDMuMS00LDYuNy0zLjEsMTAuMWwtMy4xLTMuNUM1MSwxNCw0Ny4yLDE3LjQsNTAsMjIuNGwtMy41LTIuOWwtNC43LDQuN2w2LjQsNi40Yy00LjktMy45LTEwLjItMy41LTE0LjQsMC43Yy00LjUsNC41LTQuMiwxMC0wLjgsMTQuNWwtMC43LTAuN2MtNC41LTQuNS05LjQtMi45LTExLjgtMC41Yy0xLjksMS45LTMsNC40LTIuNSw2LjJsLTkuNy05LjdsLTUuMiw1LjJsMTkuMiwxOS4yaDEwLjNsLTYuOS02LjljLTMuNi0zLjctMy43LTUuNi0xLjktNy40YzEuNy0xLjcsMy43LTAuNiw3LjIsMi44bDYuOCw2LjhsNS4xLTUuMWwtNi41LTYuNWM0LjcsMy41LDEwLjMsMy43LDE1LjMtMS4zYzAsMCwwLjEtMC4xLDAuMS0wLjFsMCwwYzMuMS0yLjgsNC01LjYsNC01LjZsLTMuOS0yLjZjLTIuMSwzLjItNS44LDguNC05LjcsNC41bDkuOS05LjlsNi4yLDYuMmw1LjQtNS40bC03LjctNy43Yy0zLjYtMy42LTEuNS03LDAtOC4zYzAuNywxLjUsMS43LDIuOSwzLDQuMmM1LDUsMTEuNCw2LDE3LjEsMC40YzAsMCwwLjEtMC4xLDAuMS0wLjFsMCwwYzMuMS0yLjgsNC01LjYsNC01LjZMNzYsMTUuM3oiLz48L2c+PC9nPjxnIGlkPSJFYmVuZV8yIj48L2c+PC9zdmc+';


    function buildImageResource(imageryProvider, x, y, level, request) {
        var subdomains = imageryProvider._urlSubdomains;
        var subdomainIndex = (x + y + level) % subdomains.length;

        return imageryProvider._tileResource.getDerivedResource({
            request: request,
            templateValues: {
                level: level,
                x: x,
                y: y,
                subdomain: imageryProvider._urlSubdomains[subdomainIndex]
            }
        });
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
