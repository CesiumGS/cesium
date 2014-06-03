/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Color',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Event',
        './ConstantProperty',
        './createDynamicPropertyDescriptor',
        './Property'
    ], function(
        Cartesian2,
        Color,
        defined,
        defineProperties,
        Event,
        ConstantProperty,
        createDynamicPropertyDescriptor,
        Property) {
    "use strict";

    /**
     * A {@link MaterialProperty} that maps to grid {@link Material} uniforms.
     * @alias GridMaterialProperty
     * @constructor
     */
    var GridMaterialProperty = function() {
        this._definitionChanged = new Event();
        this._color = undefined;
        this._colorSubscription = undefined;
        this._cellAlpha = undefined;
        this._cellAlphaSubscription = undefined;
        this._lineCount = undefined;
        this._lineCountSubscription = undefined;
        this._lineThickness = undefined;
        this._lineThicknessSubscription = undefined;
        this._lineOffset = undefined;
        this._lineOffsetSubscription = undefined;

        this.color = new ConstantProperty(Color.WHITE);
        this.cellAlpha = new ConstantProperty(0.1);
        this.lineCount = new ConstantProperty(new Cartesian2(8, 8));
        this.lineThickness = new ConstantProperty(new Cartesian2(1.0, 1.0));
        this.lineOffset = new ConstantProperty(new Cartesian2(0.0, 0.0));
    };

    defineProperties(GridMaterialProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A property is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof GridMaterialProperty.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            get : function() {
                return Property.isConstant(this._color) &&
                       Property.isConstant(this._cellAlpha) &&
                       Property.isConstant(this._lineCount) &&
                       Property.isConstant(this._lineThickness) &&
                       Property.isConstant(this._lineOffset);
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is considered to have changed if a call to getValue would return
         * a different result for the same time.
         * @memberof GridMaterialProperty.prototype
         *
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },
        /**
         * Gets or sets the {@link Color} property which determines the grid's color.
         * @memberof GridMaterialProperty.prototype
         * @type {Property}
         * @default new ConstantProperty(Color.WHITE)
         */
        color : createDynamicPropertyDescriptor('color'),
        /**
         * Gets or sets the numeric property which determines the grid cells alpha value, when combined with the color alpha.
         * @memberof GridMaterialProperty.prototype
         * @type {Property}
         * @default new ConstantProperty(0.1)
         */
        cellAlpha : createDynamicPropertyDescriptor('cellAlpha'),
        /**
         * Gets or sets the {@link Cartesian2} property which determines the number of rows and columns in the grid.
         * @memberof GridMaterialProperty.prototype
         * @type {Property}
         * @default new ConstantProperty(new Cartesian2(8, 8))
         */
        lineCount : createDynamicPropertyDescriptor('lineCount'),
        /**
         * Gets or sets the {@link Cartesian2} property which determines the thickness of rows and columns in the grid.
         * @memberof GridMaterialProperty.prototype
         * @type {Property}
         * @default new ConstantProperty(new Cartesian2(1.0, 1.0))
         */
        lineThickness : createDynamicPropertyDescriptor('lineThickness'),
        /**
         * Gets or sets the {@link Cartesian2} property which determines the offset of rows and columns in the grid.
         * @memberof GridMaterialProperty.prototype
         * @type {Property}
         * @default new ConstantProperty(new Cartesian2(0.0, 0.0))
         */
        lineOffset : createDynamicPropertyDescriptor('lineOffset')
    });

    /**
     * Gets the {@link Material} type at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve the type.
     * @returns {String} The type of material.
     */
    GridMaterialProperty.prototype.getType = function(time) {
        return 'Grid';
    };

    /**
     * Gets the value of the property at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    GridMaterialProperty.prototype.getValue = function(time, result) {
        if (!defined(result)) {
            result = {};
        }
        result.color = defined(this._color) ? this._color.getValue(time, result.color) : undefined;
        result.cellAlpha = defined(this._cellAlpha) ? this._cellAlpha.getValue(time) : undefined;
        result.lineCount = defined(this._lineCount) ? this._lineCount.getValue(time, result.lineCount) : undefined;
        result.lineThickness = defined(this._lineThickness) ? this._lineThickness.getValue(time, result.lineThickness) : undefined;
        result.lineOffset = defined(this._lineOffset) ? this._lineOffset.getValue(time, result.lineOffset) : undefined;
        return result;
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    GridMaterialProperty.prototype.equals = function(other) {
        return this === other || //
        (other instanceof GridMaterialProperty && //
        Property.equals(this._color, other._color) && //
        Property.equals(this._cellAlpha, other._cellAlpha) && //
        Property.equals(this._lineCount, other._lineCount) && //
        Property.equals(this._lineThickness, other._lineThickness) && //
        Property.equals(this._lineOffset, other._lineOffset));
    };

    /**
     * @private
     */
    GridMaterialProperty.prototype._raiseDefinitionChanged = function() {
        this._definitionChanged.raiseEvent(this);
    };

    return GridMaterialProperty;
});
