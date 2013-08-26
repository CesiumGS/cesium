/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Color',
        '../Core/defined',
        './ConstantProperty'
    ], function(
        Cartesian2,
        Color,
        defined,
        ConstantProperty) {
    "use strict";

    /**
     * A utility class for processing CZML grid materials.
     * @alias GridMaterialProperty
     * @constructor
     */
    var GridMaterialProperty = function() {
        /**
         * A DynamicProperty of type Color which determines the grid's color.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.color = new ConstantProperty(Color.WHITE);

        /**
         * A DynamicProperty of type Number which determines the grid cells alpha value, when combined with the color alpha.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.cellAlpha = new ConstantProperty(0.1);

        /**
         * A DynamicProperty of type Number which determines the number of horizontal rows.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.lineCount = new ConstantProperty(new Cartesian2(8, 8));

        /**
         * A DynamicProperty of type Number which determines the width of each horizontal line, in pixels.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.lineThickness = new ConstantProperty(new Cartesian2(1.0, 1.0));
    };

    GridMaterialProperty.prototype.getType = function(time) {
        return 'Grid';
    };

    GridMaterialProperty.prototype.getValue = function(time, result) {
        if (!defined(result)) {
            result = {};
        }
        result.color = defined(this.color) ? this.color.getValue(time, result.color) : undefined;
        result.cellAlpha = defined(this.cellAlpha) ? this.cellAlpha.getValue(time) : undefined;
        result.lineCount = defined(this.lineCount) ? this.lineCount.getValue(time, result.lineCount) : undefined;
        result.lineThickness = defined(this.lineThickness) ? this.lineThickness.getValue(time, result.lineThickness) : undefined;
        return result;
    };

    return GridMaterialProperty;
});
