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
    var ModelNode = function(model, runtimeNode) {
        this._model = model;
        this._runtimeNode = runtimeNode;
    };

    /**
     * DOC_TBA
     */
    ModelNode.prototype.setMatrix = function(matrix) {
        var runtimeNode = this._runtimeNode;
        runtimeNode.matrix = Matrix4.clone(matrix, runtimeNode.matrix);
        runtimeNode.dirty = true;
        this._model._cesiumAnimationsDirty = true;
    };

    /**
     * DOC_TBA
     */
    ModelNode.prototype.setTranslation = function(translation) {
        var runtimeNode = this._runtimeNode;
        runtimeNode.translation = Cartesian3.clone(translation, runtimeNode.translation);
        runtimeNode.dirty = true;
        this._model._cesiumAnimationsDirty = true;
    };

    /**
     * DOC_TBA
     */
    ModelNode.prototype.setRotation = function(rotation) {
        var runtimeNode = this._runtimeNode;
        runtimeNode.rotation = Quaternion.clone(rotation, runtimeNode.rotation);
        runtimeNode.dirty = true;
        this._model._cesiumAnimationsDirty = true;
    };

    /**
     * DOC_TBA
     */
    ModelNode.prototype.setScale = function(scale) {
        var runtimeNode = this._runtimeNode;
        runtimeNode.scale = Cartesian3.clone(scale, runtimeNode.scale);
        runtimeNode.dirty = true;
        this._model._cesiumAnimationsDirty = true;
    };

    return ModelNode;
});