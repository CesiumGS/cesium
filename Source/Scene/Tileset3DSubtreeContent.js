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
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/specification|3D Tiles} tileset whose
     * content points to another 3D Tiles tileset.
     * <p>
     * Implements the {@link Cesium3DTileContent} interface.
     * </p>
     *
     * @alias Tileset3DSubtreeContent
     * @constructor
     *
     * @private
     */
    function Tileset3DSubtreeContent(tileset, tile, resource, arrayBuffer, byteOffset) {
        this._tileset = tileset;
        this._tile = tile;
        this._resource = resource;
        this._readyPromise = when.defer();

        this.featurePropertiesDirty = false;

        initialize(this, arrayBuffer, byteOffset);
    }

    defineProperties(Tileset3DSubtreeContent.prototype, {
        featuresLength : {
            get : function() {
                return 0;
            }
        },

        pointsLength : {
            get : function() {
                return 0;
            }
        },

        trianglesLength : {
            get : function() {
                return 0;
            }
        },

        geometryByteLength : {
            get : function() {
                return 0;
            }
        },

        texturesByteLength : {
            get : function() {
                return 0;
            }
        },

        batchTableByteLength : {
            get : function() {
                return 0;
            }
        },

        innerContents : {
            get : function() {
                return undefined;
            }
        },

        readyPromise : {
            get : function() {
                return this._readyPromise.promise;
            }
        },

        tileset : {
            get : function() {
                return this._tileset;
            }
        },

        tile : {
            get : function() {
                return this._tile;
            }
        },

        url : {
            get : function() {
                return this._resource.getUrlComponent(true);
            }
        },

        batchTable : {
            get : function() {
                return undefined;
            }
        }
    });

    function initialize(content, arrayBuffer, byteOffset) {
        content._tileset.updateTilesetFromSubtree(content._resource, arrayBuffer, content._tile.treeKey, content._tile);
        content._readyPromise.resolve(content);
    }

    /**
     * Part of the {@link Cesium3DTileContent} interface.  <code>Tileset3DSubtreeContent</code>
     * always returns <code>false</code> since a tile of this type does not have any features.
     */
    Tileset3DSubtreeContent.prototype.hasProperty = function(batchId, name) {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.  <code>Tileset3DSubtreeContent</code>
     * always returns <code>undefined</code> since a tile of this type does not have any features.
     */
    Tileset3DSubtreeContent.prototype.getFeature = function(batchId) {
        return undefined;
    };

    Tileset3DSubtreeContent.prototype.applyDebugSettings = function(enabled, color) {
    };

    Tileset3DSubtreeContent.prototype.applyStyle = function(style) {
    };

    Tileset3DSubtreeContent.prototype.update = function(tileset, frameState) {
    };

    Tileset3DSubtreeContent.prototype.isDestroyed = function() {
        return false;
    };

    Tileset3DSubtreeContent.prototype.destroy = function() {
        return destroyObject(this);
    };

    return Tileset3DSubtreeContent;
});
