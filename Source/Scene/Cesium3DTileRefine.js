import freezeObject from '../Core/freezeObject.js';

    /**
     * The refinement approach for a tile.
     * <p>
     * See the {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/specification#refinement|Refinement}
     * in the 3D Tiles spec.
     * </p>
     *
     * @exports Cesium3DTileRefine
     *
     * @private
     */
    var Cesium3DTileRefine = {
        /**
         * Render this tile and, if it doesn't meet the screen space error, also refine to its children.
         *
         * @type {Number}
         * @constant
         */
        ADD : 0,

        /**
         * Render this tile or, if it doesn't meet the screen space error, refine to its descendants instead.
         *
         * @type {Number}
         * @constant
         */
        REPLACE : 1
    };
export default freezeObject(Cesium3DTileRefine);
