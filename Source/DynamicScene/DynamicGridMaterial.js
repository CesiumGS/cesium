/*global define*/
define(function() {
    "use strict";

    /**
     * A utility class for processing CZML grid materials.
     * @alias DynamicGridMaterial
     * @constructor
     */
    var DynamicGridMaterial = function() {
        /**
         * A DynamicProperty of type Color which determines the grid's color.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.color = undefined;

        /**
         * A DynamicProperty of type Number which determines the grid cells alpha value, when combined with the color alpha.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.cellAlpha = undefined;

        /**
         * A DynamicProperty of type Number which determines the number of horizontal rows.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.rowCount = undefined;

        /**
         * A DynamicProperty of type Number which determines the number of vertical columns.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.columnCount = undefined;

        /**
         * A DynamicProperty of type Number which determines the width of each horizontal line, in pixels.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.rowThickness = undefined;

        /**
         * A DynamicProperty of type Number which determines the width of each vertical line, in pixels.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.columnThickness = undefined;
    };

    return DynamicGridMaterial;
});
