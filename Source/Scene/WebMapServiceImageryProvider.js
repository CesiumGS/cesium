/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/combine',
        '../Core/Credit',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/freezeObject',
        '../Core/GeographicTilingScheme',
        '../Core/loadJson',
        '../Core/loadXML',
        '../Core/Math',
        '../Core/objectToQuery',
        '../Core/queryToObject',
        '../Core/Rectangle',
        '../Core/WebMercatorTilingScheme',
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        './ImageryLayerFeatureInfo',
        './ImageryProvider'
    ], function(
        Cartesian3,
        Cartographic,
        combine,
        Credit,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        freezeObject,
        GeographicTilingScheme,
        loadJson,
        loadXML,
        CesiumMath,
        objectToQuery,
        queryToObject,
        Rectangle,
        WebMercatorTilingScheme,
        Uri,
        when,
        ImageryLayerFeatureInfo,
        ImageryProvider) {
    "use strict";

    function objectToLowercase(obj) {
        var result = {};
        for ( var key in obj) {
            if (obj.hasOwnProperty(key)) {
                result[key.toLowerCase()] = obj[key];
            }
        }
        return result;
    }

    /**
     * Provides tiled imagery hosted by a Web Map Service (WMS) server.
     *
     * @alias WebMapServiceImageryProvider
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {String} options.url The URL of the WMS service.
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
     * @param {Boolean} [options.getFeatureInfoAsGeoJson=true] true if {@link WebMapServiceImageryProvider#pickFeatures} should
     *        try requesting feature info in GeoJSON format. If getFeatureInfoAsXml is true as well, feature information will be
     *        requested first as GeoJSON, and then as XML if the GeoJSON request fails.  If both are false, this instance will
     *        not support feature picking at all.
     * @param {Boolean} [options.getFeatureInfoAsXml=true] true if {@link WebMapServiceImageryProvider#pickFeatures} should try
     *        requesting feature info in XML format. If getFeatureInfoAsGeoJson is true as well, feature information will be
     *        requested first as GeoJSON, and then as XML if the GeoJSON request fails.  If both are false, this instance
     *        will not support feature picking at all.
     * @param {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle of the layer.
     * @param {TilingScheme} [options.tilingScheme=new GeographicTilingScheme()] The tiling scheme to use to divide the world into tiles.
     * @param {Number} [options.tileWidth=256] The width of each tile in pixels.
     * @param {Number} [options.tileHeight=256] The height of each tile in pixels.
     * @param {Number} [options.minimumLevel=0] The minimum level-of-detail supported by the imagery provider.  Take care when
     *        specifying this that the number of tiles at the minimum level is small, such as four or less.  A larger number is
     *        likely to result in rendering problems.
     * @param {Number} [options.maximumLevel] The maximum level-of-detail supported by the imagery provider.
     *        If not specified, there is no limit.
     * @param {Credit|String} [options.credit] A credit for the data source, which is displayed on the canvas.
     * @param {Object} [options.proxy] A proxy to use for requests. This object is
     *        expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @see ArcGisMapServerImageryProvider
     * @see BingMapsImageryProvider
     * @see GoogleEarthImageryProvider
     * @see SingleTileImageryProvider
     * @see TileMapServiceImageryProvider
     * @see OpenStreetMapImageryProvider
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
        this._tileDiscardPolicy = options.tileDiscardPolicy;
        this._proxy = options.proxy;
        this._layers = options.layers;
        this._enablePickFeatures = defaultValue(options.enablePickFeatures, true);
        this._getFeatureInfoAsGeoJson = defaultValue(options.getFeatureInfoAsGeoJson, true);
        this._getFeatureInfoAsXml = defaultValue(options.getFeatureInfoAsXml, true);

        // Merge the parameters with the defaults, and make all parameter names lowercase
        this._parameters = combine(objectToLowercase(defaultValue(options.parameters, defaultValue.EMPTY_OBJECT)), WebMapServiceImageryProvider.DefaultParameters);
        this._getFeatureInfoParameters = combine(objectToLowercase(defaultValue(options.getFeatureInfoParameters, defaultValue.EMPTY_OBJECT)), WebMapServiceImageryProvider.GetFeatureInfoDefaultParameters);

        this._tileWidth = defaultValue(options.tileWidth, 256);
        this._tileHeight = defaultValue(options.tileHeight, 256);
        this._minimumLevel = defaultValue(options.minimumLevel, 0);
        this._maximumLevel = options.maximumLevel; // undefined means no limit

        this._rectangle = defaultValue(options.rectangle, Rectangle.MAX_VALUE);
        this._tilingScheme = defined(options.tilingScheme) ? options.tilingScheme : new GeographicTilingScheme();

        this._rectangle = Rectangle.intersection(this._rectangle, this._tilingScheme.rectangle);

        var credit = options.credit;
        if (typeof credit === 'string') {
            credit = new Credit(credit);
        }
        this._credit = credit;

        this._errorEvent = new Event();

        this._ready = true;
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
                return this._proxy;
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
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('tileWidth must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._tileWidth;
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
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('tileHeight must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._tileHeight;
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
         * not be called before {@link WebMapServiceImageryProvider#ready} returns true.
         * @memberof WebMapServiceImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        minimumLevel : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('minimumLevel must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._minimumLevel;
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
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('tilingScheme must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._tilingScheme;
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
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('rectangle must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._rectangle;
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
         * @memberof WebMapServiceImageryProvider.prototype
         * @type {Event}
         * @readonly
         */
        errorEvent : {
            get : function() {
                return this._errorEvent;
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
                return this._ready;
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
                return this._credit;
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
                return true;
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
        return undefined;
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link WebMapServiceImageryProvider#ready} returns true.
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
    WebMapServiceImageryProvider.prototype.requestImage = function(x, y, level) {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('requestImage must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        var url = buildImageUrl(this, x, y, level);
        return ImageryProvider.loadImage(this, url);
    };

    var cartographicScratch = new Cartographic();
    var cartesian3Scratch = new Cartesian3();

    /**
     * Asynchronously determines what features, if any, are located at a given longitude and latitude within
     * a tile.  This function should not be called before {@link ImageryProvider#ready} returns true.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @param {Number} longitude The longitude at which to pick features.
     * @param {Number} latitude  The latitude at which to pick features.
     * @return {Promise} A promise for the picked features that will resolve when the asynchronous
     *                   picking completes.  The resolved value is an array of {@link ImageryLayerFeatureInfo}
     *                   instances.  The array may be empty if no features are found at the given location.
     *
     * @exception {DeveloperError} <code>pickFeatures</code> must not be called before the imagery provider is ready.
     */
    WebMapServiceImageryProvider.prototype.pickFeatures = function(x, y, level, longitude, latitude) {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('pickFeatures must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        if (!this._enablePickFeatures) {
            return undefined;
        }

        var rectangle = this._tilingScheme.tileXYToNativeRectangle(x, y, level);

        var projected;
        if (this._tilingScheme instanceof GeographicTilingScheme) {
            projected = cartesian3Scratch;
            projected.x = CesiumMath.toDegrees(longitude);
            projected.y = CesiumMath.toDegrees(latitude);
        } else {
            var cartographic = cartographicScratch;
            cartographic.longitude = longitude;
            cartographic.latitude = latitude;

            projected = this._tilingScheme.projection.project(cartographic, cartesian3Scratch);
        }

        var i = (this._tileWidth * (projected.x - rectangle.west) / rectangle.width) | 0;
        var j = (this._tileHeight * (rectangle.north - projected.y) / rectangle.height) | 0;

        var url;

        if (this._getFeatureInfoAsGeoJson) {
            url = buildGetFeatureInfoUrl(this, 'application/json', x, y, level, i, j);

            var that = this;
            return when(loadJson(url), function(json) {
                return geoJsonToFeatureInfo(json);
            }, function(e) {
                // GeoJSON failed, try XML.
                if (!that._getFeatureInfoAsXml) {
                    return when.reject(e);
                }

                url = buildGetFeatureInfoUrl(that, 'text/xml', x, y, level, i, j);

                return when(loadXML(url), function(xml) {
                    return xmlToFeatureInfo(xml);
                });
            });
        } else if (this._getFeatureInfoAsXml) {
            url = buildGetFeatureInfoUrl(this, 'text/xml', x, y, level, i, j);

            return when(loadXML(url), function(xml) {
                return xmlToFeatureInfo(xml);
            });
        } else {
            return undefined;
        }
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

    function buildImageUrl(imageryProvider, x, y, level) {
        var uri = new Uri(imageryProvider._url);
        var queryOptions = queryToObject(defaultValue(uri.query, ''));

        queryOptions = combine(imageryProvider._parameters, queryOptions);

        if (!defined(queryOptions.layers)) {
            queryOptions.layers = imageryProvider._layers;
        }

        if (!defined(queryOptions.srs)) {
            queryOptions.srs = imageryProvider._tilingScheme instanceof WebMercatorTilingScheme ? 'EPSG:3857' : 'EPSG:4326';
        }

        if (!defined(queryOptions.bbox)) {
            var nativeRectangle = imageryProvider._tilingScheme.tileXYToNativeRectangle(x, y, level);
            queryOptions.bbox = nativeRectangle.west + ',' + nativeRectangle.south + ',' + nativeRectangle.east + ',' + nativeRectangle.north;
        }

        if (!defined(queryOptions.width)) {
            queryOptions.width = imageryProvider._tileWidth;
        }

        if (!defined(queryOptions.height)) {
            queryOptions.height = imageryProvider._tileHeight;
        }

        uri.query = objectToQuery(queryOptions);

        var url = uri.toString();

        var proxy = imageryProvider._proxy;
        if (defined(proxy)) {
            url = proxy.getURL(url);
        }

        return url;
    }

    function buildGetFeatureInfoUrl(imageryProvider, infoFormat, x, y, level, i, j) {
        var uri = new Uri(imageryProvider._url);
        var queryOptions = queryToObject(defaultValue(uri.query, ''));

        queryOptions = combine(imageryProvider._getFeatureInfoParameters, queryOptions);

        if (!defined(queryOptions.layers)) {
            queryOptions.layers = imageryProvider._layers;
        }

        if (!defined(queryOptions.query_layers)) {
            queryOptions.query_layers = imageryProvider._layers;
        }

        if (!defined(queryOptions.srs)) {
            queryOptions.srs = imageryProvider._tilingScheme instanceof WebMercatorTilingScheme ? 'EPSG:3857' : 'EPSG:4326';
        }

        if (!defined(queryOptions.bbox)) {
            var nativeRectangle = imageryProvider._tilingScheme.tileXYToNativeRectangle(x, y, level);
            queryOptions.bbox = nativeRectangle.west + ',' + nativeRectangle.south + ',' + nativeRectangle.east + ',' + nativeRectangle.north;
        }

        if (!defined(queryOptions.x)) {
            queryOptions.x = i;
        }

        if (!defined(queryOptions.y)) {
            queryOptions.y = j;
        }

        if (!defined(queryOptions.width)) {
            queryOptions.width = imageryProvider._tileWidth;
        }

        if (!defined(queryOptions.height)) {
            queryOptions.height = imageryProvider._tileHeight;
        }

        if (!defined(queryOptions.info_format)) {
            queryOptions.info_format = infoFormat;
        }

        uri.query = objectToQuery(queryOptions);

        var url = uri.toString();

        var proxy = imageryProvider._proxy;
        if (defined(proxy)) {
            url = proxy.getURL(url);
        }

        return url;
    }

    function geoJsonToFeatureInfo(json) {
        var result = [];

        var features = json.features;
        for (var i = 0; i < features.length; ++i) {
            var feature = features[i];

            var featureInfo = new ImageryLayerFeatureInfo();
            featureInfo.data = feature;
            featureInfo.configureNameFromProperties(feature.properties);
            featureInfo.configureDescriptionFromProperties(feature.properties);

            // If this is a point feature, use the coordinates of the point.
            if (feature.geometry.type === 'Point') {
                var longitude = feature.geometry.coordinates[0];
                var latitude = feature.geometry.coordinates[1];
                featureInfo.position = Cartographic.fromDegrees(longitude, latitude);
            }

            result.push(featureInfo);
        }

        return result;
    }

    var mapInfoMxpNamespace = 'http://www.mapinfo.com/mxp';
    var esriWmsNamespace = 'http://www.esri.com/wms';

    function xmlToFeatureInfo(xml) {
        var documentElement = xml.documentElement;
        if (documentElement.localName === 'MultiFeatureCollection' && documentElement.namespaceURI === mapInfoMxpNamespace) {
            // This looks like a MapInfo MXP response
            return mapInfoXmlToFeatureInfo(xml);
        } else if (documentElement.localName === 'FeatureInfoResponse' && documentElement.namespaceURI === esriWmsNamespace) {
            // This looks like an Esri WMS response
            return esriXmlToFeatureInfo(xml);
        } else if (documentElement.localName === 'ServiceExceptionReport') {
            // This looks like a WMS server error, so no features picked.
            return undefined;
        } else {
            // Unknown response type, so just dump the XML itself into the description.
            return unknownXmlToFeatureInfo(xml);
        }
    }

    function mapInfoXmlToFeatureInfo(xml) {
        var result = [];

        var multiFeatureCollection = xml.documentElement;

        var features = multiFeatureCollection.getElementsByTagNameNS(mapInfoMxpNamespace, 'Feature');
        for (var featureIndex = 0; featureIndex < features.length; ++featureIndex) {
            var feature = features[featureIndex];

            var properties = {};

            var propertyElements = feature.getElementsByTagNameNS(mapInfoMxpNamespace, 'Val');
            for (var propertyIndex = 0; propertyIndex < propertyElements.length; ++propertyIndex) {
                var propertyElement = propertyElements[propertyIndex];
                if (propertyElement.hasAttribute('ref')) {
                    var name = propertyElement.getAttribute('ref');
                    var value = propertyElement.textContent.trim();
                    properties[name] = value;
                }
            }

            var featureInfo = new ImageryLayerFeatureInfo();
            featureInfo.data = feature;
            featureInfo.configureNameFromProperties(properties);
            featureInfo.configureDescriptionFromProperties(properties);
            result.push(featureInfo);
        }

        return result;
    }

    function esriXmlToFeatureInfo(xml) {
        var result = [];

        var featureInfoResponse = xml.documentElement;

        var features = featureInfoResponse.getElementsByTagNameNS(esriWmsNamespace, 'FIELDS');
        for (var featureIndex = 0; featureIndex < features.length; ++featureIndex) {
            var feature = features[featureIndex];

            var properties = {};

            var propertyAttributes = feature.attributes;
            for (var attributeIndex = 0; attributeIndex < propertyAttributes.length; ++attributeIndex) {
                var attribute = propertyAttributes[attributeIndex];
                properties[attribute.name] = attribute.value;
            }

            var featureInfo = new ImageryLayerFeatureInfo();
            featureInfo.data = feature;
            featureInfo.configureNameFromProperties(properties);
            featureInfo.configureDescriptionFromProperties(properties);
            result.push(featureInfo);
        }

        return result;
    }

    function unknownXmlToFeatureInfo(xml) {
        var xmlText = new XMLSerializer().serializeToString(xml);

        var element = document.createElement('div');
        var pre = document.createElement('pre');
        pre.textContent = xmlText;
        element.appendChild(pre);

        var featureInfo = new ImageryLayerFeatureInfo();
        featureInfo.data = xml;
        featureInfo.description = element.innerHTML;
        return [featureInfo];
    }

    return WebMapServiceImageryProvider;
});
