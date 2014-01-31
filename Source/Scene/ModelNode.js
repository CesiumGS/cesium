/*global define*/
define([
        '../Core/defineProperties',
        '../Core/Cartesian3',
        '../Core/Matrix4',
        '../Core/Quaternion'
    ], function(
        defineProperties,
        Cartesian3,
        Matrix4,
        Quaternion) {
    "use strict";

    /**
     * A model node with a transform for user-defined animations.  A glTF asset can
     * contain animations that target a node's transform.  This class allows
     * changing a node's transform externally so animation can be driven by another
     * source, not just an animation in the glTF asset.
     * <p>
     * Use {@link Model#getNode} to create an instance.
     * </p>
     *
     * @alias ModelNode
     * @internalConstructor
     *
     * @example
     * var node = model.getNode('LOD3sp');
     *
     * // Example 1. Apply non-uniform scale using the matrix transform
     * node.matrix = Matrix4.fromScale(new Cartesian3(5.0, 1.0, 1.0), node.matrix);
     *
     * // Example 2. Apply non-uniform scale using individual translation, rotation, and scale
     * node.matrix = undefined;
     * node.translation = new Cartesian3();
     * node.rotation = Quaternion.IDENTITY.clone();
     * node.scale = new Cartesian3(5.0, 1.0, 1.0);
     *
     * @see Model#getNode
     */
    var ModelNode = function(model, node, runtimeNode) {
        this._model = model;
        this._runtimeNode = runtimeNode;

        /**
         * DOC_TBA
         *
         * @readonly
         */
        this.name = node.name;

        this._matrix = undefined;
    };

    defineProperties(ModelNode.prototype, {
        /**
         * DOC_TBA
         * <p>
         * For changes to take affect, this property must be assigned to;
         * setting individual elements of the matrix will not work.
         * </p>
         *
         * @memberof ModelAnimationCollection
         * @type {Matrix4}
         */
        matrix : {
            get : function () {
                return this._matrix;
            },
            set : function(value) {
                this._matrix = Matrix4.clone(value, this._matrix);

                var model = this._model;
                model._cesiumAnimationsDirty = true;
                this._runtimeNode.dirtyNumber = model._maxDirtyNumber;
            }
        }

    });

    return ModelNode;
});