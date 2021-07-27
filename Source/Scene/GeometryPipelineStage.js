import defined from "../Core/defined.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import AttributeType from "./AttributeType.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";

/**
 * @private
 */
export default function GeometryPipelineStage() {}

/**
 * This pipeline stage processes the vertex attributes of a mesh primitive, adding the attribute declarations to the shaders,
 * the attribute objects to the render resources and setting the flags as needed.
 *
 * @param {MeshPrimitiveRenderResources} renderResources The render resources for this mesh primitive.
 * @param {ModelComponents.Primitive} primitive The mesh primitive.
 *
 * @private
 */
GeometryPipelineStage.process = function (renderResources, primitive) {
  var attributeIndex = 0;
  for (var i = 0; i < primitive.attributes.length; i++) {
    var attribute = primitive.attributes[i];
    processAttribute(
      renderResources,
      attribute,
      attribute.semantic === VertexAttributeSemantic.POSITION
        ? 0
        : ++attributeIndex
    );
  }

  if (primitive.primitive === PrimitiveType.POINTS) {
    renderResources.shaderBuilder.addDefine("PRIMITIVE_TYPE_POINTS");
  }
};

function processAttribute(renderResources, attribute, attributeIndex) {
  var semantic = attribute.semantic;
  var setIndex = attribute.setIndex;
  var type = attribute.type;

  var variableName;
  switch (semantic) {
    case VertexAttributeSemantic.POSITION:
      variableName = VertexAttributeSemantic.getVariableName(
        semantic,
        setIndex
      );
      break;
    case VertexAttributeSemantic.NORMAL:
      variableName = VertexAttributeSemantic.getVariableName(
        semantic,
        setIndex
      );
      renderResources.shaderBuilder.addDefine("HAS_NORMALS");
      break;
    case VertexAttributeSemantic.TANGENT:
      variableName = VertexAttributeSemantic.getVariableName(
        semantic,
        setIndex
      );
      renderResources.shaderBuilder.addDefine("HAS_TANGENTS");
      break;
    case VertexAttributeSemantic.TEXCOORD:
      variableName = VertexAttributeSemantic.getVariableName(
        semantic,
        setIndex
      );
      renderResources.shaderBuilder.addDefine("HAS_TEXCOORD_" + setIndex);
      break;
    case VertexAttributeSemantic.COLOR:
      variableName = VertexAttributeSemantic.getVariableName(
        semantic,
        setIndex
      );
      renderResources.shaderBuilder.addDefine("HAS_VERTEX_COLORS");
      break;
    case VertexAttributeSemantic.FEATURE_ID:
      variableName = VertexAttributeSemantic.getVariableName(
        semantic,
        setIndex
      );
      renderResources.shaderBuilder.addDefine("HAS_FEATURE_ID");
      break;
  }

  var vertexAttribute = {
    index: attributeIndex,
    vertexBuffer: attribute.buffer,
    componentsPerAttribute: AttributeType.getComponentsPerAttribute(type),
    componentDataype: attribute.componentDatatype,
  };

  var glslType = attributeTypeToGlslType(type);

  // Handle user defined vertex attributes.
  // For example, "_TEMPERATURE" will be converted to "a_temperature".
  if (!defined(variableName)) {
    variableName = attribute.name;
    if (variableName[0] === "_") {
      variableName = variableName.substring(1);
      variableName = variableName.toLowerCase();
    }
  }

  variableName = "a_" + variableName;

  if (semantic === VertexAttributeSemantic.POSITION) {
    renderResources.shaderBuilder.setPositionAttribute(glslType, variableName);
  } else {
    renderResources.shaderBuilder.addAttribute(glslType, variableName);
  }

  renderResources.attributes.push(vertexAttribute);
}

function attributeTypeToGlslType(attributeType) {
  switch (attributeType) {
    case AttributeType.SCALAR:
      return "float";
    case AttributeType.VEC2:
      return "vec2";
    case AttributeType.VEC3:
      return "vec3";
    case AttributeType.VEC4:
      return "vec4";
    case AttributeType.MAT2:
      return "mat2";
    case AttributeType.MAT3:
      return "mat3";
    case AttributeType.MAT4:
      return "mat4";
  }
}
