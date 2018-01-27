define([
        './Batched3DModel3DTileContent',
        './Composite3DTileContent',
        './Instanced3DModel3DTileContent',
        './PointCloud3DTileContent',
        './Tileset3DTileContent'
    ], function(
        Batched3DModel3DTileContent,
        Composite3DTileContent,
        Instanced3DModel3DTileContent,
        PointCloud3DTileContent,
        Tileset3DTileContent) {
    'use strict';

    /**
     * Maps a tile's magic field in its header to a new content object for the tile's payload.
     *
     * @private
     */
    var Cesium3DTileContentFactory = {
        b3dm : function(tileset, tile, url, arrayBuffer, byteOffset) {
            return new Batched3DModel3DTileContent(tileset, tile, url, arrayBuffer, byteOffset);
        },
        pnts : function(tileset, tile, url, arrayBuffer, byteOffset) {
            return new PointCloud3DTileContent(tileset, tile, url, arrayBuffer, byteOffset);
        },
        i3dm : function(tileset, tile, url, arrayBuffer, byteOffset) {
            return new Instanced3DModel3DTileContent(tileset, tile, url, arrayBuffer, byteOffset);
        },
        cmpt : function(tileset, tile, url, arrayBuffer, byteOffset) {
            // Send in the factory in order to avoid a cyclical dependency
            return new Composite3DTileContent(tileset, tile, url, arrayBuffer, byteOffset, Cesium3DTileContentFactory);
        },
        json : function(tileset, tile, url, arrayBuffer, byteOffset) {
            return new Tileset3DTileContent(tileset, tile, url, arrayBuffer, byteOffset);
        }
    };

    return Cesium3DTileContentFactory;
});
