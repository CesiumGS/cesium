import AttributeType from "../AttributeType.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import PrimitiveOutlineGenerator from "./PrimitiveOutlineGenerator.js";
import PrimitiveOutlineStageVS from "../../Shaders/ModelExperimental/PrimitiveOutlineStageVS.js";
import PrimitiveOutlineStageFS from "../../Shaders/ModelExperimental/PrimitiveOutlineStageFS.js";

const PrimitiveOutlinePipelineStage = {};
PrimitiveOutlinePipelineStage.name = "PrimitiveOutlinePipelineStage";

PrimitiveOutlinePipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  const shaderBuilder = renderResources.shaderBuilder;
  const uniformMap = renderResources.uniformMap;

  shaderBuilder.addDefine(
    "HAS_PRIMITIVE_OUTLINE",
    undefined,
    ShaderDestination.BOTH
  );

  shaderBuilder.addAttribute("vec3", "a_outlineCoordinates");
  const outlineCoordinates = primitive.outlineCoordinates;

  shaderBuilder.addVarying("vec3", "v_outlineCoordinates");

  const vertexAttribute = {
    index: renderResources.attributeIndex++,
    vertexBuffer: outlineCoordinates.buffer,
    componentsPerAttribute: AttributeType.getNumberOfComponents(
      outlineCoordinates.type
    ),
    componentDatatype: outlineCoordinates.componentDatatype,
    offsetInBytes: outlineCoordinates.byteOffset,
    strideInBytes: outlineCoordinates.byteStride,
    normalize: outlineCoordinates.normalized,
  };
  renderResources.attributes.push(vertexAttribute);

  shaderBuilder.addUniform(
    "sampler2D",
    "model_outlineTexture",
    ShaderDestination.FRAGMENT
  );

  // This automatically handles caching the texture on the context
  const outlineTexture = PrimitiveOutlineGenerator.createTexture(
    frameState.context
  );
  uniformMap.model_outlineTexture = function () {
    return outlineTexture;
  };

  shaderBuilder.addVertexLines([PrimitiveOutlineStageVS]);
  shaderBuilder.addFragmentLines([PrimitiveOutlineStageFS]);
};

export default PrimitiveOutlinePipelineStage;
