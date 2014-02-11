/*global define*/
define([
        '../Core/Color',
        '../Core/defined',
        './ConstantProperty',
        './Property'
    ], function(
        Color,
        defined,
        ConstantProperty,
        Property) {
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
     * @memberof ColorMaterialProperty
     *
     * @param {JulianDate} time The time for which to retrieve the type.
     * @type {String} The type of material.
     */
    ColorMaterialProperty.prototype.getType = function(time) {
        return 'Color';
    };

    /**
     * Gets the value of the property at the provided time.
     * @memberof ColorMaterialProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    ColorMaterialProperty.prototype.getValue = function(time, result) {
        if (!defined(result)) {
            result = {};
        }
        result.color = defined(this.color) ? this.color.getValue(time, result.color) : undefined;
        return result;
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof ColorMaterialProperty
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    ColorMaterialProperty.prototype.equals = function(other) {
        return this === other || //
               (other instanceof ColorMaterialProperty && //
                Property.equals(this.color, other.color));
    };

    return ColorMaterialProperty;
});
