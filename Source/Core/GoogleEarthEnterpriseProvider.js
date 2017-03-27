/*global define*/
define([
        './appendForwardSlash',
        './Cartesian2',
        './Cartesian3',
        './Cartographic',
        './Credit',
        './defaultValue',
        './defined',
        './defineProperties',
        './DeveloperError',
        './Ellipsoid',
        './Event',
        './GeographicTilingScheme',
        './GoogleEarthEnterpriseTerrainData',
        './HeightmapTerrainData',
        './loadArrayBuffer',
        './loadImageFromTypedArray',
        './Math',
        './Rectangle',
        './RuntimeError',
        './TerrainProvider',
        './TileProviderError',
        './throttleRequestByServer',
        '../Scene/DiscardMissingTileImagePolicy',
        '../ThirdParty/pako_inflate',
        '../ThirdParty/protobuf-minimal',
        '../ThirdParty/when'
    ], function(
        appendForwardSlash,
        Cartesian2,
        Cartesian3,
        Cartographic,
        Credit,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        Event,
        GeographicTilingScheme,
        GoogleEarthEnterpriseTerrainData,
        HeightmapTerrainData,
        loadArrayBuffer,
        loadImageFromTypedArray,
        CesiumMath,
        Rectangle,
        RuntimeError,
        TerrainProvider,
        TileProviderError,
        throttleRequestByServer,
        DiscardMissingTileImagePolicy,
        pako,
        protobuf,
        when) {
    'use strict';

    // Bitmask for checking tile properties
    var childrenBitmasks = [0x01, 0x02, 0x04, 0x08];
    var anyChildBitmask = 0x0F;
    var cacheFlagBitmask = 0x10; // True if there is a child subtree
    // var vectorDataBitmask = 0x20;
    var imageBitmask = 0x40;
    var terrainBitmask = 0x80;

    // Datatype sizes
    var sizeOfUint16 = Uint16Array.BYTES_PER_ELEMENT;
    var sizeOfInt32 = Int32Array.BYTES_PER_ELEMENT;
    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

    /**
     * Provides tiled imagery using the Google Earth Enterprise Imagery REST API.
     *
     * @alias GoogleEarthEnterpriseProvider
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {String} options.url The url of the Google Earth Enterprise server hosting the imagery.
     * @param {String} [options.tileProtocol] The protocol to use when loading tiles, e.g. 'http:' or 'https:'.
     *        By default, tiles are loaded using the same protocol as the page.
     * @param {Ellipsoid} [options.ellipsoid] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
     * @param {TileDiscardPolicy} [options.tileDiscardPolicy] The policy that determines if a tile
     *        is invalid and should be discarded.  If this value is not specified, a default
     *        {@link DiscardMissingTileImagePolicy} is used which requests
     *        tile 0,0 at the maximum tile level and checks pixels (0,0), (120,140), (130,160),
     *        (200,50), and (200,200).  If all of these pixels are transparent, the discard check is
     *        disabled and no tiles are discarded.  If any of them have a non-transparent color, any
     *        tile that has the same values in these pixel locations is discarded.  The end result of
     *        these defaults should be correct tile discarding for a standard Google Earth Enterprise server.  To ensure
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
     * var gee = new Cesium.GoogleEarthEnterpriseProvider({
     *     url : 'https://dev.virtualearth.net'
     * });
     *
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     */
    function GoogleEarthEnterpriseProvider(options) {
        options = defaultValue(options, {});

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.url)) {
            throw new DeveloperError('options.url is required.');
        }
        //>>includeEnd('debug');

        this._url = appendForwardSlash(options.url);
        this._tileProtocol = options.tileProtocol;
        this._tileDiscardPolicy = options.tileDiscardPolicy;
        this._proxy = options.proxy;
        this._credit = new Credit('Google Imagery', GoogleEarthEnterpriseProvider._logoData, 'http://www.google.com');

        this._tilingScheme = new GeographicTilingScheme({
            numberOfLevelZeroTilesX : 2,
            numberOfLevelZeroTilesY : 2,
            rectangle : new Rectangle(-CesiumMath.PI, -CesiumMath.PI, CesiumMath.PI, CesiumMath.PI),
            ellipsoid : options.ellipsoid
        });

        this._tileWidth = 256;
        this._tileHeight = 256;
        this._maximumLevel = 23;
        this._levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(this._tilingScheme.ellipsoid, this._tileWidth, this._tilingScheme.getNumberOfXTilesAtLevel(0));

        // Install the default tile discard policy if none has been supplied.
        if (!defined(this._tileDiscardPolicy)) {
            this._tileDiscardPolicy = new DiscardMissingTileImagePolicy({
                // TODO - missing image url
                missingImageUrl : buildImageUrl(this, GoogleEarthEnterpriseProvider.tileXYToQuadKey(0, 0, 1)),
                pixelsToCheck : [new Cartesian2(0, 0), new Cartesian2(120, 140), new Cartesian2(130, 160), new Cartesian2(200, 50), new Cartesian2(200, 200)],
                disableCheckIfAllPixelsAreTransparent : true
            });
        }

        this._tileInfo = {};
        this._terrainCache = {};
        this._subtreePromises = {};

        this._errorEvent = new Event();

        this._ready = false;
        var that = this;
        this._readyPromise = this._getQuadTreePacket()
            .then(function() {
                that._ready = true;
            });
    }

    defineProperties(GoogleEarthEnterpriseProvider.prototype, {
        /**
         * Gets the name of the Google Earth Enterprise server url hosting the imagery.
         * @memberof GoogleEarthEnterpriseProvider.prototype
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
         * @memberof GoogleEarthEnterpriseProvider.prototype
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
         * not be called before {@link GoogleEarthEnterpriseProvider#ready} returns true.
         * @memberof GoogleEarthEnterpriseProvider.prototype
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
         * not be called before {@link GoogleEarthEnterpriseProvider#ready} returns true.
         * @memberof GoogleEarthEnterpriseProvider.prototype
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
         * not be called before {@link GoogleEarthEnterpriseProvider#ready} returns true.
         * @memberof GoogleEarthEnterpriseProvider.prototype
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
         * not be called before {@link GoogleEarthEnterpriseProvider#ready} returns true.
         * @memberof GoogleEarthEnterpriseProvider.prototype
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
         * not be called before {@link GoogleEarthEnterpriseProvider#ready} returns true.
         * @memberof GoogleEarthEnterpriseProvider.prototype
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
         * not be called before {@link GoogleEarthEnterpriseProvider#ready} returns true.
         * @memberof GoogleEarthEnterpriseProvider.prototype
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
         * not be called before {@link GoogleEarthEnterpriseProvider#ready} returns true.
         * @memberof GoogleEarthEnterpriseProvider.prototype
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
         * @memberof GoogleEarthEnterpriseProvider.prototype
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
         * @memberof GoogleEarthEnterpriseProvider.prototype
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
         * @memberof GoogleEarthEnterpriseProvider.prototype
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
         * the source of the imagery.  This function should not be called before {@link GoogleEarthEnterpriseProvider#ready} returns true.
         * @memberof GoogleEarthEnterpriseProvider.prototype
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
         * @memberof GoogleEarthEnterpriseProvider.prototype
         * @type {Boolean}
         * @readonly
         */
        hasAlphaChannel : {
            get : function() {
                return false;
            }
        },

        /**
         * Gets a value indicating whether or not the provider includes a water mask.  The water mask
         * indicates which areas of the globe are water rather than land, so they can be rendered
         * as a reflective surface with animated waves.  This function should not be
         * called before {@link GoogleEarthEnterpriseProvider#ready} returns true.
         * @memberof GoogleEarthEnterpriseProvider.prototype
         * @type {Boolean}
         */
        hasWaterMask : {
            get : function() {
                return false;
            }
        },

        /**
         * Gets a value indicating whether or not the requested tiles include vertex normals.
         * This function should not be called before {@link GoogleEarthEnterpriseProvider#ready} returns true.
         * @memberof GoogleEarthEnterpriseProvider.prototype
         * @type {Boolean}
         */
        hasVertexNormals : {
            get : function() {
                return false;
            }
        },

        /**
         * Gets an object that can be used to determine availability of terrain from this provider, such as
         * at points and in rectangles.  This function should not be called before
         * {@link GoogleEarthEnterpriseProvider#ready} returns true.  This property may be undefined if availability
         * information is not available.
         * @memberof GoogleEarthEnterpriseProvider.prototype
         * @type {TileAvailability}
         */
        availability : {
            get : function() {
                return undefined;
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
    GoogleEarthEnterpriseProvider.prototype.getTileCredits = function(x, y, level) {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('getTileCredits must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        return undefined;
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link GoogleEarthEnterpriseProvider#ready} returns true.
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
    GoogleEarthEnterpriseProvider.prototype.requestImage = function(x, y, level) {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('requestImage must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        var that = this;
        var tileInfo = this._tileInfo;
        var quadKey = GoogleEarthEnterpriseProvider.tileXYToQuadKey(x, y, level);
        return populateSubtree(this, quadKey)
            .then(function(exists){
                if (exists) {
                    var info = tileInfo[quadKey];
                    if (info.bits & imageBitmask) {
                        var url = buildImageUrl(that, quadKey, info.imageryVersion);
                        return loadArrayBuffer(url)
                            .then(function(image) {
                                if (defined(image)) {
                                    GoogleEarthEnterpriseProvider._decode(image);
                                    var a = new Uint8Array(image);
                                    var type = getImageType(a);
                                    if (!defined(type)) {
                                        var message = decodeEarthImageryPacket(a);
                                        type = message.imageType;
                                        a = message.imageData;
                                    }

                                    if (!defined(type) || !defined(a)) {
                                        throw new RuntimeError('Invalid image');
                                    }

                                    return loadImageFromTypedArray(a, type);
                                }
                            })
                            .otherwise(function(error) {
                                // Just ignore failures and return undefined
                            });
                    }
                }
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
    GoogleEarthEnterpriseProvider.prototype.pickFeatures = function(x, y, level, longitude, latitude) {
        return undefined;
    };

    GoogleEarthEnterpriseProvider._logoData = 'data:image/png;base64,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';

    /**
     * Converts a tiles (x, y, level) position into a quadkey used to request an image
     * from a Google Earth Enterprise server.
     *
     * @param {Number} x The tile's x coordinate.
     * @param {Number} y The tile's y coordinate.
     * @param {Number} level The tile's zoom level.
     *
     * @see GoogleEarthEnterpriseProvider#quadKeyToTileXY
     */
    GoogleEarthEnterpriseProvider.tileXYToQuadKey = function(x, y, level) {
        var quadkey = '';
        for ( var i = level; i >= 0; --i) {
            var bitmask = 1 << i;
            var digit = 0;

            // Tile Layout
            // ___ ___
            //|   |   |
            //| 3 | 2 |
            //|-------|
            //| 0 | 1 |
            //|___|___|
            //

            if ((y & bitmask) === 0) { // Top Row
                digit |= 2;
                if ((x & bitmask) === 0) { // Right to left
                    digit |= 1;
                }
            } else {
                if ((x & bitmask) !== 0) { // Left to right
                    digit |= 1;
                }
            }

            quadkey += digit;
        }
        return quadkey;
    };

    /**
     * Converts a tile's quadkey used to request an image from a Google Earth Enterprise server into the
     * (x, y, level) position.
     *
     * @param {String} quadkey The tile's quad key
     *
     * @see GoogleEarthEnterpriseProvider#tileXYToQuadKey
     */
    GoogleEarthEnterpriseProvider.quadKeyToTileXY = function(quadkey) {
        var x = 0;
        var y = 0;
        var level = quadkey.length - 1;
        for ( var i = level; i >= 0; --i) {
            var bitmask = 1 << i;
            var digit = +quadkey[level - i];

            if ((digit & 2) !== 0) {  // Top Row
                if ((digit & 1) === 0) { // // Right to left
                    x |= bitmask;
                }
            } else {
                y |= bitmask;
                if ((digit & 1) !== 0) { // Left to right
                    x |= bitmask;
                }
            }
        }
        return {
            x : x,
            y : y,
            level : level
        };
    };

    /**
     * Requests the geometry for a given tile.  This function should not be called before
     * {@link GoogleEarthEnterpriseProvider#ready} returns true.  The result must include terrain data and
     * may optionally include a water mask and an indication of which child tiles are available.
     *
     * @param {Number} x The X coordinate of the tile for which to request geometry.
     * @param {Number} y The Y coordinate of the tile for which to request geometry.
     * @param {Number} level The level of the tile for which to request geometry.
     * @param {Boolean} [throttleRequests=true] True if the number of simultaneous requests should be limited,
     *                  or false if the request should be initiated regardless of the number of requests
     *                  already in progress.
     * @returns {Promise.<TerrainData>|undefined} A promise for the requested geometry.  If this method
     *          returns undefined instead of a promise, it is an indication that too many requests are already
     *          pending and the request will be retried later.
     *
     * @exception {DeveloperError} This function must not be called before {@link GoogleEarthEnterpriseProvider#ready}
     *            returns true.
     */
    GoogleEarthEnterpriseProvider.prototype.requestTileGeometry = function(x, y, level, throttleRequests) {
        //>>includeStart('debug', pragmas.debug)
        if (!this._ready) {
            throw new DeveloperError('requestTileGeometry must not be called before the terrain provider is ready.');
        }
        //>>includeEnd('debug');

        var that = this;
        var tileInfo = this._tileInfo;
        var terrainCache = this._terrainCache;
        var quadKey = GoogleEarthEnterpriseProvider.tileXYToQuadKey(x, y, level);
        return populateSubtree(this, quadKey)
            .then(function(exists){
                if (exists) {
                    var info = tileInfo[quadKey];
                    if (defined(terrainCache[quadKey])) {
                        var buffer = terrainCache[quadKey];
                        delete terrainCache[quadKey];
                        return new GoogleEarthEnterpriseTerrainData({
                            buffer: buffer,
                            childTileMask: info.bits & anyChildBitmask
                        });
                    }
                    if ((info.bits & terrainBitmask) !== 0 || info.terrainInParent) {
                        var q = quadKey;
                        if (info.terrainInParent) {
                            // If terrain is in parent tile, process that instead
                            q = q.substring(0, q.length-1);
                        }
                        var url = buildTerrainUrl(that, q, info.terrainVersion);
                        var promise;
                        throttleRequests = defaultValue(throttleRequests, true);
                        if (throttleRequests) {
                            promise = throttleRequestByServer(url, loadArrayBuffer);
                            if (!defined(promise)) {
                                return undefined;
                            }
                        } else {
                            promise = loadArrayBuffer(url);
                        }

                        return promise
                            .then(function(terrain) {
                                if (defined(terrain)) {
                                    GoogleEarthEnterpriseProvider._decode(terrain);
                                    var uncompressedTerrain = uncompressPacket(terrain);
                                    parseTerrainPacket(that, uncompressedTerrain, q);

                                    var buffer = terrainCache[quadKey];
                                    delete terrainCache[quadKey];
                                    return new GoogleEarthEnterpriseTerrainData({
                                        buffer: buffer,
                                        childTileMask: info.bits & anyChildBitmask
                                    });
                                }
                            })
                            .otherwise(function(error) {
                                // Just ignore failures and return undefined
                            });
                    } else if(!info.ancestorHasTerrain) {
                        // We haven't reached a level with terrain, so return the ellipsoid
                        return new HeightmapTerrainData({
                            buffer : new Uint8Array(16 * 16),
                            width : 16,
                            height : 16
                        });
                    }
                }
            });
    };

    function parseTerrainPacket(that, terrainData, quadKey) {
        var tileInfo = that._tileInfo;
        var info = tileInfo[quadKey];
        var terrainCache = that._terrainCache;
        var buffer = terrainData.buffer;

        var dv = new DataView(buffer);
        var totalSize = terrainData.length;

        var offset = 0;
        var terrainTiles = [];
        while(offset < totalSize) {
            // Each tile is split into 4 parts
            var tileStart = offset;
            for (var quad = 0; quad < 4; ++quad) {
                var size = dv.getUint32(offset, true);
                offset += sizeOfUint32;
                offset += size;
            }
            terrainTiles.push(buffer.slice(tileStart, offset));
        }

        // If we were sent child tiles, store them till they are needed
        terrainCache[quadKey] = terrainTiles[0];
        var count = terrainTiles.length-1;
        for (var j = 0;j<count;++j) {
            if (info.bits & childrenBitmasks[j] !== 0) {
                var childKey = quadKey + j.toString();
                terrainCache[childKey] = terrainTiles[j + 1];
                tileInfo[childKey].terrainInParent = true;
            }
        }
    }

    /**
     * Gets the maximum geometric error allowed in a tile at a given level.
     *
     * @param {Number} level The tile level for which to get the maximum geometric error.
     * @returns {Number} The maximum geometric error.
     */
    GoogleEarthEnterpriseProvider.prototype.getLevelMaximumGeometricError = function(level) {
        return this._levelZeroMaximumGeometricError / (1 << level);
    };

    /**
     * Determines whether data for a tile is available to be loaded.
     *
     * @param {Number} x The X coordinate of the tile for which to request geometry.
     * @param {Number} y The Y coordinate of the tile for which to request geometry.
     * @param {Number} level The level of the tile for which to request geometry.
     * @returns {Boolean} Undefined if not supported, otherwise true or false.
     */
    GoogleEarthEnterpriseProvider.prototype.getTileDataAvailable = function(x, y, level) {
        return undefined;
    };

    // Decodes packet with a key that has been around since the beginning of Google Earth Enterprise
    var key = "\x45\xf4\xbd\x0b\x79\xe2\x6a\x45\x22\x05\x92\x2c\x17\xcd\x06\x71\xf8\x49\x10\x46\x67\x51\x00\x42\x25\xc6\xe8\x61\x2c\x66\x29\x08\xc6\x34\xdc\x6a\x62\x25\x79\x0a\x77\x1d\x6d\x69\xd6\xf0\x9c\x6b\x93\xa1\xbd\x4e\x75\xe0\x41\x04\x5b\xdf\x40\x56\x0c\xd9\xbb\x72\x9b\x81\x7c\x10\x33\x53\xee\x4f\x6c\xd4\x71\x05\xb0\x7b\xc0\x7f\x45\x03\x56\x5a\xad\x77\x55\x65\x0b\x33\x92\x2a\xac\x19\x6c\x35\x14\xc5\x1d\x30\x73\xf8\x33\x3e\x6d\x46\x38\x4a\xb4\xdd\xf0\x2e\xdd\x17\x75\x16\xda\x8c\x44\x74\x22\x06\xfa\x61\x22\x0c\x33\x22\x53\x6f\xaf\x39\x44\x0b\x8c\x0e\x39\xd9\x39\x13\x4c\xb9\xbf\x7f\xab\x5c\x8c\x50\x5f\x9f\x22\x75\x78\x1f\xe9\x07\x71\x91\x68\x3b\xc1\xc4\x9b\x7f\xf0\x3c\x56\x71\x48\x82\x05\x27\x55\x66\x59\x4e\x65\x1d\x98\x75\xa3\x61\x46\x7d\x61\x3f\x15\x41\x00\x9f\x14\x06\xd7\xb4\x34\x4d\xce\x13\x87\x46\xb0\x1a\xd5\x05\x1c\xb8\x8a\x27\x7b\x8b\xdc\x2b\xbb\x4d\x67\x30\xc8\xd1\xf6\x5c\x8f\x50\xfa\x5b\x2f\x46\x9b\x6e\x35\x18\x2f\x27\x43\x2e\xeb\x0a\x0c\x5e\x10\x05\x10\xa5\x73\x1b\x65\x34\xe5\x6c\x2e\x6a\x43\x27\x63\x14\x23\x55\xa9\x3f\x71\x7b\x67\x43\x7d\x3a\xaf\xcd\xe2\x54\x55\x9c\xfd\x4b\xc6\xe2\x9f\x2f\x28\xed\xcb\x5c\xc6\x2d\x66\x07\x88\xa7\x3b\x2f\x18\x2a\x22\x4e\x0e\xb0\x6b\x2e\xdd\x0d\x95\x7d\x7d\x47\xba\x43\xb2\x11\xb2\x2b\x3e\x4d\xaa\x3e\x7d\xe6\xce\x49\x89\xc6\xe6\x78\x0c\x61\x31\x05\x2d\x01\xa4\x4f\xa5\x7e\x71\x20\x88\xec\x0d\x31\xe8\x4e\x0b\x00\x6e\x50\x68\x7d\x17\x3d\x08\x0d\x17\x95\xa6\x6e\xa3\x68\x97\x24\x5b\x6b\xf3\x17\x23\xf3\xb6\x73\xb3\x0d\x0b\x40\xc0\x9f\xd8\x04\x51\x5d\xfa\x1a\x17\x22\x2e\x15\x6a\xdf\x49\x00\xb9\xa0\x77\x55\xc6\xef\x10\x6a\xbf\x7b\x47\x4c\x7f\x83\x17\x05\xee\xdc\xdc\x46\x85\xa9\xad\x53\x07\x2b\x53\x34\x06\x07\xff\x14\x94\x59\x19\x02\xe4\x38\xe8\x31\x83\x4e\xb9\x58\x46\x6b\xcb\x2d\x23\x86\x92\x70\x00\x35\x88\x22\xcf\x31\xb2\x26\x2f\xe7\xc3\x75\x2d\x36\x2c\x72\x74\xb0\x23\x47\xb7\xd3\xd1\x26\x16\x85\x37\x72\xe2\x00\x8c\x44\xcf\x10\xda\x33\x2d\x1a\xde\x60\x86\x69\x23\x69\x2a\x7c\xcd\x4b\x51\x0d\x95\x54\x39\x77\x2e\x29\xea\x1b\xa6\x50\xa2\x6a\x8f\x6f\x50\x99\x5c\x3e\x54\xfb\xef\x50\x5b\x0b\x07\x45\x17\x89\x6d\x28\x13\x77\x37\x1d\xdb\x8e\x1e\x4a\x05\x66\x4a\x6f\x99\x20\xe5\x70\xe2\xb9\x71\x7e\x0c\x6d\x49\x04\x2d\x7a\xfe\x72\xc7\xf2\x59\x30\x8f\xbb\x02\x5d\x73\xe5\xc9\x20\xea\x78\xec\x20\x90\xf0\x8a\x7f\x42\x17\x7c\x47\x19\x60\xb0\x16\xbd\x26\xb7\x71\xb6\xc7\x9f\x0e\xd1\x33\x82\x3d\xd3\xab\xee\x63\x99\xc8\x2b\x53\xa0\x44\x5c\x71\x01\xc6\xcc\x44\x1f\x32\x4f\x3c\xca\xc0\x29\x3d\x52\xd3\x61\x19\x58\xa9\x7d\x65\xb4\xdc\xcf\x0d\xf4\x3d\xf1\x08\xa9\x42\xda\x23\x09\xd8\xbf\x5e\x50\x49\xf8\x4d\xc0\xcb\x47\x4c\x1c\x4f\xf7\x7b\x2b\xd8\x16\x18\xc5\x31\x92\x3b\xb5\x6f\xdc\x6c\x0d\x92\x88\x16\xd1\x9e\xdb\x3f\xe2\xe9\xda\x5f\xd4\x84\xe2\x46\x61\x5a\xde\x1c\x55\xcf\xa4\x00\xbe\xfd\xce\x67\xf1\x4a\x69\x1c\x97\xe6\x20\x48\xd8\x5d\x7f\x7e\xae\x71\x20\x0e\x4e\xae\xc0\x56\xa9\x91\x01\x3c\x82\x1d\x0f\x72\xe7\x76\xec\x29\x49\xd6\x5d\x2d\x83\xe3\xdb\x36\x06\xa9\x3b\x66\x13\x97\x87\x6a\xd5\xb6\x3d\x50\x5e\x52\xb9\x4b\xc7\x73\x57\x78\xc9\xf4\x2e\x59\x07\x95\x93\x6f\xd0\x4b\x17\x57\x19\x3e\x27\x27\xc7\x60\xdb\x3b\xed\x9a\x0e\x53\x44\x16\x3e\x3f\x8d\x92\x6d\x77\xa2\x0a\xeb\x3f\x52\xa8\xc6\x55\x5e\x31\x49\x37\x85\xf4\xc5\x1f\x26\x2d\xa9\x1c\xbf\x8b\x27\x54\xda\xc3\x6a\x20\xe5\x2a\x78\x04\xb0\xd6\x90\x70\x72\xaa\x8b\x68\xbd\x88\xf7\x02\x5f\x48\xb1\x7e\xc0\x58\x4c\x3f\x66\x1a\xf9\x3e\xe1\x65\xc0\x70\xa7\xcf\x38\x69\xaf\xf0\x56\x6c\x64\x49\x9c\x27\xad\x78\x74\x4f\xc2\x87\xde\x56\x39\x00\xda\x77\x0b\xcb\x2d\x1b\x89\xfb\x35\x4f\x02\xf5\x08\x51\x13\x60\xc1\x0a\x5a\x47\x4d\x26\x1c\x33\x30\x78\xda\xc0\x9c\x46\x47\xe2\x5b\x79\x60\x49\x6e\x37\x67\x53\x0a\x3e\xe9\xec\x46\x39\xb2\xf1\x34\x0d\xc6\x84\x53\x75\x6e\xe1\x0c\x59\xd9\x1e\xde\x29\x85\x10\x7b\x49\x49\xa5\x77\x79\xbe\x49\x56\x2e\x36\xe7\x0b\x3a\xbb\x4f\x03\x62\x7b\xd2\x4d\x31\x95\x2f\xbd\x38\x7b\xa8\x4f\x21\xe1\xec\x46\x70\x76\x95\x7d\x29\x22\x78\x88\x0a\x90\xdd\x9d\x5c\xda\xde\x19\x51\xcf\xf0\xfc\x59\x52\x65\x7c\x33\x13\xdf\xf3\x48\xda\xbb\x2a\x75\xdb\x60\xb2\x02\x15\xd4\xfc\x19\xed\x1b\xec\x7f\x35\xa8\xff\x28\x31\x07\x2d\x12\xc8\xdc\x88\x46\x7c\x8a\x5b\x22";
    var keyBuffer;
    GoogleEarthEnterpriseProvider._decode = function(data) {
        if (!defined(data)) {
            throw new DeveloperError('data is required.');
        }

        var keylen = key.length;
        if (!defined(keyBuffer)) {
            keyBuffer = new ArrayBuffer(keylen);
            var ui8 = new Uint8Array(keyBuffer);
            for (var i=0; i < keylen; ++i) {
                ui8[i] = key.charCodeAt(i);
            }
        }

        var dataView = new DataView(data);
        var keyView = new DataView(keyBuffer);

        var dp = 0;
        var dpend = data.byteLength;
        var dpend64 = dpend - (dpend % 8);
        var kpend = keylen;
        var kp;
        var off = 8;

        // This algorithm is intentionally asymmetric to make it more difficult to
        // guess. Security through obscurity. :-(

        // while we have a full uint64 (8 bytes) left to do
        // assumes buffer is 64bit aligned (or processor doesn't care)
        while (dp < dpend64) {
            // rotate the key each time through by using the offets 16,0,8,16,0,8,...
            off = (off + 8) % 24;
            kp = off;

            // run through one key length xor'ing one uint64 at a time
            // then drop out to rotate the key for the next bit
            while ((dp < dpend64) && (kp < kpend)) {
                dataView.setUint32(dp, dataView.getUint32(dp, true) ^ keyView.getUint32(kp, true), true);
                dataView.setUint32(dp+4, dataView.getUint32(dp+4, true) ^ keyView.getUint32(kp+4, true), true);
                dp += 8;
                kp += 24;
            }
        }

        // now the remaining 1 to 7 bytes
        if (dp < dpend) {
            if (kp >= kpend) {
                // rotate the key one last time (if necessary)
                off = (off + 8) % 24;
                kp = off;
            }

            while (dp < dpend) {
                dataView.setUint8(dp, dataView.getUint8(dp) ^ keyView.getUint8(kp));
                dp++;
                kp++;
            }
        }
    };

    //
    // Functions to handle quadtree packets
    //
    var qtMagic = 32301;
    var compressedMagic = 0x7468dead;
    var compressedMagicSwap = 0xadde6874;
    function uncompressPacket(data) {
        // The layout of this decoded data is
        // Magic Uint32
        // Size Uint32
        // [GZipped chunk of Size bytes]

        // Pullout magic and verify we have the correct data
        var dv = new DataView(data);
        var offset = 0;
        var magic = dv.getUint32(offset, true);
        offset += sizeOfUint32;
        if (magic !== compressedMagic && magic !== compressedMagicSwap) {
            throw new RuntimeError('Invalid magic');
        }

        // Get the size of the compressed buffer
        var size = dv.getUint32(offset, true);
        offset += sizeOfUint32;
        if (magic === compressedMagicSwap) {
            var v = ((size >>> 24) & 0x000000ff) |
                    ((size >>>  8) & 0x0000ff00) |
                    ((size <<  8) & 0x00ff0000) |
                    ((size << 24) & 0xff000000);
            size = v;
        }

        var compressedPacket = new Uint8Array(data, offset);
        var uncompressedPacket = pako.inflate(compressedPacket);

        if (uncompressedPacket.length !== size) {
            throw new RuntimeError('Size of packet doesn\'t match header');
        }

        return uncompressedPacket;
    }

    // Requests quadtree packet and populates _tileInfo with results
    GoogleEarthEnterpriseProvider.prototype._getQuadTreePacket = function(quadKey) {
        quadKey = defaultValue(quadKey, '');
        var url = this._url + 'flatfile?q2-0' + quadKey + '-q.2';
        var proxy = this._proxy;
        if (defined(proxy)) {
            url = proxy.getURL(url);
        }

        var that = this;
        return loadArrayBuffer(url)
            .then(function(metadata) {
                GoogleEarthEnterpriseProvider._decode(metadata);

                var uncompressedPacket = uncompressPacket(metadata);
                var dv = new DataView(uncompressedPacket.buffer);
                var offset = 0;
                var magic = dv.getUint32(offset, true);
                offset += sizeOfUint32;
                if (magic !== qtMagic) {
                    throw new RuntimeError('Invalid magic');
                }

                var dataTypeId = dv.getUint32(offset, true);
                offset += sizeOfUint32;
                if (dataTypeId !== 1) {
                    throw new RuntimeError('Invalid data type. Must be 1 for QuadTreePacket');
                }

                var version = dv.getUint32(offset, true);
                offset += sizeOfUint32;
                if (version !== 2) {
                    throw new RuntimeError('Invalid version. Only QuadTreePacket version 2 supported.');
                }

                var numInstances = dv.getInt32(offset, true);
                offset += sizeOfInt32;

                var dataInstanceSize = dv.getInt32(offset, true);
                offset += sizeOfInt32;
                if (dataInstanceSize !== 32) {
                    throw new RuntimeError('Invalid instance size.');
                }

                var dataBufferOffset = dv.getInt32(offset, true);
                offset += sizeOfInt32;

                var dataBufferSize = dv.getInt32(offset, true);
                offset += sizeOfInt32;

                var metaBufferSize = dv.getInt32(offset, true);
                offset += sizeOfInt32;

                // Offset from beginning of packet (instances + current offset)
                if (dataBufferOffset !== (numInstances * dataInstanceSize + offset)) {
                    throw new RuntimeError('Invalid dataBufferOffset');
                }

                // Verify the packets is all there header + instances + dataBuffer + metaBuffer
                if (dataBufferOffset + dataBufferSize + metaBufferSize !== uncompressedPacket.length) {
                    throw new RuntimeError('Invalid packet offsets');
                }

                // Read all the instances
                var instances = [];
                for (var i = 0; i < numInstances; ++i) {
                    var bitfield = dv.getUint8(offset);
                    ++offset;

                    ++offset; // 2 byte align

                    // We only support version 2 which we verified above this tile already is
                    //var cnodeVersion = dv.getUint16(offset, true);
                    offset += sizeOfUint16;

                    var imageVersion = dv.getUint16(offset, true);
                    offset += sizeOfUint16;

                    var terrainVersion = dv.getUint16(offset, true);
                    offset += sizeOfUint16;

                    // Number of channels stored in the dataBuffer
                    //var numChannels = dv.getUint16(offset, true);
                    offset += sizeOfUint16;

                    offset += sizeOfUint16; // 4 byte align

                    // Channel type offset into dataBuffer
                    //var typeOffset = dv.getInt32(offset, true);
                    offset += sizeOfInt32;

                    // Channel version offset into dataBuffer
                    //var versionOffset = dv.getInt32(offset, true);
                    offset += sizeOfInt32;

                    offset += 8; // Ignore image neighbors for now

                    // Data providers aren't used
                    ++offset; // Image provider
                    ++offset; // Terrain provider
                    offset += sizeOfUint16; // 4 byte align

                    instances.push({
                        bits : bitfield,
                        imageryVersion : imageVersion,
                        terrainVersion : terrainVersion,
                        ancestorHasTerrain : false, // Set it later once we find its parent
                        terrainInParent : false
                    });
                }

                var tileInfo = that._tileInfo;
                var index = 0;

                function populateTiles(parentKey, parent, level) {
                    var bits = parent.bits;
                    var isLeaf = false;
                    if (level === 4) {
                        if ((bits & cacheFlagBitmask) !== 0) {
                            return; // We have a subtree, so just return
                        }

                        isLeaf = true; // No subtree, so set all children to null
                    }
                    for (var i = 0; i < 4; ++i) {
                        var childKey = parentKey + i.toString();
                        if (isLeaf) {
                            // No subtree so set all children to null
                            tileInfo[childKey] = null;
                        } else if (level < 4) {
                            // We are still in the middle of the subtree, so add child
                            //  only if their bits are set, otherwise set child to null.
                            if ((bits & childrenBitmasks[i]) === 0) {
                                tileInfo[childKey] = null;
                            } else {
                                if (index === numInstances) {
                                    console.log('Incorrect number of instances');
                                    return;
                                }

                                var instance = instances[index++];
                                instance.ancestorHasTerrain = parent.ancestorHasTerrain || ((instance.bits & terrainBitmask) !== 0);
                                tileInfo[childKey] = instance;
                                populateTiles(childKey, instance, level + 1);
                            }
                        }
                    }
                }

                var level = 0;
                var root;
                if (quadKey === '') {
                    // Root tile has data at its root, all others don't
                    root = instances[index++];
                    ++level;
                } else {
                    // Root tile has no data except children bits, so put them into the tile info
                    var top = instances[index++];
                    root = tileInfo[quadKey];
                    root.bits |= top.bits;
                }

                populateTiles(quadKey, root, level);
            });
    };

    // Verifies there is tileInfo for a quadKey. If not it requests the subtrees required to get it.
    // Returns promise that resolves to true if the tile info is available, false otherwise.
    function populateSubtree(that, quadKey) {
        var tileInfo = that._tileInfo;
        var q = quadKey;
        var t = tileInfo[q];
        // If we have tileInfo make sure sure it is not a node with a subtree that's not loaded
        if (defined(t) && ((t.bits & cacheFlagBitmask) === 0 || (t.bits & anyChildBitmask) !== 0)) {
            return when(true);
        }

        while((t === undefined) && q.length > 1) {
            q = q.substring(0, q.length-1);
            t = tileInfo[q];
        }

        // t is either
        //   null so one of its parents was a leaf node, so this tile doesn't exist
        //   undefined so no parent exists - this shouldn't ever happen once the provider is ready
        if (!defined(t)) {
            return when(false);
        }

        var subtreePromises = that._subtreePromises;
        var promise = subtreePromises[q];
        if (defined(promise)) {
            return promise;
        }

        // We need to split up the promise here because when will execute syncronously if _getQuadTreePacket
        //  is already resolved (like in the tests), so subtreePromises will never get cleared out.
        promise = that._getQuadTreePacket(q);

        subtreePromises[q] = promise
            .then(function() {
                return true;
            });
        return promise
            .then(function() {
                delete subtreePromises[q];
                // Recursively call this incase we need multiple subtree requests
                return populateSubtree(that, quadKey);
            });
    }

    //
    // Functions to handle imagery packets
    //
    function buildImageUrl(imageryProvider, quadKey, version) {
        version = (defined(version) && version > 0) ? version : 1;
        var imageUrl = imageryProvider._url + 'flatfile?f1-0' + quadKey + '-i.' + version.toString();

        var proxy = imageryProvider._proxy;
        if (defined(proxy)) {
            imageUrl = proxy.getURL(imageUrl);
        }

        return imageUrl;
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
            switch(imageType) {
                case 0:
                    message.imageType = 'image/jpeg';
                    break;
                case 4:
                    message.imageType = 'image/png';
                    break;
                default:
                    throw new RuntimeError('GoogleEarthEnterpriseProvider: Unsupported image type.');
            }
        }

        var alphaType = message.alphaType;
        if (defined(alphaType) && alphaType !== 0) {
            console.log('GoogleEarthEnterpriseProvider: External alpha not supported.');
            delete message.alphaType;
            delete message.imageAlpha;
        }

        return message;
    }

    //
    // Functions to handle imagery packets
    //
    function buildTerrainUrl(terrainProvider, quadKey, version) {
        version = (defined(version) && version > 0) ? version : 1;
        var terrainUrl = terrainProvider._url + 'flatfile?f1c-0' + quadKey + '-t.' + version.toString();

        var proxy = terrainProvider._proxy;
        if (defined(proxy)) {
            terrainUrl = proxy.getURL(terrainUrl);
        }

        return terrainUrl;
    }

    return GoogleEarthEnterpriseProvider;
});
