import ShaderBuilder from "../Renderer/ShaderBuilder.js";
import RenderState from "../Renderer/RenderState.js";
import DepthFunction from "../Scene/DepthFunction.js";
import ModelAlphaOptions from "./Model/ModelAlphaOptions.js";
import ShaderDestination from "../Renderer/ShaderDestination.js";
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

function GaussianSplatRenderResources(primitive) {
  const shaderBuilder = new ShaderBuilder();
  this.shaderBuilder = shaderBuilder;

  // Custom shader uniforms
  const customShader = primitive._customShader;
  const uniformMap = defined(customShader)
    ? combine(primitive._uniformMap, customShader.uniformMap)
    : Object.assign({}, primitive._uniformMap);
  primitive._uniformMap = uniformMap;

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
    shaderBuilder.addFragmentLines([
      customFragmentShaderStructs,
      "#line 0",
      customShader.fragmentShaderText,
    ]);
  }

  this.uniformMap = uniformMap;

  // Render state
  this.renderStateOptions = RenderState.getState(
    RenderState.fromCache({
      depthTest: {
        enabled: true,
        func: DepthFunction.LESS_OR_EQUAL,
      },
      cull: {
        enabled: false,
      },
      depthMask: true,
      blending: {
        enabled: true,
        equationRgb: 0x8006,
        equationAlpha: 0x8006,
        functionSourceRgb: 0x0302,
        functionSourceAlpha: 0x0302,
        functionDestinationRgb: 0x0303,
        functionDestinationAlpha: 0x0303,
      },
    }),
  );
  this.alphaOptions = new ModelAlphaOptions();
  this.hasSkipLevelOfDetail = false;

  shaderBuilder.addDefine(
    "USE_FRUSTUM_CULLING",
    undefined,
    ShaderDestination.VERTEX,
  );

  if (primitive._useLogDepth) {
    shaderBuilder.addDefine(
      "LOG_DEPTH_READ_ONLY",
      undefined,
      ShaderDestination.FRAGMENT,
    );
  }
}

export default GaussianSplatRenderResources;
