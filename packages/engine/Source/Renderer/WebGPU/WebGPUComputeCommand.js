import { defined } from "@cesium/engine";
import Frozen from "../../Core/Frozen.js";
import Pass from "../Pass.js";
import RuntimeError from "../../Core/RuntimeError.js";

/**
 * Represents a command to the renderer for GPU Compute (using old-school GPGPU).
 *
 * @private
 * @constructor
 */
function WebGPUCommand(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const webGPUContext = options.webGPUContext;
  if (!defined(webGPUContext)) {
    throw new RuntimeError(
      "WebGPUContext is required to create a WebGPUCommand.",
    );
  }

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

  this._pipeline = options.webGPUContext.createComputePipeline({
    layout: webGPUContext.createPipelineLayout(
      this.bindGroups.map((bg) => bg.layout),
    ),
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
WebGPUCommand.prototype.execute = function (wgpuContext) {
  wgpuContext.runCompute(this._pipeline, this._bindGroups, this._workgroups);
};
export default WebGPUCommand;
