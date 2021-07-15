import Model2Utility from "./Model2Utility.js";
import AttributeType from "../../Scene/AttributeType.js";
import defined from "../../Core/defined.js";

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

  var attributeIndex = 1;

  // Feature ID
  var featureIDAttribute = Model2Utility.getAttributeBySemantic(
    primitive,
    "FEATURE_ID"
  );

  if (defined(featureIDAttribute)) {
    var featureIdVertexAttribute = {
      index: attributeIndex++,
      vertexBuffer: featureIDAttribute.buffer,
      componentsPerAttribute: 1, // TODO: Don't hardcode if possible
      componentDatatype: featureIDAttribute.componentDatatype,
    };
    renderResources.shaderBuilder.addAttribute(
      AttributeType.getGlslType(featureIDAttribute.type),
      "a_featureId"
    );
    renderResources.attributes.push(featureIdVertexAttribute);
  }

  // Texture
  var texCoordAttribute = Model2Utility.getAttributeBySemantic(
    primitive,
    "TEXCOORD"
  );

  if (defined(texCoordAttribute)) {
    var texCoordVertexAttribute = {
      index: attributeIndex++,
      vertexBuffer: texCoordAttribute.buffer,
      componentsPerAttribute: 2, // TODO: Don't hardcode
      componentDatatype: texCoordAttribute.componentDatatype,
    };

    renderResources.shaderBuilder.addAttribute(
      AttributeType.getGlslType(texCoordAttribute.type),
      "a_texCoord0"
    );

    renderResources.attributes.push(texCoordVertexAttribute);
  }

  // indices
  renderResources.indexCount = primitive.indices.count;
  renderResources.attributes.push(positionVertexAttribute);
};

export default MeshGeometryPipelineStage;
