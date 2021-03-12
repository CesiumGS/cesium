function GltfLoadResources(asynchronous) {
  this.asynchronous = asynchronous;
  this.vertexBuffersToLoad = [];
  this.indexBuffersToLoad = [];
}

function VertexBufferToLoad(cacheKey, bufferViewId) {
  this.buffer = undefined;
  this.bufferView = undefined;
  this.cacheKey = cacheKey;
  this.bufferPromise = undefined;
  this.typedArray = undefined;
  this.vertexBuffer = undefined;
  this.ready = false;
}

function IndexBufferToLoad(cacheKey, accessorId) {
  this.accessorId = accessorId;
  this.cacheKey = cacheKey;
  this.loadBufferPromise = undefined;
  this.indexBuffer = undefined;
}

GltfLoadResources.prototype.addVertexBuffer = function (
  cacheKey,
  bufferViewId
) {
  this.vertexBuffersToLoad.push(new VertexBufferToLoad(cacheKey, bufferViewId));
};

GltfLoadResources.prototype.addIndexBuffer = function (cacheKey, accessorId) {
  this.indexBuffersToLoad.push(new IndexBufferToLoad(cacheKey, accessorId));
};
