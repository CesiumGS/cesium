/*global define*/
define([
        '../Core/Color',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Scene/Material'
    ], function(
        Color,
        defined,
        defineProperties,
        DeveloperError,
        Material) {
    "use strict";

    /**
     * The interface for all {@link Property} objects that represent {@link Material} uniforms.
     * This type defines an interface and cannot be instantiated directly.
     *
     * @alias MaterialProperty
     * @constructor
     *
     * @see ColorMaterialProperty
     * @see CompositeMaterialProperty
     * @see GridMaterialProperty
     * @see ImageMaterialProperty
     * @see PolylineGlowMaterialProperty
     * @see PolylineOutlineMaterialProperty
     * @see StripeMaterialProperty
     */
    var MaterialProperty = function() {
        DeveloperError.throwInstantiationError();
    };

    defineProperties(MaterialProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A property is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof MaterialProperty.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            get : DeveloperError.throwInstantiationError
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is considered to have changed if a call to getValue would return
         * a different result for the same time.
         * @memberof MaterialProperty.prototype
         *
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : DeveloperError.throwInstantiationError
        }
    });

    /**
     * Gets the {@link Material} type at the provided time.
     * @function
     *
     * @param {JulianDate} time The time for which to retrieve the type.
     * @returns {String} The type of material.
     */
    MaterialProperty.prototype.getType = DeveloperError.throwInstantiationError;

    /**
     * Gets the value of the property at the provided time.
     * @function
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    MaterialProperty.prototype.getValue = DeveloperError.throwInstantiationError;

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @function
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    MaterialProperty.prototype.equals = DeveloperError.throwInstantiationError;

    /**
     * @private
     */
    MaterialProperty.getValue = function(time, materialProperty, material) {
        var type;

        if (defined(materialProperty)) {
            type = materialProperty.getType(time);
            if (defined(type)) {
                if (!defined(material) || (material.type !== type)) {
                    material = Material.fromType(type);
                }
                materialProperty.getValue(time, material.uniforms);
                return material;
            }
        }

        if (!defined(material) || (material.type !== Material.ColorType)) {
            material = Material.fromType(Material.ColorType);
        }
        Color.clone(Color.WHITE, material.uniforms.color);

        return material;
    };

    return MaterialProperty;
});
