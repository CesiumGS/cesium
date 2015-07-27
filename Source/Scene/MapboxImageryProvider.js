/*global define*/
define([
        '../Core/Credit',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        './UrlTemplateImageryProvider'
    ], function(
        Credit,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        UrlTemplateImageryProvider) {
    "use strict";

    var trailingSlashRegex = /\/$/;
    var mapboxLogo = 'data:image/png;base64,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';
    var defaultCredit = new Credit('Mapbox', mapboxLogo, 'https://www.mapbox.com');

    /**
     * Provides tiled imagery hosted by Mapbox.
     *
     * @alias MapboxImageryProvider
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {String} [options.url='//api.mapbox.com/v4/'] The Mapbox server url.
     * @param {String} options.mapId The Mapbox Map ID.
     * @param {String} [options.accessToken] The public access token for the imagery.
     * @param {String} [options.format='png'] The format of the image request.
     * @param {Object} [options.proxy] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL.
     * @param {Ellipsoid} [options.ellipsoid] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
     * @param {Number} [options.minimumLevel=0] The minimum level-of-detail supported by the imagery provider.  Take care when specifying
     *                 this that the number of tiles at the minimum level is small, such as four or less.  A larger number is likely
     *                 to result in rendering problems.
     * @param {Number} [options.maximumLevel] The maximum level-of-detail supported by the imagery provider, or undefined if there is no limit.
     * @param {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle, in radians, covered by the image.

     *
     * @see {@link https://www.mapbox.com/developers/api/maps/#tiles}
     * @see {@link https://www.mapbox.com/developers/api/#access-tokens}
     *
     * @example
     * // Mapbox tile provider
     * var mapbox = new Cesium.MapboxImageryProvider({
     *     mapId: 'mapbox.streets',
     *     accessToken: 'thisIsMyAccessToken'
     * });
     */
    var MapboxImageryProvider = function MapboxImageryProvider(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var mapId = options.mapId;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(mapId)) {
            throw new DeveloperError('options.url is required.');
        }
        //>>includeEnd('debug');

        var url = defaultValue(options.url, '//api.mapbox.com/v4/');
        this._url = url;
        this._mapId = mapId;
        this._accessToken = options.accessToken;
        this._format = defaultValue(options.format, '.png');

        var templateUrl = url;
        if (!trailingSlashRegex.test(url)) {
            templateUrl += '/';
        }
        templateUrl += mapId + '/{z}/{x}/{y}' + this._format;
        if (defined(this._accessToken)) {
            templateUrl += '?access_token=' + this._accessToken;
        }

        this._imageryProvider = new UrlTemplateImageryProvider({
            url: templateUrl,
            proxy: options.proxy,
            credit: defaultCredit,
            ellipsoid: options.ellipsoid,
            minimumLevel: options.minimumLevel,
            maximumLevel: options.maximumLevel,
            rectangle: options.rectangle
        });
    };

    defineProperties(MapboxImageryProvider.prototype, {
        /**
         * Gets the URL of the Mapbox server.
         * @memberof MapboxImageryProvider.prototype
         * @type {String}
         * @readonly
         */
        url : {
            get : function() {
                return this._url;
            }
        },

        /**
         * Gets a value indicating whether or not the provider is ready for use.
         * @memberof MapboxImageryProvider.prototype
         * @type {Boolean}
         * @readonly
         */
        ready : {
            get : function() {
                return this._imageryProvider.ready;
            }
        },

        /**
         * Gets the rectangle, in radians, of the imagery provided by the instance.  This function should
         * not be called before {@link MapboxImageryProvider#ready} returns true.
         * @memberof MapboxImageryProvider.prototype
         * @type {Rectangle}
         * @readonly
         */
        rectangle: {
            get : function() {
                return this._imageryProvider.rectangle;
            }
        },

        /**
         * Gets the width of each tile, in pixels.  This function should
         * not be called before {@link MapboxImageryProvider#ready} returns true.
         * @memberof MapboxImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        tileWidth : {
            get : function() {
                return this._imageryProvider.tileWidth;
            }
        },

        /**
         * Gets the height of each tile, in pixels.  This function should
         * not be called before {@link MapboxImageryProvider#ready} returns true.
         * @memberof MapboxImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        tileHeight : {
            get : function() {
                return this._imageryProvider.tileHeight;
            }
        },

        /**
         * Gets the maximum level-of-detail that can be requested.  This function should
         * not be called before {@link MapboxImageryProvider#ready} returns true.
         * @memberof MapboxImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        maximumLevel : {
            get : function() {
                return this._imageryProvider.maximumLevel;
            }
        },

        /**
         * Gets the minimum level-of-detail that can be requested.  This function should
         * not be called before {@link MapboxImageryProvider#ready} returns true. Generally,
         * a minimum level should only be used when the rectangle of the imagery is small
         * enough that the number of tiles at the minimum level is small.  An imagery
         * provider with more than a few tiles at the minimum level will lead to
         * rendering problems.
         * @memberof MapboxImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        minimumLevel : {
            get : function() {
                return this._imageryProvider.minimumLevel;
            }
        },

        /**
         * Gets the tiling scheme used by the provider.  This function should
         * not be called before {@link MapboxImageryProvider#ready} returns true.
         * @memberof MapboxImageryProvider.prototype
         * @type {TilingScheme}
         * @readonly
         */
        tilingScheme : {
            get : function() {
                return this._imageryProvider.tilingScheme;
            }
        },

        /**
         * Gets the tile discard policy.  If not undefined, the discard policy is responsible
         * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
         * returns undefined, no tiles are filtered.  This function should
         * not be called before {@link MapboxImageryProvider#ready} returns true.
         * @memberof MapboxImageryProvider.prototype
         * @type {TileDiscardPolicy}
         * @readonly
         */
        tileDiscardPolicy : {
            get : function() {
                return this._imageryProvider.tileDiscardPolicy;
            }
        },

        /**
         * Gets an event that is raised when the imagery provider encounters an asynchronous error..  By subscribing
         * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
         * are passed an instance of {@link TileProviderError}.
         * @memberof MapboxImageryProvider.prototype
         * @type {Event}
         * @readonly
         */
        errorEvent : {
            get : function() {
                return this._imageryProvider.errorEvent;
            }
        },

        /**
         * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
         * the source of the imagery. This function should
         * not be called before {@link MapboxImageryProvider#ready} returns true.
         * @memberof MapboxImageryProvider.prototype
         * @type {Credit}
         * @readonly
         */
        credit : {
            get : function() {
                return this._imageryProvider.credit;
            }
        },

        /**
         * Gets the proxy used by this provider.
         * @memberof MapboxImageryProvider.prototype
         * @type {Proxy}
         * @readonly
         */
        proxy : {
            get : function() {
                return this._imageryProvider.proxy;
            }
        },

        /**
         * Gets a value indicating whether or not the images provided by this imagery provider
         * include an alpha channel.  If this property is false, an alpha channel, if present, will
         * be ignored.  If this property is true, any images without an alpha channel will be treated
         * as if their alpha is 1.0 everywhere.  When this property is false, memory usage
         * and texture upload time are reduced.
         * @memberof MapboxImageryProvider.prototype
         * @type {Boolean}
         * @readonly
         */
        hasAlphaChannel : {
            get : function() {
                return this._imageryProvider.hasAlphaChannel;
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
    MapboxImageryProvider.prototype.getTileCredits = function(x, y, level) {
        return this._imageryProvider.getTileCredits(x, y, level);
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link MapboxImageryProvider#ready} returns true.
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
    MapboxImageryProvider.prototype.requestImage = function(x, y, level) {
        return this._imageryProvider.requestImage(x, y, level);
    };

    /**
     * Asynchronously determines what features, if any, are located at a given longitude and latitude within
     * a tile.  This function should not be called before {@link MapboxImageryProvider#ready} returns true.
     * This function is optional, so it may not exist on all ImageryProviders.
     *
     * @function
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
     *
     * @exception {DeveloperError} <code>pickFeatures</code> must not be called before the imagery provider is ready.
     */
    MapboxImageryProvider.prototype.pickFeatures = function(x, y, level, longitude, latitude) {
        return this._imageryProvider.pickFeatures(x, y, level, longitude, latitude);
    };

    return MapboxImageryProvider;
});
