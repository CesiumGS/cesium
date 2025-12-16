import { defined } from "@cesium/engine";
import Frozen from "../../Core/Frozen.js";
import Pass from "../Pass.js";

function WebGPUComputeCommand(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const webGPUContextPromise = options.webGPUContextPromise;

  /**
   * For now, a simple string literal containing the WGSL source code. Later, should be something akin to ShaderSource.
   *
   * @type {string}
   */
  this.shaderSource = options.shaderSource;

  /**
   * The pass when to render. Always compute pass.
   *
   * @type {Pass}
   * @default Pass.COMPUTE;
   */
  this.pass = Pass.COMPUTE;

  this.bindGroups = options.bindGroups ?? [];

  this.bindGroupsGPU = undefined;

  this.workgroups = options.workgroups ?? { x: 1, y: 1, z: 1 };

  this.entryPoint = options.entryPoint ?? "main";

  this.debugName = options.debugName;

  this.wgpuContext = undefined;

  this.inputBuffers = options.inputBuffers ?? [];

  this.outputBuffers = options.outputBuffers ?? [];

  webGPUContextPromise.then((webGPUContext) => {
    createWGPUResources.call(this, webGPUContext);
  });
}

function createWGPUResources(webGPUContext) {
  this.pipeline = webGPUContext.createComputePipeline({
    layout: webGPUContext.createPipelineLayout({
      bindGroupLayouts: this.bindGroups.map((bg) => bg.layout),
    }),
    compute: {
      module: webGPUContext.createShaderModule({
        code: this.shaderSource,
        label: this.debugName,
      }),
      entryPoint: this.entryPoint,
    },
  });

  this.wgpuContext = webGPUContext;
  this.bindGroupsGPU = this.bindGroups.map((bg) => bg.bindGroup);
}

/**
 * Executes the compute command.
 *
 * @param {WebGPUContext} wgpuContext The context that processes the compute command.
 */
WebGPUComputeCommand.prototype.execute = function (frameState) {
  if (!defined(this.wgpuContext)) {
    return;
  }
  this.wgpuContext.runCompute(
    this.pipeline,
    this.bindGroupsGPU,
    this.workgroups,
  );

  // FOR TESTING:
  // Read back output buffers to CPU
  if (frameState.frameNumber <= 2) {
    const outputBuffer = this.outputBuffers[0].buffer;
    this.wgpuContext
      .readBuffer(outputBuffer, outputBuffer.size)
      .then((data) => {
        const f32 = new Float32Array(
          data.buffer,
          data.byteOffset,
          data.byteLength / 4,
        );
        for (let i = 0; i < f32.length; i++) {
          console.log(f32[i]);
        }
      });
  }
};
export default WebGPUComputeCommand;
