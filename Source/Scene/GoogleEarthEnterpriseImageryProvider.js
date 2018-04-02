define([
        '../Core/Credit',
        '../Core/decodeGoogleEarthEnterpriseData',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/GeographicTilingScheme',
        '../Core/GoogleEarthEnterpriseMetadata',
        '../Core/loadImageFromTypedArray',
        '../Core/Math',
        '../Core/Rectangle',
        '../Core/Request',
        '../Core/Resource',
        '../Core/RuntimeError',
        '../Core/TileProviderError',
        '../ThirdParty/protobuf-minimal',
        '../ThirdParty/when'
    ], function(
        Credit,
        decodeGoogleEarthEnterpriseData,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        GeographicTilingScheme,
        GoogleEarthEnterpriseMetadata,
        loadImageFromTypedArray,
        CesiumMath,
        Rectangle,
        Request,
        Resource,
        RuntimeError,
        TileProviderError,
        protobuf,
        when) {
    'use strict';

    function GoogleEarthEnterpriseDiscardPolicy() {
        this._image = new Image();
    }

    /**
     * Determines if the discard policy is ready to process images.
     * @returns {Boolean} True if the discard policy is ready to process images; otherwise, false.
     */
    GoogleEarthEnterpriseDiscardPolicy.prototype.isReady = function() {
        return true;
    };

    /**
     * Given a tile image, decide whether to discard that image.
     *
     * @param {Image} image An image to test.
     * @returns {Boolean} True if the image should be discarded; otherwise, false.
     */
    GoogleEarthEnterpriseDiscardPolicy.prototype.shouldDiscardImage = function(image) {
        return (image === this._image);
    };

    /**
     * Provides tiled imagery using the Google Earth Enterprise REST API.
     *
     * Notes: This provider is for use with the 3D Earth API of Google Earth Enterprise,
     *        {@link GoogleEarthEnterpriseMapsProvider} should be used with 2D Maps API.
     *
     * @alias GoogleEarthEnterpriseImageryProvider
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Resource|String} options.url The url of the Google Earth Enterprise server hosting the imagery.
     * @param {GoogleEarthEnterpriseMetadata} options.metadata A metadata object that can be used to share metadata requests with a GoogleEarthEnterpriseTerrainProvider.
     * @param {Ellipsoid} [options.ellipsoid] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
     * @param {TileDiscardPolicy} [options.tileDiscardPolicy] The policy that determines if a tile
     *        is invalid and should be discarded. If this value is not specified, a default
     *        is to discard tiles that fail to download.
     * @param {Credit|String} [options.credit] A credit for the data source, which is displayed on the canvas.
     *
     * @see GoogleEarthEnterpriseTerrainProvider
     * @see ArcGisMapServerImageryProvider
     * @see GoogleEarthEnterpriseMapsProvider
     * @see createOpenStreetMapImageryProvider
     * @see SingleTileImageryProvider
     * @see createTileMapServiceImageryProvider
     * @see WebMapServiceImageryProvider
     * @see WebMapTileServiceImageryProvider
     * @see UrlTemplateImageryProvider
     *
     *
     * @example
     * var geeMetadata = new GoogleEarthEnterpriseMetadata('http://www.earthenterprise.org/3d');
     * var gee = new Cesium.GoogleEarthEnterpriseImageryProvider({
     *     metadata : geeMetadata
     * });
     *
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     */
    function GoogleEarthEnterpriseImageryProvider(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (!(defined(options.url) || defined(options.metadata))) {
            throw new DeveloperError('options.url or options.metadata is required.');
        }
        //>>includeEnd('debug');

        var metadata;
        if (defined(options.metadata)) {
            metadata = options.metadata;
        } else {
            var resource = Resource.createIfNeeded(options.url);
            metadata = new GoogleEarthEnterpriseMetadata(resource);
        }
        this._metadata = metadata;
        this._tileDiscardPolicy = options.tileDiscardPolicy;

        this._tilingScheme = new GeographicTilingScheme({
            numberOfLevelZeroTilesX : 2,
            numberOfLevelZeroTilesY : 2,
            rectangle : new Rectangle(-CesiumMath.PI, -CesiumMath.PI, CesiumMath.PI, CesiumMath.PI),
            ellipsoid : options.ellipsoid
        });

        var credit = options.credit;
        if (typeof credit === 'string') {
            credit = new Credit(credit);
        }
        this._credit = credit;

        this._tileWidth = 256;
        this._tileHeight = 256;
        this._maximumLevel = 23;

        // Install the default tile discard policy if none has been supplied.
        if (!defined(this._tileDiscardPolicy)) {
            this._tileDiscardPolicy = new GoogleEarthEnterpriseDiscardPolicy();
        }

        this._errorEvent = new Event();

        this._ready = false;
        var that = this;
        var metadataError;
        this._readyPromise = metadata.readyPromise
            .then(function(result) {
                if (!metadata.imageryPresent) {
                    var e = new RuntimeError('The server ' + metadata.url + ' doesn\'t have imagery');
                    metadataError = TileProviderError.handleError(metadataError, that, that._errorEvent, e.message, undefined, undefined, undefined, e);
                    return when.reject(e);
                }

                TileProviderError.handleSuccess(metadataError);
                that._ready = result;
                return result;
            })
            .otherwise(function(e) {
                metadataError = TileProviderError.handleError(metadataError, that, that._errorEvent, e.message, undefined, undefined, undefined, e);
                return when.reject(e);
            });
    }

    defineProperties(GoogleEarthEnterpriseImageryProvider.prototype, {
        /**
         * Gets the name of the Google Earth Enterprise server url hosting the imagery.
         * @memberof GoogleEarthEnterpriseImageryProvider.prototype
         * @type {String}
         * @readonly
         */
        url : {
            get : function() {
                return this._metadata.url;
            }
        },

        /**
         * Gets the proxy used by this provider.
         * @memberof GoogleEarthEnterpriseImageryProvider.prototype
         * @type {Proxy}
         * @readonly
         */
        proxy : {
            get : function() {
                return this._metadata.proxy;
            }
        },

        /**
         * Gets the width of each tile, in pixels. This function should
         * not be called before {@link GoogleEarthEnterpriseImageryProvider#ready} returns true.
         * @memberof GoogleEarthEnterpriseImageryProvider.prototype
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
         * not be called before {@link GoogleEarthEnterpriseImageryProvider#ready} returns true.
         * @memberof GoogleEarthEnterpriseImageryProvider.prototype
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
         * not be called before {@link GoogleEarthEnterpriseImageryProvider#ready} returns true.
         * @memberof GoogleEarthEnterpriseImageryProvider.prototype
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
         * not be called before {@link GoogleEarthEnterpriseImageryProvider#ready} returns true.
         * @memberof GoogleEarthEnterpriseImageryProvider.prototype
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
         * not be called before {@link GoogleEarthEnterpriseImageryProvider#ready} returns true.
         * @memberof GoogleEarthEnterpriseImageryProvider.prototype
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
         * not be called before {@link GoogleEarthEnterpriseImageryProvider#ready} returns true.
         * @memberof GoogleEarthEnterpriseImageryProvider.prototype
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
         * not be called before {@link GoogleEarthEnterpriseImageryProvider#ready} returns true.
         * @memberof GoogleEarthEnterpriseImageryProvider.prototype
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
         * @memberof GoogleEarthEnterpriseImageryProvider.prototype
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
         * @memberof GoogleEarthEnterpriseImageryProvider.prototype
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
         * @memberof GoogleEarthEnterpriseImageryProvider.prototype
         * @type {Promise.<Boolean>}
         * @readonly
         */
        readyPromise : {
            get : function() {
                return this._readyPromise;
            }
        },

        /**
         * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
         * the source of the imagery.  This function should not be called before {@link GoogleEarthEnterpriseImageryProvider#ready} returns true.
         * @memberof GoogleEarthEnterpriseImageryProvider.prototype
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
         * @memberof GoogleEarthEnterpriseImageryProvider.prototype
         * @type {Boolean}
         * @readonly
         */
        hasAlphaChannel : {
            get : function() {
                return false;
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
    GoogleEarthEnterpriseImageryProvider.prototype.getTileCredits = function(x, y, level) {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('getTileCredits must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        var metadata = this._metadata;
        var info = metadata.getTileInformation(x, y, level);
        if (defined(info)) {
            var credit = metadata.providers[info.imageryProvider];
            if (defined(credit)) {
                return [credit];
            }
        }

        return undefined;
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link GoogleEarthEnterpriseImageryProvider#ready} returns true.
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
    GoogleEarthEnterpriseImageryProvider.prototype.requestImage = function(x, y, level, request) {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('requestImage must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        var invalidImage = this._tileDiscardPolicy._image; // Empty image or undefined depending on discard policy
        var metadata = this._metadata;
        var quadKey = GoogleEarthEnterpriseMetadata.tileXYToQuadKey(x, y, level);
        var info = metadata.getTileInformation(x, y, level);
        if (!defined(info)) {
            if (metadata.isValid(quadKey)) {
                var metadataRequest = new Request({
                    throttle : request.throttle,
                    throttleByServer : request.throttleByServer,
                    type : request.type,
                    priorityFunction : request.priorityFunction
                });
                metadata.populateSubtree(x, y, level, metadataRequest);
                return undefined; // No metadata so return undefined so we can be loaded later
            }
            return invalidImage; // Image doesn't exist
        }

        if (!info.hasImagery()) {
            // Already have info and there isn't any imagery here
            return invalidImage;
        }
        var promise = buildImageResource(this, info, x, y, level, request).fetchArrayBuffer();
        if (!defined(promise)) {
            return undefined; // Throttled
        }

        return promise
            .then(function(image) {
                decodeGoogleEarthEnterpriseData(metadata.key, image);
                var a = new Uint8Array(image);
                var type;

                var protoImagery = metadata.protoImagery;
                if (!defined(protoImagery) || !protoImagery) {
                    type = getImageType(a);
                }

                if (!defined(type) && (!defined(protoImagery) || protoImagery)) {
                    var message = decodeEarthImageryPacket(a);
                    type = message.imageType;
                    a = message.imageData;
                }

                if (!defined(type) || !defined(a)) {
                    return invalidImage;
                }

                return loadImageFromTypedArray(a, type);
            });
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
    GoogleEarthEnterpriseImageryProvider.prototype.pickFeatures = function(x, y, level, longitude, latitude) {
        return undefined;
    };

    //
    // Functions to handle imagery packets
    //
    function buildImageResource(imageryProvider, info, x, y, level, request) {
        var quadKey = GoogleEarthEnterpriseMetadata.tileXYToQuadKey(x, y, level);
        var version = info.imageryVersion;
        version = (defined(version) && version > 0) ? version : 1;

        return imageryProvider._metadata.resource.getDerivedResource({
            url: 'flatfile?f1-0' + quadKey + '-i.' + version.toString(),
            request: request
        });
    }

    // Detects if a Uint8Array is a JPEG or PNG
    function getImageType(image) {
        var jpeg = 'JFIF';
        if (image[6] === jpeg.charCodeAt(0) && image[7] === jpeg.charCodeAt(1) &&
            image[8] === jpeg.charCodeAt(2) && image[9] === jpeg.charCodeAt(3)) {
            return 'image/jpeg';
        }

        var png = 'PNG';
        if (image[1] === png.charCodeAt(0) && image[2] === png.charCodeAt(1) && image[3] === png.charCodeAt(2)) {
            return 'image/png';
        }

        return undefined;
    }

    // Decodes an Imagery protobuf into the message
    // Partially generated with the help of protobuf.js static generator
    function decodeEarthImageryPacket(data) {
        var reader = protobuf.Reader.create(data);
        var end = reader.len;
        var message = {};
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.imageType = reader.uint32();
                    break;
                case 2:
                    message.imageData = reader.bytes();
                    break;
                case 3:
                    message.alphaType = reader.uint32();
                    break;
                case 4:
                    message.imageAlpha = reader.bytes();
                    break;
                case 5:
                    var copyrightIds = message.copyrightIds;
                    if (!defined(copyrightIds)) {
                        copyrightIds = message.copyrightIds = [];
                    }
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2) {
                            copyrightIds.push(reader.uint32());
                        }
                    } else {
                        copyrightIds.push(reader.uint32());
                    }
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }

        var imageType = message.imageType;
        if (defined(imageType)) {
            switch (imageType) {
                case 0:
                    message.imageType = 'image/jpeg';
                    break;
                case 4:
                    message.imageType = 'image/png';
                    break;
                default:
                    throw new RuntimeError('GoogleEarthEnterpriseImageryProvider: Unsupported image type.');
            }
        }

        var alphaType = message.alphaType;
        if (defined(alphaType) && alphaType !== 0) {
            console.log('GoogleEarthEnterpriseImageryProvider: External alpha not supported.');
            delete message.alphaType;
            delete message.imageAlpha;
        }

        return message;
    }

    return GoogleEarthEnterpriseImageryProvider;
});
