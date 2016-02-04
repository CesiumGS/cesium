/*global define*/
define([
        './Batched3DModel3DTileContent',
        './Composite3DTileContent',
        './Instanced3DModel3DTileContent',
        './Points3DTileContent',
        './Tileset3DTileContent'
    ], function(
        Batched3DModel3DTileContent,
        Composite3DTileContent,
        Instanced3DModel3DTileContent,
        Points3DTileContent,
        Tileset3DTileContent) {
    "use strict";

    /**
     * Maps a tile's extension (and a tile's magic field in its header) to a new
     * content object for the tile's payload.
     *
     * @private
     */
    var Cesium3DTileContentFactory = {
        b3dm : function(tiles3D, tile, url) {
            return new Batched3DModel3DTileContent(tiles3D, tile, url);
        },
        pnts : function(tiles3D, tile, url) {
            return new Points3DTileContent(tiles3D, tile, url);
        },
        i3dm : function(tiles3D, tile, url) {
            return new Instanced3DModel3DTileContent(tiles3D, tile, url);
        },
        cmpt : function(tiles3D, tile, url) {
            // Send in the factory in order to avoid a cyclical dependency
            return new Composite3DTileContent(tiles3D, tile, url, Cesium3DTileContentFactory);
        },
        json : function(tiles3D, tile, url) {
            return new Tileset3DTileContent(tiles3D, tile, url);
        }
    };

    return Cesium3DTileContentFactory;
});