/*global define*/
define([
        '../Core/clone',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/freezeObject',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/Extent',
        './Credit',
        './ImageryProvider',
        './GeographicTilingScheme'
    ], function(
        clone,
        defaultValue,
        defined,
        defineProperties,
        freezeObject,
        DeveloperError,
        Event,
        Extent,
        Credit,
        ImageryProvider,
        GeographicTilingScheme) {
    "use strict";

    /**
     * Provides tiled imagery hosted by a Web Map Service (WMS) server.
     *
     * @alias WebMapServiceImageryProvider
     * @constructor
     *
     * @param {String} description.url The URL of the WMS service.
     * @param {String} description.layers The layers to include, separated by commas.
     * @param {Object} [description.parameters=WebMapServiceImageryProvider.DefaultParameters] Additional parameters to pass to the WMS server in the GetMap URL.
     * @param {Extent} [description.extent=Extent.MAX_VALUE] The extent of the layer.
     * @param {Number} [description.maximumLevel] The maximum level-of-detail supported by the imagery provider.
     *        If not specified, there is no limit.
     * @param {Credit|String} [description.credit] A credit for the data source, which is displayed on the canvas.
     * @param {Object} [description.proxy] A proxy to use for requests. This object is
     *        expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @see ArcGisMapServerImageryProvider
     * @see BingMapsImageryProvider
     * @see GoogleEarthImageryProvider
     * @see SingleTileImageryProvider
     * @see TileMapServiceImageryProvider
     * @see OpenStreetMapImageryProvider
     *
     * @see <a href='http://resources.esri.com/help/9.3/arcgisserver/apis/rest/'>ArcGIS Server REST API</a>
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     *
     * @example
     * var provider = new Cesium.WebMapServiceImageryProvider({
     *     url: 'http://sampleserver1.arcgisonline.com/ArcGIS/services/Specialty/ESRI_StatesCitiesRivers_USA/MapServer/WMSServer',
     *     layers : '0',
     *     proxy: new Cesium.DefaultProxy('/proxy/')
     * });
     */
    var WebMapServiceImageryProvider = function WebMapServiceImageryProvider(description) {
        description = defaultValue(description, {});

        //>>includeStart('debug', pragmas.debug);
        if (!defined(description.url)) {
            throw new DeveloperError('description.url is required.');
        }
        if (!defined(description.layers)) {
            throw new DeveloperError('description.layers is required.');
        }
        //>>includeEnd('debug');

        this._url = description.url;
        this._tileDiscardPolicy = description.tileDiscardPolicy;
        this._proxy = description.proxy;
        this._layers = description.layers;

        // Merge the parameters with the defaults, and make all parameter names lowercase
        var parameters = clone(WebMapServiceImageryProvider.DefaultParameters);
        if (defined(description.parameters)) {
            for (var parameter in description.parameters) {
                if (description.parameters.hasOwnProperty(parameter)) {
                    var parameterLowerCase = parameter.toLowerCase();
                    parameters[parameterLowerCase] = description.parameters[parameter];
                }
            }
        }

        this._parameters = parameters;

        this._tileWidth = 256;
        this._tileHeight = 256;
        this._maximumLevel = description.maximumLevel; // undefined means no limit

        var extent = defaultValue(description.extent, Extent.MAX_VALUE);
        this._tilingScheme = new GeographicTilingScheme({
            extent : extent
        });

        var credit = description.credit;
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
            var nativeExtent = imageryProvider._tilingScheme.tileXYToNativeExtent(x, y, level);
            var bbox = nativeExtent.west + ',' + nativeExtent.south + ',' + nativeExtent.east + ',' + nativeExtent.north;
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
         * @returns {String}
         */
        layers : {
            get : function() {
                return this._layers;
            }
        },

        /**
         * Gets the width of each tile, in pixels. This function should
         * not be called before {@link WebMapServiceImageryProvider#ready} returns true.
         * @memberof WebMapServiceImageryProviderr.prototype
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
         * Gets the extent, in radians, of the imagery provided by this instance.  This function should
         * not be called before {@link WebMapServiceImageryProvider#ready} returns true.
         * @memberof WebMapServiceImageryProvider.prototype
         * @type {Extent}
         */
        extent : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('extent must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._tilingScheme.extent;
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
        }
    });

    /**
     * Gets the credits to be displayed when a given tile is displayed.
     *
     * @memberof WebMapServiceImageryProvider
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level;
     *
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
     * @memberof WebMapServiceImageryProvider
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
     * @memberof WebMapServiceImageryProvider
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
