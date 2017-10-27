define([
        '../Core/defaultValue',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/getStringFromTypedArray',
        '../Core/RuntimeError',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        defineProperties,
        destroyObject,
        getStringFromTypedArray,
        RuntimeError,
        when) {
    'use strict';

    /**
     * Represents content for a tile in a
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/README.md|3D Tiles} tileset whose
     * content points to another 3D Tiles tileset.
     * <p>
     * Implements the {@link Cesium3DTileContent} interface.
     * </p>
     *
     * @alias Tileset3DTileContent
     * @constructor
     *
     * @private
     */
    function Tileset3DTileContent(tileset, tile, url, arrayBuffer, byteOffset) {
        this._tileset = tileset;
        this._tile = tile;
        this._url = url;
        this._readyPromise = when.defer();

        /**
         * @inheritdoc Cesium3DTileContent#featurePropertiesDirty
         */
        this.featurePropertiesDirty = false;

        initialize(this, arrayBuffer, byteOffset);
    }

    defineProperties(Tileset3DTileContent.prototype, {
        /**
         * @inheritdoc Cesium3DTileContent#featuresLength
         */
        featuresLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#pointsLength
         */
        pointsLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#trianglesLength
         */
        trianglesLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#geometryByteLength
         */
        geometryByteLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#texturesByteLength
         */
        texturesByteLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#batchTableByteLength
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
                return undefined;
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
         * @inheritdoc Cesium3DTileContent#batchTable
         */
        batchTable : {
            get : function() {
                return undefined;
            }
        }
    });

    function initialize(content, arrayBuffer, byteOffset) {
        byteOffset = defaultValue(byteOffset, 0);
        var uint8Array = new Uint8Array(arrayBuffer);
        var jsonString = getStringFromTypedArray(uint8Array, byteOffset);
        var tilesetJson;

        try {
            tilesetJson = JSON.parse(jsonString);
        } catch (error) {
            content._readyPromise.reject(new RuntimeError('Invalid tile content.'));
            return;
        }

        content._tileset.loadTileset(content._url, tilesetJson, content._tile);
        content._readyPromise.resolve(content);
    }

    /**
     * Part of the {@link Cesium3DTileContent} interface.  <code>Tileset3DTileContent</code>
     * always returns <code>false</code> since a tile of this type does not have any features.
     */
    Tileset3DTileContent.prototype.hasProperty = function(batchId, name) {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.  <code>Tileset3DTileContent</code>
     * always returns <code>undefined</code> since a tile of this type does not have any features.
     */
    Tileset3DTileContent.prototype.getFeature = function(batchId) {
        return undefined;
    };

    /**
     * @inheritdoc Cesium3DTileContent#applyDebugSettings
     */
    Tileset3DTileContent.prototype.applyDebugSettings = function(enabled, color) {
    };

    /**
     * @inheritdoc Cesium3DTileContent#applyStyle
     */
    Tileset3DTileContent.prototype.applyStyle = function(frameState, style) {
    };

    /**
     * @inheritdoc Cesium3DTileContent#update
     */
    Tileset3DTileContent.prototype.update = function(tileset, frameState) {
    };

    /**
     * @inheritdoc Cesium3DTileContent#isDestroyed
     */
    Tileset3DTileContent.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @inheritdoc Cesium3DTileContent#destroy
     */
    Tileset3DTileContent.prototype.destroy = function() {
        return destroyObject(this);
    };

    return Tileset3DTileContent;
});
