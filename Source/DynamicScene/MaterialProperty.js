/*global define*/
define([
        '../Core/defined',
        '../Core/DeveloperError',
        '../Scene/Material'
    ], function(
        defined,
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
     */
    var MaterialProperty = function() {
        DeveloperError.throwInstantiationError();
    };

    /**
     * Gets the {@link Material} type at the provided time.
     * @memberof MaterialProperty
     * @function
     *
     * @param {JulianDate} time The time for which to retrieve the type.
     * @type {String} The type of material.
     */
    MaterialProperty.prototype.getType = DeveloperError.throwInstantiationError;

    /**
     * Gets the value of the property at the provided time.
     * @memberof MaterialProperty
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
     * @memberof MaterialProperty
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    MaterialProperty.prototype.equals = DeveloperError.throwInstantiationError;

    /**
     * @private
     */
    MaterialProperty.getValue = function(time, materialProperty, material) {
        if (defined(materialProperty)) {
            var type = materialProperty.getType(time);
            if (defined(type)) {
                if (!defined(material) || (material.type !== type)) {
                    material = Material.fromType(type);
                }
                materialProperty.getValue(time, material.uniforms);
            }
        }
        return material;
    };

    return MaterialProperty;
});