/*global define*/
define(['../Core/Color',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Event',
        './ConstantProperty',
        './Property'
    ], function(
        Color,
        defined,
        defineProperties,
        Event,
        ConstantProperty,
        Property) {
    "use strict";

    /**
     * A {@link MaterialProperty} that maps to solid color {@link Material} uniforms.
     * @alias ColorMaterialProperty
     * @constructor
     */
    var ColorMaterialProperty = function(color) {
        this._definitionChanged = new Event();
        this._color = undefined;
        this._colorSubscription = undefined;
        this.color = new ConstantProperty(color);
    };

    defineProperties(ColorMaterialProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A property is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof ColorMaterialProperty.prototype
         * @type {Boolean}
         */
        isConstant : {
            get : function() {
                return !defined(this._color) || this._color.isConstant;
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is considered to have changed if a call to getValue would return
         * a different result for the same time.
         * @memberof ColorMaterialProperty.prototype
         * @type {Event}
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },
        /**
         * A {@link Color} {@link Property} which determines the material's color.
         * @memberof ColorMaterialProperty.prototype
         * @type {Property}
         * @default new ConstantProperty(Color.WHITE)
         */
        color : {
            get : function() {
                return this._color;
            },
            set : function(value) {
                if (this._color !== value) {
                    if (this._colorSubscription) {
                        this._colorSubscription();
                        this._colorSubscription = undefined;
                    }
                    this._color = value;
                    if (defined(value)) {
                        this._colorSubscription = value.definitionChanged.addEventListener(ColorMaterialProperty.prototype._raiseDefinitionChanged, this);
                    }
                    this._raiseDefinitionChanged(this);
                }
            }
        }
    });

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
     *
     * @exception {DeveloperError} time is required.
     */
    ColorMaterialProperty.prototype.getValue = function(time, result) {
        if (!defined(result)) {
            result = {};
        }
        result.color = defined(this._color) ? this._color.getValue(time, result.color) : undefined;
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
        Property.equals(this._color, other._color));
    };

    /**
     * @private
     */
    ColorMaterialProperty.prototype._raiseDefinitionChanged = function(){
        this._definitionChanged.raiseEvent(this);
    };

    return ColorMaterialProperty;
});
