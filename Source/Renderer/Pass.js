define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * The render pass for a command.
     *
     * @private
     */
    var Pass = {
        // If you add/modify/remove Pass constants, also change the automatic GLSL constants
        // that start with 'czm_pass'
        //
        // Commands are executed in order by pass up to the translucent pass.
        // Translucent geometry needs special handling (sorting/OIT). The compute pass
        // is executed first and the overlay pass is executed last. Both are not sorted
        // by frustum.
        ENVIRONMENT : 0,
        COMPUTE : 1,
        GLOBE : 2,
        TERRAIN_CLASSIFICATION : 3,
        CESIUM_3D_TILE : 4,
        CESIUM_3D_TILE_CLASSIFICATION : 5,
        OPAQUE : 6,
        TRANSLUCENT : 7,
        OVERLAY : 8,
        NUMBER_OF_PASSES : 9
    };

    return freezeObject(Pass);
});
