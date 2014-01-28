/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Matrix4',
        '../Core/Quaternion'
    ], function(
        Cartesian3,
        Matrix4,
        Quaternion) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias ModelNode
     * @internalConstructor
     */
    var ModelNode = function(model, node) {

        // Animation targets

        /**
         * DOC_TBA
         * @readonly
         */
        this.matrix = undefined;
        /**
         * DOC_TBA
         * @readonly
         */
        this.translation = undefined;           // read-only for the Cesium API; targetable by glTF animations
        /**
         * DOC_TBA
         * @readonly
         */
        this.rotation = undefined;              // read-only for the Cesium API; targetable by glTF animations
        /**
         * DOC_TBA
         * @readonly
         */
        this.scale = undefined;                 // read-only for the Cesium API; targetable by glTF animations

        // Computed transforms

        /**
         * @private
         */
        this.transformToRoot = new Matrix4();
        /**
         * @private
         */
        this.computedMatrix = new Matrix4();
        /**
         * @private
         */
        this.dirty = false;                      // for graph traversal
        /**
         * @private
         */
        this.anyAncestorDirty = false;           // for graph traversal

        // Rendering

        /**
         * @private
         */
        this.commands = [];                      // empty for transform, light, and camera nodes

        // Skinned node

        /**
         * @private
         */
        this.inverseBindMatrices = undefined;    // undefined when node is not skinned
        /**
         * @private
         */
        this.bindShapeMatrix = undefined;        // undefined when node is not skinned or identity
        /**
         * @private
         */
        this.joints = [];                        // empty when node is not skinned
        /**
         * @private
         */
        this.computedJointMatrices = [];         // empty when node is not skinned

        // Joint node

        /**
         * @private
         */
        this.jointId = node.jointId;             // undefined when node is not a joint

        // Graph pointers

        /**
         * @private
         */
        this.children = [];                      // empty for leaf nodes
        /**
         * @private
         */
        this.parents = [];                       // empty for root nodes

        this._model = model;
    };

    /**
     * DOC_TBA
     */
    ModelNode.prototype.setMatrix = function(matrix) {
        this.matrix = Matrix4.clone(matrix, this.matrix);
        this.dirty = true;
        this._model._cesiumAnimationsDirty = true;
    };

    /**
     * DOC_TBA
     */
    ModelNode.prototype.setTranslation = function(translation) {
        this.translation = Cartesian3.clone(translation, this.translation);
        this.dirty = true;
        this._model._cesiumAnimationsDirty = true;
    };

    /**
     * DOC_TBA
     */
    ModelNode.prototype.setRotation = function(rotation) {
        this.rotation = Quaternion.clone(rotation, this.rotation);
        this.dirty = true;
        this._model._cesiumAnimationsDirty = true;
    };

    /**
     * DOC_TBA
     */
    ModelNode.prototype.setScale = function(scale) {
        this.scale = Cartesian3.clone(scale, this.scale);
        this.dirty = true;
        this._model._cesiumAnimationsDirty = true;
    };

    return ModelNode;
});