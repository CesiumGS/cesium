import RuntimeError from "../../Core/RuntimeError";

// TODO: to use WebGPU for rendering, need to provide a canvas to configure.
function WebGPUContext(device, adapter) {
  this._device = device;
  this._adapter = adapter;
}

WebGPUContext.create = async function () {
  if (!navigator.gpu) {
    throw new RuntimeError("WebGPU not supported on this browser.");
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new RuntimeError("No appropriate GPUAdapter found.");
  }

  const device = await adapter.requestDevice();
  return new WebGPUContext(device, adapter);
};

Object.defineProperties(WebGPUContext.prototype, {
  device: {
    get: function () {
      return this._device;
    },
  },
});

WebGPUContext.prototype.createCommandEncoder = function (descriptor) {
  return this._device.createCommandEncoder(descriptor);
};

WebGPUContext.prototype.submitEncoder = function (encoder) {
  const cb = encoder.finish();
  this._device.queue.submit([cb]);
};

WebGPUContext.prototype.createShaderModule = function (descriptor) {
  return this._device.createShaderModule(descriptor);
};

WebGPUContext.prototype.createComputePipeline = function (descriptor) {
  return this._device.createComputePipeline(descriptor);
};

WebGPUContext.prototype.createPipelineLayout = function (descriptor) {
  return this._device.createPipelineLayout(descriptor);
};

WebGPUContext.prototype.createBindGroupLayout = function (entries) {
  return this._device.createBindGroupLayout({ entries });
};

WebGPUContext.prototype.createBindGroup = function (layout, entries) {
  return this._device.createBindGroup({ layout, entries });
};

WebGPUContext.prototype.createBuffer = function (size, usage, mapped = false) {
  return this._device.createBuffer({
    size,
    usage,
    mappedAtCreation: mapped,
  });
};

WebGPUContext.prototype.writeBuffer = function (buffer, data, offset = 0) {
  this._device.queue.writeBuffer(buffer, offset, data);
};

WebGPUContext.prototype.createComputePipeline = function (descriptor) {
  return this._device.createComputePipeline(descriptor);
};

WebGPUContext.prototype.runCompute = function (
  pipeline,
  bindGroups = [],
  workgroups = { x: 1, y: 1, z: 1 },
) {
  const commandEncoder = this.createCommandEncoder();
  const passEncoder = commandEncoder.beginComputePass();
  passEncoder.setPipeline(pipeline);
  for (let i = 0; i < bindGroups.length; ++i) {
    passEncoder.setBindGroup(i, bindGroups[i]);
  }
  passEncoder.dispatchWorkgroups(workgroups.x, workgroups.y, workgroups.z);
  passEncoder.end();
  this.submitEncoder(commandEncoder);
};

export default WebGPUContext;
