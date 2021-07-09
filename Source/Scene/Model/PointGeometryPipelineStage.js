import ShaderDestination from "../../Renderer/ShaderDestination.js";
import Model2Utility from "./Model2Utility.js";

export default function PointGeometryPipelineStage() {}

PointGeometryPipelineStage.process = function (
  primitive,
  renderResources,
  frameState
) {
  var positionAttribute = Model2Utility.getAttributeBySemantic(
    primitive,
    "POSITION"
  );
  var positionVertexAttribute = {
    index: 0,
    vertexBuffer: positionAttribute.buffer,
    componentsPerAttribute: 3,
    componentDatatype: positionAttribute.componentDatatype,
  };
  renderResources.shaderBuilder.setPositionAttribute("vec3", "a_position");
  renderResources.attributes.push(positionVertexAttribute);

  renderResources.indexCount = positionAttribute.count;

  // TODO: u_pointSize uniform
  // TODO: How to pass in point size from style or point cloud attenuation?
  //       tile.tileset.style?

  // Add gl_PointSize to shader.
  renderResources.shaderBuilder.addDefine(
    "USE_POINTS",
    undefined,
    ShaderDestination.VERTEX
  );
};
