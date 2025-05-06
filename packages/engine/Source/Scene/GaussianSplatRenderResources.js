import ShaderBuilder from "../Renderer/ShaderBuilder";
import ShaderDestination from "../Renderer/ShaderDestination.js";
import combine from "../Core/combine.js";
import RenderState from "../Renderer/RenderState.js";

function GaussianSplatRenderResources(primitive) {
  const shaderBuilder = new ShaderBuilder();

  this.shaderBuilder = shaderBuilder;

  const customShader = primitive._customShader;
  const uniformMap = combine(primitive._uniformMap, customShader.uniformMap);
  primitive._uniformMap = uniformMap;

  const customShaderUniforms = customShader.uniforms;
  for (const uniformName in customShaderUniforms) {
    if (customShaderUniforms.hasOwnProperty(uniformName)) {
      const uniform = customShaderUniforms[uniformName];
      shaderBuilder.addUniform(
        uniform.type,
        uniformName,
        ShaderDestination.FRAGMENT,
      );
    }
  }

  this.renderStateOptions = RenderState.getState(
    RenderState.fromCache({
      depthTest: {
        enabled: true,
        func: RenderState.DepthFunction.LESS_OR_EQUAL,
      },
    }),
  );
}

export default GaussianSplatRenderResources;
