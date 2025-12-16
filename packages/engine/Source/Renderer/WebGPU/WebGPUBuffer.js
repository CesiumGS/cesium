function WebGPUBuffer(options) {
  const wgpuContextPromise = options.webGPUContextPromise;
  this.buffer = undefined;
  this.size = options.size;
  this.usage = options.usage;
  this.mappedAtCreation = options.mappedAtCreation || false;
  this.debugName = options.debugName;
  this.data = options.data;

  wgpuContextPromise.then((webGPUContext) => {
    createWGPUResources.call(this, webGPUContext);
  });
}

function createWGPUResources(webGPUContext) {
  this.buffer = webGPUContext.createBuffer(
    this.size,
    this.usage,
    this.mappedAtCreation,
  );

  if (this.data) {
    webGPUContext.writeBuffer(this.buffer, this.data);
  }
}

export default WebGPUBuffer;
