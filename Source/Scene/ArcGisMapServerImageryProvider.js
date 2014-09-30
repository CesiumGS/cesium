/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Credit',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/GeographicProjection',
        '../Core/GeographicTilingScheme',
        '../Core/jsonp',
        '../Core/Rectangle',
        '../Core/TileProviderError',
        '../Core/WebMercatorProjection',
        '../Core/WebMercatorTilingScheme',
        '../ThirdParty/when',
        './DiscardMissingTileImagePolicy',
        './ImageryProvider'
    ], function(
        Cartesian2,
        Credit,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        GeographicProjection,
        GeographicTilingScheme,
        jsonp,
        Rectangle,
        TileProviderError,
        WebMercatorProjection,
        WebMercatorTilingScheme,
        when,
        DiscardMissingTileImagePolicy,
        ImageryProvider) {
    "use strict";

    /**
     * Provides tiled imagery hosted by an ArcGIS MapServer.  By default, the server's pre-cached tiles are
     * used, if available.
     *
     * @alias ArcGisMapServerImageryProvider
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {String} options.url The URL of the ArcGIS MapServer service.
     * @param {TileDiscardPolicy} [options.tileDiscardPolicy] The policy that determines if a tile
     *        is invalid and should be discarded.  If this value is not specified, a default
     *        {@link DiscardMissingTileImagePolicy} is used for tiled map servers, and a
     *        {@link NeverTileDiscardPolicy} is used for non-tiled map servers.  In the former case,
     *        we request tile 0,0 at the maximum tile level and check pixels (0,0), (200,20), (20,200),
     *        (80,110), and (160, 130).  If all of these pixels are transparent, the discard check is
     *        disabled and no tiles are discarded.  If any of them have a non-transparent color, any
     *        tile that has the same values in these pixel locations is discarded.  The end result of
     *        these defaults should be correct tile discarding for a standard ArcGIS Server.  To ensure
     *        that no tiles are discarded, construct and pass a {@link NeverTileDiscardPolicy} for this
     *        parameter.
     * @param {Proxy} [options.proxy] A proxy to use for requests. This object is
     *        expected to have a getURL function which returns the proxied URL, if needed.
     * @param {Boolean} [options.usePreCachedTilesIfAvailable=true] If true, the server's pre-cached
     *        tiles are used if they are available.  If false, any pre-cached tiles are ignored and the
     *        'export' service is used.
     *
     * @see BingMapsImageryProvider
     * @see GoogleEarthImageryProvider
     * @see OpenStreetMapImageryProvider
     * @see SingleTileImageryProvider
     * @see TileMapServiceImageryProvider
     * @see WebMapServiceImageryProvider
     *
     * @see {@link http://resources.esri.com/help/9.3/arcgisserver/apis/rest/|ArcGIS Server REST API}
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     *
     * @example
     * var esri = new Cesium.ArcGisMapServerImageryProvider({
     *     url: '//services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
     * });
     */
    var ArcGisMapServerImageryProvider = function ArcGisMapServerImageryProvider(options) {
        options = defaultValue(options, {});

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.url)) {
            throw new DeveloperError('options.url is required.');
        }
        //>>includeEnd('debug');

        this._url = options.url;
        this._tileDiscardPolicy = options.tileDiscardPolicy;
        this._proxy = options.proxy;

        this._tileWidth = undefined;
        this._tileHeight = undefined;
        this._maximumLevel = undefined;
        this._tilingScheme = undefined;
        this._credit = undefined;
        this._useTiles = defaultValue(options.usePreCachedTilesIfAvailable, true);
        this._rectangle = undefined;

        this._errorEvent = new Event();

        this._ready = false;

        // Grab the details of this MapServer.
        var that = this;
        var metadataError;

        function metadataSuccess(data) {
            var tileInfo = data.tileInfo;
            if (!that._useTiles || !defined(tileInfo)) {
                that._tileWidth = 256;
                that._tileHeight = 256;
                that._tilingScheme = new GeographicTilingScheme();
                that._rectangle = that._tilingScheme.rectangle;
                that._useTiles = false;
            } else {
                that._tileWidth = tileInfo.rows;
                that._tileHeight = tileInfo.cols;

                if (tileInfo.spatialReference.wkid === 102100 ||
                    tileInfo.spatialReference.wkid === 102113) {
                    that._tilingScheme = new WebMercatorTilingScheme();
                } else if (data.tileInfo.spatialReference.wkid === 4326) {
                    that._tilingScheme = new GeographicTilingScheme();
                } else {
                    var message = 'Tile spatial reference WKID ' + data.tileInfo.spatialReference.wkid + ' is not supported.';
                    metadataError = TileProviderError.handleError(metadataError, that, that._errorEvent, message, undefined, undefined, undefined, requestMetadata);
                    return;
                }
                that._maximumLevel = data.tileInfo.lods.length - 1;

                if (defined(data.fullExtent)) {
                    var projection = that._tilingScheme.projection;

                    if (defined(data.fullExtent.spatialReference) && defined(data.fullExtent.spatialReference.wkid)) {
                        if (data.fullExtent.spatialReference.wkid === 102100 ||
                            data.fullExtent.spatialReference.wkid === 102113) {
                            projection = new WebMercatorProjection();
                        } else if (data.fullExtent.spatialReference.wkid === 4326) {
                            projection = new GeographicProjection();
                        } else {
                            var extentMessage = 'fullExtent.spatialReference WKID ' + data.fullExtent.spatialReference.wkid + ' is not supported.';
                            metadataError = TileProviderError.handleError(metadataError, that, that._errorEvent, extentMessage, undefined, undefined, undefined, requestMetadata);
                            return;
                        }
                    }

                    var sw = projection.unproject(new Cartesian2(data.fullExtent.xmin, data.fullExtent.ymin));
                    var ne = projection.unproject(new Cartesian2(data.fullExtent.xmax, data.fullExtent.ymax));
                    that._rectangle = new Rectangle(sw.longitude, sw.latitude, ne.longitude, ne.latitude);
                } else {
                    that._rectangle = that._tilingScheme.rectangle;
                }

                // Install the default tile discard policy if none has been supplied.
                if (!defined(that._tileDiscardPolicy)) {
                    that._tileDiscardPolicy = new DiscardMissingTileImagePolicy({
                        missingImageUrl : buildImageUrl(that, 0, 0, that._maximumLevel),
                        pixelsToCheck : [new Cartesian2(0, 0), new Cartesian2(200, 20), new Cartesian2(20, 200), new Cartesian2(80, 110), new Cartesian2(160, 130)],
                        disableCheckIfAllPixelsAreTransparent : true
                    });
                }

                that._useTiles = true;
            }

            if (defined(data.copyrightText) && data.copyrightText.length > 0) {
                that._credit = new Credit(data.copyrightText);
            }

            that._ready = true;
            TileProviderError.handleSuccess(metadataError);
        }

        function metadataFailure(e) {
            var message = 'An error occurred while accessing ' + that._url + '.';
            metadataError = TileProviderError.handleError(metadataError, that, that._errorEvent, message, undefined, undefined, undefined, requestMetadata);
        }

        function requestMetadata() {
            var metadata = jsonp(that._url, {
                parameters : {
                    f : 'json'
                },
                proxy : that._proxy
            });
            when(metadata, metadataSuccess, metadataFailure);
        }

        requestMetadata();
    };

    function buildImageUrl(imageryProvider, x, y, level) {
        var url;
        if (imageryProvider._useTiles) {
            url = imageryProvider._url + '/tile/' + level + '/' + y + '/' + x;
        } else {
            var nativeRectangle = imageryProvider._tilingScheme.tileXYToNativeRectangle(x, y, level);
            var bbox = nativeRectangle.west + '%2C' + nativeRectangle.south + '%2C' + nativeRectangle.east + '%2C' + nativeRectangle.north;

            url = imageryProvider._url + '/export?';
            url += 'bbox=' + bbox;
            url += '&bboxSR=4326&size=256%2C256&imageSR=4326&format=png&transparent=true&f=image';
        }

        var proxy = imageryProvider._proxy;
        if (defined(proxy)) {
            url = proxy.getURL(url);
        }

        return url;
    }

    defineProperties(ArcGisMapServerImageryProvider.prototype, {
        /**
         * Gets the URL of the ArcGIS MapServer.
         * @memberof ArcGisMapServerImageryProvider.prototype
         * @type {String}
         */
        url : {
            get : function() {
                return this._url;
            }
        },

        /**
         * Gets the proxy used by this provider.
         * @memberof ArcGisMapServerImageryProvider.prototype
         * @type {Proxy}
         */
        proxy : {
            get : function() {
                return this._proxy;
            }
        },

        /**
         * Gets the width of each tile, in pixels. This function should
         * not be called before {@link ArcGisMapServerImageryProvider#ready} returns true.
         * @memberof ArcGisMapServerImageryProvider.prototype
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
         * not be called before {@link ArcGisMapServerImageryProvider#ready} returns true.
         * @memberof ArcGisMapServerImageryProvider.prototype
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
         * not be called before {@link ArcGisMapServerImageryProvider#ready} returns true.
         * @memberof ArcGisMapServerImageryProvider.prototype
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
         * not be called before {@link ArcGisMapServerImageryProvider#ready} returns true.
         * @memberof ArcGisMapServerImageryProvider.prototype
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
         * not be called before {@link ArcGisMapServerImageryProvider#ready} returns true.
         * @memberof ArcGisMapServerImageryProvider.prototype
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
         * not be called before {@link ArcGisMapServerImageryProvider#ready} returns true.
         * @memberof ArcGisMapServerImageryProvider.prototype
         * @type {Rectangle}
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
         * not be called before {@link ArcGisMapServerImageryProvider#ready} returns true.
         * @memberof ArcGisMapServerImageryProvider.prototype
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
         * @memberof ArcGisMapServerImageryProvider.prototype
         * @type {Event}
         */
        errorEvent : {
            get : function() {
                return this._errorEvent;
            }
        },

        /**
         * Gets a value indicating whether or not the provider is ready for use.
         * @memberof ArcGisMapServerImageryProvider.prototype
         * @type {Boolean}
         */
        ready : {
            get : function() {
                return this._ready;
            }
        },

        /**
         * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
         * the source of the imagery.  This function should not be called before {@link ArcGisMapServerImageryProvider#ready} returns true.
         * @memberof ArcGisMapServerImageryProvider.prototype
         * @type {Credit}
         */
        credit : {
            get : function() {
                return this._credit;
            }
        },

        /**
         * Gets a value indicating whether this imagery provider is using pre-cached tiles from the
         * ArcGIS MapServer.  If the imagery provider is not yet ready ({@link ArcGisMapServerImageryProvider#ready}), this function
         * will return the value of `options.usePreCachedTilesIfAvailable`, even if the MapServer does
         * not have pre-cached tiles.
         * @memberof ArcGisMapServerImageryProvider.prototype
         *
         * @type {Boolean}
         * @default true
         */
        usingPrecachedTiles : {
            get : function() {
                return this._useTiles;
            }
        },

        /**
         * Gets a value indicating whether or not the images provided by this imagery provider
         * include an alpha channel.  If this property is false, an alpha channel, if present, will
         * be ignored.  If this property is true, any images without an alpha channel will be treated
         * as if their alpha is 1.0 everywhere.  When this property is false, memory usage
         * and texture upload time are reduced.
         * @memberof ArcGisMapServerImageryProvider.prototype
         *
         * @type {Boolean}
         * @default true
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
    ArcGisMapServerImageryProvider.prototype.getTileCredits = function(x, y, level) {
        return undefined;
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link ArcGisMapServerImageryProvider#ready} returns true.
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
    ArcGisMapServerImageryProvider.prototype.requestImage = function(x, y, level) {
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
    ArcGisMapServerImageryProvider.prototype.pickFeatures = function() {
        return undefined;
    };

    return ArcGisMapServerImageryProvider;
});
