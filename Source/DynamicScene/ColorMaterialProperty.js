/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties'
    ], function(
        defined,
        defineProperties) {
    "use strict";

    /**
     * A utility class for processing CZML color materials.
     * @alias ColorMaterialProperty
     * @constructor
     */
    var ColorMaterialProperty = function() {
        this.type = 'Color';

        /**
         * A DynamicProperty of type Color which determines the material's color.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.color = undefined;
    };

    defineProperties(ColorMaterialProperty.prototype, {
        /**
         * Always returns false, since this property always varies with simulation time.
         * @memberof ConstantProperty
         *
         * @type {Boolean}
         */
        isTimeVarying : {
            get : function() {
                return defined(this.color) ? this.color.isTimeVarying : false;
            }
        }
    });

    ColorMaterialProperty.prototype.getValue = function(time, result) {
        if (!defined(result)) {
            return {
                color : this.color.getValue(time)
            };
        }

        result.color = this.color.getValue(time, result.color);
        return result;
    };

    return ColorMaterialProperty;
});
