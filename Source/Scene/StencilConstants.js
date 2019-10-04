import freezeObject from '../Core/freezeObject.js';
import StencilFunction from './StencilFunction.js';
import StencilOperation from './StencilOperation.js';

    /**
     * The most significant bit is used to identify whether the pixel is 3D Tiles.
     * The next three bits store selection depth for the skip LODs optimization.
     * The last four bits are for increment/decrement shadow volume operations for classification.
     *
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
            reference : StencilConstants.CESIUM_3D_TILE_MASK,
            mask : StencilConstants.CESIUM_3D_TILE_MASK
        };
    };
export default freezeObject(StencilConstants);
