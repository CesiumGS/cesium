import defined from "../../Core/defined.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import AttributeType from "../AttributeType.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import GeometryStageVS from "../../Shaders/ModelExperimental/GeometryStageVS.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";

/**
 * The geometry pipeline stage processes the vertex attributes of a primitive.
 *
 * @namespace
 *
 * @private
 */
var GeometryPipelineStage = {};

/**
 * This pipeline stage processes the vertex attributes of a mesh primitive, adding the attribute declarations to the shaders,
 * the attribute objects to the render resources and setting the flags as needed.
 *
 * Processes a mesh primitive. This stage modifies the following parts of the render resources:
 * <ul>
 *  <li> adds attribute and varying declarations for the vertex attributes in the vertex and fragment shaders
 *  <li> creates the objects required to create VertexArrays
 *  <li> sets the flag for point primitive types
 * </ul>
 *
 * @param {MeshPrimitiveRenderResources} renderResources The render resources for this mesh primitive.
 * @param {ModelComponents.Primitive} primitive The mesh primitive.
 *
 * @private
 */
GeometryPipelineStage.process = function (renderResources, primitive) {
  var attributeIndex = 0;
  var index;
  var customAttributeInitializationLines = [];
  for (var i = 0; i < primitive.attributes.length; i++) {
    var attribute = primitive.attributes[i];
    if (attribute.semantic !== VertexAttributeSemantic.POSITION) {
      attributeIndex = attributeIndex + 1;
      index = attributeIndex;
    } else {
      index = 0;
    }
    processAttribute(
      renderResources,
      attribute,
      index,
      customAttributeInitializationLines
    );
  }

  var shaderBuilder = renderResources.shaderBuilder;

  // add a function to initialize varyings for custom attributes.
  // for example "v_custom_attribute = a_custom_attribute;""
  if (customAttributeInitializationLines.length > 0) {
    shaderBuilder.addDefine(
      "HAS_CUSTOM_ATTRIBUTES",
      undefined,
      ShaderDestination.VERTEX
    );
    var varyingFunctionLines = [].concat(
      "void initializeCustomAttributes()",
      "{",
      customAttributeInitializationLines,
      "}"
    );
    shaderBuilder.addVertexLines(varyingFunctionLines);
  }

  if (primitive.primitiveType === PrimitiveType.POINTS) {
    shaderBuilder.addDefine("PRIMITIVE_TYPE_POINTS");
  }

  shaderBuilder.addVertexLines([GeometryStageVS]);
  shaderBuilder.addVarying("vec3", "v_positionEC");
};

function processAttribute(
  renderResources,
  attribute,
  attributeIndex,
  customAttributeInitializationLines
) {
  var semantic = attribute.semantic;
  var setIndex = attribute.setIndex;
  var attributeType = attribute.type;

  var shaderBuilder = renderResources.shaderBuilder;

  var variableName;
  var varyingName;
  var glslType = AttributeType.getGlslType(attributeType);

  if (defined(semantic)) {
    variableName = VertexAttributeSemantic.getVariableName(semantic, setIndex);
    varyingName = "v_" + variableName;

    switch (semantic) {
      case VertexAttributeSemantic.NORMAL:
        shaderBuilder.addDefine("HAS_NORMALS");
        break;
      case VertexAttributeSemantic.TANGENT:
        shaderBuilder.addDefine("HAS_TANGENTS");
        break;
      case VertexAttributeSemantic.TEXCOORD:
        shaderBuilder.addDefine("HAS_TEXCOORD_" + setIndex);
        break;
      case VertexAttributeSemantic.COLOR:
        shaderBuilder.addDefine("HAS_VERTEX_COLORS");
        break;
      case VertexAttributeSemantic.FEATURE_ID:
        shaderBuilder.addDefine("HAS_FEATURE_ID");
        break;
    }
  }

  var vertexAttribute = {
    index: attributeIndex,
    vertexBuffer: attribute.buffer,
    componentsPerAttribute: AttributeType.getComponentsPerAttribute(
      attributeType
    ),
    componentDatatype: attribute.componentDatatype,
  };

  // Handle custom vertex attributes.
  // For example, "_TEMPERATURE" will be converted to "a_temperature".
  if (!defined(variableName)) {
    variableName = attribute.name;
    if (variableName[0] === "_") {
      variableName = variableName.substring(1);
      variableName = variableName.toLowerCase();
    }

    varyingName = "v_" + variableName;

    var initializationLine =
      "    " + varyingName + " = a_" + variableName + ";";
    customAttributeInitializationLines.push(initializationLine);
  }

  variableName = "a_" + variableName;
  shaderBuilder.addVarying(glslType, varyingName);

  if (semantic === VertexAttributeSemantic.POSITION) {
    shaderBuilder.setPositionAttribute(glslType, variableName);
  } else {
    shaderBuilder.addAttribute(glslType, variableName);
  }

  renderResources.attributes.push(vertexAttribute);
}

export default GeometryPipelineStage;
