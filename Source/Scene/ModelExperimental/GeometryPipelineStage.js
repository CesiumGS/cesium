import defined from "../../Core/defined.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import AttributeType from "../AttributeType.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import GeometryStageVS from "../../Shaders/ModelExperimental/GeometryStageVS.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";

/**
 * The geometry pipeline stage processes the vertex attributes of a primitive.
 *
 * @namespace GeometryPipelineStage
 *
 * @private
 */
var GeometryPipelineStage = {};
GeometryPipelineStage.name = "GeometryPipelineStage"; // Helps with debugging

var attributesStructId = "Attributes";
var initializeAttributesFunctionId = "initializeAttributes";
var setDynamicVaryingsFunctionId = "setDynamicVaryings";

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
  // start the dynamic portions of the shader
  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addStruct(
    attributesStructId,
    "Attributes",
    ShaderDestination.BOTH
  );
  shaderBuilder.addFunction(
    initializeAttributesFunctionId,
    "void initializeAttributes(out Attributes attributes)",
    ShaderDestination.VERTEX
  );
  shaderBuilder.addFunction(
    setDynamicVaryingsFunctionId,
    "void setDynamicVaryings(inout Attributes attributes)",
    ShaderDestination.VERTEX
  );

  var index;
  for (var i = 0; i < primitive.attributes.length; i++) {
    var attribute = primitive.attributes[i];
    if (attribute.semantic === VertexAttributeSemantic.POSITION) {
      index = 0;
    } else {
      // The attribute index is taken from the node render resources, which may have added some attributes of its own.
      index = renderResources.attributeIndex++;
    }
    processAttribute(renderResources, attribute, index);
  }

  if (primitive.primitiveType === PrimitiveType.POINTS) {
    shaderBuilder.addDefine("PRIMITIVE_TYPE_POINTS");
  }

  shaderBuilder.addVertexLines([GeometryStageVS]);
  shaderBuilder.addVarying("vec3", "v_positionWC");
  shaderBuilder.addVarying("vec3", "v_positionEC");
};

function processAttribute(renderResources, attribute, attributeIndex) {
  var shaderBuilder = renderResources.shaderBuilder;
  var attributeInfo = ModelExperimentalUtility.getAttributeInfo(attribute);

  addAttributeToAttributesArray(
    renderResources.attributes,
    attribute,
    attributeIndex
  );
  addAttributeDeclaration(shaderBuilder, attributeInfo);
  addVaryingDeclaration(shaderBuilder, attributeInfo);

  // For common attributes like positions, normals and tangents, the code is
  // already in GeometryStageVS, we just need to enable it
  if (defined(attribute.semantic)) {
    addSemanticDefine(shaderBuilder, attribute);
  }

  // Some GLSL code must be dynamically generated
  updateAttributesStruct(shaderBuilder, attributeInfo);
  updateInitialzeAttributesFunction(shaderBuilder, attributeInfo);
  updateSetDynamicVaryingsFunction(shaderBuilder, attributeInfo);
}

function addSemanticDefine(shaderBuilder, attribute) {
  var semantic = attribute.semantic;
  var setIndex = attribute.setIndex;
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
  }
}

function addAttributeToAttributesArray(
  attributesArray,
  attribute,
  attributeIndex
) {
  var vertexAttribute = {
    index: attributeIndex,
    value: defined(attribute.buffer) ? undefined : attribute.constant,
    vertexBuffer: attribute.buffer,
    componentsPerAttribute: AttributeType.getNumberOfComponents(attribute.type),
    componentDatatype: attribute.componentDatatype,
    offsetInBytes: attribute.byteOffset,
    strideInBytes: attribute.byteStride,
    normalize: attribute.normalized,
  };

  attributesArray.push(vertexAttribute);
}

function addVaryingDeclaration(shaderBuilder, attributeInfo) {
  var variableName = attributeInfo.variableName;
  var varyingName = "v_" + variableName;
  shaderBuilder.addVarying(attributeInfo.glslType, varyingName);
}

function addAttributeDeclaration(shaderBuilder, attributeInfo) {
  var semantic = attributeInfo.attribute.semantic;
  var variableName = attributeInfo.variableName;

  var attributeName;
  var glslType;
  if (attributeInfo.isQuantized) {
    attributeName = "a_encoded_" + variableName;
    glslType = attributeInfo.quantizedGlslType;
  } else {
    attributeName = "a_" + variableName;
    glslType = attributeInfo.glslType;
  }

  if (semantic === VertexAttributeSemantic.POSITION) {
    shaderBuilder.setPositionAttribute(glslType, attributeName);
  } else {
    shaderBuilder.addAttribute(glslType, attributeName);
  }
}

function updateAttributesStruct(shaderBuilder, attributeInfo) {
  var structId = attributesStructId;
  var variableName = attributeInfo.variableName;
  if (variableName === "color") {
    // Always declare color as a vec4, even if it was a vec3
    shaderBuilder.addStructField(structId, "vec4", "color");
  } else if (variableName === "tangent") {
    // declare tangent as a vec3, and also declare a bitangent which will
    // be computed in the shader.
    shaderBuilder.addStructField(structId, "vec3", "tangent");
    shaderBuilder.addStructField(structId, "vec3", "bitangent");
  } else {
    shaderBuilder.addStructField(
      structId,
      attributeInfo.glslType,
      variableName
    );
  }
}

function updateInitialzeAttributesFunction(shaderBuilder, attributeInfo) {
  if (attributeInfo.isQuantized) {
    // Skip initialization, it will be handled in the dequantization stage.
    return;
  }

  var functionId = initializeAttributesFunctionId;
  var variableName = attributeInfo.variableName;
  if (variableName === "tangent") {
    shaderBuilder.addFunctionLine(
      functionId,
      "attributes.tangent = a_tangent.xyz;"
    );
    // compute the bitangent according to the formula in the glTF spec
    shaderBuilder.addFunctionLine(functionId, "#ifdef HAS_NORMALS");
    shaderBuilder.addFunctionLine(
      functionId,
      "attributes.bitangent = normalize(cross(a_normal, a_tangent.xyz) * a_tangent.w);"
    );
    shaderBuilder.addFunctionLine(functionId, "#endif");
  } else {
    var line = "attributes." + variableName + " = a_" + variableName + ";";
    shaderBuilder.addFunctionLine(functionId, line);
  }
}

function updateSetDynamicVaryingsFunction(shaderBuilder, attributeInfo) {
  var semantic = attributeInfo.attribute.semantic;
  var setIndex = attributeInfo.attribute.setIndex;
  if (defined(semantic) && !defined(setIndex)) {
    // positions, normals, and tangents are handled statically in
    // GeometryStageVS
    return;
  }

  var functionId = setDynamicVaryingsFunctionId;
  var variableName = attributeInfo.variableName;
  var line = "v_" + variableName + " = attributes." + variableName + ";";
  shaderBuilder.addFunctionLine(functionId, line);
}

export default GeometryPipelineStage;
