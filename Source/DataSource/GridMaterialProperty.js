/*global define*/
define(['../Core/Cartesian2',
        '../Core/Color',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Event',
        './ConstantProperty',
        './Property'
    ], function(
        Cartesian2,
        Color,
        defined,
        defineProperties,
        Event,
        ConstantProperty,
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

        this.color = new ConstantProperty(Color.WHITE);
        this.cellAlpha = new ConstantProperty(0.1);
        this.lineCount = new ConstantProperty(new Cartesian2(8, 8));
        this.lineThickness = new ConstantProperty(new Cartesian2(1.0, 1.0));
    };

    defineProperties(GridMaterialProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A value is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof GridMaterialProperty.prototype
         * @type {Boolean}
         */
        isConstant : {
            get : function() {
                return (!defined(this._color) || this._color.isConstant) && //
                       (!defined(this._cellAlpha) || this._cellAlpha.isConstant) && //
                       (!defined(this._lineCount) || this._lineCount.isConstant) && //
                       (!defined(this._lineThickness) || this._lineThickness.isConstant);
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is considered to have changed if a call to getValue would return
         * a different result for the same time.
         * @memberof GridMaterialProperty.prototype
         * @type {Event}
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },
        /**
         * A {@link Color} {@link Property} which determines the grid's color.
         * @memberof GridMaterialProperty.prototype
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
                        this._colorSubscription = value.definitionChanged.addEventListener(GridMaterialProperty.prototype._raiseDefinitionChanged, this);
                    }
                    this._raiseDefinitionChanged(this);
                }
            }
        },
        /**
         * A numeric {@link Property} which determines the grid cells alpha value, when combined with the color alpha.
         * @type {Property}
         * @default new ConstantProperty(0.1)
         */
        cellAlpha : {
            get : function() {
                return this._cellAlpha;
            },
            set : function(value) {
                if (this._cellAlpha !== value) {
                    if (this._cellAlphaSubscription) {
                        this._cellAlphaSubscription();
                        this._cellAlphaSubscription = undefined;
                    }
                    this._cellAlpha = value;
                    if (defined(value)) {
                        this._cellAlphaSubscription = value.definitionChanged.addEventListener(GridMaterialProperty.prototype._raiseDefinitionChanged, this);
                    }
                    this._raiseDefinitionChanged(this);
                }
            }
        },
        /**
         * A {@link Cartesian2} {@link Property} which determines the number of rows and columns in the grid.
         * @type {Property}
         * @default new ConstantProperty(new Cartesian2(8, 8))
         */
        lineCount : {
            get : function() {
                return this._lineCount;
            },
            set : function(value) {
                if (this._lineCount !== value) {
                    if (this._lineCountSubscription) {
                        this._lineCountSubscription();
                        this._lineCountSubscription = undefined;
                    }
                    this._lineCount = value;
                    if (defined(value)) {
                        this._lineCountSubscription = value.definitionChanged.addEventListener(GridMaterialProperty.prototype._raiseDefinitionChanged, this);
                    }
                    this._raiseDefinitionChanged(this);
                }
            }
        },
        /**
         * A {@link Cartesian2} {@link Property} which determines the thickness of rows and columns in the grid.
         * @type {Property}
         * @default new ConstantProperty(new Cartesian2(1.0, 1.0))
         */
        lineThickness : {
            get : function() {
                return this._lineThickness;
            },
            set : function(value) {
                if (this._lineThickness !== value) {
                    if (this._lineThicknessSubscription) {
                        this._lineThicknessSubscription();
                        this._lineThicknessSubscription = undefined;
                    }
                    this._lineThickness = value;
                    if (defined(value)) {
                        this._lineThicknessSubscription = value.definitionChanged.addEventListener(GridMaterialProperty.prototype._raiseDefinitionChanged, this);
                    }
                    this._raiseDefinitionChanged(this);
                }
            }
        }
    });

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
     *
     * @exception {DeveloperError} time is required.
     */
    GridMaterialProperty.prototype.getValue = function(time, result) {
        if (!defined(result)) {
            result = {};
        }
        result.color = defined(this._color) ? this._color.getValue(time, result.color) : undefined;
        result.cellAlpha = defined(this._cellAlpha) ? this._cellAlpha.getValue(time) : undefined;
        result.lineCount = defined(this._lineCount) ? this._lineCount.getValue(time, result.lineCount) : undefined;
        result.lineThickness = defined(this._lineThickness) ? this._lineThickness.getValue(time, result.lineThickness) : undefined;
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
        Property.equals(this._color, other._color) && //
        Property.equals(this._cellAlpha, other._cellAlpha) && //
        Property.equals(this._lineCount, other._lineCount) && //
        Property.equals(this._lineThickness, other._lineThickness));
    };

    /**
     * @private
     */
    GridMaterialProperty.prototype._raiseDefinitionChanged = function() {
        this._definitionChanged.raiseEvent(this);
    };

    return GridMaterialProperty;
});
