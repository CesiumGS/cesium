import ShaderBuilder from "../Renderer/ShaderBuilder.js";
import RenderState from "../Renderer/RenderState.js";
import DepthFunction from "../Scene/DepthFunction.js";
import ModelAlphaOptions from "./Model/ModelAlphaOptions.js";
import ShaderDestination from "../Renderer/ShaderDestination.js";
import Pass from "../Renderer/Pass.js";
import BlendingState from "./BlendingState.js";
import combine from "../Core/combine.js";
import defined from "../Core/defined.js";

const customFragmentShaderStructs = `
struct Attributes {
  vec3 positionWC;
  vec3 positionEC;
  vec3 normalEC;
  vec4 color_0;
  int featureId_0;
};

struct FragmentInput {
  Attributes attributes;
};`;

/**
 * Build the FragmentInput / Attributes struct string dynamically so that it
 * contains one `int featureId_N` field per feature ID set.
 *
 * @param {number} featureIdCount Number of feature ID sets (0 = use static default).
 * @returns {string} GLSL struct definitions.
 * @private
 */
function buildCustomFragmentShaderStructs(featureIdCount) {
  if (featureIdCount <= 1) {
    return customFragmentShaderStructs;
  }

  let featureIdFields = "";
  for (let i = 0; i < featureIdCount; i++) {
    featureIdFields += `  int featureId_${i};\n`;
  }

  return `
struct Attributes {
  vec3 positionWC;
  vec3 positionEC;
  vec3 normalEC;
  vec4 color_0;
${featureIdFields}};

struct FragmentInput {
  Attributes attributes;
};`;
}

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

  // Custom shader uniforms
  const customShader = primitive._customShader;
  /**
   * A dictionary mapping uniform name to functions that return the uniform
   * values.
   *
   * @type {Object<string, Function>}
   * @readonly
   *
   * @private
   */
  const uniformMap = defined(customShader)
    ? combine(primitive._uniformMap, customShader.uniformMap)
    : Object.assign({}, primitive._uniformMap);

  const customShaderUniforms = defined(customShader)
    ? customShader.uniforms
    : {};
  for (const uniformName in customShaderUniforms) {
    if (customShaderUniforms.hasOwnProperty(uniformName)) {
      const uniform = customShaderUniforms[uniformName];
      shaderBuilder.addUniform(
        uniform.type,
        uniformName,
        ShaderDestination.BOTH,
      );
    }
  }

  if (defined(customShader) && defined(customShader.fragmentShaderText)) {
    shaderBuilder.addDefine(
      "HAS_CUSTOM_FRAGMENT_SHADER",
      undefined,
      ShaderDestination.FRAGMENT,
    );

    const featureIdCount = primitive._featureIdCount ?? 0;
    const structs = buildCustomFragmentShaderStructs(featureIdCount);

    shaderBuilder.addFragmentLines([
      structs,
      "#line 0",
      customShader.fragmentShaderText,
    ]);
  }

  this.uniformMap = uniformMap;

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
      cull: {
        enabled: false,
      },
      depthMask: false,
      blending: BlendingState.PRE_MULTIPLIED_ALPHA_BLEND,
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
  this.alphaOptions.pass = Pass.GAUSSIAN_SPLATS;

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
