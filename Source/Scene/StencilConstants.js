define([
        '../Core/freezeObject',
        './StencilFunction',
        './StencilOperation'
    ], function(
        freezeObject,
        StencilFunction,
        StencilOperation) {
    'use strict';

    /**
     * @private
     */
    var StencilConstants = {
        CESIUM_3D_TILE_MASK : 0x80,
        SKIP_LOD_MASK : 0x70,
        SKIP_LOD_BIT_SHIFT : 4,
        CLASSIFICATION_MASK : 0x0F
    };

    StencilConstants.setCesium3DTileBit = function() {
        return {
            enabled : true,
            frontFunction : StencilFunction.ALWAYS,
            frontOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.REPLACE
            },
            backFunction : StencilFunction.ALWAYS,
            backOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.REPLACE
            },
            reference : ~0,
            mask : StencilConstants.CESIUM_3D_TILE_MASK
        };
    };

    return freezeObject(StencilConstants);
});
