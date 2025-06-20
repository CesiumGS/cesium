import ShaderBuilder from "../Renderer/ShaderBuilder.js";
import RenderState from "../Renderer/RenderState.js";
import DepthFunction from "../Scene/DepthFunction.js";
import ModelAlphaOptions from "./Model/ModelAlphaOptions.js";
import ShaderDestination from "../Renderer/ShaderDestination.js";

function GaussianSplatRenderResources(primitive) {
  const shaderBuilder = new ShaderBuilder();
  /**
   * An object used to build a shader incrementally. Each pipeline stage
   * may add lines of shader code to this object.
   *
   * @type {ShaderBuilder}
   * @readonly
   *
   * @private
   */
  this.shaderBuilder = shaderBuilder;

  /**
   * A dictionary mapping uniform name to functions that return the uniform
   * values.
   *
   * @type {Object<string, Function>}
   * @readonly
   *
   * @private
   */
  this.uniformMap = {};

  /**
   * An object storing options for creating a {@link RenderState}.
   * The pipeline stages simply set the options, the render state is created
   * when the {@link DrawCommand} is constructed.
   *
   * @type {object}
   * @readonly
   *
   * @private
   */
  this.renderStateOptions = RenderState.getState(
    RenderState.fromCache({
      depthTest: {
        enabled: true,
        func: DepthFunction.LESS_OR_EQUAL,
      },
    }),
  );

  /**
   * Options for configuring the alpha stage such as pass and alpha cutoff.
   *
   * @type {ModelAlphaOptions}
   * @readonly
   *
   * @private
   */
  this.alphaOptions = new ModelAlphaOptions();

  /**
   * Whether the model is part of a tileset that uses the skipLevelOfDetail
   * optimization. This value indicates what draw commands are needed and
   * is set by TilesetPipelineStage.
   *
   * @type {boolean}
   * @default false
   *
   * @private
   */
  this.hasSkipLevelOfDetail = false;

  if (primitive._useLogDepth) {
    shaderBuilder.addDefine(
      "LOG_DEPTH_READ_ONLY",
      undefined,
      ShaderDestination.FRAGMENT,
    );
  }
}

export default GaussianSplatRenderResources;
