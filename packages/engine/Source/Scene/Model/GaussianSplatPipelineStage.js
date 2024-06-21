import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import GaussianSplatVS from "../../Shaders/Model/GaussianSplatVS.js";
import GaussianSplatFS from "../../Shaders/Model/GaussianSplatFS.js";

const GaussianSplatPipelineStage = {
  name: "GaussianSplatPipelineStage",
};

GaussianSplatPipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  const { shaderBuilder } = renderResources;

  const vertexBuffer = Buffer.createVertexBuffer({
    context: frameState.context,
    typedArray: new Float32Array([-2.0, -2.0, 2.0, -2.0, 2.0, 2.0, -2.0, 2.0]),
    usage: BufferUsage.STATIC_DRAW,
  });

  vertexBuffer.vertexArrayDestroyable = false;

  shaderBuilder.addDefine(
    "HAS_POINT_CLOUD_SPLAT",
    undefined,
    ShaderDestination.BOTH
  );

  const aPositionLoc = shaderBuilder.addAttribute("vec2", "a_splatPosition");
  shaderBuilder.addVarying("vec2", "v_splatPosition");

  const attr = {
    index: aPositionLoc,
    vertexBuffer: vertexBuffer,
    componentDatatype: ComponentDatatype.FLOAT,
    componentsPerAttribute: 2,
  };

  renderResources.attributes.push(attr);

  shaderBuilder.addVertexLines(GaussianSplatVS);
  shaderBuilder.addFragmentLines(GaussianSplatFS);
};

export default GaussianSplatPipelineStage;
