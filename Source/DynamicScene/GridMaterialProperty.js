/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties'
    ], function(
        defined,
        defineProperties) {
    "use strict";

    /**
     * A utility class for processing CZML grid materials.
     * @alias GridMaterialProperty
     * @constructor
     */
    var GridMaterialProperty = function() {
        this.type = 'Grid';

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
        this.lineCount = undefined;

        /**
         * A DynamicProperty of type Number which determines the width of each horizontal line, in pixels.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.lineThickness = undefined;
    };

    defineProperties(GridMaterialProperty.prototype, {
        /**
         * Always returns false, since this property always varies with simulation time.
         * @memberof ConstantProperty
         *
         * @type {Boolean}
         */
        isTimeVarying : {
            get : function() {
                return (defined(this.color) ? this.color.isTimeVarying : false) || //
                       (defined(this.cellAlpha) ? this.cellAlpha.isTimeVarying : false) || //
                       (defined(this.lineCount) ? this.lineCount.isTimeVarying : false) || //
                       (defined(this.lineThickness) ? this.lineThickness.isTimeVarying : false);
            }
        }
    });

    GridMaterialProperty.prototype.getValue = function(time, result) {
        var property = this.color;
        if (defined(property)) {
            result.color = property.getValue(time, result.color);
        }

        property = this.cellAlpha;
        if (defined(property)) {
            var cellAlpha = property.getValue(time);
            if (defined(cellAlpha)) {
                result.cellAlpha = cellAlpha;
            }
        }

        property = this.lineCount;
        if (defined(property)) {
            result.lineCount = property.getValue(time, result.lineCount);
        }

        property = this.lineThickness;
        if (defined(property)) {
            result.lineThickness = property.getValue(time, result.lineThickness);
        }

        return result;
    };

    return GridMaterialProperty;
});
