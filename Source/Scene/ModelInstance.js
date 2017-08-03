define([
        '../Core/defineProperties',
        '../Core/Matrix4'
    ], function(
        defineProperties,
        Matrix4) {
    'use strict';

    /**
     * @private
     */
    function ModelInstance(collection, modelMatrix, instanceId) {
        this.primitive = collection;
        this._modelMatrix = Matrix4.clone(modelMatrix);
        this._instanceId = instanceId;
    }

    defineProperties(ModelInstance.prototype, {
        instanceId : {
            get : function() {
                return this._instanceId;
            }
        },
        model : {
            get : function() {
                return this.primitive._model;
            }
        },
        modelMatrix : {
            get : function() {
                return Matrix4.clone(this._modelMatrix);
            },
            set : function(value) {
                Matrix4.clone(value, this._modelMatrix);
                this.primitive.expandBoundingSphere(this._modelMatrix);
                this.primitive._dirty = true;
            }
        }
    });

    return ModelInstance;
});
