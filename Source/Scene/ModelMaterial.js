/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError'
    ], function(
        defined,
        defineProperties,
        DeveloperError) {
    "use strict";

    /**
     * DOC_TBA
     * <p>
     * Use {@link Model#getMaterial} to create an instance.
     * </p>
     *
     * @alias ModelMatrix
     * @internalConstructor
     *
     * @see Model#getMaterial
     */
    var ModelMaterial = function(model, material, id) {
        this._name = material.name;
        this._id = id;
        this._uniformMap = model._rendererResources.uniformMaps[id];
    };

    defineProperties(ModelMaterial.prototype, {
        /**
         * The value of the <code>name</code> property of this material.  This is the
         * name assigned by the artist when the asset is created.  This can be
         * different than the name of the material property ({@link ModelMaterial#id}),
         * which is internal to glTF.
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
         * The name of the glTF JSON property for this material.  This is guaranteed
         * to be unique among all materials.  It may not match the material's <code>
         * name</code> property (@link ModelMaterial#name), which is assigned by
         * the artist when the asset is created.
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
     * DOC_TBA
     *
     * @exception {DeveloperError} name is required.
     * @exception {DeveloperError} name must match a parameter name in the material's technique that is targetable and not optimized out.
     */
    ModelMaterial.prototype.setValue = function(name, value) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(name)) {
            throw new DeveloperError('name is required.');
        }
        //>>includeEnd('debug');

        var v = this._uniformMap.values[name];

        //>>includeStart('debug', pragmas.debug);
        if (!defined(v)) {
            throw new DeveloperError('name must match a parameter name in the material\'s technique that is targetable and not optimized out.');
        }
        //>>includeEnd('debug');

        v.value = v.clone(value, v.value);
    };

    /**
     * DOC_TBA
     *
     * @exception {DeveloperError} name is required.
     */
    ModelMaterial.prototype.getValue = function(name) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(name)) {
            throw new DeveloperError('name is required.');
        }
        //>>includeEnd('debug');

        var v = this._uniformMap.values[name];

        if (!defined(v)) {
            return undefined;
        }

        return v.value;
    };

    return ModelMaterial;
});