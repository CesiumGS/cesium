/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/defined',
        '../Core/defineProperties',
        './ConstantProperty'
    ], function(
        Cartesian2,
        defined,
        defineProperties,
        ConstantProperty) {
    "use strict";

    /**
     * A utility class for processing CZML image materials.
     * @alias ImageMaterialProperty
     * @constructor
     */
    var ImageMaterialProperty = function() {
         /**
         * A DynamicProperty of type Number which determines the material's image.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.image = undefined;
        /**
         * A DynamicProperty of type Number which determines the material's vertical repeat.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.repeat = new ConstantProperty(new Cartesian2(1, 1));
    };


    defineProperties(ImageMaterialProperty.prototype, {
        /**
         * Always returns false, since this property always varies with simulation time.
         * @memberof ConstantProperty
         *
         * @type {Boolean}
         */
        isTimeVarying : {
            get : function() {
                return (defined(this.image) ? this.image.isTimeVarying : false) || //
                       (defined(this.repeat) ? this.repeat.isTimeVarying : false);
            }
        }
    });

    ImageMaterialProperty.prototype.getType = function(time) {
        return 'Image';
    };

    ImageMaterialProperty.prototype.getValue = function(time, result) {
        if (!defined(result)) {
            result = {};
        }

        result.image = defined(this.image) ? this.image.getValue(time) : undefined;
        result.repeat = defined(this.repeat) ? this.repeat.getValue(time, result.repeat) : undefined;
        return result;
    };

    return ImageMaterialProperty;
});
