import Cartesian2 from "../../Core/Cartesian2.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import VerticalExaggerationStageVS from "../../Shaders/Model/VerticalExaggerationStageVS.js";

/**
 * The vertical exaggeration pipeline stage transforms the vertex
 * positions based on the values of {@link Scene#verticalExaggeration} and
 * {@link Scene#verticalExaggerationRelativeHeight}
 *
 * @namespace VerticalExaggerationPipelineStage
 *
 * @private
 */
const VerticalExaggerationPipelineStage = {
  name: "VerticalExaggerationPipelineStage", // Helps with debugging
};

const scratchExaggerationUniform = new Cartesian2();

/**
 * Add defines and uniforms for vertical exaggeration calculations in the vertex shader
 *
 * @param {PrimitiveRenderResources} renderResources The render resources for the primitive
 * @param {ModelComponents.Primitive} primitive The primitive to be rendered
 * @param {FrameState} frameState The frame state.
 * @private
 */
VerticalExaggerationPipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  const { shaderBuilder, uniformMap } = renderResources;

  shaderBuilder.addVertexLines(VerticalExaggerationStageVS);

  shaderBuilder.addDefine(
    "HAS_VERTICAL_EXAGGERATION",
    undefined,
    ShaderDestination.VERTEX
  );

  shaderBuilder.addUniform(
    "vec2",
    "u_verticalExaggerationAndRelativeHeight",
    ShaderDestination.VERTEX
  );

  uniformMap.u_verticalExaggerationAndRelativeHeight = function () {
    return Cartesian2.fromElements(
      frameState.verticalExaggeration,
      frameState.verticalExaggerationRelativeHeight,
      scratchExaggerationUniform
    );
  };
};

export default VerticalExaggerationPipelineStage;
