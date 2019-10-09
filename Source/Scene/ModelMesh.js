import defineProperties from '../Core/defineProperties.js';

    /**
     * A model's mesh and its materials.
     * <p>
     * Use {@link Model#getMesh} to create an instance.
     * </p>
     *
     * @alias ModelMesh
     * @internalConstructor
     * @class
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
         * The value of the <code>name</code> property of this mesh.
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
         * The index of the mesh.
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
export default ModelMesh;
