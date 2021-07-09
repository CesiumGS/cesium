import Model2Utility from "./Model2Utility.js";

function MeshGeometryPipelineStage() {}

MeshGeometryPipelineStage.process = function (
  primitive,
  renderResources,
  frameState
) {
  // position
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

  // indices
  renderResources.indexCount = primitive.indices.count;
  renderResources.attributes.push(positionVertexAttribute);
};

export default MeshGeometryPipelineStage;
