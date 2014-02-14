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
     * A {@link MaterialProperty} that maps to polyline outline {@link Material} uniforms.
     * @alias PolylineOutlineMaterialProperty
     * @constructor
     */
    var PolylineOutlineMaterialProperty = function() {
        /**
         * A {@link Color} {@link Property} which determines the polyline's color.
         * @type {Property}
         * @default new ConstantProperty(Color.WHITE)
         */
        this.color = new ConstantProperty(Color.WHITE);
        /**
         * A {@link Color} {@link Property} which determines the polyline's outline color.
         * @type {Property}
         * @default new ConstantProperty(Color.BLACK)
         */
        this.outlineColor = new ConstantProperty(Color.BLACK);
        /**
         * A Number {@link Property} which determines the polyline's outline width.
         * @type {Property}
         * @default new ConstantProperty(0)
         */
        this.outlineWidth = new ConstantProperty(0);
    };

    /**
     * Gets the {@link Material} type at the provided time.
     * @memberof PolylineOutlineMaterialProperty
     *
     * @param {JulianDate} time The time for which to retrieve the type.
     * @type {String} The type of material.
     */
    PolylineOutlineMaterialProperty.prototype.getType = function(time) {
        return 'PolylineOutline';
    };

    /**
     * Gets the value of the property at the provided time.
     * @memberof PolylineOutlineMaterialProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    PolylineOutlineMaterialProperty.prototype.getValue = function(time, result) {
        if (!defined(result)) {
            result = {};
        }
        result.color = defined(this.color) ? this.color.getValue(time, result.color) : undefined;
        result.outlineColor = defined(this.outlineColor) ? this.outlineColor.getValue(time, result.outlineColor) : undefined;
        result.outlineWidth = defined(this.outlineWidth) ? this.outlineWidth.getValue(time) : undefined;
        return result;
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof PolylineOutlineMaterialProperty
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    PolylineOutlineMaterialProperty.prototype.equals = function(other) {
        return this === other || //
               (other instanceof PolylineOutlineMaterialProperty && //
                Property.equals(this.color, other.color) && //
                Property.equals(this.outlineColor, other.outlineColor) && //
                Property.equals(this.outlineWidth, other.outlineWidth));
    };

    return PolylineOutlineMaterialProperty;
});
