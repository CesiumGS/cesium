/*global define*/
define([
        '../Core/Color',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Event',
        './createPropertyDescriptor',
        './Property'
    ], function(
        Color,
        defined,
        defineProperties,
        Event,
        createPropertyDescriptor,
        Property) {
    "use strict";

    var defaultColor = Color.WHITE;
    var defaultOutlineColor = Color.BLACK;
    var defaultOutlineWidth = 0.0;

    /**
     * A {@link MaterialProperty} that maps to polyline outline {@link Material} uniforms.
     * @alias PolylineOutlineMaterialProperty
     * @constructor
     */
    var PolylineOutlineMaterialProperty = function() {
        this._definitionChanged = new Event();
        this._color = undefined;
        this._colorSubscription = undefined;
        this._outlineColor = undefined;
        this._outlineColorSubscription = undefined;
        this._outlineWidth = undefined;
        this._outlineWidthSubscription = undefined;
    };

    defineProperties(PolylineOutlineMaterialProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A property is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof PolylineOutlineMaterialProperty.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            get : function() {
                return Property.isConstant(this._color) && Property.isConstant(this._outlineColor) && Property.isConstant(this._outlineWidth);
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is considered to have changed if a call to getValue would return
         * a different result for the same time.
         * @memberof PolylineOutlineMaterialProperty.prototype
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
         * Gets or sets {@link Color} property which determines the polyline's color.
         * @memberof PolylineOutlineMaterialProperty.prototype
         * @type {Property}
         * @default new ConstantProperty(Color.WHITE)
         */
        color : createPropertyDescriptor('color'),
        /**
         * Gets or sets the {@link Color} property which determines the polyline's outline color.
         * @memberof PolylineOutlineMaterialProperty.prototype
         * @type {Property}
         * @default new ConstantProperty(Color.BLACK)
         */
        outlineColor : createPropertyDescriptor('outlineColor'),
        /**
         * Gets or sets the numberic property which determines the polyline's outline width.
         * @memberof PolylineOutlineMaterialProperty.prototype
         * @type {Property}
         * @default new ConstantProperty(0)
         */
        outlineWidth : createPropertyDescriptor('outlineWidth')
    });

    /**
     * Gets the {@link Material} type at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve the type.
     * @returns {String} The type of material.
     */
    PolylineOutlineMaterialProperty.prototype.getType = function(time) {
        return 'PolylineOutline';
    };

    /**
     * Gets the value of the property at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    PolylineOutlineMaterialProperty.prototype.getValue = function(time, result) {
        if (!defined(result)) {
            result = {};
        }
        result.color = Property.getValueOrClonedDefault(this._color, time, defaultColor, result.color);
        result.outlineColor = Property.getValueOrClonedDefault(this._outlineColor, time, defaultOutlineColor, result.outlineColor);
        result.outlineWidth = Property.getValueOrDefault(this._outlineWidth, time, defaultOutlineWidth);
        return result;
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    PolylineOutlineMaterialProperty.prototype.equals = function(other) {
        return this === other || //
               (other instanceof PolylineOutlineMaterialProperty && //
                Property.equals(this._color, other._color) && //
                Property.equals(this._outlineColor, other._outlineColor) && //
                Property.equals(this._outlineWidth, other._outlineWidth));
    };

    /**
     * @private
     */
    PolylineOutlineMaterialProperty.prototype._raiseDefinitionChanged = function(){
        this._definitionChanged.raiseEvent(this);
    };

    return PolylineOutlineMaterialProperty;
});
