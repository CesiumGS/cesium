/*global define*/
define([
        '../Core/Color',
        '../Core/defined',
        './ConstantProperty'
    ], function(
        Color,
        defined,
        ConstantProperty) {
    "use strict";

    /**
     * A {@link MaterialProperty} that maps to solid color {@link Material} uniforms.
     * @alias ColorMaterialProperty
     * @constructor
     */
    var ColorMaterialProperty = function() {
        /**
         * A {@link Color} {@link Property} which determines the material's color.
         * @type {Property}
         * @default new ConstantProperty(Color.WHITE)
         */
        this.color = new ConstantProperty(Color.WHITE);
    };

    /**
     * Gets the {@link Material} type at the provided time.
     * @memberof MaterialProperty
     *
     * @param {JulianDate} time The time for which to retrieve the type.
     * @type {String} The type of material.
     */
    ColorMaterialProperty.prototype.getType = function(time) {
        return 'Color';
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
    ColorMaterialProperty.prototype.getValue = function(time, result) {
        if (!defined(result)) {
            result = {};
        }
        result.color = defined(this.color) ? this.color.getValue(time, result.color) : undefined;
        return result;
    };

    return ColorMaterialProperty;
});
