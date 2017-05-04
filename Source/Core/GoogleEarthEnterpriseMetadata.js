/*global define*/
define([
    '../ThirdParty/when',
    './appendForwardSlash',
    './Check',
    './defaultValue',
    './defined',
    './defineProperties',
    './GoogleEarthEnterpriseTileInformation',
    './isBitSet',
    './loadArrayBuffer',
    './RuntimeError',
    './TaskProcessor',
    './throttleRequestByServer'
], function(
    when,
    appendForwardSlash,
    Check,
    defaultValue,
    defined,
    defineProperties,
    GoogleEarthEnterpriseTileInformation,
    isBitSet,
    loadArrayBuffer,
    RuntimeError,
    TaskProcessor,
    throttleRequestByServer) {
    'use strict';

    /**
     * Provides metadata using the Google Earth Enterprise REST API. This is used by the
     *
     * @alias GoogleEarthEnterpriseMetadata
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {String} options.url The url of the Google Earth Enterprise server hosting the imagery.
     * @param {Proxy} [options.proxy] A proxy to use for requests. This object is
     *        expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @see GoogleEarthEnterpriseImageryProvider
     * @see GoogleEarthEnterpriseTerrainProvider
     *
     */
    function GoogleEarthEnterpriseMetadata(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.string('options.url', options.url);
        //>>includeEnd('debug');

        this._url = appendForwardSlash(options.url);
        this._proxy = options.proxy;

        this._tileInfo = {};
        this._subtreePromises = {};

        var that = this;
        this._readyPromise = this.getQuadTreePacket('', 1, false)
            .then(function() {
                return true;
            })
            .otherwise(function(e) {
                var message = 'An error occurred while accessing ' + getMetadataUrl(that, '', 1) + '.';
                return when.reject(new RuntimeError(message));
            });
    }

    defineProperties(GoogleEarthEnterpriseMetadata.prototype, {
        /**
         * Gets the name of the Google Earth Enterprise server.
         * @memberof GoogleEarthEnterpriseMetadata.prototype
         * @type {String}
         * @readonly
         */
        url : {
            get : function() {
                return this._url;
            }
        },

        /**
         * Gets the proxy used for metadata requests.
         * @memberof GoogleEarthEnterpriseImageryProvider.prototype
         * @type {Proxy}
         * @readonly
         */
        proxy : {
            get : function() {
                return this._proxy;
            }
        },

        /**
         * Gets a promise that resolves to true when the metadata is ready for use.
         * @memberof GoogleEarthEnterpriseProvider.prototype
         * @type {Promise.<Boolean>}
         * @readonly
         */
        readyPromise : {
            get : function() {
                return this._readyPromise;
            }
        }
    });

    /**
     * Converts a tiles (x, y, level) position into a quadkey used to request an image
     * from a Google Earth Enterprise server.
     *
     * @param {Number} x The tile's x coordinate.
     * @param {Number} y The tile's y coordinate.
     * @param {Number} level The tile's zoom level.
     *
     * @see GoogleEarthEnterpriseMetadata#quadKeyToTileXY
     */
    GoogleEarthEnterpriseMetadata.tileXYToQuadKey = function(x, y, level) {
        var quadkey = '';
        for (var i = level; i >= 0; --i) {
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

            if (!isBitSet(y, bitmask)) { // Top Row
                digit |= 2;
                if (!isBitSet(x, bitmask)) { // Right to left
                    digit |= 1;
                }
            } else {
                if (isBitSet(x, bitmask)) { // Left to right
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
     * @see GoogleEarthEnterpriseMetadata#tileXYToQuadKey
     */
    GoogleEarthEnterpriseMetadata.quadKeyToTileXY = function(quadkey) {
        var x = 0;
        var y = 0;
        var level = quadkey.length - 1;
        for (var i = level; i >= 0; --i) {
            var bitmask = 1 << i;
            var digit = +quadkey[level - i];

            if (isBitSet(digit, 2)) {  // Top Row
                if (!isBitSet(digit, 1)) { // // Right to left
                    x |= bitmask;
                }
            } else {
                y |= bitmask;
                if (isBitSet(digit, 1)) { // Left to right
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

    GoogleEarthEnterpriseMetadata.prototype.isValid = function(quadKey) {
        var info = this.getTileInformationFromQuadKey(quadKey);
        if (defined(info)) {
            return info !== null;
        }

        var valid = true;
        var q = quadKey;
        var last;
        while (q.length > 1) {
            last = q.substring(q.length - 1);
            q = q.substring(0, q.length - 1);
            info = this.getTileInformationFromQuadKey(q);
            if (defined(info)) {
                if (!info.hasSubtree() &&
                    !info.hasChild(parseInt(last))) {
                    // We have no subtree or child available at some point in this node's ancestry
                    valid = false;
                }

                break;
            } else if (info === null) {
                // Some node in the ancestry was loaded and said there wasn't a subtree
                valid = false;
                break;
            }
        }

        return valid;
    };

    var taskProcessor = new TaskProcessor('decodeGoogleEarthEnterprisePacket', Number.POSITIVE_INFINITY);

    /**
     * Retrieves a Google Earth Enterprise quadtree packet.
     *
     * @param {String} [quadKey=''] The quadkey to retrieve the packet for.
     * @param {Number} [version=1] The cnode version to be used in the request.
     * @param {Boolean} [throttle=true] True if the number of simultaneous requests should be limited,
     *                  or false if the request should be initiated regardless of the number of requests
     *                  already in progress.
     *
     * @private
     */
    GoogleEarthEnterpriseMetadata.prototype.getQuadTreePacket = function(quadKey, version, throttle) {
        version = defaultValue(version, 1);
        quadKey = defaultValue(quadKey, '');
        throttle = defaultValue(throttle, true);
        var url = getMetadataUrl(this, quadKey, version);
        var proxy = this._proxy;
        if (defined(proxy)) {
            url = proxy.getURL(url);
        }

        var promise;
        if (throttle) {
            promise = throttleRequestByServer(url, loadArrayBuffer);
            if (!defined(promise)) {
                return undefined;
            }
        } else {
            promise = loadArrayBuffer(url);
        }

        var tileInfo = this._tileInfo;
        return promise
            .then(function(metadata) {
                var decodePromise = taskProcessor.scheduleTask({
                    buffer : metadata,
                    quadKey : quadKey,
                    type : 'Metadata'
                }, [metadata]);

                return decodePromise
                    .then(function(result) {
                        var root;
                        var topLevelKeyLength = -1;
                        if (quadKey !== '') {
                            // Root tile has no data except children bits, so put them into the tile info
                            topLevelKeyLength = quadKey.length + 1;
                            var top = result[quadKey];
                            root = tileInfo[quadKey];
                            root._bits |= top._bits;

                            delete result[quadKey];
                        }

                        // Copy the resulting objects into tileInfo
                        // Make sure we start with shorter quadkeys first, so we know the parents have
                        //  already been processed. Otherwise we can lose ancestorHasTerrain along the way.
                        var keys = Object.keys(result);
                        keys.sort(function(a, b) {
                            return a.length - b.length;
                        });
                        var keysLength = keys.length;
                        for (var i = 0; i < keysLength; ++i) {
                            var key = keys[i];
                            var r = result[key];
                            if (r !== null) {
                                var info = GoogleEarthEnterpriseTileInformation.clone(result[key]);
                                var keyLength = key.length;
                                if (keyLength === topLevelKeyLength) {
                                    info.setParent(root);
                                } else if(keyLength > 1){
                                    var parent = tileInfo[key.substring(0, key.length - 1)];
                                    info.setParent(parent);
                                }
                                tileInfo[key] = info;
                            } else {
                                tileInfo[key] = null;
                            }
                        }
                    });
            });
    };

    /**
     * Populates the metadata subtree down to the specified tile.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @param {Boolean} [throttle=true] True if the number of simultaneous requests should be limited,
     *                  or false if the request should be initiated regardless of the number of requests
     *                  already in progress.
     *
     * @returns {Promise<GoogleEarthEnterpriseTileInformation>} A promise that resolves to the tile info for the requested quad key
     *
     * @private
     */
    GoogleEarthEnterpriseMetadata.prototype.populateSubtree = function(x, y, level, throttle) {
        throttle = defaultValue(throttle, true);
        var quadkey = GoogleEarthEnterpriseMetadata.tileXYToQuadKey(x, y, level);
        return populateSubtree(this, quadkey, throttle);
    };

    function populateSubtree(that, quadKey, throttle) {
        var tileInfo = that._tileInfo;
        var q = quadKey;
        var t = tileInfo[q];
        // If we have tileInfo make sure sure it is not a node with a subtree that's not loaded
        if (defined(t) && (!t.hasSubtree() || t.hasChildren())) {
            return t;
        }

        while ((t === undefined) && q.length > 1) {
            q = q.substring(0, q.length - 1);
            t = tileInfo[q];
        }

        var subtreePromises = that._subtreePromises;
        var promise = subtreePromises[q];
        if (defined(promise)) {
            return promise
                .then(function() {
                    // Recursively call this incase we need multiple subtree requests
                    return populateSubtree(that, quadKey, throttle);
                });
        }

        // t is either
        //   null so one of its parents was a leaf node, so this tile doesn't exist
        //   exists but doesn't have a subtree to request
        //   undefined so no parent exists - this shouldn't ever happen once the provider is ready
        if (!defined(t) || !t.hasSubtree()) {
            return when.reject(new RuntimeError('Couldn\'t load metadata for tile ' + quadKey));
        }

        // We need to split up the promise here because when will execute syncronously if getQuadTreePacket
        //  is already resolved (like in the tests), so subtreePromises will never get cleared out.
        //  Only the initial request will also remove the promise from subtreePromises.
        promise = that.getQuadTreePacket(q, t.cnodeVersion, throttle);
        if (!defined(promise)) {
            return undefined;
        }
        subtreePromises[q] = promise;

        return promise
            .then(function() {
                // Recursively call this incase we need multiple subtree requests
                return populateSubtree(that, quadKey, throttle);
            })
            .always(function() {
                delete subtreePromises[q];
            });
    }

    /**
     * Gets information about a tile
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @returns {GoogleEarthEnterpriseTileInformation|undefined} Information about the tile or undefined if it isn't loaded.
     *
     * @private
     */
    GoogleEarthEnterpriseMetadata.prototype.getTileInformation = function(x, y, level) {
        var quadkey = GoogleEarthEnterpriseMetadata.tileXYToQuadKey(x, y, level);
        return this._tileInfo[quadkey];
    };

    /**
     * Gets information about a tile from a quadKey
     *
     * @param {String} quadkey The quadkey for the tile
     * @returns {GoogleEarthEnterpriseTileInformation|undefined} Information about the tile or undefined if it isn't loaded.
     *
     * @private
     */
    GoogleEarthEnterpriseMetadata.prototype.getTileInformationFromQuadKey = function(quadkey) {
        return this._tileInfo[quadkey];
    };

    function getMetadataUrl(that, quadKey, version) {
        return that._url + 'flatfile?q2-0' + quadKey + '-q.' + version.toString();
    }

    return GoogleEarthEnterpriseMetadata;
});
