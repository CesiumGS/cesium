/*global define*/
define([
    './appendForwardSlash',
    './defaultValue',
    './defined',
    './defineProperties',
    './DeveloperError',
    './loadArrayBuffer',
    './RuntimeError',
    '../ThirdParty/pako_inflate',
    '../ThirdParty/when'
], function(
    appendForwardSlash,
    defaultValue,
    defined,
    defineProperties,
    DeveloperError,
    loadArrayBuffer,
    RuntimeError,
    pako,
    when) {
    'use strict';

    // Bitmask for checking tile properties
    var childrenBitmasks = [0x01, 0x02, 0x04, 0x08];
    var anyChildBitmask = 0x0F;
    var cacheFlagBitmask = 0x10; // True if there is a child subtree
    //var vectorDataBitmask = 0x20;
    var imageBitmask = 0x40;
    var terrainBitmask = 0x80;

    // Datatype sizes
    var sizeOfUint16 = Uint16Array.BYTES_PER_ELEMENT;
    var sizeOfInt32 = Int32Array.BYTES_PER_ELEMENT;
    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

    function isBitSet(bits, mask) {
        return ((bits & mask) !== 0);
    }

    function TileInformation(bits, cnodeVersion, imageryVersion, terrainVersion) {
        this._bits = bits;
        this.cnodeVersion = cnodeVersion;
        this.imageryVersion = imageryVersion;
        this.terrainVersion = terrainVersion;
        this.ancestorHasTerrain = false; // Set it later once we find its parent
        this.terrainState = 0; // UNKNOWN
    }

    TileInformation.prototype.setParent = function(parent) {
        this.ancestorHasTerrain = parent.ancestorHasTerrain || this.hasTerrain();
    };

    TileInformation.prototype.hasSubtree = function() {
        return isBitSet(this._bits, cacheFlagBitmask);
    };

    TileInformation.prototype.hasImagery = function() {
        return isBitSet(this._bits, imageBitmask);
    };

    TileInformation.prototype.hasTerrain = function() {
        return isBitSet(this._bits, terrainBitmask);
    };

    TileInformation.prototype.hasChildren = function() {
        return isBitSet(this._bits, anyChildBitmask);
    };

    TileInformation.prototype.hasChild = function(index) {
        return isBitSet(this._bits, childrenBitmasks[index]);
    };

    TileInformation.prototype.getChildBitmask = function(index) {
        return this._bits && anyChildBitmask;
    };

    GoogleEarthEnterpriseMetadata.TileInformation = TileInformation;

    var metadata = {};

    GoogleEarthEnterpriseMetadata.getMetadata = function(url, proxy) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(url)) {
            throw new DeveloperError('url is required.');
        }
        //>>includeEnd('debug');

        url = appendForwardSlash(url);

        var result = metadata[url];
        if (defined(metadata[url])) {
            ++result.refCount;
            return result;
        }

        result = new GoogleEarthEnterpriseMetadata(url, proxy);
        metadata[url] = result;

        return result;
    };

    GoogleEarthEnterpriseMetadata.releaseMetadata = function(metadataObj) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(metadataObj)) {
            throw new DeveloperError('metadataObj is required.');
        }
        //>>includeEnd('debug');

        --metadataObj.refCount;
        if (metadataObj.refCount === 0) {
            delete metadata[metadataObj.url];
        }
    };

    /**
     * Provides metadata using the Google Earth Enterprise REST API. This is used by the
     *
     * @alias GoogleEarthEnterpriseMetadata
     * @constructor
     *
     * @param {String} url The url of the Google Earth Enterprise server hosting the imagery.
     * @param {Proxy} [proxy] A proxy to use for requests. This object is
     *        expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @see GoogleEarthEnterpriseImageryProvider
     * @see GoogleEarthEnterpriseTerrainProvider
     *
     * @private
     */
    function GoogleEarthEnterpriseMetadata(url, proxy) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(url)) {
            throw new DeveloperError('url is required.');
        }
        //>>includeEnd('debug');

        this._url = url;
        this._proxy = proxy;

        this._tileInfo = {};
        this._subtreePromises = {};

        this.refCount = 1;

        this._readyPromise = this._getQuadTreePacket();
    }

    defineProperties(GoogleEarthEnterpriseMetadata.prototype, {
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
         * Gets a promise that resolves to true when the provider is ready for use.
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
        for ( var i = level; i >= 0; --i) {
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

    // Decodes packet with a key that has been around since the beginning of Google Earth Enterprise
    var key = "\x45\xf4\xbd\x0b\x79\xe2\x6a\x45\x22\x05\x92\x2c\x17\xcd\x06\x71\xf8\x49\x10\x46\x67\x51\x00\x42\x25\xc6\xe8\x61\x2c\x66\x29\x08\xc6\x34\xdc\x6a\x62\x25\x79\x0a\x77\x1d\x6d\x69\xd6\xf0\x9c\x6b\x93\xa1\xbd\x4e\x75\xe0\x41\x04\x5b\xdf\x40\x56\x0c\xd9\xbb\x72\x9b\x81\x7c\x10\x33\x53\xee\x4f\x6c\xd4\x71\x05\xb0\x7b\xc0\x7f\x45\x03\x56\x5a\xad\x77\x55\x65\x0b\x33\x92\x2a\xac\x19\x6c\x35\x14\xc5\x1d\x30\x73\xf8\x33\x3e\x6d\x46\x38\x4a\xb4\xdd\xf0\x2e\xdd\x17\x75\x16\xda\x8c\x44\x74\x22\x06\xfa\x61\x22\x0c\x33\x22\x53\x6f\xaf\x39\x44\x0b\x8c\x0e\x39\xd9\x39\x13\x4c\xb9\xbf\x7f\xab\x5c\x8c\x50\x5f\x9f\x22\x75\x78\x1f\xe9\x07\x71\x91\x68\x3b\xc1\xc4\x9b\x7f\xf0\x3c\x56\x71\x48\x82\x05\x27\x55\x66\x59\x4e\x65\x1d\x98\x75\xa3\x61\x46\x7d\x61\x3f\x15\x41\x00\x9f\x14\x06\xd7\xb4\x34\x4d\xce\x13\x87\x46\xb0\x1a\xd5\x05\x1c\xb8\x8a\x27\x7b\x8b\xdc\x2b\xbb\x4d\x67\x30\xc8\xd1\xf6\x5c\x8f\x50\xfa\x5b\x2f\x46\x9b\x6e\x35\x18\x2f\x27\x43\x2e\xeb\x0a\x0c\x5e\x10\x05\x10\xa5\x73\x1b\x65\x34\xe5\x6c\x2e\x6a\x43\x27\x63\x14\x23\x55\xa9\x3f\x71\x7b\x67\x43\x7d\x3a\xaf\xcd\xe2\x54\x55\x9c\xfd\x4b\xc6\xe2\x9f\x2f\x28\xed\xcb\x5c\xc6\x2d\x66\x07\x88\xa7\x3b\x2f\x18\x2a\x22\x4e\x0e\xb0\x6b\x2e\xdd\x0d\x95\x7d\x7d\x47\xba\x43\xb2\x11\xb2\x2b\x3e\x4d\xaa\x3e\x7d\xe6\xce\x49\x89\xc6\xe6\x78\x0c\x61\x31\x05\x2d\x01\xa4\x4f\xa5\x7e\x71\x20\x88\xec\x0d\x31\xe8\x4e\x0b\x00\x6e\x50\x68\x7d\x17\x3d\x08\x0d\x17\x95\xa6\x6e\xa3\x68\x97\x24\x5b\x6b\xf3\x17\x23\xf3\xb6\x73\xb3\x0d\x0b\x40\xc0\x9f\xd8\x04\x51\x5d\xfa\x1a\x17\x22\x2e\x15\x6a\xdf\x49\x00\xb9\xa0\x77\x55\xc6\xef\x10\x6a\xbf\x7b\x47\x4c\x7f\x83\x17\x05\xee\xdc\xdc\x46\x85\xa9\xad\x53\x07\x2b\x53\x34\x06\x07\xff\x14\x94\x59\x19\x02\xe4\x38\xe8\x31\x83\x4e\xb9\x58\x46\x6b\xcb\x2d\x23\x86\x92\x70\x00\x35\x88\x22\xcf\x31\xb2\x26\x2f\xe7\xc3\x75\x2d\x36\x2c\x72\x74\xb0\x23\x47\xb7\xd3\xd1\x26\x16\x85\x37\x72\xe2\x00\x8c\x44\xcf\x10\xda\x33\x2d\x1a\xde\x60\x86\x69\x23\x69\x2a\x7c\xcd\x4b\x51\x0d\x95\x54\x39\x77\x2e\x29\xea\x1b\xa6\x50\xa2\x6a\x8f\x6f\x50\x99\x5c\x3e\x54\xfb\xef\x50\x5b\x0b\x07\x45\x17\x89\x6d\x28\x13\x77\x37\x1d\xdb\x8e\x1e\x4a\x05\x66\x4a\x6f\x99\x20\xe5\x70\xe2\xb9\x71\x7e\x0c\x6d\x49\x04\x2d\x7a\xfe\x72\xc7\xf2\x59\x30\x8f\xbb\x02\x5d\x73\xe5\xc9\x20\xea\x78\xec\x20\x90\xf0\x8a\x7f\x42\x17\x7c\x47\x19\x60\xb0\x16\xbd\x26\xb7\x71\xb6\xc7\x9f\x0e\xd1\x33\x82\x3d\xd3\xab\xee\x63\x99\xc8\x2b\x53\xa0\x44\x5c\x71\x01\xc6\xcc\x44\x1f\x32\x4f\x3c\xca\xc0\x29\x3d\x52\xd3\x61\x19\x58\xa9\x7d\x65\xb4\xdc\xcf\x0d\xf4\x3d\xf1\x08\xa9\x42\xda\x23\x09\xd8\xbf\x5e\x50\x49\xf8\x4d\xc0\xcb\x47\x4c\x1c\x4f\xf7\x7b\x2b\xd8\x16\x18\xc5\x31\x92\x3b\xb5\x6f\xdc\x6c\x0d\x92\x88\x16\xd1\x9e\xdb\x3f\xe2\xe9\xda\x5f\xd4\x84\xe2\x46\x61\x5a\xde\x1c\x55\xcf\xa4\x00\xbe\xfd\xce\x67\xf1\x4a\x69\x1c\x97\xe6\x20\x48\xd8\x5d\x7f\x7e\xae\x71\x20\x0e\x4e\xae\xc0\x56\xa9\x91\x01\x3c\x82\x1d\x0f\x72\xe7\x76\xec\x29\x49\xd6\x5d\x2d\x83\xe3\xdb\x36\x06\xa9\x3b\x66\x13\x97\x87\x6a\xd5\xb6\x3d\x50\x5e\x52\xb9\x4b\xc7\x73\x57\x78\xc9\xf4\x2e\x59\x07\x95\x93\x6f\xd0\x4b\x17\x57\x19\x3e\x27\x27\xc7\x60\xdb\x3b\xed\x9a\x0e\x53\x44\x16\x3e\x3f\x8d\x92\x6d\x77\xa2\x0a\xeb\x3f\x52\xa8\xc6\x55\x5e\x31\x49\x37\x85\xf4\xc5\x1f\x26\x2d\xa9\x1c\xbf\x8b\x27\x54\xda\xc3\x6a\x20\xe5\x2a\x78\x04\xb0\xd6\x90\x70\x72\xaa\x8b\x68\xbd\x88\xf7\x02\x5f\x48\xb1\x7e\xc0\x58\x4c\x3f\x66\x1a\xf9\x3e\xe1\x65\xc0\x70\xa7\xcf\x38\x69\xaf\xf0\x56\x6c\x64\x49\x9c\x27\xad\x78\x74\x4f\xc2\x87\xde\x56\x39\x00\xda\x77\x0b\xcb\x2d\x1b\x89\xfb\x35\x4f\x02\xf5\x08\x51\x13\x60\xc1\x0a\x5a\x47\x4d\x26\x1c\x33\x30\x78\xda\xc0\x9c\x46\x47\xe2\x5b\x79\x60\x49\x6e\x37\x67\x53\x0a\x3e\xe9\xec\x46\x39\xb2\xf1\x34\x0d\xc6\x84\x53\x75\x6e\xe1\x0c\x59\xd9\x1e\xde\x29\x85\x10\x7b\x49\x49\xa5\x77\x79\xbe\x49\x56\x2e\x36\xe7\x0b\x3a\xbb\x4f\x03\x62\x7b\xd2\x4d\x31\x95\x2f\xbd\x38\x7b\xa8\x4f\x21\xe1\xec\x46\x70\x76\x95\x7d\x29\x22\x78\x88\x0a\x90\xdd\x9d\x5c\xda\xde\x19\x51\xcf\xf0\xfc\x59\x52\x65\x7c\x33\x13\xdf\xf3\x48\xda\xbb\x2a\x75\xdb\x60\xb2\x02\x15\xd4\xfc\x19\xed\x1b\xec\x7f\x35\xa8\xff\x28\x31\x07\x2d\x12\xc8\xdc\x88\x46\x7c\x8a\x5b\x22";
    var keyBuffer;

    /**
     * Decodes data that is received from the Google Earth Enterprise server.
     *
     * @param {ArrayBuffer} data The data to be decoded.
     */
    GoogleEarthEnterpriseMetadata.decode = function(data) {
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


    var qtMagic = 32301;
    var compressedMagic = 0x7468dead;
    var compressedMagicSwap = 0xadde6874;
    /**
     * Uncompresses a Google Earth Enterprise packet.
     *
     * @param {ArrayBuffer} data The data to be uncompressed.
     */
    GoogleEarthEnterpriseMetadata.uncompressPacket = function (data) {
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
            size = ((size >>> 24) & 0x000000ff) |
                    ((size >>>  8) & 0x0000ff00) |
                    ((size <<  8) & 0x00ff0000) |
                    ((size << 24) & 0xff000000);
        }

        var compressedPacket = new Uint8Array(data, offset);
        var uncompressedPacket = pako.inflate(compressedPacket);

        if (uncompressedPacket.length !== size) {
            throw new RuntimeError('Size of packet doesn\'t match header');
        }

        return uncompressedPacket;
    };

    // Requests quadtree packet and populates _tileInfo with results
    GoogleEarthEnterpriseMetadata.prototype._getQuadTreePacket = function(quadKey, version) {
        version = defaultValue(version, 1);
        quadKey = defaultValue(quadKey, '');
        var url = this._url + 'flatfile?q2-0' + quadKey + '-q.' + version.toString();
        var proxy = this._proxy;
        if (defined(proxy)) {
            url = proxy.getURL(url);
        }

        var that = this;
        return loadArrayBuffer(url)
            .then(function(metadata) {
                GoogleEarthEnterpriseMetadata.decode(metadata);

                var uncompressedPacket = GoogleEarthEnterpriseMetadata.uncompressPacket(metadata);
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

                    var cnodeVersion = dv.getUint16(offset, true);
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

                    instances.push(new TileInformation(bitfield, cnodeVersion,
                        imageVersion, terrainVersion));
                }

                var tileInfo = that._tileInfo;
                var index = 0;

                function populateTiles(parentKey, parent, level) {
                    var isLeaf = false;
                    if (level === 4) {
                        if (parent.hasSubtree()) {
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
                            if (!parent.hasChild(i)) {
                                tileInfo[childKey] = null;
                            } else {
                                if (index === numInstances) {
                                    console.log('Incorrect number of instances');
                                    return;
                                }

                                var instance = instances[index++];
                                instance.setParent(parent);
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
                    root._bits |= top._bits;
                }

                populateTiles(quadKey, root, level);
            });
    };

    // Verifies there is tileInfo for a quadKey. If not it requests the subtrees required to get it.
    // Returns promise that resolves to true if the tile info is available, false otherwise.

    /**
     * Populates the metadata subtree down to the specified tile.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     *
     * @returns {Promise<GoogleEarthEnterpriseMetadata.TileInformation>} A promise that resolves to the tile info for the requested quad key
     */
    GoogleEarthEnterpriseMetadata.prototype.populateSubtree = function(x, y, level) {
        var quadkey = GoogleEarthEnterpriseMetadata.tileXYToQuadKey(x, y, level);
        return populateSubtree(this, quadkey);
    };

    function populateSubtree(that, quadKey) {
        var tileInfo = that._tileInfo;
        var q = quadKey;
        var t = tileInfo[q];
        // If we have tileInfo make sure sure it is not a node with a subtree that's not loaded
        if (defined(t) && (!t.hasSubtree() || t.hasChildren())) {
            return when(t);
        }

        while((t === undefined) && q.length > 1) {
            q = q.substring(0, q.length-1);
            t = tileInfo[q];
        }

        // t is either
        //   null so one of its parents was a leaf node, so this tile doesn't exist
        //   undefined so no parent exists - this shouldn't ever happen once the provider is ready
        if (!defined(t)) {
            return when(undefined);
        }

        var subtreePromises = that._subtreePromises;
        var promise = subtreePromises[q];
        if (defined(promise)) {
            return promise
                .then(function() {
                    return tileInfo[quadKey];
                });
        }

        // We need to split up the promise here because when will execute syncronously if _getQuadTreePacket
        //  is already resolved (like in the tests), so subtreePromises will never get cleared out.
        //  The promise will always resolve with a bool, but the initial request will also remove
        //  the promise from subtreePromises.
        promise = subtreePromises[q] = that._getQuadTreePacket(q, t.cnodeVersion);

        return promise
            .then(function() {
                delete subtreePromises[q];
                // Recursively call this incase we need multiple subtree requests
                return populateSubtree(that, quadKey);
            })
            .then(function() {
                return tileInfo[quadKey];
            });
    }

    /**
     * Gets information about a tile
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @returns {GoogleEarthEnterpriseMetadata.TileInformation|undefined} Information about the tile or undefined if it isn't loaded.
     */
    GoogleEarthEnterpriseMetadata.prototype.getTileInformation = function(x, y, level) {
        var quadkey = GoogleEarthEnterpriseMetadata.tileXYToQuadKey(x, y, level);
        return this._tileInfo[quadkey];
    };

    /**
     * Gets information about a tile from a quadKey
     *
     * @param {String} quadkey The quadkey for the tile
     * @returns {GoogleEarthEnterpriseMetadata.TileInformation|undefined} Information about the tile or undefined if it isn't loaded.
     */
    GoogleEarthEnterpriseMetadata.prototype.getTileInformationFromQuadKey = function(quadkey) {
        return this._tileInfo[quadkey];
    };

    return GoogleEarthEnterpriseMetadata;
});
