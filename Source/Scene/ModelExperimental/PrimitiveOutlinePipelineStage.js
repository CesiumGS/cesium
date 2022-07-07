import AttributeType from "../AttributeType.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import PrimitiveOutlineGenerator from "./PrimitiveOutlineGenerator.js";
import PrimitiveOutlineStageVS from "../../Shaders/ModelExperimental/PrimitiveOutlineStageVS.js";
import PrimitiveOutlineStageFS from "../../Shaders/ModelExperimental/PrimitiveOutlineStageFS.js";

/**
 * The primitive outline pipeline stage configures the shader to render outlines
 * from the CESIUM_primitive_outline extension.
 *
 * @namespace PrimitiveOutlinePipelineStage
 *
 * @private
 */
const PrimitiveOutlinePipelineStage = {};
PrimitiveOutlinePipelineStage.name = "PrimitiveOutlinePipelineStage";

/**
 * Process a primitive. This modifies the following parts of the render
 * resources:
 * <ul>
 *  <li>Declares a new attribute for the outline (texture) coordinates</li>
 *  <li>Adds shader code to overlay outlines on the primitive after lighting computations</li>
 *  <li>Add uniforms for showing the outline and changing its color</li>
 * </ul>
 * @param {PrimitiveRenderResources} renderResources The render resources for the primitive
 * @param {ModelComponents.Primitive} primitive The primitive to be rendered
 * @param {FrameState} frameState The frame state
 * @private
 */
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
  shaderBuilder.addVarying("vec3", "v_outlineCoordinates");

  const outlineCoordinates = primitive.outlineCoordinates;
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

  const model = renderResources.model;
  shaderBuilder.addUniform(
    "vec4",
    "model_outlineColor",
    ShaderDestination.FRAGMENT
  );
  uniformMap.model_outlineColor = function () {
    return model.outlineColor;
  };
  shaderBuilder.addUniform(
    "bool",
    "model_showOutline",
    ShaderDestination.FRAGMENT
  );
  uniformMap.model_showOutline = function () {
    return model.showOutline;
  };

  shaderBuilder.addVertexLines([PrimitiveOutlineStageVS]);
  shaderBuilder.addFragmentLines([PrimitiveOutlineStageFS]);
};

export default PrimitiveOutlinePipelineStage;
