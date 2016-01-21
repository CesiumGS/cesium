/*global define*/
define([
        './Batched3DModel3DTileContentProvider',
        './Composite3DTileContentProvider',
        './Empty3DTileContentProvider',
        './Instanced3DModel3DTileContentProvider',
        './Points3DTileContentProvider',
        './Tileset3DTileContentProvider'
    ], function(
        Batched3DModel3DTileContentProvider,
        Composite3DTileContentProvider,
        Empty3DTileContentProvider,
        Instanced3DModel3DTileContentProvider,
        Points3DTileContentProvider,
        Tileset3DTileContentProvider) {
    "use strict";

    /**
     * Maps a tile's extension (and a tile's magic field in its header) to a new
     * content object for the tile's payload.
     *
     * @private
     */
    var Cesium3DTileContentProviderFactory = {
        b3dm : function(tiles3D, tile, url) {
            return new Batched3DModel3DTileContentProvider(tiles3D, tile, url);
        },
        pnts : function(tiles3D, tile, url) {
            return new Points3DTileContentProvider(tiles3D, tile, url);
        },
        i3dm : function(tiles3D, tile, url) {
            return new Instanced3DModel3DTileContentProvider(tiles3D, tile, url);
        },
        cmpt : function(tiles3D, tile, url) {
            // Send in the factory in order to avoid a cyclical dependency
            return new Composite3DTileContentProvider(tiles3D, tile, url, Cesium3DTileContentProviderFactory);
        },
        json : function(tiles3D, tile, url) {
            return new Tileset3DTileContentProvider(tiles3D, tile, url);
        }
    };

    return Cesium3DTileContentProviderFactory;
});