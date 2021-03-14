function GltfLoadResources(asynchronous) {
  this.asynchronous = asynchronous;
  this.vertexBuffersToLoad = [];
  this.indexBuffersToLoad = [];
}

GltfLoadResources.prototype.addVertexBuffer = function (options) {
  this.vertexBuffersToLoad.push(new VertexBufferToLoad(options));
};

GltfLoadResources.prototype.addIndexBuffer = function (options) {
  this.indexBuffersToLoad.push(new IndexBufferToLoad(options));
};

function VertexBufferToLoad(options) {
  this.buffer = options.buffer;
  this.bufferView = options.bufferView;
  this.cacheKey = options.cacheKey;
  this.bufferCacheKey = options.bufferCacheKey;
  this.typedArray = undefined;
  this.vertexBuffer = undefined;
  this.deferredPromise = undefined;
}

function IndexBufferToLoad(options) {
  this.buffer = options.buffer;
  this.bufferView = options.bufferView;
  this.cacheKey = options.cacheKey;
  this.bufferCacheKey = options.bufferCacheKey;
  this.typedArray = undefined;
  this.vertexBuffer = undefined;
  this.deferredPromise = undefined;
}

export default GltfLoadResources;
