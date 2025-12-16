/**
 * A single bind group entry used to build a bind group layout and bind group.
 * Entries will be bound in the order they are provided to the {@link WebGPUCommand}
 */
function BindGroupEntry(options) {
  this._bufferType = options.bufferType ?? "storage";
  this._buffer = options.buffer;
  this._visibility = options.visibility ?? GPUShaderStage.COMPUTE;
}

export default BindGroupEntry;
