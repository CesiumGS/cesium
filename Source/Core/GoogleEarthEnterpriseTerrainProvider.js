/*global define*/
define([
        './Cartesian2',
        './Cartesian3',
        './Cartographic',
        './Credit',
        './defaultValue',
        './defined',
        './defineProperties',
        './destroyObject',
        './DeveloperError',
        './Ellipsoid',
        './Event',
        './GeographicTilingScheme',
        './GoogleEarthEnterpriseMetadata',
        './GoogleEarthEnterpriseTerrainData',
        './HeightmapTerrainData',
        './loadArrayBuffer',
        './Math',
        './Rectangle',
        './TerrainProvider',
        './throttleRequestByServer',
        './TileProviderError',
        '../ThirdParty/when'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartographic,
        Credit,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        Ellipsoid,
        Event,
        GeographicTilingScheme,
        GoogleEarthEnterpriseMetadata,
        GoogleEarthEnterpriseTerrainData,
        HeightmapTerrainData,
        loadArrayBuffer,
        CesiumMath,
        Rectangle,
        TerrainProvider,
        throttleRequestByServer,
        TileProviderError,
        when) {
    'use strict';

    var TerrainState = {
        UNKNOWN : 0,
        NONE : 1,
        SELF : 2,
        PARENT : 3
    };

    /**
     * Provides tiled terrain using the Google Earth Enterprise REST API.
     *
     * @alias GoogleEarthEnterpriseTerrainProvider
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {String} options.url The url of the Google Earth Enterprise server hosting the imagery.
     * @param {Proxy} [options.proxy] A proxy to use for requests. This object is
     *        expected to have a getURL function which returns the proxied URL, if needed.
     * @param {Ellipsoid} [options.ellipsoid] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
     * @param {Credit|String} [options.credit] A credit for the data source, which is displayed on the canvas.
     *
     * @see CesiumTerrainProvider
     * @see GoogleEarthEnterpriseImageryProvider
     *
     * @example
     * var gee = new Cesium.GoogleEarthEnterpriseTerrainProvider({
     *     url : 'http://www.earthenterprise.org/3d'
     * });
     *
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     */
    function GoogleEarthEnterpriseTerrainProvider(options) {
        options = defaultValue(options, {});

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.url)) {
            throw new DeveloperError('options.url is required.');
        }
        //>>includeEnd('debug');

        this._metadata = GoogleEarthEnterpriseMetadata.getMetadata(options.url, options.proxy);
        this._proxy = options.proxy;

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

        // Pulled from Google's documentation
        this._levelZeroMaximumGeometricError = 40075.16;

        this._terrainCache = {};
        this._terrainPromises = {};

        this._errorEvent = new Event();

        this._ready = false;
        var that = this;
        var metadataError;
        this._readyPromise = this._metadata.readyPromise
            .then(function(result) {
                TileProviderError.handleSuccess(metadataError);
                that._ready = result;
                return result;
            })
            .otherwise(function(e) {
                metadataError = TileProviderError.handleError(metadataError, that, that._errorEvent, e.message, undefined, undefined, undefined, e);
                return when.reject(e);
            });
    }

    defineProperties(GoogleEarthEnterpriseTerrainProvider.prototype, {
        /**
         * Gets the name of the Google Earth Enterprise server url hosting the imagery.
         * @memberof GoogleEarthEnterpriseProvider.prototype
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
                return this._readyPromise;
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
    GoogleEarthEnterpriseTerrainProvider.prototype.requestTileGeometry = function(x, y, level, throttleRequests) {
        //>>includeStart('debug', pragmas.debug)
        if (!this._ready) {
            throw new DeveloperError('requestTileGeometry must not be called before the terrain provider is ready.');
        }
        //>>includeEnd('debug');

        var hasTerrain = true;
        var quadKey = GoogleEarthEnterpriseMetadata.tileXYToQuadKey(x, y, level);
        var terrainCache = this._terrainCache;
        var metadata = this._metadata;
        var info = metadata.getTileInformationFromQuadKey(quadKey);

        if (!defined(terrainCache[quadKey])) { // If its in the cache we know we have it so just skip all the checks
            if (defined(info)) {
                if (info.terrainState === TerrainState.NONE) {
                    // Already have info and there isn't any terrain here
                    hasTerrain = false;
                }
            } else {
                if (info === null) {
                    // Parent was retrieved and said child doesn't exist
                    hasTerrain = false;
                }

                var q = quadKey;
                var last;
                while (q.length > 1) {
                    last = q.substring(q.length - 1);
                    q = q.substring(0, q.length - 1);
                    info = metadata.getTileInformationFromQuadKey(q);
                    if (defined(info)) {
                        if (!info.hasSubtree() &&
                            !info.hasChild(parseInt(last))) {
                            // We have no subtree or child available at some point in this node's ancestry
                            hasTerrain = false;
                        }

                        break;
                    } else if (info === null) {
                        // Some node in the ancestry was loaded and said there wasn't a subtree
                        hasTerrain = false;
                        break;
                    }
                }
            }
        }

        if (!hasTerrain) {
            if(defined(info) && !info.ancestorHasTerrain) {
                // We haven't reached a level with terrain, so return the ellipsoid
                return new HeightmapTerrainData({
                    buffer : new Uint8Array(16 * 16),
                    width : 16,
                    height : 16
                });
            }

            return undefined;
        }


        var that = this;
        var terrainPromises = this._terrainPromises;
        return metadata.populateSubtree(x, y, level)
            .then(function(info){
                if (defined(info)) {
                    if (defined(terrainCache[quadKey])) {
                        if (info.terrainState === TerrainState.UNKNOWN) {
                            // If its already in the cache then a parent request must've loaded it
                            info.terrainState = TerrainState.PARENT;
                        }
                        var buffer = terrainCache[quadKey];
                        delete terrainCache[quadKey];
                        return new GoogleEarthEnterpriseTerrainData({
                            buffer: buffer,
                            childTileMask: info.getChildBitmask()
                        });
                    }

                    var parentInfo;
                    var q = quadKey;
                    var terrainVersion = -1;
                    var terrainState = info.terrainState;
                    if (terrainState !== TerrainState.NONE) {
                        switch(terrainState) {
                            case TerrainState.SELF: // We have terrain and have retrieved it before
                                terrainVersion = info.terrainVersion;
                                break;
                            case TerrainState.PARENT: // We have terrain in our parent
                                q = q.substring(0, q.length-1);
                                parentInfo = metadata.getTileInformationFromQuadKey(q);
                                terrainVersion = parentInfo.terrainVersion;
                                break;
                            case TerrainState.UNKNOWN: // We haven't tried to retrieve terrain yet
                                if (info.hasTerrain()) {
                                    terrainVersion = info.terrainVersion; // We should have terrain
                                } else {
                                    q = q.substring(0, q.length-1);
                                    parentInfo = metadata.getTileInformationFromQuadKey(q);
                                    if (defined(parentInfo) && parentInfo.hasTerrain()) {
                                        terrainVersion = parentInfo.terrainVersion; // Try checking in the parent
                                    }
                                }
                                break;
                        }
                    }

                    if (terrainVersion > 0) {
                        var url = buildTerrainUrl(that, q, terrainVersion);
                        var promise;
                        if (defined(terrainPromises[q])) {
                            promise = terrainPromises[q];
                        } else {
                            var requestPromise;
                            throttleRequests = defaultValue(throttleRequests, true);
                            if (throttleRequests) {
                                requestPromise = throttleRequestByServer(url, loadArrayBuffer);
                                if (!defined(requestPromise)) {
                                    return undefined;
                                }
                            } else {
                                requestPromise = loadArrayBuffer(url);
                            }

                            terrainPromises[q] = requestPromise;

                            promise = requestPromise
                                .always(function(terrain) {
                                    delete terrainPromises[q];
                                    return terrain;
                                });
                        }

                        return promise
                            .then(function(terrain) {
                                if (defined(terrain)) {
                                    GoogleEarthEnterpriseMetadata.decode(terrain);
                                    var uncompressedTerrain = GoogleEarthEnterpriseMetadata.uncompressPacket(terrain);
                                    parseTerrainPacket(that, uncompressedTerrain, q);

                                    var buffer = terrainCache[quadKey];
                                    if (defined(buffer)) {
                                        if (q !== quadKey) {
                                            // If we didn't request this tile directly then it came from a parent
                                            info.terrainState = TerrainState.PARENT;
                                        }
                                        delete terrainCache[quadKey];
                                        return new GoogleEarthEnterpriseTerrainData({
                                            buffer : buffer,
                                            childTileMask : info.getChildBitmask()
                                        });
                                    } else {
                                        info.terrainState = TerrainState.NONE;
                                    }
                                }
                            })
                            .otherwise(function(error) {
                                info.terrainState = TerrainState.NONE;
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

    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;
    function parseTerrainPacket(that, terrainData, quadKey) {
        var info = that._metadata.getTileInformationFromQuadKey(quadKey);
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
        info.terrainState = TerrainState.SELF;
        var count = terrainTiles.length-1;
        for (var j = 0; j < count; ++j) {
            var childKey = quadKey + j.toString();
            if (info.hasChild(j)) {
                terrainCache[childKey] = terrainTiles[j+1];
            }
        }
    }

    /**
     * Gets the maximum geometric error allowed in a tile at a given level.
     *
     * @param {Number} level The tile level for which to get the maximum geometric error.
     * @returns {Number} The maximum geometric error.
     */
    GoogleEarthEnterpriseTerrainProvider.prototype.getLevelMaximumGeometricError = function(level) {
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
    GoogleEarthEnterpriseTerrainProvider.prototype.getTileDataAvailable = function(x, y, level) {
        var metadata = this._metadata;
        var info = metadata.getTileInformation(x, y, level);
        if (defined(info)) {
            // We may have terrain or no ancestors have had it so we'll return the ellipsoid
            return info.terrainState !== TerrainState.NONE || !info.ancestorHasTerrain;
        }
        return undefined;
    };

    /**
     * Releases resources used by this provider
     */
    GoogleEarthEnterpriseTerrainProvider.prototype.destroy = function() {
        var metadata = this._metadata;
        if (defined(metadata)) {
            this._metadata = undefined;
            GoogleEarthEnterpriseMetadata.releaseMetadata(metadata);
        }

        return destroyObject(this);
    };

    //
    // Functions to handle imagery packets
    //
    function buildTerrainUrl(terrainProvider, quadKey, version) {
        version = (defined(version) && version > 0) ? version : 1;
        var terrainUrl = terrainProvider.url + 'flatfile?f1c-0' + quadKey + '-t.' + version.toString();

        var proxy = terrainProvider._proxy;
        if (defined(proxy)) {
            terrainUrl = proxy.getURL(terrainUrl);
        }

        return terrainUrl;
    }

    return GoogleEarthEnterpriseTerrainProvider;
});
