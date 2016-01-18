/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Event',
        './createPropertyDescriptor',
        './Property'
    ], function(
        Cartesian2,
        Color,
        defaultValue,
        defined,
        defineProperties,
        Event,
        createPropertyDescriptor,
        Property) {
    "use strict";

    var defaultColor = Color.WHITE;
    var defaultCellAlpha = 0.1;
    var defaultLineCount = new Cartesian2(8, 8);
    var defaultLineOffset = new Cartesian2(0, 0);
    var defaultLineThickness = new Cartesian2(1, 1);

    /**
     * A {@link MaterialProperty} that maps to grid {@link Material} uniforms.
     * @alias GridMaterialProperty
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Property} [options.color=Color.WHITE] A Property specifying the grid {@link Color}.
     * @param {Property} [options.cellAlpha=0.1] A numeric Property specifying cell alpha values.
     * @param {Property} [options.lineCount=new Cartesian2(8, 8)] A {@link Cartesian2} Property specifying the number of grid lines along each axis.
     * @param {Property} [options.lineThickness=new Cartesian2(1.0, 1.0)] A {@link Cartesian2} Property specifying the thickness of grid lines along each axis.
     * @param {Property} [options.lineOffset=new Cartesian2(0.0, 0.0)] A {@link Cartesian2} Property specifying starting offset of grid lines along each axis.
     *
     * @constructor
     */
    function GridMaterialProperty(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

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

        this.color = options.color;
        this.cellAlpha = options.cellAlpha;
        this.lineCount = options.lineCount;
        this.lineThickness = options.lineThickness;
        this.lineOffset = options.lineOffset;
    }

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
         * Gets or sets the Property specifying the grid {@link Color}.
         * @memberof GridMaterialProperty.prototype
         * @type {Property}
         * @default Color.WHITE
         */
        color : createPropertyDescriptor('color'),
        /**
         * Gets or sets the numeric Property specifying cell alpha values.
         * @memberof GridMaterialProperty.prototype
         * @type {Property}
         * @default 0.1
         */
        cellAlpha : createPropertyDescriptor('cellAlpha'),
        /**
         * Gets or sets the {@link Cartesian2} Property specifying the number of grid lines along each axis.
         * @memberof GridMaterialProperty.prototype
         * @type {Property}
         * @default new Cartesian2(8.0, 8.0)
         */
        lineCount : createPropertyDescriptor('lineCount'),
        /**
         * Gets or sets the {@link Cartesian2} Property specifying the thickness of grid lines along each axis.
         * @memberof GridMaterialProperty.prototype
         * @type {Property}
         * @default new Cartesian2(1.0, 1.0)
         */
        lineThickness : createPropertyDescriptor('lineThickness'),
        /**
         * Gets or sets the {@link Cartesian2} Property specifying the starting offset of grid lines along each axis.
         * @memberof GridMaterialProperty.prototype
         * @type {Property}
         * @default new Cartesian2(0.0, 0.0)
         */
        lineOffset : createPropertyDescriptor('lineOffset')
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
        result.color = Property.getValueOrClonedDefault(this._color, time, defaultColor, result.color);
        result.cellAlpha = Property.getValueOrDefault(this._cellAlpha, time, defaultCellAlpha);
        result.lineCount = Property.getValueOrClonedDefault(this._lineCount, time, defaultLineCount, result.lineCount);
        result.lineThickness = Property.getValueOrClonedDefault(this._lineThickness, time, defaultLineThickness, result.lineThickness);
        result.lineOffset = Property.getValueOrClonedDefault(this._lineOffset, time, defaultLineOffset, result.lineOffset);
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

    return GridMaterialProperty;
});
