/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/defined',
        './ConstantProperty'
    ], function(
        Cartesian2,
        defined,
        ConstantProperty) {
    "use strict";

    /**
     * A {@link MaterialProperty} that maps to image {@link Material} uniforms.
     * @alias ImageMaterialProperty
     * @constructor
     */
    var ImageMaterialProperty = function() {
        /**
         * A string {@link Property} which is the url of the desired image.
         * @type {Property}
         */
        this.image = undefined;
        /**
         * A {@link Cartesian2} {@link Property} which determines the number of times the image repeats in each direction.
         * @type {Property}
         * @default new ConstantProperty(new Cartesian2(1, 1))
         */
        this.repeat = new ConstantProperty(new Cartesian2(1, 1));
    };

    /**
     * Gets the {@link Material} type at the provided time.
     * @memberof MaterialProperty
     *
     * @param {JulianDate} time The time for which to retrieve the type.
     * @type {String} The type of material.
     */
    ImageMaterialProperty.prototype.getType = function(time) {
        return 'Image';
    };

    /**
     * Gets the value of the property at the provided time.
     * @memberof MaterialProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     *
     * @exception {DeveloperError} time is required.
     */
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
