/*global define*/
define([
        './freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * Style options for corners.
     *
     * @demo The {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Corridor.html&label=Geometries|Corridor Demo}
     * demonstrates the three corner types, as used by {@link CorridorGraphics}.
     *
     * @exports CornerType
     */
    var CornerType = {
        /**
         * <img src="images/CornerTypeRounded.png" style="vertical-align: middle;" width="186" height="189" />
         *
         * Corner has a smooth edge.
         * @type {Number}
         * @constant
         */
        ROUNDED : 0,

        /**
         * <img src="images/CornerTypeMitered.png" style="vertical-align: middle;" width="186" height="189" />
         *
         * Corner point is the intersection of adjacent edges.
         * @type {Number}
         * @constant
         */
        MITERED : 1,

        /**
         * <img src="images/CornerTypeBeveled.png" style="vertical-align: middle;" width="186" height="189" />
         *
         * Corner is clipped.
         * @type {Number}
         * @constant
         */
        BEVELED : 2
    };

    return freezeObject(CornerType);
});