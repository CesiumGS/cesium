import Model2Utility from "./Model2Utility.js";
import AttributeType from "../../Scene/AttributeType.js";

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
    componentsPerAttribute: 3, // TODO: Don't hardcode if possible
    componentDatatype: positionAttribute.componentDatatype,
  };
  renderResources.shaderBuilder.setPositionAttribute("vec3", "a_position");

  // Feature ID
  var featureIDAttribute = Model2Utility.getAttributeBySemantic(
    primitive,
    "FEATURE_ID"
  );
  var featureIdVertexAttribute = {
    index: 1,
    vertexBuffer: featureIDAttribute.buffer,
    componentsPerAttribute: 1, // TODO: Don't hardcode if possible
    componentDatatype: featureIDAttribute.componentDatatype,
  };
  renderResources.shaderBuilder.addAttribute(
    AttributeType.getGlslType(featureIDAttribute.type),
    "a_featureId"
  );

  // indices
  renderResources.indexCount = primitive.indices.count;
  renderResources.attributes.push(positionVertexAttribute);
  renderResources.attributes.push(featureIdVertexAttribute);
};

export default MeshGeometryPipelineStage;
