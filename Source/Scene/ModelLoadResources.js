define([
        '../Core/Queue'
    ], function(
        Queue) {
    'use strict';

    /**
     * @private
     */
    function ModelLoadResources() {
        this.vertexBuffersToCreate = new Queue();
        this.indexBuffersToCreate = new Queue();
        this.buffers = {};
        this.pendingBufferLoads = 0;

        this.programsToCreate = new Queue();
        this.shaders = {};
        this.pendingShaderLoads = 0;

        this.texturesToCreate = new Queue();
        this.pendingTextureLoads = 0;

        this.texturesToCreateFromBufferView = new Queue();
        this.pendingBufferViewToImage = 0;

        this.createSamplers = true;
        this.createSkins = true;
        this.createRuntimeAnimations = true;
        this.createVertexArrays = true;
        this.createRenderStates = true;
        this.createUniformMaps = true;
        this.createRuntimeNodes = true;

        this.decoding = false;
        this.primitivesToDecode = new Queue();
        this.finishedDecoding = false;

        this.skinnedNodesIds = [];
    }

    /**
     * This function differs from the normal subarray function
     * because it takes offset and length, rather than begin and end.
     */
    function getSubarray(array, offset, length) {
        return array.subarray(offset, offset + length);
    }

    ModelLoadResources.prototype.getBuffer = function(bufferView) {
        return getSubarray(this.buffers[bufferView.buffer], bufferView.byteOffset, bufferView.byteLength);
    };

    ModelLoadResources.prototype.finishedPendingBufferLoads = function() {
        return (this.pendingBufferLoads === 0);
    };

    ModelLoadResources.prototype.finishedBuffersCreation = function() {
        return ((this.pendingBufferLoads === 0) &&
                (this.vertexBuffersToCreate.length === 0) &&
                (this.indexBuffersToCreate.length === 0));
    };

    ModelLoadResources.prototype.finishedProgramCreation = function() {
        return ((this.pendingShaderLoads === 0) && (this.programsToCreate.length === 0));
    };

    ModelLoadResources.prototype.finishedTextureCreation = function() {
        var finishedPendingLoads = (this.pendingTextureLoads === 0);
        var finishedResourceCreation =
            (this.texturesToCreate.length === 0) &&
            (this.texturesToCreateFromBufferView.length === 0);

        return finishedPendingLoads && finishedResourceCreation;
    };

    ModelLoadResources.prototype.finishedEverythingButTextureCreation = function() {
        var finishedPendingLoads =
            (this.pendingBufferLoads === 0) &&
            (this.pendingShaderLoads === 0);
        var finishedResourceCreation =
            (this.vertexBuffersToCreate.length === 0) &&
            (this.indexBuffersToCreate.length === 0) &&
            (this.programsToCreate.length === 0) &&
            (this.pendingBufferViewToImage === 0);

        return this.decodingComplete() && finishedPendingLoads && finishedResourceCreation;
    };

    ModelLoadResources.prototype.decodingComplete = function() {
        return !this.decoding || (this.primitivesToDecode.length === 0 && this.finishedDecoding);
    };

    ModelLoadResources.prototype.finished = function() {
        return this.decodingComplete() && this.finishedTextureCreation() && this.finishedEverythingButTextureCreation();
    };

    return ModelLoadResources;
});
