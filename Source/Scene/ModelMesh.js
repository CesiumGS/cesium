/*global define*/
define(function() {
    "use strict";

    /**
     * A model's mesh.  This will eventually hold a material for material animations via the Cesium API.
     * <p>
     * Use {@link Model#getMesh} to create an instance.
     * </p>
     *
     * @alias ModelMesh
     * @internalConstructor
     *
     * @see Model#getMesh
     */
    var ModelMesh = function(name) {
        /**
         * The value of the <code>name</code> property of this mesh.  This is the
         * name assigned by the artist when the asset is created.  This can be
         * different than the name of the mesh property, which is internal to glTF.
         *
         * @type {String}
         *
         * @readonly
         */
        this.name = name;
    };

    return ModelMesh;
});