/*global define*/
define([
        '../Core/BingMapsApi',
        '../Core/Cartesian2',
        '../Core/Credit',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/loadJsonp',
        '../Core/Math',
        '../Core/Rectangle',
        '../Core/RuntimeError',
        '../Core/TileProviderError',
        '../Core/WebMercatorTilingScheme',
        '../ThirdParty/when',
        './BingMapsStyle',
        './DiscardMissingTileImagePolicy',
        './ImageryProvider'
    ], function(
        BingMapsApi,
        Cartesian2,
        Credit,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        loadJsonp,
        CesiumMath,
        Rectangle,
        RuntimeError,
        TileProviderError,
        WebMercatorTilingScheme,
        when,
        BingMapsStyle,
        DiscardMissingTileImagePolicy,
        ImageryProvider) {
    "use strict";

    /**
     * Provides tiled imagery using the Bing Maps Imagery REST API.
     *
     * @alias BingMapsImageryProvider
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {String} options.url The url of the Bing Maps server hosting the imagery.
     * @param {String} [options.key] The Bing Maps key for your application, which can be
     *        created at {@link https://www.bingmapsportal.com/}.
     *        If this parameter is not provided, {@link BingMapsApi.defaultKey} is used.
     *        If {@link BingMapsApi.defaultKey} is undefined as well, a message is
     *        written to the console reminding you that you must create and supply a Bing Maps
     *        key as soon as possible.  Please do not deploy an application that uses
     *        Bing Maps imagery without creating a separate key for your application.
     * @param {String} [options.tileProtocol] The protocol to use when loading tiles, e.g. 'http:' or 'https:'.
     *        By default, tiles are loaded using the same protocol as the page.
     * @param {String} [options.mapStyle=BingMapsStyle.AERIAL] The type of Bing Maps
     *        imagery to load.
     * @param {String} [options.culture=''] The culture to use when requesting Bing Maps imagery. Not
     *        all cultures are supported. See {@link http://msdn.microsoft.com/en-us/library/hh441729.aspx}
     *        for information on the supported cultures.
     * @param {Ellipsoid} [options.ellipsoid] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
     * @param {TileDiscardPolicy} [options.tileDiscardPolicy] The policy that determines if a tile
     *        is invalid and should be discarded.  If this value is not specified, a default
     *        {@link DiscardMissingTileImagePolicy} is used which requests
     *        tile 0,0 at the maximum tile level and checks pixels (0,0), (120,140), (130,160),
     *        (200,50), and (200,200).  If all of these pixels are transparent, the discard check is
     *        disabled and no tiles are discarded.  If any of them have a non-transparent color, any
     *        tile that has the same values in these pixel locations is discarded.  The end result of
     *        these defaults should be correct tile discarding for a standard Bing Maps server.  To ensure
     *        that no tiles are discarded, construct and pass a {@link NeverTileDiscardPolicy} for this
     *        parameter.
     * @param {Proxy} [options.proxy] A proxy to use for requests. This object is
     *        expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @see ArcGisMapServerImageryProvider
     * @see GoogleEarthImageryProvider
     * @see createOpenStreetMapImageryProvider
     * @see SingleTileImageryProvider
     * @see createTileMapServiceImageryProvider
     * @see WebMapServiceImageryProvider
     * @see WebMapTileServiceImageryProvider
     * @see UrlTemplateImageryProvider
     *
     *
     * @example
     * var bing = new Cesium.BingMapsImageryProvider({
     *     url : '//dev.virtualearth.net',
     *     key : 'get-yours-at-https://www.bingmapsportal.com/',
     *     mapStyle : Cesium.BingMapsStyle.AERIAL
     * });
     * 
     * @see {@link http://msdn.microsoft.com/en-us/library/ff701713.aspx|Bing Maps REST Services}
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     */
    function BingMapsImageryProvider(options) {
        options = defaultValue(options, {});

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.url)) {
            throw new DeveloperError('options.url is required.');
        }
        //>>includeEnd('debug');

        this._key = BingMapsApi.getKey(options.key);

        this._url = options.url;
        this._tileProtocol = options.tileProtocol;
        this._mapStyle = defaultValue(options.mapStyle, BingMapsStyle.AERIAL);
        this._culture = defaultValue(options.culture, '');
        this._tileDiscardPolicy = options.tileDiscardPolicy;
        this._proxy = options.proxy;
        this._credit = new Credit('Bing Imagery', BingMapsImageryProvider._logoData, 'http://www.bing.com');

        /**
         * The default {@link ImageryLayer#gamma} to use for imagery layers created for this provider.
         * By default, this is set to 1.3 for the "aerial" and "aerial with labels" map styles and 1.0 for
         * all others.  Changing this value after creating an {@link ImageryLayer} for this provider will have
         * no effect.  Instead, set the layer's {@link ImageryLayer#gamma} property.
         *
         * @type {Number}
         * @default 1.0
         */
        this.defaultGamma = 1.0;
        if (this._mapStyle === BingMapsStyle.AERIAL || this._mapStyle === BingMapsStyle.AERIAL_WITH_LABELS) {
            this.defaultGamma = 1.3;
        }

        this._tilingScheme = new WebMercatorTilingScheme({
            numberOfLevelZeroTilesX : 2,
            numberOfLevelZeroTilesY : 2,
            ellipsoid : options.ellipsoid
        });

        this._tileWidth = undefined;
        this._tileHeight = undefined;
        this._maximumLevel = undefined;
        this._imageUrlTemplate = undefined;
        this._imageUrlSubdomains = undefined;

        this._errorEvent = new Event();

        this._ready = false;
        this._readyPromise = when.defer();

        var metadataUrl = this._url + '/REST/v1/Imagery/Metadata/' + this._mapStyle + '?incl=ImageryProviders&key=' + this._key;
        var that = this;
        var metadataError;

        function metadataSuccess(data) {
            var resource = data.resourceSets[0].resources[0];

            that._tileWidth = resource.imageWidth;
            that._tileHeight = resource.imageHeight;
            that._maximumLevel = resource.zoomMax - 1;
            that._imageUrlSubdomains = resource.imageUrlSubdomains;
            that._imageUrlTemplate = resource.imageUrl.replace('{culture}', that._culture);

            var tileProtocol = that._tileProtocol;
            if (!defined(tileProtocol)) {
                // use the document's protocol, unless it's not http or https
                var documentProtocol = document.location.protocol;
                tileProtocol = /^http/.test(documentProtocol) ? documentProtocol : 'http:';
            }

            that._imageUrlTemplate = that._imageUrlTemplate.replace(/^http:/, tileProtocol);

            // Install the default tile discard policy if none has been supplied.
            if (!defined(that._tileDiscardPolicy)) {
                that._tileDiscardPolicy = new DiscardMissingTileImagePolicy({
                    missingImageUrl : buildImageUrl(that, 0, 0, that._maximumLevel),
                    pixelsToCheck : [new Cartesian2(0, 0), new Cartesian2(120, 140), new Cartesian2(130, 160), new Cartesian2(200, 50), new Cartesian2(200, 200)],
                    disableCheckIfAllPixelsAreTransparent : true
                });
            }

            var attributionList = that._attributionList = resource.imageryProviders;
            if (!attributionList) {
                attributionList = that._attributionList = [];
            }

            for (var attributionIndex = 0, attributionLength = attributionList.length; attributionIndex < attributionLength; ++attributionIndex) {
                var attribution = attributionList[attributionIndex];

                attribution.credit = new Credit(attribution.attribution);

                var coverageAreas = attribution.coverageAreas;

                for (var areaIndex = 0, areaLength = attribution.coverageAreas.length; areaIndex < areaLength; ++areaIndex) {
                    var area = coverageAreas[areaIndex];
                    var bbox = area.bbox;
                    area.bbox = new Rectangle(
                            CesiumMath.toRadians(bbox[1]),
                            CesiumMath.toRadians(bbox[0]),
                            CesiumMath.toRadians(bbox[3]),
                            CesiumMath.toRadians(bbox[2]));
                }
            }

            that._ready = true;
            that._readyPromise.resolve(true);
            TileProviderError.handleSuccess(metadataError);
        }

        function metadataFailure(e) {
            var message = 'An error occurred while accessing ' + metadataUrl + '.';
            metadataError = TileProviderError.handleError(metadataError, that, that._errorEvent, message, undefined, undefined, undefined, requestMetadata);
            that._readyPromise.reject(new RuntimeError(message));
        }

        function requestMetadata() {
            var metadata = loadJsonp(metadataUrl, {
                callbackParameterName : 'jsonp',
                proxy : that._proxy
            });
            when(metadata, metadataSuccess, metadataFailure);
        }

        requestMetadata();
    }

    defineProperties(BingMapsImageryProvider.prototype, {
        /**
         * Gets the name of the BingMaps server url hosting the imagery.
         * @memberof BingMapsImageryProvider.prototype
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
         * @memberof BingMapsImageryProvider.prototype
         * @type {Proxy}
         * @readonly
         */
        proxy : {
            get : function() {
                return this._proxy;
            }
        },


        /**
         * Gets the Bing Maps key.
         * @memberof BingMapsImageryProvider.prototype
         * @type {String}
         * @readonly
         */
        key : {
            get : function() {
                return this._key;
            }
        },

        /**
         * Gets the type of Bing Maps imagery to load.
         * @memberof BingMapsImageryProvider.prototype
         * @type {BingMapsStyle}
         * @readonly
         */
        mapStyle : {
            get : function() {
                return this._mapStyle;
            }
        },

        /**
         * The culture to use when requesting Bing Maps imagery. Not
         * all cultures are supported. See {@link http://msdn.microsoft.com/en-us/library/hh441729.aspx}
         * for information on the supported cultures.
         * @memberof BingMapsImageryProvider.prototype
         * @type {String}
         * @readonly
         */
        culture : {
            get : function() {
                return this._culture;
            }
        },

        /**
         * Gets the width of each tile, in pixels. This function should
         * not be called before {@link BingMapsImageryProvider#ready} returns true.
         * @memberof BingMapsImageryProvider.prototype
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
         * not be called before {@link BingMapsImageryProvider#ready} returns true.
         * @memberof BingMapsImageryProvider.prototype
         * @type {Number}
         * @readonly
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
         * not be called before {@link BingMapsImageryProvider#ready} returns true.
         * @memberof BingMapsImageryProvider.prototype
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
         * not be called before {@link BingMapsImageryProvider#ready} returns true.
         * @memberof BingMapsImageryProvider.prototype
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

                return 0;
            }
        },

        /**
         * Gets the tiling scheme used by this provider.  This function should
         * not be called before {@link BingMapsImageryProvider#ready} returns true.
         * @memberof BingMapsImageryProvider.prototype
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
         * not be called before {@link BingMapsImageryProvider#ready} returns true.
         * @memberof BingMapsImageryProvider.prototype
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

                return this._tilingScheme.rectangle;
            }
        },

        /**
         * Gets the tile discard policy.  If not undefined, the discard policy is responsible
         * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
         * returns undefined, no tiles are filtered.  This function should
         * not be called before {@link BingMapsImageryProvider#ready} returns true.
         * @memberof BingMapsImageryProvider.prototype
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
         * @memberof BingMapsImageryProvider.prototype
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
         * @memberof BingMapsImageryProvider.prototype
         * @type {Boolean}
         * @readonly
         */
        ready : {
            get : function() {
                return this._ready;
            }
        },

        /**
         * Gets a promise that resolves to true when the provider is ready for use.
         * @memberof BingMapsImageryProvider.prototype
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
         * the source of the imagery.  This function should not be called before {@link BingMapsImageryProvider#ready} returns true.
         * @memberof BingMapsImageryProvider.prototype
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
         * as if their alpha is 1.0 everywhere.  Setting this property to false reduces memory usage
         * and texture upload time.
         * @memberof BingMapsImageryProvider.prototype
         * @type {Boolean}
         * @readonly
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
    BingMapsImageryProvider.prototype.getTileCredits = function(x, y, level) {
        if (!this._ready) {
            throw new DeveloperError('getTileCredits must not be called before the imagery provider is ready.');
        }

        var rectangle = this._tilingScheme.tileXYToRectangle(x, y, level, rectangleScratch);
        return getRectangleAttribution(this._attributionList, level, rectangle);
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link BingMapsImageryProvider#ready} returns true.
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
    BingMapsImageryProvider.prototype.requestImage = function(x, y, level) {
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
     * @return {Promise.<ImageryLayerFeatureInfo[]>|undefined} A promise for the picked features that will resolve when the asynchronous
     *                   picking completes.  The resolved value is an array of {@link ImageryLayerFeatureInfo}
     *                   instances.  The array may be empty if no features are found at the given location.
     *                   It may also be undefined if picking is not supported.
     */
    BingMapsImageryProvider.prototype.pickFeatures = function() {
        return undefined;
    };

    BingMapsImageryProvider._logoData = 'data:image/png;base64,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';

    /**
     * Converts a tiles (x, y, level) position into a quadkey used to request an image
     * from a Bing Maps server.
     *
     * @param {Number} x The tile's x coordinate.
     * @param {Number} y The tile's y coordinate.
     * @param {Number} level The tile's zoom level.
     *
     * @see {@link http://msdn.microsoft.com/en-us/library/bb259689.aspx|Bing Maps Tile System}
     * @see BingMapsImageryProvider#quadKeyToTileXY
     */
    BingMapsImageryProvider.tileXYToQuadKey = function(x, y, level) {
        var quadkey = '';
        for ( var i = level; i >= 0; --i) {
            var bitmask = 1 << i;
            var digit = 0;

            if ((x & bitmask) !== 0) {
                digit |= 1;
            }

            if ((y & bitmask) !== 0) {
                digit |= 2;
            }

            quadkey += digit;
        }
        return quadkey;
    };

    /**
     * Converts a tile's quadkey used to request an image from a Bing Maps server into the
     * (x, y, level) position.
     *
     * @param {String} quadkey The tile's quad key
     *
     * @see {@link http://msdn.microsoft.com/en-us/library/bb259689.aspx|Bing Maps Tile System}
     * @see BingMapsImageryProvider#tileXYToQuadKey
     */
    BingMapsImageryProvider.quadKeyToTileXY = function(quadkey) {
        var x = 0;
        var y = 0;
        var level = quadkey.length - 1;
        for ( var i = level; i >= 0; --i) {
            var bitmask = 1 << i;
            var digit = +quadkey[level - i];

            if ((digit & 1) !== 0) {
                x |= bitmask;
            }

            if ((digit & 2) !== 0) {
                y |= bitmask;
            }
        }
        return {
            x : x,
            y : y,
            level : level
        };
    };

    function buildImageUrl(imageryProvider, x, y, level) {
        var imageUrl = imageryProvider._imageUrlTemplate;

        var quadkey = BingMapsImageryProvider.tileXYToQuadKey(x, y, level);
        imageUrl = imageUrl.replace('{quadkey}', quadkey);

        var subdomains = imageryProvider._imageUrlSubdomains;
        var subdomainIndex = (x + y + level) % subdomains.length;
        imageUrl = imageUrl.replace('{subdomain}', subdomains[subdomainIndex]);

        var proxy = imageryProvider._proxy;
        if (defined(proxy)) {
            imageUrl = proxy.getURL(imageUrl);
        }

        return imageUrl;
    }

    var intersectionScratch = new Rectangle();

    function getRectangleAttribution(attributionList, level, rectangle) {
        // Bing levels start at 1, while ours start at 0.
        ++level;

        var result = [];

        for (var attributionIndex = 0, attributionLength = attributionList.length; attributionIndex < attributionLength; ++attributionIndex) {
            var attribution = attributionList[attributionIndex];
            var coverageAreas = attribution.coverageAreas;

            var included = false;

            for (var areaIndex = 0, areaLength = attribution.coverageAreas.length; !included && areaIndex < areaLength; ++areaIndex) {
                var area = coverageAreas[areaIndex];
                if (level >= area.zoomMin && level <= area.zoomMax) {
                    var intersection = Rectangle.intersection(rectangle, area.bbox, intersectionScratch);
                    if (defined(intersection)) {
                        included = true;
                    }
                }
            }

            if (included) {
                result.push(attribution.credit);
            }
        }

        return result;
    }

    return BingMapsImageryProvider;
});
