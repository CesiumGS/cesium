/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Scene/Material'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        Material) {
    "use strict";

    function throwInstantiationError() {
        throw new DeveloperError('This type should not be instantiated directly.');
    }

    /**
     * The base class for {@link Material} properties, which are {@link Property} objects
     * that represent a Material whose uniforms change over time.
     * This type defines an interface and cannot be instantiated directly.
     *
     * @alias MaterialProperty
     * @constructor
     *
     * @see ColorMaterialProperty
     * @see GridMaterialProperty
     * @see ImageMaterialProperty
     */
    var MaterialProperty = throwInstantiationError;

    defineProperties(MaterialProperty.prototype, {
        /**
         * Returns the value of the property at the specified simulation time in the fixed frame.
         * @memberof MaterialProperty
         *
         * @param {JulianDate} time The simulation time for which to retrieve the value.
         * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
         * @returns {Cartesian3} The modified result parameter or a new instance if the result parameter was not supplied.
         */
        isTimeVarying : {
            get : function() {
                throwInstantiationError();
            }
        },
        /**
         * Gets the Material type.
         * @type {String}
         */
        type : {
            get : function() {
                throwInstantiationError();
            }
        }
    });

    /**
     * Returns the value of the property at the specified simulation time in the fixed frame.
     * @memberof MaterialProperty
     *
     * @param {JulianDate} time The simulation time for which to retrieve the value.
     * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Cartesian3} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    MaterialProperty.prototype.getValue = throwInstantiationError;

    /**
     * @private
     */
    MaterialProperty.GetValue = function(time, context, materialProperty, material) {
        if (defined(materialProperty)) {
            if (!defined(materialProperty.type) && defined(materialProperty.intervals)) {
                var interval = materialProperty.intervals.findIntervalContainingDate(time);
                if (!defined(interval) || !defined(interval.data)) {
                    return material;
                }
                materialProperty = interval.data;
            }
            if (!defined(material) || (material.type !== materialProperty.type)) {
                material = Material.fromType(context, materialProperty.type);
            }
            materialProperty.getValue(time, material.uniforms);
        }
        return material;
    };

    return MaterialProperty;
});