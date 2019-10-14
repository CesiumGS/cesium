import BingMapsApi from '../Core/BingMapsApi.js';
import buildModuleUrl from '../Core/buildModuleUrl.js';
import Check from '../Core/Check.js';
import Credit from '../Core/Credit.js';
import defaultValue from '../Core/defaultValue.js';
import defined from '../Core/defined.js';
import defineProperties from '../Core/defineProperties.js';
import DeveloperError from '../Core/DeveloperError.js';
import Event from '../Core/Event.js';
import CesiumMath from '../Core/Math.js';
import Rectangle from '../Core/Rectangle.js';
import Resource from '../Core/Resource.js';
import RuntimeError from '../Core/RuntimeError.js';
import TileProviderError from '../Core/TileProviderError.js';
import WebMercatorTilingScheme from '../Core/WebMercatorTilingScheme.js';
import when from '../ThirdParty/when.js';
import BingMapsStyle from './BingMapsStyle.js';
import DiscardEmptyTilePolicy from './DiscardEmptyTileImagePolicy.js';
import ImageryProvider from './ImageryProvider.js';

    /**
     * Provides tiled imagery using the Bing Maps Imagery REST API.
     *
     * @alias BingMapsImageryProvider
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Resource|String} options.url The url of the Bing Maps server hosting the imagery.
     * @param {String} [options.key] The Bing Maps key for your application, which can be
     *        created at {@link https://www.bingmapsportal.com/}.
     *        If this parameter is not provided, {@link BingMapsApi.defaultKey} is used, which is undefined by default.
     * @param {String} [options.tileProtocol] The protocol to use when loading tiles, e.g. 'http' or 'https'.
     *        By default, tiles are loaded using the same protocol as the page.
     * @param {BingMapsStyle} [options.mapStyle=BingMapsStyle.AERIAL] The type of Bing Maps imagery to load.
     * @param {String} [options.culture=''] The culture to use when requesting Bing Maps imagery. Not
     *        all cultures are supported. See {@link http://msdn.microsoft.com/en-us/library/hh441729.aspx}
     *        for information on the supported cultures.
     * @param {Ellipsoid} [options.ellipsoid] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
     * @param {TileDiscardPolicy} [options.tileDiscardPolicy] The policy that determines if a tile
     *        is invalid and should be discarded.  By default, a {@link DiscardEmptyTileImagePolicy}
     *        will be used, with the expectation that the Bing Maps server will send a zero-length response for missing tiles.
     *        To ensure that no tiles are discarded, construct and pass a {@link NeverTileDiscardPolicy} for this parameter.
     *
     * @see ArcGisMapServerImageryProvider
     * @see GoogleEarthEnterpriseMapsProvider
     * @see OpenStreetMapImageryProvider
     * @see SingleTileImageryProvider
     * @see TileMapServiceImageryProvider
     * @see WebMapServiceImageryProvider
     * @see WebMapTileServiceImageryProvider
     * @see UrlTemplateImageryProvider
     *
     *
     * @example
     * var bing = new Cesium.BingMapsImageryProvider({
     *     url : 'https://dev.virtualearth.net',
     *     key : 'get-yours-at-https://www.bingmapsportal.com/',
     *     mapStyle : Cesium.BingMapsStyle.AERIAL
     * });
     *
     * @see {@link http://msdn.microsoft.com/en-us/library/ff701713.aspx|Bing Maps REST Services}
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     */
    function BingMapsImageryProvider(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.url)) {
            throw new DeveloperError('options.url is required.');
        }
        //>>includeEnd('debug');

        this._key = BingMapsApi.getKey(options.key);
        this._resource = Resource.createIfNeeded(options.url);
        this._resource.appendForwardSlash();
        this._tileProtocol = options.tileProtocol;
        this._mapStyle = defaultValue(options.mapStyle, BingMapsStyle.AERIAL);
        this._culture = defaultValue(options.culture, '');

        this._tileDiscardPolicy = options.tileDiscardPolicy;
        if (!defined(this._tileDiscardPolicy)) {
            this._tileDiscardPolicy = new DiscardEmptyTilePolicy();
        }

        this._proxy = options.proxy;
        this._credit = new Credit('<a href="http://www.bing.com"><img src="' + BingMapsImageryProvider.logoUrl + '" title="Bing Imagery"/></a>');

        /**
         * The default {@link ImageryLayer#gamma} to use for imagery layers created for this provider.
         * Changing this value after creating an {@link ImageryLayer} for this provider will have
         * no effect.  Instead, set the layer's {@link ImageryLayer#gamma} property.
         *
         * @type {Number}
         * @default 1.0
         */
        this.defaultGamma = 1.0;

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

        var tileProtocol = this._tileProtocol;

        // For backward compatibility reasons, the tileProtocol may end with
        // a `:`. Remove it.
        if (defined(tileProtocol)) {
            if (tileProtocol.length > 0 && tileProtocol[tileProtocol.length - 1] === ':') {
                tileProtocol = tileProtocol.substr(0, tileProtocol.length - 1);
            }
        } else {
            // use http if the document's protocol is http, otherwise use https
            var documentProtocol = document.location.protocol;
            tileProtocol = documentProtocol === 'http:' ? 'http' : 'https';
        }

        var metadataResource = this._resource.getDerivedResource({
            url:'REST/v1/Imagery/Metadata/' + this._mapStyle,
            queryParameters: {
                incl: 'ImageryProviders',
                key: this._key,
                uriScheme: tileProtocol
            }
        });
        var that = this;
        var metadataError;

        function metadataSuccess(data) {
            if (data.resourceSets.length !== 1) {
                metadataFailure();
                return;
            }
            var resource = data.resourceSets[0].resources[0];

            that._tileWidth = resource.imageWidth;
            that._tileHeight = resource.imageHeight;
            that._maximumLevel = resource.zoomMax - 1;
            that._imageUrlSubdomains = resource.imageUrlSubdomains;
            that._imageUrlTemplate = resource.imageUrl;

            var attributionList = that._attributionList = resource.imageryProviders;
            if (!attributionList) {
                attributionList = that._attributionList = [];
            }

            for (var attributionIndex = 0, attributionLength = attributionList.length; attributionIndex < attributionLength; ++attributionIndex) {
                var attribution = attributionList[attributionIndex];

                if (attribution.credit instanceof Credit) {
                    // If attribution.credit has already been created
                    // then we are using a cached value, which means
                    // none of the remaining processing needs to be done.
                    break;
                }

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
            var message = 'An error occurred while accessing ' + metadataResource.url + '.';
            metadataError = TileProviderError.handleError(metadataError, that, that._errorEvent, message, undefined, undefined, undefined, requestMetadata);
            that._readyPromise.reject(new RuntimeError(message));
        }

        var cacheKey = metadataResource.url;
        function requestMetadata() {
            var promise = metadataResource.fetchJsonp('jsonp');
            BingMapsImageryProvider._metadataCache[cacheKey] = promise;
            promise.then(metadataSuccess).otherwise(metadataFailure);
        }

        var promise = BingMapsImageryProvider._metadataCache[cacheKey];
        if (defined(promise)) {
            promise.then(metadataSuccess).otherwise(metadataFailure);
        } else {
            requestMetadata();
        }
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
                return this._resource.url;
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
                return this._resource.proxy;
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
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('getTileCredits must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        var rectangle = this._tilingScheme.tileXYToRectangle(x, y, level, rectangleScratch);
        var result = getRectangleAttribution(this._attributionList, level, rectangle);

        return result;
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link BingMapsImageryProvider#ready} returns true.
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
    BingMapsImageryProvider.prototype.requestImage = function(x, y, level, request) {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('requestImage must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        var promise = ImageryProvider.loadImage(this, buildImageResource(this, x, y, level, request));

        if (defined(promise)) {
            return promise.otherwise(function(error) {
                // One cause of an error here is that the image we tried to load was zero-length.
                // This isn't actually a problem, since it indicates that there is no tile.
                // So, in that case we return the EMPTY_IMAGE sentinel value for later discarding.
                if (defined(error.blob) && error.blob.size === 0) {
                    return DiscardEmptyTilePolicy.EMPTY_IMAGE;
                }
                return when.reject(error);
            });
        }

        return undefined;
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
    BingMapsImageryProvider.prototype.pickFeatures = function(x, y, level, longitude, latitude) {
        return undefined;
    };

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

    BingMapsImageryProvider._logoUrl = undefined;

    defineProperties(BingMapsImageryProvider, {
        /**
         * Gets or sets the URL to the Bing logo for display in the credit.
         * @memberof BingMapsImageryProvider
         * @type {String}
         */
        logoUrl: {
            get: function() {
                if (!defined(BingMapsImageryProvider._logoUrl)) {
                    BingMapsImageryProvider._logoUrl = buildModuleUrl('Assets/Images/bing_maps_credit.png');
                }
                return BingMapsImageryProvider._logoUrl;
            },
            set: function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.defined('value', value);
                //>>includeEnd('debug');

                BingMapsImageryProvider._logoUrl = value;
            }
        }
    });

    function buildImageResource(imageryProvider, x, y, level, request) {
        var imageUrl = imageryProvider._imageUrlTemplate;

        var subdomains = imageryProvider._imageUrlSubdomains;
        var subdomainIndex = (x + y + level) % subdomains.length;

        return imageryProvider._resource.getDerivedResource({
            url: imageUrl,
            request: request,
            templateValues: {
                quadkey: BingMapsImageryProvider.tileXYToQuadKey(x, y, level),
                subdomain: subdomains[subdomainIndex],
                culture: imageryProvider._culture
            },
            queryParameters: {
                // this parameter tells the Bing servers to send a zero-length response
                // instead of a placeholder image for missing tiles.
                n: 'z'
            }
        });
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

    // Exposed for testing
    BingMapsImageryProvider._metadataCache = {};
export default BingMapsImageryProvider;
