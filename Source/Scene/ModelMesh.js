/*global define*/
define([
        '../Core/defineProperties'
    ], function(
        defineProperties) {
    'use strict';

    /**
     * A model's mesh and its materials.
     * <p>
     * Use {@link Model#getMesh} to create an instance.
     * </p>
     *
     * @alias ModelMesh
     * @internalConstructor
     *
     * @see Model#getMesh
     */
    function ModelMesh(mesh, runtimeMaterialsById, id) {
        var materials = [];
        var primitives = mesh.primitives;
        var length = primitives.length;
        for (var i = 0; i < length; ++i) {
            var p = primitives[i];
            materials[i] = runtimeMaterialsById[p.material];
        }

        this._name = mesh.name;
        this._materials = materials;
        this._id = id;
    }

    defineProperties(ModelMesh.prototype, {
        /**
         * The value of the <code>name</code> property of this mesh.  This is the
         * name assigned by the artist when the asset is created.  This can be
         * different than the name of the mesh property ({@link ModelMesh#id}),
         * which is internal to glTF.
         *
         * @memberof ModelMesh.prototype
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
         * The name of the glTF JSON property for this mesh.  This is guaranteed
         * to be unique among all meshes.  It may not match the mesh's <code>
         * name</code> property (@link ModelMesh#name), which is assigned by
         * the artist when the asset is created.
         *
         * @memberof ModelMesh.prototype
         *
         * @type {String}
         * @readonly
         */
        id : {
            get : function() {
                return this._id;
            }
        },

        /**
         * An array of {@link ModelMaterial} instances indexed by the mesh's
         * primitive indices.
         *
         * @memberof ModelMesh.prototype
         *
         * @type {ModelMaterial[]}
         * @readonly
         */
        materials : {
            get : function() {
                return this._materials;
            }
        }
    });

    return ModelMesh;
});
