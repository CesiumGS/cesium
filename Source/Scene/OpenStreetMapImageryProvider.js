/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './ImageryProvider',
        './WebMercatorTilingScheme',
        './Credit'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        ImageryProvider,
        WebMercatorTilingScheme,
        Credit) {
    "use strict";

    var trailingSlashRegex = /\/$/;
    var defaultCredit = new Credit('MapQuest, Open Street Map and contributors, CC-BY-SA');

    /**
     * Provides tiled imagery hosted by OpenStreetMap or another provider of Slippy tiles.  Please be aware
     * that a default-constructed instance of this class will connect to OpenStreetMap's volunteer-run
     * servers, so you must conform to their
     * <a href='http://wiki.openstreetmap.org/wiki/Tile_usage_policy'>Tile Usage Policy</a>.
     *
     * @alias OpenStreetMapImageryProvider
     * @constructor
     *
     * @param {String} [description.url='http://tile.openstreetmap.org'] The OpenStreetMap server url.
     * @param {String} [description.fileExtension='png'] The file extension for images on the server.
     * @param {Object} [description.proxy] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL.
     * @param {Extent} [description.extent=Extent.MAX_VALUE] The extent of the layer.
     * @param {Number} [description.minimumLevel=0] The minimum level-of-detail supported by the imagery provider.
     * @param {Number} [description.maximumLevel=18] The maximum level-of-detail supported by the imagery provider.
     * @param {Credit|String} [description.credit='MapQuest, Open Street Map and contributors, CC-BY-SA'] A credit for the data source, which is displayed on the canvas.
     *
     * @see ArcGisMapServerImageryProvider
     * @see BingMapsImageryProvider
     * @see SingleTileImageryProvider
     * @see TileMapServiceImageryProvider
     * @see WebMapServiceImageryProvider
     *
     * @see <a href='http://wiki.openstreetmap.org/wiki/Main_Page'>OpenStreetMap Wiki</a>
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     *
     * @example
     * // OpenStreetMap tile provider
     * var osm = new Cesium.OpenStreetMapImageryProvider({
     *     url : 'http://tile.openstreetmap.org/'
     * });
     */
    var OpenStreetMapImageryProvider = function OpenStreetMapImageryProvider(description) {
        description = defaultValue(description, {});

        var url = defaultValue(description.url, 'http://tile.openstreetmap.org/');

        if (!trailingSlashRegex.test(url)) {
            url = url + '/';
        }

        this._url = url;
        this._fileExtension = defaultValue(description.fileExtension, 'png');
        this._proxy = description.proxy;
        this._tileDiscardPolicy = description.tileDiscardPolicy;

        this._tilingScheme = new WebMercatorTilingScheme();

        this._tileWidth = 256;
        this._tileHeight = 256;

        this._minimumLevel = defaultValue(description.minimumLevel, 0);
        this._maximumLevel = defaultValue(description.maximumLevel, 18);

        this._extent = defaultValue(description.extent, this._tilingScheme.extent);

        // Check the number of tiles at the minimum level.  If it's more than four,
        // throw an exception, because starting at the higher minimum
        // level will cause too many tiles to be downloaded and rendered.
        var swTile = this._tilingScheme.positionToTileXY(this._extent.getSouthwest(), this._minimumLevel);
        var neTile = this._tilingScheme.positionToTileXY(this._extent.getNortheast(), this._minimumLevel);
        var tileCount = (Math.abs(neTile.x - swTile.x) + 1) * (Math.abs(neTile.y - swTile.y) + 1);
        if (tileCount > 4) {
            throw new DeveloperError('The imagery provider\'s extent and minimumLevel indicate that there are ' + tileCount + ' tiles at the minimum level. Imagery providers with more than four tiles at the minimum level are not supported.');
        }

        this._errorEvent = new Event();

        this._ready = true;

        var credit = defaultValue(description.credit, defaultCredit);
        if (typeof credit === 'string') {
            credit = new Credit(credit);
        }
        this._credit = credit;
    };

    function buildImageUrl(imageryProvider, x, y, level) {
        var url = imageryProvider._url + level + '/' + x + '/' + y + '.' + imageryProvider._fileExtension;

        var proxy = imageryProvider._proxy;
        if (defined(proxy)) {
            url = proxy.getURL(url);
        }

        return url;
    }

    defineProperties(OpenStreetMapImageryProvider.prototype, {
        /**
         * Gets the URL of the service hosting the imagery.
         * @memberof OpenStreetMapImageryProvider.prototype
         * @type {String}
         */
        url : {
            get : function() {
                return this._url;
            }
        },

        /**
         * Gets the proxy used by this provider.
         * @memberof OpenStreetMapImageryProvider
         * @type {Proxy}
         */
        proxy : {
            get : function() {
                return this._proxy;
            }
        },

        /**
         * Gets the width of each tile, in pixels. This function should
         * not be called before {@link OpenStreetMapImageryProvider#ready} returns true.
         * @memberof OpenStreetMapImageryProvider.prototype
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
         * not be called before {@link OpenStreetMapImageryProvider#ready} returns true.
         * @memberof OpenStreetMapImageryProvider.prototype
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
         * not be called before {@link OpenStreetMapImageryProvider#ready} returns true.
         * @memberof OpenStreetMapImageryProvider.prototype
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
         * not be called before {@link OpenStreetMapImageryProvider#ready} returns true.
         * @memberof OpenStreetMapImageryProvider.prototype
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
            }
        },

        /**
         * Gets the tiling scheme used by this provider.  This function should
         * not be called before {@link OpenStreetMapImageryProvider#ready} returns true.
         * @memberof OpenStreetMapImageryProvider.prototype
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
         * not be called before {@link OpenStreetMapImageryProvider#ready} returns true.
         * @memberof OpenStreetMapImageryProviderr.prototype
         * @type {Extent}
         */
        extent : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('extent must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._extent;
            }
        },

        /**
         * Gets the tile discard policy.  If not undefined, the discard policy is responsible
         * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
         * returns undefined, no tiles are filtered.  This function should
         * not be called before {@link OpenStreetMapImageryProvider#ready} returns true.
         * @memberof OpenStreetMapImageryProvider.prototype
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
         * @memberof OpenStreetMapImageryProvider.prototype
         * @type {Event}
         */
        errorEvent : {
            get : function() {
                return this._errorEvent;
            }
        },

        /**
         * Gets a value indicating whether or not the provider is ready for use.
         * @memberof OpenStreetMapImageryProvider.prototype
         * @type {Boolean}
         */
        ready : {
            get : function() {
                return this._ready;
            }
        },

        /**
         * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
         * the source of the imagery.  This function should not be called before {@link OpenStreetMapImageryProvider#ready} returns true.
         * @memberof OpenStreetMapImageryProvider.prototype
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
     * @memberof OpenStreetMapImageryProvider
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level;
     *
     * @returns {Credit[]} The credits to be displayed when the tile is displayed.
     *
     * @exception {DeveloperError} <code>getTileCredits</code> must not be called before the imagery provider is ready.
     */
    OpenStreetMapImageryProvider.prototype.getTileCredits = function(x, y, level) {
        return undefined;
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link OpenStreetMapImageryProvider#ready} returns true.
     *
     * @memberof OpenStreetMapImageryProvider
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
    OpenStreetMapImageryProvider.prototype.requestImage = function(x, y, level) {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('requestImage must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        var url = buildImageUrl(this, x, y, level);
        return ImageryProvider.loadImage(this, url);
    };

    return OpenStreetMapImageryProvider;
});