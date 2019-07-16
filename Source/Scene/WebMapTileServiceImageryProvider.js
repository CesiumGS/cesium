define([
        '../Core/combine',
        '../Core/Credit',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/freezeObject',
        '../Core/isArray',
        '../Core/Rectangle',
        '../Core/Resource',
        '../Core/WebMercatorTilingScheme',
        '../ThirdParty/when',
        './ImageryProvider',
        './TimeDynamicImagery'
    ], function(
        combine,
        Credit,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        freezeObject,
        isArray,
        Rectangle,
        Resource,
        WebMercatorTilingScheme,
        when,
        ImageryProvider,
        TimeDynamicImagery) {
    'use strict';

    var defaultParameters = freezeObject({
        service : 'WMTS',
        version : '1.0.0',
        request : 'GetTile'
    });

    /**
     * Provides tiled imagery served by {@link http://www.opengeospatial.org/standards/wmts|WMTS 1.0.0} compliant servers.
     * This provider supports HTTP KVP-encoded and RESTful GetTile requests, but does not yet support the SOAP encoding.
     *
     * @alias WebMapTileServiceImageryProvider
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Resource|String} options.url The base URL for the WMTS GetTile operation (for KVP-encoded requests) or the tile-URL template (for RESTful requests). The tile-URL template should contain the following variables: &#123;style&#125;, &#123;TileMatrixSet&#125;, &#123;TileMatrix&#125;, &#123;TileRow&#125;, &#123;TileCol&#125;. The first two are optional if actual values are hardcoded or not required by the server. The &#123;s&#125; keyword may be used to specify subdomains.
     * @param {String} [options.format='image/jpeg'] The MIME type for images to retrieve from the server.
     * @param {String} options.layer The layer name for WMTS requests.
     * @param {String} options.style The style name for WMTS requests.
     * @param {String} options.tileMatrixSetID The identifier of the TileMatrixSet to use for WMTS requests.
     * @param {Array} [options.tileMatrixLabels] A list of identifiers in the TileMatrix to use for WMTS requests, one per TileMatrix level.
     * @param {Clock} [options.clock] A Clock instance that is used when determining the value for the time dimension. Required when options.times is specified.
     * @param {TimeIntervalCollection} [options.times] TimeIntervalCollection with its <code>data</code> property being an object containing time dynamic dimension and their values.
     * @param {Object} [options.dimensions] A object containing static dimensions and their values.
     * @param {Number} [options.tileWidth=256] The tile width in pixels.
     * @param {Number} [options.tileHeight=256] The tile height in pixels.
     * @param {TilingScheme} [options.tilingScheme] The tiling scheme corresponding to the organization of the tiles in the TileMatrixSet.
     * @param {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle covered by the layer.
     * @param {Number} [options.minimumLevel=0] The minimum level-of-detail supported by the imagery provider.
     * @param {Number} [options.maximumLevel] The maximum level-of-detail supported by the imagery provider, or undefined if there is no limit.
     * @param {Ellipsoid} [options.ellipsoid] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
     * @param {Credit|String} [options.credit] A credit for the data source, which is displayed on the canvas.
     * @param {String|String[]} [options.subdomains='abc'] The subdomains to use for the <code>{s}</code> placeholder in the URL template.
     *                          If this parameter is a single string, each character in the string is a subdomain.  If it is
     *                          an array, each element in the array is a subdomain.
     *
     * @demo {@link https://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Web%20Map%20Tile%20Service%20with%20Time.html|Cesium Sandcastle Web Map Tile Service with Time Demo}
     *
     * @example
     * // Example 1. USGS shaded relief tiles (KVP)
     * var shadedRelief1 = new Cesium.WebMapTileServiceImageryProvider({
     *     url : 'http://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/WMTS',
     *     layer : 'USGSShadedReliefOnly',
     *     style : 'default',
     *     format : 'image/jpeg',
     *     tileMatrixSetID : 'default028mm',
     *     // tileMatrixLabels : ['default028mm:0', 'default028mm:1', 'default028mm:2' ...],
     *     maximumLevel: 19,
     *     credit : new Cesium.Credit('U. S. Geological Survey')
     * });
     * viewer.imageryLayers.addImageryProvider(shadedRelief1);
     *
     * @example
     * // Example 2. USGS shaded relief tiles (RESTful)
     * var shadedRelief2 = new Cesium.WebMapTileServiceImageryProvider({
     *     url : 'http://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/WMTS/tile/1.0.0/USGSShadedReliefOnly/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpg',
     *     layer : 'USGSShadedReliefOnly',
     *     style : 'default',
     *     format : 'image/jpeg',
     *     tileMatrixSetID : 'default028mm',
     *     maximumLevel: 19,
     *     credit : new Cesium.Credit('U. S. Geological Survey')
     * });
     * viewer.imageryLayers.addImageryProvider(shadedRelief2);
     *
     * @example
     * // Example 3. NASA time dynamic weather data (RESTful)
     * var times = Cesium.TimeIntervalCollection.fromIso8601({
     *     iso8601: '2015-07-30/2017-06-16/P1D',
     *     dataCallback: function dataCallback(interval, index) {
     *         return {
     *             Time: Cesium.JulianDate.toIso8601(interval.start)
     *         };
     *     }
     * });
     * var weather = new Cesium.WebMapTileServiceImageryProvider({
     *     url : 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/AMSR2_Snow_Water_Equivalent/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png',
     *     layer : 'AMSR2_Snow_Water_Equivalent',
     *     style : 'default',
     *     tileMatrixSetID : '2km',
     *     maximumLevel : 5,
     *     format : 'image/png',
     *     clock: clock,
     *     times: times,
     *     credit : new Cesium.Credit('NASA Global Imagery Browse Services for EOSDIS')
     * });
     * viewer.imageryLayers.addImageryProvider(weather);
     *
     * @see ArcGisMapServerImageryProvider
     * @see BingMapsImageryProvider
     * @see GoogleEarthEnterpriseMapsProvider
     * @see createOpenStreetMapImageryProvider
     * @see SingleTileImageryProvider
     * @see createTileMapServiceImageryProvider
     * @see WebMapServiceImageryProvider
     * @see UrlTemplateImageryProvider
     */
    function WebMapTileServiceImageryProvider(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.url)) {
            throw new DeveloperError('options.url is required.');
        }
        if (!defined(options.layer)) {
            throw new DeveloperError('options.layer is required.');
        }
        if (!defined(options.style)) {
            throw new DeveloperError('options.style is required.');
        }
        if (!defined(options.tileMatrixSetID)) {
            throw new DeveloperError('options.tileMatrixSetID is required.');
        }
        if (defined(options.times) && !defined(options.clock)) {
            throw new DeveloperError('options.times was specified, so options.clock is required.');
        }
        //>>includeEnd('debug');

        var resource = Resource.createIfNeeded(options.url);

        var style = options.style;
        var tileMatrixSetID = options.tileMatrixSetID;
        var url = resource.url;
        if (url.indexOf('{') >= 0) {
            var templateValues = {
                style : style,
                Style : style,
                TileMatrixSet : tileMatrixSetID
            };

            resource.setTemplateValues(templateValues);
            this._useKvp = false;
        } else {
            resource.setQueryParameters(defaultParameters);
            this._useKvp = true;
        }

        this._resource = resource;
        this._layer = options.layer;
        this._style = style;
        this._tileMatrixSetID = tileMatrixSetID;
        this._tileMatrixLabels = options.tileMatrixLabels;
        this._format = defaultValue(options.format, 'image/jpeg');
        this._tileDiscardPolicy = options.tileDiscardPolicy;

        this._tilingScheme = defined(options.tilingScheme) ? options.tilingScheme : new WebMercatorTilingScheme({ellipsoid : options.ellipsoid});
        this._tileWidth = defaultValue(options.tileWidth, 256);
        this._tileHeight = defaultValue(options.tileHeight, 256);

        this._minimumLevel = defaultValue(options.minimumLevel, 0);
        this._maximumLevel = options.maximumLevel;

        this._rectangle = defaultValue(options.rectangle, this._tilingScheme.rectangle);
        this._dimensions = options.dimensions;

        var that = this;
        this._reload = undefined;
        if (defined(options.times)) {
            this._timeDynamicImagery = new TimeDynamicImagery({
                clock : options.clock,
                times : options.times,
                requestImageFunction : function(x, y, level, request, interval) {
                    return requestImage(that, x, y, level, request, interval);
                },
                reloadFunction : function() {
                    if (defined(that._reload)) {
                        that._reload();
                    }
                }
            });
        }

        this._readyPromise = when.resolve(true);

        // Check the number of tiles at the minimum level.  If it's more than four,
        // throw an exception, because starting at the higher minimum
        // level will cause too many tiles to be downloaded and rendered.
        var swTile = this._tilingScheme.positionToTileXY(Rectangle.southwest(this._rectangle), this._minimumLevel);
        var neTile = this._tilingScheme.positionToTileXY(Rectangle.northeast(this._rectangle), this._minimumLevel);
        var tileCount = (Math.abs(neTile.x - swTile.x) + 1) * (Math.abs(neTile.y - swTile.y) + 1);
        //>>includeStart('debug', pragmas.debug);
        if (tileCount > 4) {
            throw new DeveloperError('The imagery provider\'s rectangle and minimumLevel indicate that there are ' + tileCount + ' tiles at the minimum level. Imagery providers with more than four tiles at the minimum level are not supported.');
        }
        //>>includeEnd('debug');

        this._errorEvent = new Event();

        var credit = options.credit;
        this._credit = typeof credit === 'string' ? new Credit(credit) : credit;

        this._subdomains = options.subdomains;
        if (isArray(this._subdomains)) {
            this._subdomains = this._subdomains.slice();
        } else if (defined(this._subdomains) && this._subdomains.length > 0) {
            this._subdomains = this._subdomains.split('');
        } else {
            this._subdomains = ['a', 'b', 'c'];
        }
    }

    function requestImage(imageryProvider, col, row, level, request, interval) {
        var labels = imageryProvider._tileMatrixLabels;
        var tileMatrix = defined(labels) ? labels[level] : level.toString();
        var subdomains = imageryProvider._subdomains;
        var staticDimensions = imageryProvider._dimensions;
        var dynamicIntervalData = defined(interval) ? interval.data : undefined;

        var resource;
        if (!imageryProvider._useKvp) {
            var templateValues = {
                TileMatrix: tileMatrix,
                TileRow: row.toString(),
                TileCol: col.toString(),
                s: subdomains[(col + row + level) % subdomains.length]
            };

            resource = imageryProvider._resource.getDerivedResource({
                request: request
            });
            resource.setTemplateValues(templateValues);

            if (defined(staticDimensions)) {
                resource.setTemplateValues(staticDimensions);
            }

            if (defined(dynamicIntervalData)) {
                resource.setTemplateValues(dynamicIntervalData);
            }
        } else {
            // build KVP request
            var query = {};
            query.tilematrix = tileMatrix;
            query.layer = imageryProvider._layer;
            query.style = imageryProvider._style;
            query.tilerow = row;
            query.tilecol = col;
            query.tilematrixset = imageryProvider._tileMatrixSetID;
            query.format = imageryProvider._format;

            if (defined(staticDimensions)) {
                query = combine(query, staticDimensions);
            }

            if (defined(dynamicIntervalData)) {
                query = combine(query, dynamicIntervalData);
            }
            resource = imageryProvider._resource.getDerivedResource({
                queryParameters: query,
                request: request
            });
        }

        return ImageryProvider.loadImage(imageryProvider, resource);
    }

    defineProperties(WebMapTileServiceImageryProvider.prototype, {
        /**
         * Gets the URL of the service hosting the imagery.
         * @memberof WebMapTileServiceImageryProvider.prototype
         * @type {String}
         * @readonly
         */
        url : {
            get : function() {
                return this._resource.url;
            }
        },

        /**
         * Gets the proxy used by this provider.
         * @memberof WebMapTileServiceImageryProvider.prototype
         * @type {Proxy}
         * @readonly
         */
        proxy : {
            get : function() {
                return this._resource.proxy;
            }
        },

        /**
         * Gets the width of each tile, in pixels. This function should
         * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
         * @memberof WebMapTileServiceImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        tileWidth : {
            get : function() {
                return this._tileWidth;
            }
        },

        /**
         * Gets the height of each tile, in pixels.  This function should
         * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
         * @memberof WebMapTileServiceImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        tileHeight : {
            get : function() {
                return this._tileHeight;
            }
        },

        /**
         * Gets the maximum level-of-detail that can be requested.  This function should
         * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
         * @memberof WebMapTileServiceImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        maximumLevel : {
            get : function() {
                return this._maximumLevel;
            }
        },

        /**
         * Gets the minimum level-of-detail that can be requested.  This function should
         * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
         * @memberof WebMapTileServiceImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        minimumLevel : {
            get : function() {
                return this._minimumLevel;
            }
        },

        /**
         * Gets the tiling scheme used by this provider.  This function should
         * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
         * @memberof WebMapTileServiceImageryProvider.prototype
         * @type {TilingScheme}
         * @readonly
         */
        tilingScheme : {
            get : function() {
                return this._tilingScheme;
            }
        },

        /**
         * Gets the rectangle, in radians, of the imagery provided by this instance.  This function should
         * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
         * @memberof WebMapTileServiceImageryProvider.prototype
         * @type {Rectangle}
         * @readonly
         */
        rectangle : {
            get : function() {
                return this._rectangle;
            }
        },

        /**
         * Gets the tile discard policy.  If not undefined, the discard policy is responsible
         * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
         * returns undefined, no tiles are filtered.  This function should
         * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
         * @memberof WebMapTileServiceImageryProvider.prototype
         * @type {TileDiscardPolicy}
         * @readonly
         */
        tileDiscardPolicy : {
            get : function() {
                return this._tileDiscardPolicy;
            }
        },

        /**
         * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
         * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
         * are passed an instance of {@link TileProviderError}.
         * @memberof WebMapTileServiceImageryProvider.prototype
         * @type {Event}
         * @readonly
         */
        errorEvent : {
            get : function() {
                return this._errorEvent;
            }
        },

        /**
         * Gets the mime type of images returned by this imagery provider.
         * @memberof WebMapTileServiceImageryProvider.prototype
         * @type {String}
         * @readonly
         */
        format : {
            get : function() {
                return this._format;
            }
        },

        /**
         * Gets a value indicating whether or not the provider is ready for use.
         * @memberof WebMapTileServiceImageryProvider.prototype
         * @type {Boolean}
         * @readonly
         */
        ready : {
            value : true
        },

        /**
         * Gets a promise that resolves to true when the provider is ready for use.
         * @memberof WebMapTileServiceImageryProvider.prototype
         * @type {Promise.<Boolean>}
         * @readonly
         */
        readyPromise : {
            get : function() {
                return this._readyPromise;
            }
        },

        /**
         * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
         * the source of the imagery.  This function should not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
         * @memberof WebMapTileServiceImageryProvider.prototype
         * @type {Credit}
         * @readonly
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
         * as if their alpha is 1.0 everywhere.  When this property is false, memory usage
         * and texture upload time are reduced.
         * @memberof WebMapTileServiceImageryProvider.prototype
         * @type {Boolean}
         * @readonly
         */
        hasAlphaChannel : {
            get : function() {
                return true;
            }
        },
        /**
         * Gets or sets a clock that is used to get keep the time used for time dynamic parameters.
         * @memberof WebMapTileServiceImageryProvider.prototype
         * @type {Clock}
         */
        clock : {
            get : function() {
                return this._timeDynamicImagery.clock;
            },
            set : function(value) {
                this._timeDynamicImagery.clock = value;
            }
        },
        /**
         * Gets or sets a time interval collection that is used to get time dynamic parameters. The data of each
         * TimeInterval is an object containing the keys and values of the properties that are used during
         * tile requests.
         * @memberof WebMapTileServiceImageryProvider.prototype
         * @type {TimeIntervalCollection}
         */
        times : {
            get : function() {
                return this._timeDynamicImagery.times;
            },
            set : function(value) {
                this._timeDynamicImagery.times = value;
            }
        },
        /**
         * Gets or sets an object that contains static dimensions and their values.
         * @memberof WebMapTileServiceImageryProvider.prototype
         * @type {Object}
         */
        dimensions : {
            get : function() {
                return this._dimensions;
            },
            set : function(value) {
                if (this._dimensions !== value) {
                    this._dimensions = value;
                    if (defined(this._reload)) {
                        this._reload();
                    }
                }
            }
        }
    });

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
    WebMapTileServiceImageryProvider.prototype.getTileCredits = function(x, y, level) {
        return undefined;
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @param {Request} [request] The request object. Intended for internal use only.
     * @returns {Promise.<Image|Canvas>|undefined} A promise for the image that will resolve when the image is available, or
     *          undefined if there are too many active requests to the server, and the request
     *          should be retried later.  The resolved image may be either an
     *          Image or a Canvas DOM object.
     *
     * @exception {DeveloperError} <code>requestImage</code> must not be called before the imagery provider is ready.
     */
    WebMapTileServiceImageryProvider.prototype.requestImage = function(x, y, level, request) {
        var result;
        var timeDynamicImagery = this._timeDynamicImagery;
        var currentInterval;

        // Try and load from cache
        if (defined(timeDynamicImagery)) {
            currentInterval = timeDynamicImagery.currentInterval;
            result = timeDynamicImagery.getFromCache(x, y, level, request);
        }

        // Couldn't load from cache
        if (!defined(result)) {
            result = requestImage(this, x, y, level, request, currentInterval);
        }

        // If we are approaching an interval, preload this tile in the next interval
        if (defined(result) && defined(timeDynamicImagery)) {
            timeDynamicImagery.checkApproachingInterval(x, y, level, request);
        }

        return result;
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
    WebMapTileServiceImageryProvider.prototype.pickFeatures = function(x, y, level, longitude, latitude) {
        return undefined;
    };

    return WebMapTileServiceImageryProvider;
});
