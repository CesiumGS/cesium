import defined from "../../Core/defined.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import AttributeType from "../AttributeType.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import GeometryStageVS from "../../Shaders/ModelExperimental/GeometryStageVS.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";

/**
 * The geometry pipeline stage processes the vertex attributes of a primitive.
 *
 * @namespace GeometryPipelineStage
 *
 * @private
 */
var GeometryPipelineStage = {};

/**
 * This pipeline stage processes the vertex attributes of a primitive, adding the attribute declarations to the shaders,
 * the attribute objects to the render resources and setting the flags as needed.
 *
 * Processes a primitive. This stage modifies the following parts of the render resources:
 * <ul>
 *  <li> adds attribute and varying declarations for the vertex attributes in the vertex and fragment shaders
 *  <li> creates the objects required to create VertexArrays
 *  <li> sets the flag for point primitive types
 * </ul>
 *
 * @param {PrimitiveRenderResources} renderResources The render resources for this primitive.
 * @param {ModelComponents.Primitive} primitive The primitive.
 *
 * @private
 */
GeometryPipelineStage.process = function (renderResources, primitive) {
  // The attribute index is taken from the node render resources, which may have added some attributes of its own.
  var index;
  var setIndexedAttributeInitializationLines = [];
  var customAttributeInitializationLines = [];
  for (var i = 0; i < primitive.attributes.length; i++) {
    var attribute = primitive.attributes[i];
    if (attribute.semantic !== VertexAttributeSemantic.POSITION) {
      index = renderResources.attributeIndex++;
    } else {
      index = 0;
    }
    processAttribute(
      renderResources,
      attribute,
      index,
      setIndexedAttributeInitializationLines,
      customAttributeInitializationLines
    );
  }

  var shaderBuilder = renderResources.shaderBuilder;

  var varyingFunctionLines;

  // Adds a function to initialize varyings for vertex attribute
  // semantics that have a setIndex. For example:
  // void initializeSetIndexedAttributes()
  // {
  //    #ifdef HAS_TEXCOORD_0
  //    v_texCoord_0 = a_texCoord_0;
  //    #endif
  // }
  if (setIndexedAttributeInitializationLines.length > 0) {
    shaderBuilder.addDefine(
      "HAS_SET_INDEXED_ATTRIBUTES",
      undefined,
      ShaderDestination.VERTEX
    );
    varyingFunctionLines = [].concat(
      "void initializeSetIndexedAttributes()",
      "{",
      setIndexedAttributeInitializationLines,
      "}"
    );
    shaderBuilder.addVertexLines(varyingFunctionLines);
  }

  // Adds a function to initialize varyings for custom vertex attributes.
  // For example:
  // void initializeCustomAttributes()
  // {
  //    v_customAttribute = a_customAttribute;
  // }
  if (customAttributeInitializationLines.length > 0) {
    shaderBuilder.addDefine("HAS_CUSTOM_ATTRIBUTES");
    varyingFunctionLines = [].concat(
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
  setIndexedAttributeInitializationLines,
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
      case VertexAttributeSemantic.FEATURE_ID:
      case VertexAttributeSemantic.TEXCOORD:
      case VertexAttributeSemantic.COLOR:
        shaderBuilder.addDefine("HAS_" + semantic + "_" + setIndex);
        setIndexedAttributeInitializationLines.push(
          "    #ifdef HAS_" + semantic + "_" + setIndex
        );
        setIndexedAttributeInitializationLines.push(
          "    " + varyingName + " = a_" + variableName + ";"
        );
        setIndexedAttributeInitializationLines.push("    #endif");
    }
  }

  var vertexAttribute = {
    index: attributeIndex,
    value: defined(attribute.buffer) ? undefined : attribute.constant,
    vertexBuffer: attribute.buffer,
    componentsPerAttribute: AttributeType.getNumberOfComponents(attributeType),
    componentDatatype: attribute.componentDatatype,
    offsetInBytes: attribute.byteOffset,
    strideInBytes: attribute.byteStride,
    normalize: attribute.normalized,
  };

  // Handle custom vertex attributes.
  // For example, "_TEMPERATURE" will be converted to "a_temperature".
  if (!defined(variableName)) {
    variableName = attribute.name;

    // Per the glTF 2.0 spec, custom vertex attributes must be prepended with an underscore.
    variableName = variableName.substring(1);
    variableName = variableName.toLowerCase();
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
