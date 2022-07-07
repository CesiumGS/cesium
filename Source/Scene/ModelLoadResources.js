import Queue from "../Core/Queue.js";

/**
 * @private
 */
function ModelLoadResources() {
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

/**
 * This function differs from the normal subarray function
 * because it takes offset and length, rather than begin and end.
 * @private
 */
function getSubarray(array, offset, length) {
  return array.subarray(offset, offset + length);
}

ModelLoadResources.prototype.getBuffer = function (bufferView) {
  return getSubarray(
    this.buffers[bufferView.buffer],
    bufferView.byteOffset,
    bufferView.byteLength
  );
};

ModelLoadResources.prototype.finishedPendingBufferLoads = function () {
  return this.pendingBufferLoads === 0;
};

ModelLoadResources.prototype.finishedBuffersCreation = function () {
  return (
    this.pendingBufferLoads === 0 &&
    this.vertexBuffersToCreate.length === 0 &&
    this.indexBuffersToCreate.length === 0
  );
};

ModelLoadResources.prototype.finishedProgramCreation = function () {
  return this.pendingShaderLoads === 0 && this.programsToCreate.length === 0;
};

ModelLoadResources.prototype.finishedTextureCreation = function () {
  const finishedPendingLoads = this.pendingTextureLoads === 0;
  const finishedResourceCreation =
    this.texturesToCreate.length === 0 &&
    this.texturesToCreateFromBufferView.length === 0;

  return finishedPendingLoads && finishedResourceCreation;
};

ModelLoadResources.prototype.finishedEverythingButTextureCreation = function () {
  const finishedPendingLoads =
    this.pendingBufferLoads === 0 && this.pendingShaderLoads === 0;
  const finishedResourceCreation =
    this.vertexBuffersToCreate.length === 0 &&
    this.indexBuffersToCreate.length === 0 &&
    this.programsToCreate.length === 0 &&
    this.pendingBufferViewToImage === 0;

  return (
    this.finishedDecoding() && finishedPendingLoads && finishedResourceCreation
  );
};

ModelLoadResources.prototype.finishedDecoding = function () {
  return (
    this.primitivesToDecode.length === 0 &&
    this.activeDecodingTasks === 0 &&
    !this.pendingDecodingCache
  );
};

ModelLoadResources.prototype.finished = function () {
  return (
    this.finishedDecoding() &&
    this.finishedTextureCreation() &&
    this.finishedEverythingButTextureCreation()
  );
};
export default ModelLoadResources;
