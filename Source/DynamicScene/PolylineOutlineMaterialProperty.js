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
         * @default new ConstantProperty(Color.WHITE)
         */
        this.outlineColor = new ConstantProperty(Color.BLACK);
        /**
         * A {@link Color} {@link Property} which determines the polylines outline width.
         * @type {Property}
         * @default new ConstantProperty(Color.WHITE)
         */
        this.outlineWidth = new ConstantProperty(1);
    };

    /**
     * Gets the {@link Material} type at the provided time.
     * @memberof MaterialProperty
     *
     * @param {JulianDate} time The time for which to retrieve the type.
     * @type {String} The type of material.
     */
    PolylineOutlineMaterialProperty.prototype.getType = function(time) {
        return 'PolylineOutline';
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
    PolylineOutlineMaterialProperty.prototype.getValue = function(time, result) {
        if (!defined(result)) {
            result = {};
        }
        result.color = defined(this.color) ? this.color.getValue(time, result.color) : undefined;
        result.outlineColor = defined(this.outlineColor) ? this.outlineColor.getValue(time, result.outlineColor) : undefined;
        result.outlineWidth = defined(this.outlineWidth) ? this.outlineWidth.getValue(time) : undefined;
        return result;
    };

    return PolylineOutlineMaterialProperty;
});
