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
     * @see Model#getNode
     *
     * @example
     * var node = model.getNode('LOD3sp');
     * node.matrix = Cesium.Matrix4.fromScale(new Cesium.Cartesian3(5.0, 1.0, 1.0), node.matrix);
     */
    var ModelNode = function(model, node, runtimeNode, id) {
        this._model = model;
        this._runtimeNode = runtimeNode;
        this._name = node.name;
        this._id = id;

        /**
         * @private
         */
        this.useMatrix = false;

        this._matrix = Matrix4.clone(defaultValue(node.matrix, Matrix4.IDENTITY));
    };

    defineProperties(ModelNode.prototype, {
        /**
         * The value of the <code>name</code> property of this node.  This is the
         * name assigned by the artist when the asset is created.  This can be
         * different than the name of the node property ({@link ModelNode#id}),
         * which is internal to glTF.
         *
         * @memberof ModelNode.prototype
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
         * The name of the glTF JSON property for this node.  This is guaranteed
         * to be unique among all nodes.  It may not match the node's <code>
         * name</code> property (@link ModelNode#name), which is assigned by
         * the artist when the asset is created.
         *
         * @memberof ModelNode.prototype
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
         * The node's 4x4 matrix transform from its local coordinates to
         * its parent's.
         * <p>
         * For changes to take effect, this property must be assigned to;
         * setting individual elements of the matrix will not work.
         * </p>
         *
         * @memberof ModelNode.prototype
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
