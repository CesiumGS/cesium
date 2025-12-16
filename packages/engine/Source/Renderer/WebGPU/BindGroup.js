function BindGroup(entries, webgpuContext) {
  const layoutEntries = [];
  const bindgroupEntries = [];

  for (let i = 0; i < entries.length; i++) {
    const layoutEntry = {
      binding: i,
      visibility: entries[i]._visibility,
      buffer: {
        type: entries[i]._bufferType,
      },
    };

    const bindgroupEntry = {
      binding: i,
      resource: {
        buffer: entries[i]._buffer,
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
