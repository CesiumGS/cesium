define([
        '../Core/Check',
        '../Core/freezeObject'
        // './Cesium3DTilesetMostDetailedTraversal',
        // './Cesium3DTilesetTraversal'
    ], function(
        Check,
        freezeObject) {
        // Cesium3DTilesetMostDetailedTraversal,
        // Cesium3DTilesetTraversal) {
    'use strict';

    /**
     * The pass in which a 3D Tileset is updated.
     *
     * @private
     */
    var Cesium3DTilePass = {
        RENDER : 0,
        PICK : 1,
        SHADOW : 2,
        PRELOAD : 3,
        PRELOAD_FLIGHT : 4,
        REQUEST_RENDER_MODE_DEFER_CHECK : 5,
        MOST_DETAILED_PRELOAD : 6,
        MOST_DETAILED_PICK : 7,
        NUMBER_OF_PASSES : 8
    };

    var Traversal = {
        DEFAULT : 0,
        MOST_DETAILED : 1,
        NUMBER_OF_TRAVERSALS : 2
    };

    var passOptions = new Array(Cesium3DTilePass.NUMBER_OF_PASSES);

    passOptions[Cesium3DTilePass.RENDER] = freezeObject({
        traversal : Traversal.DEFAULT,
        isRender : true,
        requestTiles : true,
        ignoreCommands : false
    });

    passOptions[Cesium3DTilePass.PICK] = freezeObject({
        traversal : Traversal.DEFAULT,
        isRender : false,
        requestTiles : false,
        ignoreCommands : false
    });

    passOptions[Cesium3DTilePass.SHADOW] = freezeObject({
        traversal : Traversal.DEFAULT,
        isRender : false,
        requestTiles : true,
        ignoreCommands : false
    });

    passOptions[Cesium3DTilePass.PRELOAD] = freezeObject({
        traversal : Traversal.DEFAULT,
        isRender : false,
        requestTiles : true,
        ignoreCommands : true
    });

    passOptions[Cesium3DTilePass.PRELOAD_FLIGHT] = freezeObject({
        traversal : Traversal.DEFAULT,
        isRender : false,
        requestTiles : true,
        ignoreCommands : true
    });

    passOptions[Cesium3DTilePass.REQUEST_RENDER_MODE_DEFER_CHECK] = freezeObject({
        traversal : Traversal.DEFAULT,
        isRender : false,
        requestTiles : true,
        ignoreCommands : true
    });

    passOptions[Cesium3DTilePass.MOST_DETAILED_PRELOAD] = freezeObject({
        traversal : Traversal.MOST_DETAILED,
        isRender : false,
        requestTiles : true,
        ignoreCommands : true
    });

    passOptions[Cesium3DTilePass.MOST_DETAILED_PICK] = freezeObject({
        traversal : Traversal.MOST_DETAILED,
        isRender : false,
        requestTiles : false,
        ignoreCommands : false
    });

    Cesium3DTilePass.getPassOptions = function(pass) {
        return passOptions[pass];
    };

    return freezeObject(Cesium3DTilePass);
});
