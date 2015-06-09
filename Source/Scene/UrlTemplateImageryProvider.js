/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartographic',
        '../Core/Credit',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/GeographicTilingScheme',
        '../Core/loadXML',
        '../Core/Rectangle',
        '../Core/TileProviderError',
        '../Core/WebMercatorTilingScheme',
        '../ThirdParty/when',
        './ImageryProvider'
    ], function(
        Cartesian2,
        Cartographic,
        Credit,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        GeographicTilingScheme,
        loadXML,
        Rectangle,
        TileProviderError,
        WebMercatorTilingScheme,
        when,
        ImageryProvider) {
    "use strict";

    /**
     * Provides tiled imagery following a specific URL template
     *
     * @alias UrlTemplateImageryProvider
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {String} [options.url='']  The pattern to request a tile which has the following keywords: <ul>
     *  <li> {Z}:  corresponding to the level of a tile</li>
     *  <li> {X}:  corresponding to the abscissa of a tile</li>
     *  <li> {reverseX}:  corresponding to the reverse abscissa of a tile</li>
     *  <li> {Y}:  corresponding to the ordinate of a tile</li>
     *  <li> {reverseY}:  corresponding to the reverse ordinate of a tile</li>
     *  <li> {north}:  the north bounding of a tile</li>
     *  <li> {south}:  the south bounding of a tile</li>
     *  <li> {east}:  the east bounding of a tile</li>
     *  <li> {west}:  the west bounding of a tile</li>
     * </ul>
     * @param {Object} [options.proxy] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL.
     * @param {Credit|String} [options.credit=''] A credit for the data source, which is displayed on the canvas.
     * @param {Number} [options.minimumLevel=0] The minimum level-of-detail supported by the imagery provider.  Take care when specifying
     *                 this that the number of tiles at the minimum level is small, such as four or less.  A larger number is likely
     *                 to result in rendering problems.
     * @param {Number} [options.maximumLevel=18] The maximum level-of-detail supported by the imagery provider.
     * @param {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle, in radians, covered by the image.
     * @param {TilingScheme} [options.tilingScheme=WebMercatorTilingScheme] The tiling scheme specifying how the ellipsoidal
     * surface is broken into tiles.  If this parameter is not provided, a {@link WebMercatorTilingScheme}
     * is used.
     * @param {Ellipsoid} [options.ellipsoid] The ellipsoid.  If the tilingScheme is specified,
     *                    this parameter is ignored and the tiling scheme's ellipsoid is used instead. If neither
     *                    parameter is specified, the WGS84 ellipsoid is used.
     * @param {Number} [options.tileWidth=256] Pixel width of image tiles.
     * @param {Number} [options.tileHeight=256] Pixel height of image tiles.
     *
     * @see ArcGisMapServerImageryProvider
     * @see BingMapsImageryProvider
     * @see GoogleEarthImageryProvider
     * @see OpenStreetMapImageryProvider
     * @see WebMapTileServiceImageryProvider
     * @see SingleTileImageryProvider
     * @see WebMapServiceImageryProvider
     *
     *
     * @example
     * // A tile provider with Z/Y/X and .PNG tile files template
     * var utip = new Cesium.UrlTemplateImageryProvider({
     *    url : '../images/cesium_maptiler/Cesium_Logo_Color/{Z}/{reverseY}/{X}.PNG',
     *    maximumLevel: 4,
     *    rectangle: new Cesium.Rectangle(
     *        Cesium.Math.toRadians(-120.0),
     *        Cesium.Math.toRadians(20.0),
     *        Cesium.Math.toRadians(-60.0),
     *        Cesium.Math.toRadians(40.0))
     * });
     * // An emulation of WMS server with a time dimension
     * utip = new Cesium.UrlTemplateImageryProvider({
     *    url : 'URL/to/WMS?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=980_13'+
     *    '&FORMAT=image/png&STYLES=default&TRANSPARENT=true&SRS=EPSG:4326&'+
     *    'BBOX={west},{south},{east},{north}&WIDTH=256&HEIGHT=256&TIME=2009-11-30T12:00',
     * });
     * // An emulation of WMTS server 
     * utip = new Cesium.UrlTemplateImageryProvider({
     *    url : 'URL/to/WMTS?REQUEST=gettile&LAYER=980_13&FORMAT=image/png&TILEMATRIXSET=EPSG:4258'+
     *    '&TILEMATRIX=EPSG:4258:{Z}&TILEROW={Y}&TILECOL={X}&DIM_TIME=2013-11-20T11:15:00Z&STYLE=default
     * });
     */
    var UrlTemplateImageryProvider = function UrlTemplateImageryProvider(options) {
        options = defaultValue(options, {});

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.url)) {
            throw new DeveloperError('options.url is required.');
        }
        //>>includeEnd('debug');

        this._url = options.url;
        this._ready = false;
        this._proxy = options.proxy;
        this._tileDiscardPolicy = options.tileDiscardPolicy;
        this._errorEvent = new Event();

        this._tileWidth = defaultValue(options.tileWidth, 256);
        this._tileHeight = defaultValue(options.tileHeight, 256);
        this._minimumLevel = defaultValue(options.minimumLevel, 0);
        this._maximumLevel = defaultValue(options.maximumLevel, 18);
        this._tilingScheme = defaultValue(options.tilingScheme, new WebMercatorTilingScheme({ ellipsoid : options.ellipsoid }));
        this._rectangle = defaultValue(options.rectangle, this._tilingScheme.rectangle);
        this._ready = true;

        var credit = options.credit;
        if (typeof credit === 'string') {
            credit = new Credit(credit);
        }
        this._credit = credit;

    };

    function buildImageUrl(imageryProvider, x, y, level) {
        var reverseY= imageryProvider.tilingScheme.getNumberOfYTilesAtLevel(level) - y - 1;
        var reverseX=imageryProvider.tilingScheme.getNumberOfXTilesAtLevel(level) - x - 1;

        var rect= imageryProvider.tilingScheme.tileXYToNativeRectangle(x, y,level);
        var xSpacing = (rect.east - rect.west)/ (imageryProvider.tileWidth - 1);
        var ySpacing = (rect.north - rect.south)/ (imageryProvider.tileHeight - 1);
        rect.west -= xSpacing * 0.5;
        rect.east += xSpacing * 0.5;
        rect.south -= ySpacing * 0.5;
        rect.north += ySpacing * 0.5;

        var url = imageryProvider.url;
        url = url.replace('{Z}',level).replace('{X}',x).replace('{reverseX}',reverseX).replace('{Y}',y).replace('{reverseY}',reverseY);
        url = url.replace('{north}',rect.north).replace('{south}',rect.south).replace('{west}',rect.west).replace('{east}',rect.east);

        var proxy = imageryProvider._proxy;
        if (defined(proxy)) {
            url = proxy.getURL(url);
        }

        return url;
    }


    defineProperties(UrlTemplateImageryProvider.prototype, {
        /**
         * The pattern to request a tile which has the following keywords: <ul>
         *  <li> {Z}:  corresponding to the level of a tile</li>
         *  <li> {X}:  corresponding to the abscissa of a tile</li>
         *  <li> {reverseX}:  corresponding to the reverse abscissa of a tile</li>
         *  <li> {Y}:  corresponding to the ordinate of a tile</li>
         *  <li> {reverseY}:  corresponding to the reverse ordinate of a tile</li>
         *  <li> {north}:  the north bounding of a tile</li>
         *  <li> {south}:  the south bounding of a tile</li>
         *  <li> {east}:  the east bounding of a tile</li>
         *  <li> {west}:  the west bounding of a tile</li>
         * </ul>
         * @memberof UrlTemplateImageryProvider.prototype
         * @type {String}
         */
        url : {
            get : function() {
                return this._url;
            },
            set : function(value) {
                this._url=value;
            }
        },

        /**
         * Gets the proxy used by this provider.
         * @memberof UrlTemplateImageryProvider.prototype
         * @type {Proxy}
         * @readonly
         */
        proxy : {
            get : function() {
                return this._proxy;
            }
        },

        /**
         * Gets the width of each tile, in pixels. This function should
         * not be called before {@link UrlTemplateImageryProvider#ready} returns true.
         * @memberof UrlTemplateImageryProvider.prototype
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
            },
            set : function(value) {
                this._tileWidth=value;
            }
        },

        /**
         * Gets the height of each tile, in pixels.  This function should
         * not be called before {@link UrlTemplateImageryProvider#ready} returns true.
         * @memberof UrlTemplateImageryProvider.prototype
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
            },
            set : function(value) {
                this._tileHeight=value;
            }
        },

        /**
         * Gets the maximum level-of-detail that can be requested.  This function should
         * not be called before {@link UrlTemplateImageryProvider#ready} returns true.
         * @memberof UrlTemplateImageryProvider.prototype
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
            },
            set : function(value) {
                this._maximumLevel=value;
            }
        },

        /**
         * Gets the minimum level-of-detail that can be requested.  This function should
         * not be called before {@link UrlTemplateImageryProvider#ready} returns true.
         * @memberof UrlTemplateImageryProvider.prototype
         * @type {Number}
         */
        minimumLevel : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('minimumLevel must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._minimumLevel;
            },
            set : function(value) {
                this._minimumLevel=value;
            }
        },

        /**
         * Gets the tiling scheme used by this provider.  This function should
         * not be called before {@link UrlTemplateImageryProvider#ready} returns true.
         * @memberof UrlTemplateImageryProvider.prototype
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
         * not be called before {@link UrlTemplateImageryProvider#ready} returns true.
         * @memberof UrlTemplateImageryProvider.prototype
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
         * not be called before {@link UrlTemplateImageryProvider#ready} returns true.
         * @memberof UrlTemplateImageryProvider.prototype
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
         * @memberof UrlTemplateImageryProvider.prototype
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
         * @memberof UrlTemplateImageryProvider.prototype
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
         * the source of the imagery.  This function should not be called before {@link UrlTemplateImageryProvider#ready} returns true.
         * @memberof UrlTemplateImageryProvider.prototype
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
         * @memberof UrlTemplateImageryProvider.prototype
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
    UrlTemplateImageryProvider.prototype.getTileCredits = function(x, y, level) {
        return undefined;
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link UrlTemplateImageryProvider#ready} returns true.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @returns {Promise} A promise for the image that will resolve when the image is available, or
     *          undefined if there are too many active requests to the server, and the request
     *          should be retried later.  The resolved image may be either an
     *          Image or a Canvas DOM object.
     */
    UrlTemplateImageryProvider.prototype.requestImage = function(x, y, level) {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('requestImage must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        var url = buildImageUrl(this, x, y, level);
        return ImageryProvider.loadImage(this, url);
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
     * @return {Promise} A promise for the picked features that will resolve when the asynchronous
     *                   picking completes.  The resolved value is an array of {@link ImageryLayerFeatureInfo}
     *                   instances.  The array may be empty if no features are found at the given location.
     *                   It may also be undefined if picking is not supported.
     */
    UrlTemplateImageryProvider.prototype.pickFeatures = function() {
        return undefined;
    };

    return UrlTemplateImageryProvider;
});
