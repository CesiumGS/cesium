function BindGroup(entries, webgpuContextPromise) {
  this._entries = entries;

  webgpuContextPromise.then((webgpuContext) => {
    createGPUResources.call(this, webgpuContext);
  });
}

function createGPUResources(webgpuContext) {
  const layoutEntries = [];
  const bindgroupEntries = [];

  for (let i = 0; i < this._entries.length; i++) {
    const layoutEntry = {
      binding: i,
      visibility: this._entries[i]._visibility,
      buffer: {
        type: this._entries[i]._bufferType,
      },
    };

    const bindgroupEntry = {
      binding: i,
      resource: {
        buffer: this._entries[i]._buffer.buffer,
      },
    };

    layoutEntries.push(layoutEntry);
    bindgroupEntries.push(bindgroupEntry);
  }

  this._layout = webgpuContext.createBindGroupLayout(layoutEntries);
  this._bindGroup = webgpuContext.createBindGroup(
    this._layout,
    bindgroupEntries,
  );
}

Object.defineProperties(BindGroup.prototype, {
  layout: {
    get: function () {
      return this._layout;
    },
  },
  bindGroup: {
    get: function () {
      return this._bindGroup;
    },
  },
});

export default BindGroup;
