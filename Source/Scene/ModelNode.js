/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defineProperties',
        '../Core/Matrix4'
    ], function(
        defaultValue,
        defineProperties,
        Matrix4) {
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
     * node.matrix = Matrix4.fromScale(new Cartesian3(5.0, 1.0, 1.0), node.matrix);
     *
     * @see Model#getNode
     */
    var ModelNode = function(model, node, runtimeNode) {
        this._model = model;
        this._runtimeNode = runtimeNode;

        /**
         * The value of the <code>name</code> property of this node.  This is the
         * name assigned by the artist when the asset is created.  This can be
         * different than the name of the node property, which is internal to glTF.
         *
         * @type {String}
         *
         * @readonly
         */
        this.name = node.name;

        /**
         * @private
         */
        this.useMatrix = false;

        this._matrix = Matrix4.clone(defaultValue(node.matrix, Matrix4.IDENTITY));
    };

    defineProperties(ModelNode.prototype, {
        /**
         * The node's 4x4 matrix transform from its local coordinates to
         * its parent's.
         * <p>
         * For changes to take effect, this property must be assigned to;
         * setting individual elements of the matrix will not work.
         * </p>
         *
         * @memberof ModelAnimationCollection
         * @type {Matrix4}
         */
        matrix : {
            get : function() {
                return this._matrix;
            },
            set : function(value) {
                this._matrix = Matrix4.clone(value, this._matrix);
                this.useMatrix = true;

                var model = this._model;
                model._cesiumAnimationsDirty = true;
                this._runtimeNode.dirtyNumber = model._maxDirtyNumber;
            }
        }

    });

    return ModelNode;
});