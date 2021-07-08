import Model2Utility from "./Model2Utility.js";

function MeshGeometryPipelineStage() {}

MeshGeometryPipelineStage.process = function (
  primitive,
  renderResources,
  frameState
) {
  // position, indices
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

  renderResources.attributes.push(positionVertexAttribute);
};

export default MeshGeometryPipelineStage;
