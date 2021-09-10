import defined from "../../Core/defined.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import AttributeType from "../AttributeType.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import GeometryStageFS from "../../Shaders/ModelExperimental/GeometryStageFS.js";
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

var attributesStructVSId = "ProcessedAttributesVS";
var attributesStructFSId = "ProcessedAttributesFS";
var initializeAttributesFunctionId = "initializeAttributes";
var setDynamicVaryingsVSFunctionId = "setDynamicVaryingsVS";
var setDynamicVaryingsFSFunctionId = "setDynamicVaryingsFS";

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
  var shaderBuilder = renderResources.shaderBuilder;
  // These structs are similar, though the fragment shader version has a couple
  // additional fields.
  shaderBuilder.addStruct(
    attributesStructVSId,
    "ProcessedAttributes",
    ShaderDestination.VERTEX
  );
  shaderBuilder.addStruct(
    attributesStructFSId,
    "ProcessedAttributes",
    ShaderDestination.FRAGMENT
  );

  // This initialization function is only needed in the vertex shader,
  // it assigns the non-quantized attribute struct fields from the
  // physical attributes
  shaderBuilder.addFunction(
    initializeAttributesFunctionId,
    "void initializeAttributes(out ProcessedAttributes attributes)",
    ShaderDestination.VERTEX
  );

  // Positions in other coordinate systems need more variables
  shaderBuilder.addVarying("vec3", "v_positionWC");
  shaderBuilder.addVarying("vec3", "v_positionEC");
  shaderBuilder.addStructField(attributesStructFSId, "vec3", "positionWC");
  shaderBuilder.addStructField(attributesStructFSId, "vec3", "positionEC");

  // Though they have identical signatures, the implementation is different
  // between vertex and fragment shaders. The VS stores attributes in
  // varyings, while the FS unpacks the varyings for use by other stages.
  shaderBuilder.addFunction(
    setDynamicVaryingsVSFunctionId,
    "void setDynamicVaryings(inout ProcessedAttributes attributes)",
    ShaderDestination.VERTEX
  );
  shaderBuilder.addFunction(
    setDynamicVaryingsFSFunctionId,
    "void setDynamicVaryings(inout ProcessedAttributes attributes)",
    ShaderDestination.FRAGMENT
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

  handleBitangents(shaderBuilder, primitive.attributes);

  if (primitive.primitiveType === PrimitiveType.POINTS) {
    shaderBuilder.addDefine("PRIMITIVE_TYPE_POINTS");
  }

  shaderBuilder.addVertexLines([GeometryStageVS]);
  shaderBuilder.addFragmentLines([GeometryStageFS]);
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
  var quantization = attribute.quantization;
  var type;
  var componentDatatype;
  if (defined(quantization)) {
    type = quantization.type;
    componentDatatype = quantization.componentDatatype;
  } else {
    type = attribute.type;
    componentDatatype = attribute.componentDatatype;
  }

  var vertexAttribute = {
    index: attributeIndex,
    value: defined(attribute.buffer) ? undefined : attribute.constant,
    vertexBuffer: attribute.buffer,
    componentsPerAttribute: AttributeType.getNumberOfComponents(type),
    componentDatatype: componentDatatype,
    offsetInBytes: attribute.byteOffset,
    strideInBytes: attribute.byteStride,
    normalize: attribute.normalized,
  };

  attributesArray.push(vertexAttribute);
}

function addVaryingDeclaration(shaderBuilder, attributeInfo) {
  var variableName = attributeInfo.variableName;
  var varyingName = "v_" + variableName;

  var glslType;
  if (variableName === "tangent") {
    // Tangent's glslType is vec4, but in the shader it is split into
    // vec3 tangent and vec3 bitangent
    glslType = "vec3";
  } else {
    glslType = attributeInfo.glslType;
  }

  shaderBuilder.addVarying(glslType, varyingName);
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
  var vsStructId = attributesStructVSId;
  var fsStructId = attributesStructFSId;
  var variableName = attributeInfo.variableName;
  if (variableName === "color") {
    // Always declare color as a vec4, even if it was a vec3
    shaderBuilder.addStructField(vsStructId, "vec4", "color");
    shaderBuilder.addStructField(fsStructId, "vec4", "color");
  } else if (variableName === "tangent") {
    // declare tangent as vec3, the w component is only used for computing
    // the bitangent
    shaderBuilder.addStructField(vsStructId, "vec3", "tangent");
    shaderBuilder.addStructField(fsStructId, "vec3", "tangent");
  } else {
    shaderBuilder.addStructField(
      vsStructId,
      attributeInfo.glslType,
      variableName
    );
    shaderBuilder.addStructField(
      fsStructId,
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

  // In the vertex shader, we want things like
  // v_texCoord_1 = attributes.texCoord_1;
  var functionId = setDynamicVaryingsVSFunctionId;
  var variableName = attributeInfo.variableName;
  var line = "v_" + variableName + " = attributes." + variableName + ";";
  shaderBuilder.addFunctionLine(functionId, line);

  // In the fragment shader, we do the opposite:
  // attributes.texCoord_1 = v_texCoord_1;
  functionId = setDynamicVaryingsFSFunctionId;
  line = "attributes." + variableName + " = v_" + variableName + ";";
  shaderBuilder.addFunctionLine(functionId, line);
}

function handleBitangents(shaderBuilder, attributes) {
  var hasNormals = false;
  var hasTangents = false;
  for (var i = 0; i < attributes.length; i++) {
    var attribute = attributes[i];
    if (attribute.semantic === VertexAttributeSemantic.NORMAL) {
      hasNormals = true;
    } else if (attribute.semantic === VertexAttributeSemantic.TANGENT) {
      hasTangents = true;
    }
  }

  // Bitangents are only defined if we have normals and tangents
  if (!hasNormals || !hasTangents) {
    return;
  }

  shaderBuilder.addDefine("HAS_BITANGENTS");

  // compute the bitangent according to the formula in the glTF spec
  shaderBuilder.addFunctionLine(
    initializeAttributesFunctionId,
    "attributes.bitangent = normalize(cross(a_normal, a_tangent.xyz) * a_tangent.w);"
  );

  shaderBuilder.addVarying("vec3", "v_bitangent");
  shaderBuilder.addStructField(attributesStructVSId, "vec3", "bitangent");
  shaderBuilder.addStructField(attributesStructFSId, "vec3", "bitangent");
}

export default GeometryPipelineStage;
