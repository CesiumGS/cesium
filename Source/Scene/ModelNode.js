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
    var ModelNode = function(model, runtimeNode) {
        this._model = model;
        this._runtimeNode = runtimeNode;
    };

    defineProperties(ModelNode.prototype, {
        /**
         * The 4x4 matrix that transforms from this node's coordinate system to
         * its parent node's coordinate system.  When a matrix is provided,
         * it takes precedence over the {@link ModelNode#translation},
         * {@link ModelNode#rotation}, and {@link ModelNode#scale} properties.
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
                return this._runtimeNode.matrix;
            },
            set : function(value) {
                var runtimeNode = this._runtimeNode;
                runtimeNode.matrix = Matrix4.clone(value, runtimeNode.matrix);
                runtimeNode.dirty = true;
                this._model._cesiumAnimationsDirty = true;
            }
        },

        /**
         * Together, <code>translation</code>, {@link ModelNode#rotation}, and {@link ModelNode#scale}
         * define a transform from this node's coordinate system to its parent node's
         * coordinate system.
         * <p>
         * Using these properties instead of {@link ModeNode#matrix} allows user
         * animations to target individual transforms, e.g., just translation,
         * instead of the entire 4x4 matrix.
         * </p>
         * <p>
         * For changes to take affect, this property must be assigned to;
         * setting individual elements of the Cartesian will not work.
         * </p>
         * <p>
         * When {@link ModeNode#matrix} is defined, it takes precedence; otherwise,
         * all three properties must be defined.
         * </p>
         *
         * @memberof ModelAnimationCollection
         * @type {Cartesian3}
         */
        translation : {
            get : function () {
                return this._runtimeNode.translation;
            },
            set : function(value) {
                var runtimeNode = this._runtimeNode;
                runtimeNode.translation = Cartesian3.clone(value, runtimeNode.translation);
                runtimeNode.dirty = true;
                this._model._cesiumAnimationsDirty = true;
            }
        },

        /**
         * Together, {@link ModelNode#translation}, <code>rotation</code>, and {@link ModelNode#scale}
         * define a transform from this node's coordinate system to its parent node's
         * coordinate system.
         * <p>
         * Using these properties instead of {@link ModeNode#matrix} allows user
         * animations to target individual transforms, e.g., just rotation,
         * instead of the entire 4x4 matrix.
         * </p>
         * <p>
         * For changes to take affect, this property must be assigned to;
         * setting individual elements of the Quaternion will not work.
         * </p>
         * <p>
         * When {@link ModeNode#matrix} is defined, it takes precedence; otherwise,
         * all three properties must be defined.
         * </p>
         *
         * @memberof ModelAnimationCollection
         * @type {Quaternion}
         */
        rotation : {
            get : function () {
                return this._runtimeNode.rotation;
            },
            set : function(value) {
                var runtimeNode = this._runtimeNode;
                runtimeNode.rotation = Quaternion.clone(value, runtimeNode.rotation);
                runtimeNode.dirty = true;
                this._model._cesiumAnimationsDirty = true;
            }
        },

        /**
         * Together, {@link ModelNode#translation}, {@link ModelNode#rotation}, and <code>scale</code>
         * define a transform from this node's coordinate system to its parent node's
         * coordinate system.
         * <p>
         * Using these properties instead of {@link ModeNode#matrix} allows user
         * animations to target individual transforms, e.g., just scale,
         * instead of the entire 4x4 matrix.
         * </p>
         * <p>
         * For changes to take affect, this property must be assigned to;
         * setting individual elements of the Cartesian will not work.
         * </p>
         * <p>
         * When {@link ModeNode#matrix} is defined, it takes precedence; otherwise,
         * all three properties must be defined.
         * </p>
         *
         * @memberof ModelAnimationCollection
         * @type {Cartesian3}
         */
        scale : {
            get : function () {
                return this._runtimeNode.scale;
            },
            set : function(value) {
                var runtimeNode = this._runtimeNode;
                runtimeNode.scale = Cartesian3.clone(value, runtimeNode.scale);
                runtimeNode.dirty = true;
                this._model._cesiumAnimationsDirty = true;
            }
        }
    });

    return ModelNode;
});