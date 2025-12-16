import RuntimeError from "../../Core/RuntimeError";

async function Context(canvas) {
  if (!navigator.gpu) {
    throw new RuntimeError("WebGPU not supported on this browser.");
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new RuntimeError("No appropriate GPUAdapter found.");
  }

  this._canvas = canvas;
  this._device = await adapter.requestDevice();

  const context = canvas.getContext("webgpu");
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device: this._device,
    format: canvasFormat,
  });
}

Object.defineProperties(Context.prototype, {
  device: {
    get: function () {
      return this._device;
    },
  },
  canvas: {
    get: function () {
      return this._canvas;
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
