define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError'
    ], function(
        defined,
        defineProperties,
        DeveloperError) {
    'use strict';

    /**
     * A model's material with modifiable parameters.  A glTF material
     * contains parameters defined by the material's technique with values
     * defined by the technique and potentially overridden by the material.
     * This class allows changing these values at runtime.
     * <p>
     * Use {@link Model#getMaterial} to create an instance.
     * </p>
     *
     * @alias ModelMaterial
     * @internalConstructor
     * @class
     *
     * @see Model#getMaterial
     */
    function ModelMaterial(model, material, id) {
        this._name = material.name;
        this._id = id;
        this._uniformMap = model._uniformMaps[id];

        this._technique = undefined;
        this._program = undefined;
        this._values = undefined;
    }

    defineProperties(ModelMaterial.prototype, {
        /**
         * The value of the <code>name</code> property of this material.
         *
         * @memberof ModelMaterial.prototype
         *
         * @type {String}
         * @readonly
         */
        name : {
            get : function() {
                return this._name;
            }
        },

        /**
         * The index of the material.
         *
         * @memberof ModelMaterial.prototype
         *
         * @type {String}
         * @readonly
         */
        id : {
            get : function() {
                return this._id;
            }
        }
    });

    /**
     * Assigns a value to a material parameter.  The type for <code>value</code>
     * depends on the glTF type of the parameter.  It will be a floating-point
     * number, Cartesian, or matrix.
     *
     * @param {String} name The name of the parameter.
     * @param {*} [value] The value to assign to the parameter.
     *
     * @exception {DeveloperError} name must match a parameter name in the material's technique that is targetable and not optimized out.
     *
     * @example
     * material.setValue('diffuse', new Cesium.Cartesian4(1.0, 0.0, 0.0, 1.0));  // vec4
     * material.setValue('shininess', 256.0); // scalar
     */
    ModelMaterial.prototype.setValue = function(name, value) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(name)) {
            throw new DeveloperError('name is required.');
        }
        //>>includeEnd('debug');

        var uniformName = 'u_' + name;
        var v = this._uniformMap.values[uniformName];

        //>>includeStart('debug', pragmas.debug);
        if (!defined(v)) {
            throw new DeveloperError('name must match a parameter name in the material\'s technique that is targetable and not optimized out.');
        }
        //>>includeEnd('debug');

        v.value = v.clone(value, v.value);
    };

    /**
     * Returns the value of the parameter with the given <code>name</code>.  The type of the
     * returned object depends on the glTF type of the parameter.  It will be a floating-point
     * number, Cartesian, or matrix.
     *
     * @param {String} name The name of the parameter.
     * @returns {*} The value of the parameter or <code>undefined</code> if the parameter does not exist.
     */
    ModelMaterial.prototype.getValue = function(name) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(name)) {
            throw new DeveloperError('name is required.');
        }
        //>>includeEnd('debug');

        var uniformName = 'u_' + name;
        var v = this._uniformMap.values[uniformName];

        if (!defined(v)) {
            return undefined;
        }

        return v.value;
    };

    return ModelMaterial;
});
