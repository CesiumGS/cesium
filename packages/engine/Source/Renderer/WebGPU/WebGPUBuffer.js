function WebGPUBuffer(options) {
  const wgpuContextPromise = options.webGPUContextPromise;
  this.buffer = undefined;
  this.size = options.size;
  this.usage = options.usage;
  this.mappedAtCreation = options.mappedAtCreation || false;
  this.debugName = options.debugName;

  wgpuContextPromise.then((webGPUContext) => {
    createWGPUResources.call(this, webGPUContext);
  });
}

function createWGPUResources(webGPUContext) {
  this.buffer = webGPUContext.createBuffer({
    size: this.size,
    usage: this.usage,
    mappedAtCreation: this.mappedAtCreation,
    label: this.debugName,
  });
}

export default WebGPUBuffer;
