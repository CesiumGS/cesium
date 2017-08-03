define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/FeatureDetection',
        '../Core/getMagic',
        '../Core/RuntimeError',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        FeatureDetection,
        getMagic,
        RuntimeError,
        when) {
    'use strict';

    // Bail out if the browser doesn't support typed arrays, to prevent the setup function
    // from failing, since we won't be able to create a WebGL context anyway.
    if (!FeatureDetection.supportsTypedArrays()) {
        return {};
    }

    /**
     * Represents the contents of a
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/TileFormats/Composite/README.md|Composite}
     * tile in a {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/README.md|3D Tiles} tileset.
     * <p>
     * Implements the {@link Cesium3DTileContent} interface.
     * </p>
     *
     * @alias Composite3DTileContent
     * @constructor
     *
     * @private
     */
    function Composite3DTileContent(tileset, tile, url, arrayBuffer, byteOffset, factory) {
        this._tileset = tileset;
        this._tile = tile;
        this._url = url;
        this._contents = [];
        this._readyPromise = when.defer();

        initialize(this, arrayBuffer, byteOffset, factory);
    }

    defineProperties(Composite3DTileContent.prototype, {
        /**
         * @inheritdoc Cesium3DTileContent#featurePropertiesDirty
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
         * Part of the {@link Cesium3DTileContent} interface.  <code>Composite3DTileContent</code>
         * always returns <code>0</code>.  Instead call <code>trianglesLength</code> for a tile in the composite.
         */
        trianglesLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.  <code>Composite3DTileContent</code>
         * always returns <code>0</code>.  Instead call <code>geometryByteLength</code> for a tile in the composite.
         */
        geometryByteLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.   <code>Composite3DTileContent</code>
         * always returns <code>0</code>.  Instead call <code>texturesByteLength</code> for a tile in the composite.
         */
        texturesByteLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.  <code>Composite3DTileContent</code>
         * always returns <code>0</code>.  Instead call <code>batchTableByteLength</code> for a tile in the composite.
         */
        batchTableByteLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#innerContents
         */
        innerContents : {
            get : function() {
                return this._contents;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#readyPromise
         */
        readyPromise : {
            get : function() {
                return this._readyPromise.promise;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#tileset
         */
        tileset : {
            get : function() {
                return this._tileset;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#tile
         */
        tile : {
            get : function() {
                return this._tile;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#url
         */
        url : {
            get : function() {
                return this._url;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface. <code>Composite3DTileContent</code>
         * always returns <code>undefined</code>.  Instead call <code>batchTable</code> for a tile in the composite.
         */
        batchTable : {
            get : function() {
                return undefined;
            }
        }
    });

    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

    function initialize(content, arrayBuffer, byteOffset, factory) {
        byteOffset = defaultValue(byteOffset, 0);

        var uint8Array = new Uint8Array(arrayBuffer);
        var view = new DataView(arrayBuffer);
        byteOffset += sizeOfUint32;  // Skip magic

        var version = view.getUint32(byteOffset, true);
        if (version !== 1) {
            throw new RuntimeError('Only Composite Tile version 1 is supported. Version ' + version + ' is not.');
        }
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
                throw new RuntimeError('Unknown tile content type, ' + tileType + ', inside Composite tile');
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

    /**
     * @inheritdoc Cesium3DTileContent#applyDebugSettings
     */
    Composite3DTileContent.prototype.applyDebugSettings = function(enabled, color) {
        var contents = this._contents;
        var length = contents.length;
        for (var i = 0; i < length; ++i) {
            contents[i].applyDebugSettings(enabled, color);
        }
    };

    /**
     * @inheritdoc Cesium3DTileContent#applyStyle
     */
    Composite3DTileContent.prototype.applyStyle = function(frameState, style) {
        var contents = this._contents;
        var length = contents.length;
        for (var i = 0; i < length; ++i) {
            contents[i].applyStyle(frameState, style);
        }
    };

    /**
     * @inheritdoc Cesium3DTileContent#update
     */
    Composite3DTileContent.prototype.update = function(tileset, frameState) {
        var contents = this._contents;
        var length = contents.length;
        for (var i = 0; i < length; ++i) {
            contents[i].update(tileset, frameState);
        }
    };

    /**
     * @inheritdoc Cesium3DTileContent#isDestroyed
     */
    Composite3DTileContent.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @inheritdoc Cesium3DTileContent#destroy
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
