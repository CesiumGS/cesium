/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Shaders/ViewportQuadVS',
    ], function(
        DeveloperError,
        destroyObject,
        ViewportQuadVS) {
    "use strict";

    /**
     * DOC_TBA
     */
    var PostProcessFilter = function(touchUp) {
        if (typeof touchUp === 'undefined') {
            throw new DeveloperError('touchUp is required.');
        }
// TODO: validate touchUp

// TODO: make public and readonly
        this._touchUp = touchUp;

        /**
         * @private
         */
        this.shaderProgram = undefined;

        /**
         * @private
         */
        this.uniformMap = undefined;
    };

    var attributeIndices = {
        position : 0,
        textureCoordinates : 1
    };

    PostProcessFilter.prototype.update = function(context) {
        if (typeof this.shaderProgram === 'undefined') {
            this.shaderProgram = context.getShaderCache().getShaderProgram(ViewportQuadVS, this._touchUp.source, attributeIndices);
        }
// TODO: expose uniformMap
    };

    PostProcessFilter.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessFilter.prototype.destroy = function() {
        this.shaderProgram = this.shaderProgram && this.shaderProgram.release();

        return destroyObject(this);
    };

    return PostProcessFilter;
});
