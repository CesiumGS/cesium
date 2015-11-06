/*global define*/
define([
        '../Core/combine',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/deprecationWarning',
        '../Core/DeveloperError',
        '../Core/freezeObject',
        '../Core/GeographicTilingScheme',
        '../Core/objectToQuery',
        '../Core/queryToObject',
        '../Core/WebMercatorTilingScheme',
        '../ThirdParty/Uri',
        './GetFeatureInfoFormat',
        './UrlTemplateImageryProvider'
    ], function(
        combine,
        defaultValue,
        defined,
        defineProperties,
        deprecationWarning,
        DeveloperError,
        freezeObject,
        GeographicTilingScheme,
        objectToQuery,
        queryToObject,
        WebMercatorTilingScheme,
        Uri,
        GetFeatureInfoFormat,
        UrlTemplateImageryProvider) {
    "use strict";

    /**
     * Provides tiled imagery hosted by a Web Map Service (WMS) server.
     *
     * @alias WebMapServiceImageryProvider
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {String} options.url The URL of the WMS service. The URL supports the same keywords as the {@link UrlTemplateImageryProvider}.
     * @param {String} options.layers The layers to include, separated by commas.
     * @param {Object} [options.parameters=WebMapServiceImageryProvider.DefaultParameters] Additional parameters
     *        to pass to the WMS server in the GetMap URL.
     * @param {Object} [options.getFeatureInfoParameters=WebMapServiceImageryProvider.GetFeatureInfoDefaultParameters] Additional
     *        parameters to pass to the WMS server in the GetFeatureInfo URL.
     * @param {Boolean} [options.enablePickFeatures=true] If true, {@link WebMapServiceImageryProvider#pickFeatures} will invoke
     *        the GetFeatureInfo operation on the WMS server and return the features included in the response.  If false,
     *        {@link WebMapServiceImageryProvider#pickFeatures} will immediately return undefined (indicating no pickable features)
     *        without communicating with the server.  Set this property to false if you know your WMS server does not support
     *        GetFeatureInfo or if you don't want this provider's features to be pickable.
     * @param {GetFeatureInfoFormat[]} [options.getFeatureInfoFormats=WebMapServiceImageryProvider.DefaultGetFeatureInfoFormats] The formats
     *        in which to try WMS GetFeatureInfo requests.
     * @param {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle of the layer.
     * @param {TilingScheme} [options.tilingScheme=new GeographicTilingScheme()] The tiling scheme to use to divide the world into tiles.
     * @param {Ellipsoid} [options.ellipsoid] The ellipsoid.  If the tilingScheme is specified,
     *        this parameter is ignored and the tiling scheme's ellipsoid is used instead. If neither
     *        parameter is specified, the WGS84 ellipsoid is used.
     * @param {Number} [options.tileWidth=256] The width of each tile in pixels.
     * @param {Number} [options.tileHeight=256] The height of each tile in pixels.
     * @param {Number} [options.minimumLevel=0] The minimum level-of-detail supported by the imagery provider.  Take care when
     *        specifying this that the number of tiles at the minimum level is small, such as four or less.  A larger number is
     *        likely to result in rendering problems.
     * @param {Number} [options.maximumLevel] The maximum level-of-detail supported by the imagery provider, or undefined if there is no limit.
     *        If not specified, there is no limit.
     * @param {Credit|String} [options.credit] A credit for the data source, which is displayed on the canvas.
     * @param {Object} [options.proxy] A proxy to use for requests. This object is
     *        expected to have a getURL function which returns the proxied URL, if needed.
     * @param {String|String[]} [options.subdomains='abc'] The subdomains to use for the <code>{s}</code> placeholder in the URL template.
     *                          If this parameter is a single string, each character in the string is a subdomain.  If it is
     *                          an array, each element in the array is a subdomain.
     *
     * @see ArcGisMapServerImageryProvider
     * @see BingMapsImageryProvider
     * @see GoogleEarthImageryProvider
     * @see OpenStreetMapImageryProvider
     * @see SingleTileImageryProvider
     * @see TileMapServiceImageryProvider
     * @see WebMapTileServiceImageryProvider
     * @see UrlTemplateImageryProvider
     *
     * @see {@link http://resources.esri.com/help/9.3/arcgisserver/apis/rest/|ArcGIS Server REST API}
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     *
     * @example
     * var provider = new Cesium.WebMapServiceImageryProvider({
     *     url: '//sampleserver1.arcgisonline.com/ArcGIS/services/Specialty/ESRI_StatesCitiesRivers_USA/MapServer/WMSServer',
     *     layers : '0',
     *     proxy: new Cesium.DefaultProxy('/proxy/')
     * });
     *
     * viewer.imageryLayers.addImageryProvider(provider);
     */
    var WebMapServiceImageryProvider = function WebMapServiceImageryProvider(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.url)) {
            throw new DeveloperError('options.url is required.');
        }
        if (!defined(options.layers)) {
            throw new DeveloperError('options.layers is required.');
        }
        //>>includeEnd('debug');

        this._url = options.url;
        this._layers = options.layers;

        var getFeatureInfoFormats = defaultValue(options.getFeatureInfoFormats, WebMapServiceImageryProvider.DefaultGetFeatureInfoFormats);

        // Build the template URLs for tiles and pickFeatures.
        var uri = new Uri(options.url);
        var queryOptions = queryToObject(defaultValue(uri.query, ''));
        var parameters = combine(objectToLowercase(defaultValue(options.parameters, defaultValue.EMPTY_OBJECT)), WebMapServiceImageryProvider.DefaultParameters);
        queryOptions = combine(parameters, queryOptions);

        var pickFeaturesUri;
        var pickFeaturesQueryOptions;
        if (defaultValue(options.enablePickFeatures, true)) {
            pickFeaturesUri = new Uri(options.url);
            pickFeaturesQueryOptions = queryToObject(defaultValue(pickFeaturesUri.query, ''));
            var pickFeaturesParameters = combine(objectToLowercase(defaultValue(options.getFeatureInfoParameters, defaultValue.EMPTY_OBJECT)), WebMapServiceImageryProvider.GetFeatureInfoDefaultParameters);
            pickFeaturesQueryOptions = combine(pickFeaturesParameters, pickFeaturesQueryOptions);
        }

        function setParameter(name, value) {
            if (!defined(queryOptions[name])) {
                queryOptions[name] = value;
            }

            if (defined(pickFeaturesQueryOptions) && !defined(pickFeaturesQueryOptions[name])) {
                pickFeaturesQueryOptions[name] = value;
            }
        }

        setParameter('layers', options.layers);
        setParameter('srs', options.tilingScheme instanceof WebMercatorTilingScheme ? 'EPSG:3857' : 'EPSG:4326');
        setParameter('bbox', '{westProjected},{southProjected},{eastProjected},{northProjected}');
        setParameter('width', '{width}');
        setParameter('height', '{height}');

        uri.query = objectToQuery(queryOptions);

        // objectToQuery escapes the placeholders.  Undo that.
        var templateUrl = uri.toString().replace(/%7B/g, '{').replace(/%7D/g, '}');

        var pickFeaturesTemplateUrl;
        if (defined(pickFeaturesQueryOptions)) {
            if (!defined(pickFeaturesQueryOptions.query_layers)) {
                pickFeaturesQueryOptions.query_layers = options.layers;
            }

            if (!defined(pickFeaturesQueryOptions.x)) {
                pickFeaturesQueryOptions.x = '{i}';
            }

            if (!defined(pickFeaturesQueryOptions.y)) {
                pickFeaturesQueryOptions.y = '{j}';
            }

            if (!defined(pickFeaturesQueryOptions.info_format)) {
                pickFeaturesQueryOptions.info_format = '{format}';
            }

            pickFeaturesUri.query = objectToQuery(pickFeaturesQueryOptions);
            pickFeaturesTemplateUrl = pickFeaturesUri.toString().replace(/%7B/g, '{').replace(/%7D/g, '}');
        }

        // Let UrlTemplateImageryProvider do the actual URL building.
        this._tileProvider = new UrlTemplateImageryProvider({
            url : templateUrl,
            pickFeaturesUrl : pickFeaturesTemplateUrl,
            tilingScheme : defaultValue(options.tilingScheme, new GeographicTilingScheme({ ellipsoid : options.ellipsoid})),
            rectangle : options.rectangle,
            tileWidth : options.tileWidth,
            tileHeight : options.tileHeight,
            minimumLevel : options.minimumLevel,
            maximumLevel : options.maximumLevel,
            proxy : options.proxy,
            subdomains: options.subdomains,
            tileDiscardPolicy : options.tileDiscardPolicy,
            credit : options.credit,
            getFeatureInfoFormats : getFeatureInfoFormats
        });
    };

    defineProperties(WebMapServiceImageryProvider.prototype, {
        /**
         * Gets the URL of the WMS server.
         * @memberof WebMapServiceImageryProvider.prototype
         * @type {String}
         * @readonly
         */
        url : {
            get : function() {
                return this._url;
            }
        },

        /**
         * Gets the proxy used by this provider.
         * @memberof WebMapServiceImageryProvider.prototype
         * @type {Proxy}
         * @readonly
         */
        proxy : {
            get : function() {
                return this._tileProvider.proxy;
            }
        },

        /**
         * Gets the names of the WMS layers, separated by commas.
         * @memberof WebMapServiceImageryProvider.prototype
         * @type {String}
         * @readonly
         */
        layers : {
            get : function() {
                return this._layers;
            }
        },

        /**
         * Gets the width of each tile, in pixels. This function should
         * not be called before {@link WebMapServiceImageryProvider#ready} returns true.
         * @memberof WebMapServiceImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        tileWidth : {
            get : function() {
                return this._tileProvider.tileWidth;
            }
        },

        /**
         * Gets the height of each tile, in pixels.  This function should
         * not be called before {@link WebMapServiceImageryProvider#ready} returns true.
         * @memberof WebMapServiceImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        tileHeight : {
            get : function() {
                return this._tileProvider.tileHeight;
            }
        },

        /**
         * Gets the maximum level-of-detail that can be requested.  This function should
         * not be called before {@link WebMapServiceImageryProvider#ready} returns true.
         * @memberof WebMapServiceImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        maximumLevel : {
            get : function() {
                return this._tileProvider.maximumLevel;
            }
        },

        /**
         * Gets the minimum level-of-detail that can be requested.  This function should
         * not be called before {@link WebMapServiceImageryProvider#ready} returns true.
         * @memberof WebMapServiceImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        minimumLevel : {
            get : function() {
                return this._tileProvider.minimumLevel;
            }
        },

        /**
         * Gets the tiling scheme used by this provider.  This function should
         * not be called before {@link WebMapServiceImageryProvider#ready} returns true.
         * @memberof WebMapServiceImageryProvider.prototype
         * @type {TilingScheme}
         * @readonly
         */
        tilingScheme : {
            get : function() {
                return this._tileProvider.tilingScheme;
            }
        },

        /**
         * Gets the rectangle, in radians, of the imagery provided by this instance.  This function should
         * not be called before {@link WebMapServiceImageryProvider#ready} returns true.
         * @memberof WebMapServiceImageryProvider.prototype
         * @type {Rectangle}
         * @readonly
         */
        rectangle : {
            get : function() {
                return this._tileProvider.rectangle;
            }
        },

        /**
         * Gets the tile discard policy.  If not undefined, the discard policy is responsible
         * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
         * returns undefined, no tiles are filtered.  This function should
         * not be called before {@link WebMapServiceImageryProvider#ready} returns true.
         * @memberof WebMapServiceImageryProvider.prototype
         * @type {TileDiscardPolicy}
         * @readonly
         */
        tileDiscardPolicy : {
            get : function() {
                return this._tileProvider.tileDiscardPolicy;
            }
        },

        /**
         * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
         * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
         * are passed an instance of {@link TileProviderError}.
         * @memberof WebMapServiceImageryProvider.prototype
         * @type {Event}
         * @readonly
         */
        errorEvent : {
            get : function() {
                return this._tileProvider.errorEvent;
            }
        },

        /**
         * Gets a value indicating whether or not the provider is ready for use.
         * @memberof WebMapServiceImageryProvider.prototype
         * @type {Boolean}
         * @readonly
         */
        ready : {
            get : function() {
                return this._tileProvider.ready;
            }
        },

        /**
         * Gets a promise that resolves to true when the provider is ready for use.
         * @memberof WebMapServiceImageryProvider.prototype
         * @type {Promise.<Boolean>}
         * @readonly
         */
        readyPromise : {
            get : function() {
                return this._tileProvider.readyPromise;
            }
        },

        /**
         * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
         * the source of the imagery.  This function should not be called before {@link WebMapServiceImageryProvider#ready} returns true.
         * @memberof WebMapServiceImageryProvider.prototype
         * @type {Credit}
         * @readonly
         */
        credit : {
            get : function() {
                return this._tileProvider.credit;
            }
        },

        /**
         * Gets a value indicating whether or not the images provided by this imagery provider
         * include an alpha channel.  If this property is false, an alpha channel, if present, will
         * be ignored.  If this property is true, any images without an alpha channel will be treated
         * as if their alpha is 1.0 everywhere.  When this property is false, memory usage
         * and texture upload time are reduced.
         * @memberof WebMapServiceImageryProvider.prototype
         * @type {Boolean}
         * @readonly
         */
        hasAlphaChannel : {
            get : function() {
                return this._tileProvider.hasAlphaChannel;
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
    WebMapServiceImageryProvider.prototype.getTileCredits = function(x, y, level) {
        return this._tileProvider.getTileCredits(x, y, level);
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link WebMapServiceImageryProvider#ready} returns true.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @returns {Promise.<Image|Canvas>|undefined} A promise for the image that will resolve when the image is available, or
     *          undefined if there are too many active requests to the server, and the request
     *          should be retried later.  The resolved image may be either an
     *          Image or a Canvas DOM object.
     *
     * @exception {DeveloperError} <code>requestImage</code> must not be called before the imagery provider is ready.
     */
    WebMapServiceImageryProvider.prototype.requestImage = function(x, y, level) {
        return this._tileProvider.requestImage(x, y, level);
    };

    /**
     * Asynchronously determines what features, if any, are located at a given longitude and latitude within
     * a tile.  This function should not be called before {@link ImageryProvider#ready} returns true.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @param {Number} longitude The longitude at which to pick features.
     * @param {Number} latitude  The latitude at which to pick features.
     * @return {Promise.<ImageryLayerFeatureInfo[]>|undefined} A promise for the picked features that will resolve when the asynchronous
     *                   picking completes.  The resolved value is an array of {@link ImageryLayerFeatureInfo}
     *                   instances.  The array may be empty if no features are found at the given location.
     *
     * @exception {DeveloperError} <code>pickFeatures</code> must not be called before the imagery provider is ready.
     */
    WebMapServiceImageryProvider.prototype.pickFeatures = function(x, y, level, longitude, latitude) {
        return this._tileProvider.pickFeatures(x, y, level, longitude, latitude);
    };

    /**
     * The default parameters to include in the WMS URL to obtain images.  The values are as follows:
     *    service=WMS
     *    version=1.1.1
     *    request=GetMap
     *    styles=
     *    format=image/jpeg
     *
     * @constant
     */
    WebMapServiceImageryProvider.DefaultParameters = freezeObject({
        service : 'WMS',
        version : '1.1.1',
        request : 'GetMap',
        styles : '',
        format : 'image/jpeg'
    });

    /**
     * The default parameters to include in the WMS URL to get feature information.  The values are as follows:
     *     service=WMS
     *     version=1.1.1
     *     request=GetFeatureInfo
     *
     * @constant
     */
    WebMapServiceImageryProvider.GetFeatureInfoDefaultParameters = freezeObject({
        service : 'WMS',
        version : '1.1.1',
        request : 'GetFeatureInfo'
    });

    WebMapServiceImageryProvider.DefaultGetFeatureInfoFormats = freezeObject([
        freezeObject(new GetFeatureInfoFormat('json', 'application/json')),
        freezeObject(new GetFeatureInfoFormat('xml', 'text/xml')),
        freezeObject(new GetFeatureInfoFormat('text', 'text/html'))
    ]);

    function objectToLowercase(obj) {
        var result = {};
        for ( var key in obj) {
            if (obj.hasOwnProperty(key)) {
                result[key.toLowerCase()] = obj[key];
            }
        }
        return result;
    }

    return WebMapServiceImageryProvider;
});
