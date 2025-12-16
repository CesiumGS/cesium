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

  this.workgroups = options.workgroups ?? { x: 1, y: 1, z: 1 };

  this.entryPoint = options.entryPoint ?? "main";

  this.debugName = options.debugName;

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
}

/**
 * Executes the compute command.
 *
 * @param {WebGPUContext} wgpuContext The context that processes the compute command.
 */
WebGPUComputeCommand.prototype.execute = function (wgpuContext) {
  if (!this.pipeline) {
    return;
  }
  wgpuContext.runCompute(this.pipeline, this.bindGroups, this.workgroups);
};
export default WebGPUComputeCommand;
