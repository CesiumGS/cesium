import Model2Utility from "./Model2Utility.js";
//import ComponentDatatype from "../../Core/ComponentDatatype.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";

function InstancingPipelineStage() {}

// * add instancing function to vertex shader
// * set instance count
// * set instancing attributes
InstancingPipelineStage.process = function (node, renderResources, frameState) {
  // Create attributes for transforms
  var translationAttribute = Model2Utility.getAttributeBySemantic(
    node.instances,
    "TRANSLATION"
  );
  var translationVertexAttribute = {
    index: 1, // TODO: Update this later,
    vertexBuffer: translationAttribute.buffer,
    componentsPerAttribute: 3,
    componentDatatype: translationAttribute.componentDatatype,
    offsetInBytes: 0,
    strideInBytes: 0,
    instanceDivisor: 1,
  };

  renderResources.instanceCount = translationAttribute.count;
  renderResources.attributes.push(translationVertexAttribute);

  renderResources.shaderBuilder.addDefine(
    "USE_INSTANCING",
    undefined,
    ShaderDestination.VERTEX
  );
  renderResources.shaderBuilder.addAttribute("vec3", "a_instanceTranslation");
  renderResources.shaderBuilder.addVertexLines([
    "vec3 instancing(vec3 position)",
    "{",
    " return position + a_instanceTranslation;",
    "}",
  ]);
};

export default InstancingPipelineStage;
