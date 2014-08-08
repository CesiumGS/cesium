/*global define*/
define([
        '../Core/clone',
        '../Core/Credit',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/freezeObject',
        '../Core/GeographicTilingScheme',
        '../Core/Rectangle',
        './ImageryProvider'
    ], function(
        clone,
        Credit,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        freezeObject,
        GeographicTilingScheme,
        Rectangle,
        ImageryProvider) {
    "use strict";

    /**
     * Provides tiled imagery hosted by a Web Map Service (WMS) server.
     *
     * @alias WebMapServiceImageryProvider
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {String} options.url The URL of the WMS service.
     * @param {String} options.layers The layers to include, separated by commas.
     * @param {Object} [options.parameters=WebMapServiceImageryProvider.DefaultParameters] Additional parameters to pass to the WMS server in the GetMap URL.
     * @param {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle of the layer.
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
     */
    var WebMapServiceImageryProvider = function WebMapServiceImageryProvider(options) {
        options = defaultValue(options, {});

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

        // Merge the parameters with the defaults, and make all parameter names lowercase
        var parameters = clone(WebMapServiceImageryProvider.DefaultParameters);
        if (defined(options.parameters)) {
            for (var parameter in options.parameters) {
                if (options.parameters.hasOwnProperty(parameter)) {
                    var parameterLowerCase = parameter.toLowerCase();
                    parameters[parameterLowerCase] = options.parameters[parameter];
                }
            }
        }

        this._parameters = parameters;

        this._tileWidth = 256;
        this._tileHeight = 256;
        this._maximumLevel = options.maximumLevel; // undefined means no limit

        var rectangle = defaultValue(options.rectangle, Rectangle.MAX_VALUE);
        this._tilingScheme = new GeographicTilingScheme({
            rectangle : rectangle
        });

        var credit = options.credit;
        if (typeof credit === 'string') {
            credit = new Credit(credit);
        }
        this._credit = credit;

        this._errorEvent = new Event();

        this._ready = true;
    };

    function buildImageUrl(imageryProvider, x, y, level) {
        var url = imageryProvider._url;
        var indexOfQuestionMark = url.indexOf('?');
        if (indexOfQuestionMark >= 0 && indexOfQuestionMark < url.length - 1) {
            if (url[url.length - 1] !== '&') {
                url += '&';
            }
        } else if (indexOfQuestionMark < 0) {
            url += '?';
        }

        var parameters = imageryProvider._parameters;
        for (var parameter in parameters) {
            if (parameters.hasOwnProperty(parameter)) {
                url += parameter + '=' + parameters[parameter] + '&';
            }
        }

        if (!defined(parameters.layers)) {
            url += 'layers=' + imageryProvider._layers + '&';
        }

        if (!defined(parameters.srs)) {
            url += 'srs=EPSG:4326&';
        }

        if (!defined(parameters.bbox)) {
            var nativeRectangle = imageryProvider._tilingScheme.tileXYToNativeRectangle(x, y, level);
            var bbox = nativeRectangle.west + ',' + nativeRectangle.south + ',' + nativeRectangle.east + ',' + nativeRectangle.north;
            url += 'bbox=' + bbox + '&';
        }

        if (!defined(parameters.width)) {
            url += 'width=256&';
        }

        if (!defined(parameters.height)) {
            url += 'height=256&';
        }

        var proxy = imageryProvider._proxy;
        if (defined(proxy)) {
            url = proxy.getURL(url);
        }

        return url;
    }


    defineProperties(WebMapServiceImageryProvider.prototype, {
        /**
         * Gets the URL of the WMS server.
         * @memberof WebMapServiceImageryProvider.prototype
         * @type {String}
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
         */
        tileHeight: {
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
         * not be called before {@link WebMapServiceImageryProvider#ready} returns true.
         * @memberof WebMapServiceImageryProvider.prototype
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
         * Gets the rectangle, in radians, of the imagery provided by this instance.  This function should
         * not be called before {@link WebMapServiceImageryProvider#ready} returns true.
         * @memberof WebMapServiceImageryProvider.prototype
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
         * not be called before {@link WebMapServiceImageryProvider#ready} returns true.
         * @memberof WebMapServiceImageryProvider.prototype
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
         * @memberof WebMapServiceImageryProvider.prototype
         * @type {Event}
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

    return WebMapServiceImageryProvider;
});
