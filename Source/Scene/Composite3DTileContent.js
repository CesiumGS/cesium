/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/getMagic',
        '../Core/loadArrayBuffer',
        '../Core/Request',
        '../Core/RequestScheduler',
        '../Core/RequestType',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        getMagic,
        loadArrayBuffer,
        Request,
        RequestScheduler,
        RequestType,
        when) {
    'use strict';

    /**
     * Represents the contents of a
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/TileFormats/Composite/README.md|Composite}
     * tile in a {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/README.md|3D Tiles} tileset.
     *
     * @alias Composite3DTileContent
     * @constructor
     *
     * @private
     */
    function Composite3DTileContent(tileset, tile, url, arrayBuffer, byteOffset, factory) {
        this._url = url;
        this._tileset = tileset;
        this._tile = tile;
        this._contents = [];

        /**
         * The following properties are part of the {@link Cesium3DTileContent} interface.
         */
        this.batchTable = undefined;

        this._readyPromise = when.defer();

        initialize(this, arrayBuffer, byteOffset, factory);
    }

    defineProperties(Composite3DTileContent.prototype, {
        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        featurePropertiesDirty : {
            get : function() {
                var contents = this._contents;
                var length = contents.length;
                for (var i = 0; i < length; ++i) {
                    if (contents[i].featurePropertiesDirty) {
                        return true;
                    }
                }

                return false;
            },
            set : function(value) {
                var contents = this._contents;
                var length = contents.length;
                for (var i = 0; i < length; ++i) {
                    contents[i].featurePropertiesDirty = value;
                }
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.  <code>Composite3DTileContent</code>
         * always returns <code>0</code>.  Instead call <code>featuresLength</code> for a tile in the composite.
         */
        featuresLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.  <code>Composite3DTileContent</code>
         * always returns <code>0</code>.  Instead call <code>pointsLength</code> for a tile in the composite.
         */
        pointsLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        trianglesLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        vertexMemorySizeInBytes : {
            get : function() {
                return 0;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        textureMemorySizeInBytes : {
            get : function() {
                return 0;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        batchTableMemorySizeInBytes : {
            get : function() {
                return 0;
            }
        },

        /**
         * Gets the array of {@link Cesium3DTileContent} objects that represent the
         * content of the composite's inner tiles, which can also be composites.
         */
        innerContents : {
            get : function() {
                return this._contents;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        readyPromise : {
            get : function() {
                return this._readyPromise.promise;
            }
        }
    });

    /**
     * Part of the {@link Cesium3DTileContent} interface.  <code>Composite3DTileContent</code>
     * always returns <code>false</code>.  Instead call <code>hasProperty</code> for a tile in the composite.
     */
    Composite3DTileContent.prototype.hasProperty = function(batchId, name) {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.  <code>Composite3DTileContent</code>
     * always returns <code>undefined</code>.  Instead call <code>getFeature</code> for a tile in the composite.
     */
    Composite3DTileContent.prototype.getFeature = function(batchId) {
        return undefined;
    };

    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

    function initialize(content, arrayBuffer, byteOffset, factory) {
        byteOffset = defaultValue(byteOffset, 0);

        var uint8Array = new Uint8Array(arrayBuffer);
        var view = new DataView(arrayBuffer);
        byteOffset += sizeOfUint32;  // Skip magic

        //>>includeStart('debug', pragmas.debug);
        var version = view.getUint32(byteOffset, true);
        if (version !== 1) {
            throw new DeveloperError('Only Composite Tile version 1 is supported. Version ' + version + ' is not.');
        }
        //>>includeEnd('debug');
        byteOffset += sizeOfUint32;

        // Skip byteLength
        byteOffset += sizeOfUint32;

        var tilesLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var contentPromises = [];

        for (var i = 0; i < tilesLength; ++i) {
            var tileType = getMagic(uint8Array, byteOffset);

            // Tile byte length is stored after magic and version
            var tileByteLength = view.getUint32(byteOffset + sizeOfUint32 * 2, true);

            var contentFactory = factory[tileType];

            if (defined(contentFactory)) {
                var innerContent = contentFactory(content._tileset, content._tile, content._url, arrayBuffer, byteOffset);
                content._contents.push(innerContent);
                contentPromises.push(innerContent.readyPromise);
            } else {
                throw new DeveloperError('Unknown tile content type, ' + tileType + ', inside Composite tile');
            }

            byteOffset += tileByteLength;
        }

        when.all(contentPromises).then(function() {
            content._readyPromise.resolve(content);
        }).otherwise(function(error) {
            content._readyPromise.reject(error);
        });
    }

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Composite3DTileContent.prototype.applyDebugSettings = function(enabled, color) {
        var contents = this._contents;
        var length = contents.length;
        for (var i = 0; i < length; ++i) {
            contents[i].applyDebugSettings(enabled, color);
        }
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Composite3DTileContent.prototype.update = function(tileset, frameState) {
        var contents = this._contents;
        var length = contents.length;
        for (var i = 0; i < length; ++i) {
            contents[i].update(tileset, frameState);
        }
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Composite3DTileContent.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Composite3DTileContent.prototype.destroy = function() {
        var contents = this._contents;
        var length = contents.length;
        for (var i = 0; i < length; ++i) {
            contents[i].destroy();
        }
        return destroyObject(this);
    };

    return Composite3DTileContent;
});
