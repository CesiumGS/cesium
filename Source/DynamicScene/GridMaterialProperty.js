/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Color',
        '../Core/defined',
        './ConstantProperty',
        './Property'
    ], function(
        Cartesian2,
        Color,
        defined,
        ConstantProperty,
        Property) {
    "use strict";

    /**
     * A {@link MaterialProperty} that maps to grid {@link Material} uniforms.
     * @alias GridMaterialProperty
     * @constructor
     */
    var GridMaterialProperty = function() {
        /**
         * A {@link Color} {@link Property} which determines the grid's color.
         * @type {Property}
         * @default new ConstantProperty(Color.WHITE)
         */
        this.color = new ConstantProperty(Color.WHITE);

        /**
         * A numeric {@link Property} which determines the grid cells alpha value, when combined with the color alpha.
         * @type {Property}
         * @default new ConstantProperty(0.1)
         */
        this.cellAlpha = new ConstantProperty(0.1);

        /**
         * A {@link Cartesian2} {@link Property} which determines the number of rows and columns in the grid.
         * @type {Property}
         * @default new ConstantProperty(new Cartesian2(8, 8))
         */
        this.lineCount = new ConstantProperty(new Cartesian2(8, 8));

        /**
         * A {@link Cartesian2} {@link Property} which determines the thickness of rows and columns in the grid.
         * @type {Property}
         * @default new ConstantProperty(new Cartesian2(1.0, 1.0))
         */
        this.lineThickness = new ConstantProperty(new Cartesian2(1.0, 1.0));
    };

    /**
     * Gets the {@link Material} type at the provided time.
     * @memberof GridMaterialProperty
     *
     * @param {JulianDate} time The time for which to retrieve the type.
     * @type {String} The type of material.
     */
    GridMaterialProperty.prototype.getType = function(time) {
        return 'Grid';
    };

    /**
     * Gets the value of the property at the provided time.
     * @memberof GridMaterialProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
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

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof GridMaterialProperty
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    GridMaterialProperty.prototype.equals = function(other) {
        return this === other || //
               (other instanceof GridMaterialProperty && //
                Property.equals(this.color, other.color) && //
                Property.equals(this.cellAlpha, other.cellAlpha) && //
                Property.equals(this.lineCount, other.lineCount) && //
                Property.equals(this.lineThickness, other.lineThickness));
    };

    return GridMaterialProperty;
});
