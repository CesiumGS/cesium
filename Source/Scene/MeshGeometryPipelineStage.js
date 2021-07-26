import AttributeType from "./AttributeType";
import ModelExperimentalUtility from "./ModelExperimentalUtility";

export default function MeshGeometryPipelineStage() {}

MeshGeometryPipelineStage.prototype.process = function (
  primitive,
  renderResources
) {
  var positionAttribute = ModelExperimentalUtility.getAttributeBySemantic(
    primitive,
    "POSITION"
  );
  var positionVertexAttribute = {
    index: 0,
    vertexBuffer: positionAttribute.buffer,
    componentsPerAttribute: AttributeType.getComponentsPerAttribute(
      positionAttribute.type
    ),
    componentDataype: positionAttribute.componentDataype,
  };

  renderResources.shaderBuilder.setPositionAttribute("vec3", "a_position");
  renderResources.indexCount = primitive.indices.count;
  renderResources.attributes.push(positionVertexAttribute);
};
