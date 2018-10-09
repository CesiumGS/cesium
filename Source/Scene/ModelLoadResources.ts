define([
        '../Core/Queue'
    ], function(
        Queue) {
    'use strict';

        /**
             * @private
             */
        class ModelLoadResources {
            constructor() {
                this.initialized = false;
                this.resourcesParsed = false;
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
                this.createdBufferViews = {};
                this.primitivesToDecode = new Queue();
                this.activeDecodingTasks = 0;
                this.pendingDecodingCache = false;
                this.skinnedNodesIds = [];
            }
            getBuffer(bufferView) {
                return getSubarray(this.buffers[bufferView.buffer], bufferView.byteOffset, bufferView.byteLength);
            }
            finishedPendingBufferLoads() {
                return (this.pendingBufferLoads === 0);
            }
            finishedBuffersCreation() {
                return ((this.pendingBufferLoads === 0) &&
                    (this.vertexBuffersToCreate.length === 0) &&
                    (this.indexBuffersToCreate.length === 0));
            }
            finishedProgramCreation() {
                return ((this.pendingShaderLoads === 0) && (this.programsToCreate.length === 0));
            }
            finishedTextureCreation() {
                var finishedPendingLoads = (this.pendingTextureLoads === 0);
                var finishedResourceCreation = (this.texturesToCreate.length === 0) &&
                    (this.texturesToCreateFromBufferView.length === 0);
                return finishedPendingLoads && finishedResourceCreation;
            }
            finishedEverythingButTextureCreation() {
                var finishedPendingLoads = (this.pendingBufferLoads === 0) &&
                    (this.pendingShaderLoads === 0);
                var finishedResourceCreation = (this.vertexBuffersToCreate.length === 0) &&
                    (this.indexBuffersToCreate.length === 0) &&
                    (this.programsToCreate.length === 0) &&
                    (this.pendingBufferViewToImage === 0);
                return this.finishedDecoding() && finishedPendingLoads && finishedResourceCreation;
            }
            finishedDecoding() {
                return this.primitivesToDecode.length === 0 && this.activeDecodingTasks === 0 && !this.pendingDecodingCache;
            }
            finished() {
                return this.finishedDecoding() && this.finishedTextureCreation() && this.finishedEverythingButTextureCreation();
            }
        }

    /**
     * This function differs from the normal subarray function
     * because it takes offset and length, rather than begin and end.
     */
    function getSubarray(array, offset, length) {
        return array.subarray(offset, offset + length);
    }









    return ModelLoadResources;
});
