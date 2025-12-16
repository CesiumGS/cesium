import RuntimeError from "../../Core/RuntimeError";

// TODO: to use WebGPU for rendering, need to provide a canvas to configure.
function Context(device, adapter) {
  this._device = device;
  this._adapter = adapter;
}

Context.create = async function () {
  if (!navigator.gpu) {
    throw new RuntimeError("WebGPU not supported on this browser.");
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new RuntimeError("No appropriate GPUAdapter found.");
  }

  const device = await adapter.requestDevice();
  return new Context(device, adapter);
};

Object.defineProperties(Context.prototype, {
  device: {
    get: function () {
      return this._device;
    },
  },
});

Context.prototype.createCommandEncoder = function (descriptor) {
  return this._device.createCommandEncoder(descriptor);
};

Context.prototype.submitEncoder = function (encoder) {
  const cb = encoder.finish();
  this._device.queue.submit([cb]);
};

Context.prototype.createShaderModule = function (descriptor) {
  return this._device.createShaderModule(descriptor);
};

Context.prototype.createComputePipeline = function (descriptor) {
  return this._device.createComputePipeline(descriptor);
};

Context.prototype.createBindGroupLayout = function (entries) {
  return this._device.createBindGroupLayout({ entries });
};

Context.prototype.createBindGroup = function (layout, entries) {
  return this._device.createBindGroup({ layout, entries });
};

Context.prototype.createBuffer = function ({ size, usage, mapped = false }) {
  return this._device.createBuffer({
    size,
    usage,
    mappedAtCreation: mapped,
  });
};

Context.prototype.writeBuffer = function (buffer, data, offset = 0) {
  this._device.queue.writeBuffer(buffer, offset, data);
};

Context.prototype.createComputePipeline = function (descriptor) {
  return this._device.createComputePipeline(descriptor);
};

Context.prototype.runCompute = function ({
  pipeline,
  bindGroups = [],
  workgroups = { x: 1, y: 1, z: 1 },
}) {
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

export default Context;
