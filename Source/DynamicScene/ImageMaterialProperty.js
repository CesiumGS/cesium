/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties'
    ], function(
        defined,
        defineProperties) {
    "use strict";

    /**
     * A utility class for processing CZML image materials.
     * @alias ImageMaterialProperty
     * @constructor
     */
    var ImageMaterialProperty = function() {
        this.type = 'Image';

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
        this.verticalRepeat = undefined;
        /**
         * A DynamicProperty of type Number which determines the material's horizontal repeat.
         *
         * @type {DynamicProperty}
         * @default undefined
         */
        this.horizontalRepeat = undefined;
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

    ImageMaterialProperty.prototype.getValue = function(time, result) {
        var property = this.image;
        if (defined(property)) {
            result.image = property.getValue(time, result.image);
        }

        property = this.repeat;
        if (defined(property)) {
            result.repeat = property.getValue(time, result.repeat);
        }

        return result;
    };

    return ImageMaterialProperty;
});
