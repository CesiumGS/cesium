import defined from "../../Core/defined.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import AttributeType from "../AttributeType.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import GeometryStageFS from "../../Shaders/ModelExperimental/GeometryStageFS.js";
import GeometryStageVS from "../../Shaders/ModelExperimental/GeometryStageVS.js";
import SelectedFeatureIdPipelineStage from "./SelectedFeatureIdPipelineStage.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import ModelExperimentalType from "./ModelExperimentalType.js";

/**
 * The geometry pipeline stage processes the vertex attributes of a primitive.
 *
 * @namespace GeometryPipelineStage
 *
 * @private
 */
const GeometryPipelineStage = {};
GeometryPipelineStage.name = "GeometryPipelineStage"; // Helps with debugging

GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_VS =
  "ProcessedAttributesVS";
GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_FS =
  "ProcessedAttributesFS";
GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES = "ProcessedAttributes";
GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES =
  "initializeAttributes";
GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES =
  "void initializeAttributes(out ProcessedAttributes attributes)";
GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_VS =
  "setDynamicVaryingsVS";
GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_FS =
  "setDynamicVaryingsFS";
GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS =
  "void setDynamicVaryings(inout ProcessedAttributes attributes)";

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
  const shaderBuilder = renderResources.shaderBuilder;
  // These structs are similar, though the fragment shader version has a couple
  // additional fields.
  shaderBuilder.addStruct(
    GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_VS,
    "ProcessedAttributes",
    ShaderDestination.VERTEX
  );
  shaderBuilder.addStruct(
    GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_FS,
    "ProcessedAttributes",
    ShaderDestination.FRAGMENT
  );

  // The Feature struct is always added since it's required for compilation. It may be unused if features are not present.
  shaderBuilder.addStruct(
    SelectedFeatureIdPipelineStage.STRUCT_ID_SELECTED_FEATURE,
    SelectedFeatureIdPipelineStage.STRUCT_NAME_SELECTED_FEATURE,
    ShaderDestination.BOTH
  );

  // This initialization function is only needed in the vertex shader,
  // it assigns the non-quantized attribute struct fields from the
  // physical attributes
  shaderBuilder.addFunction(
    GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES,
    GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES,
    ShaderDestination.VERTEX
  );

  // Positions in other coordinate systems need more variables
  shaderBuilder.addVarying("vec3", "v_positionWC");
  shaderBuilder.addVarying("vec3", "v_positionEC");
  shaderBuilder.addStructField(
    GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_FS,
    "vec3",
    "positionWC"
  );
  shaderBuilder.addStructField(
    GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_FS,
    "vec3",
    "positionEC"
  );

  // Though they have identical signatures, the implementation is different
  // between vertex and fragment shaders. The VS stores attributes in
  // varyings, while the FS unpacks the varyings for use by other stages.
  shaderBuilder.addFunction(
    GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_VS,
    GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
    ShaderDestination.VERTEX
  );
  shaderBuilder.addFunction(
    GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_FS,
    GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
    ShaderDestination.FRAGMENT
  );

  // .pnts point clouds store sRGB color rather than linear color
  const model = renderResources.model;
  const modelType = model.type;
  if (modelType === ModelExperimentalType.TILE_PNTS) {
    shaderBuilder.addDefine(
      "HAS_SRGB_COLOR",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }

  const length = primitive.attributes.length;
  for (let i = 0; i < length; i++) {
    const attribute = primitive.attributes[i];
    const attributeLocationCount = AttributeType.getAttributeLocationCount(
      attribute.type
    );

    let index;
    if (attributeLocationCount > 1) {
      index = renderResources.attributeIndex;
      renderResources.attributeIndex += attributeLocationCount;
    } else if (attribute.semantic === VertexAttributeSemantic.POSITION) {
      index = 0;
    } else {
      index = renderResources.attributeIndex++;
    }
    processAttribute(renderResources, attribute, index, attributeLocationCount);
  }

  handleBitangents(shaderBuilder, primitive.attributes);

  if (primitive.primitiveType === PrimitiveType.POINTS) {
    shaderBuilder.addDefine("PRIMITIVE_TYPE_POINTS");
  }

  updateStatistics(model.statistics, primitive);

  shaderBuilder.addVertexLines([GeometryStageVS]);
  shaderBuilder.addFragmentLines([GeometryStageFS]);
};

function processAttribute(
  renderResources,
  attribute,
  attributeIndex,
  attributeLocationCount
) {
  const shaderBuilder = renderResources.shaderBuilder;
  const attributeInfo = ModelExperimentalUtility.getAttributeInfo(attribute);

  if (attributeLocationCount > 1) {
    // matrices are stored as multiple attributes, one per column vector.
    addMatrixAttributeToRenderResources(
      renderResources,
      attribute,
      attributeIndex,
      attributeLocationCount
    );
  } else {
    addAttributeToRenderResources(renderResources, attribute, attributeIndex);
  }
  addAttributeDeclaration(shaderBuilder, attributeInfo);
  addVaryingDeclaration(shaderBuilder, attributeInfo);

  // For common attributes like positions, normals and tangents, the code is
  // already in GeometryStageVS, we just need to enable it
  if (defined(attribute.semantic)) {
    addSemanticDefine(shaderBuilder, attribute);
  }

  // Some GLSL code must be dynamically generated
  updateAttributesStruct(shaderBuilder, attributeInfo);
  updateInitializeAttributesFunction(shaderBuilder, attributeInfo);
  updateSetDynamicVaryingsFunction(shaderBuilder, attributeInfo);
}

function addSemanticDefine(shaderBuilder, attribute) {
  const semantic = attribute.semantic;
  const setIndex = attribute.setIndex;
  switch (semantic) {
    case VertexAttributeSemantic.NORMAL:
      shaderBuilder.addDefine("HAS_NORMALS");
      break;
    case VertexAttributeSemantic.TANGENT:
      shaderBuilder.addDefine("HAS_TANGENTS");
      break;
    case VertexAttributeSemantic.FEATURE_ID:
      // `_FEATURE_ID starts with an underscore so no need to double the
      // underscore.
      shaderBuilder.addDefine(`HAS${semantic}_${setIndex}`);
      break;
    case VertexAttributeSemantic.TEXCOORD:
    case VertexAttributeSemantic.COLOR:
      shaderBuilder.addDefine(`HAS_${semantic}_${setIndex}`);
  }
}

function addAttributeToRenderResources(
  renderResources,
  attribute,
  attributeIndex
) {
  const quantization = attribute.quantization;
  let type;
  let componentDatatype;
  if (defined(quantization)) {
    type = quantization.type;
    componentDatatype = quantization.componentDatatype;
  } else {
    type = attribute.type;
    componentDatatype = attribute.componentDatatype;
  }

  const semantic = attribute.semantic;
  const setIndex = attribute.setIndex;
  if (
    semantic === VertexAttributeSemantic.FEATURE_ID &&
    setIndex >= renderResources.featureIdVertexAttributeSetIndex
  ) {
    renderResources.featureIdVertexAttributeSetIndex = setIndex + 1;
  }

  const vertexAttribute = {
    index: attributeIndex,
    value: defined(attribute.buffer) ? undefined : attribute.constant,
    vertexBuffer: attribute.buffer,
    count: attribute.count,
    componentsPerAttribute: AttributeType.getNumberOfComponents(type),
    componentDatatype: componentDatatype,
    offsetInBytes: attribute.byteOffset,
    strideInBytes: attribute.byteStride,
    normalize: attribute.normalized,
  };

  renderResources.attributes.push(vertexAttribute);
}

function addMatrixAttributeToRenderResources(
  renderResources,
  attribute,
  attributeIndex,
  columnCount
) {
  const quantization = attribute.quantization;
  let type;
  let componentDatatype;
  if (defined(quantization)) {
    type = quantization.type;
    componentDatatype = quantization.componentDatatype;
  } else {
    type = attribute.type;
    componentDatatype = attribute.componentDatatype;
  }

  const normalized = attribute.normalized;

  // componentCount is either 4, 9 or 16
  const componentCount = AttributeType.getNumberOfComponents(type);
  // componentsPerColumn is either 2, 3, or 4
  const componentsPerColumn = componentCount / columnCount;

  const componentSizeInBytes = ComponentDatatype.getSizeInBytes(
    componentDatatype
  );

  const columnLengthInBytes = componentsPerColumn * componentSizeInBytes;

  // The stride between corresponding columns of two matrices is constant
  // regardless of where you start
  const strideInBytes = attribute.byteStride;

  for (let i = 0; i < columnCount; i++) {
    const offsetInBytes = attribute.byteOffset + i * columnLengthInBytes;

    // upload a single column vector.
    const columnAttribute = {
      index: attributeIndex + i,
      vertexBuffer: attribute.buffer,
      componentsPerAttribute: componentsPerColumn,
      componentDatatype: componentDatatype,
      offsetInBytes: offsetInBytes,
      strideInBytes: strideInBytes,
      normalize: normalized,
    };

    renderResources.attributes.push(columnAttribute);
  }
}

function addVaryingDeclaration(shaderBuilder, attributeInfo) {
  const variableName = attributeInfo.variableName;
  let varyingName = `v_${variableName}`;

  let glslType;
  if (variableName === "normalMC") {
    // though the attribute is in model coordinates, the varying is
    // in eye coordinates.
    varyingName = "v_normalEC";
    glslType = attributeInfo.glslType;
  } else if (variableName === "tangentMC") {
    // Tangent's glslType is vec4, but in the shader it is split into
    // vec3 tangent and vec3 bitangent
    glslType = "vec3";
    // like normalMC, the varying is converted to eye coordinates
    varyingName = "v_tangentEC";
  } else {
    glslType = attributeInfo.glslType;
  }

  shaderBuilder.addVarying(glslType, varyingName);
}

function addAttributeDeclaration(shaderBuilder, attributeInfo) {
  const semantic = attributeInfo.attribute.semantic;
  const variableName = attributeInfo.variableName;

  let attributeName;
  let glslType;
  if (attributeInfo.isQuantized) {
    attributeName = `a_quantized_${variableName}`;
    glslType = attributeInfo.quantizedGlslType;
  } else {
    attributeName = `a_${variableName}`;
    glslType = attributeInfo.glslType;
  }

  if (semantic === VertexAttributeSemantic.POSITION) {
    shaderBuilder.setPositionAttribute(glslType, attributeName);
  } else {
    shaderBuilder.addAttribute(glslType, attributeName);
  }
}

function updateAttributesStruct(shaderBuilder, attributeInfo) {
  const vsStructId = GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_VS;
  const fsStructId = GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_FS;
  const variableName = attributeInfo.variableName;

  if (variableName === "tangentMC") {
    // The w component of the tangent is only used for computing the bitangent,
    // so it can be separated from the other tangent components.
    shaderBuilder.addStructField(vsStructId, "vec3", "tangentMC");
    shaderBuilder.addStructField(vsStructId, "float", "tangentSignMC");
    // The tangent is in model coordinates in the vertex shader
    // but in eye space in the fragment coordinates
    shaderBuilder.addStructField(fsStructId, "vec3", "tangentEC");
  } else if (variableName === "normalMC") {
    // Normals are in model coordinates in the vertex shader but in eye
    // coordinates in the fragment shader
    shaderBuilder.addStructField(vsStructId, "vec3", "normalMC");
    shaderBuilder.addStructField(fsStructId, "vec3", "normalEC");
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

function updateInitializeAttributesFunction(shaderBuilder, attributeInfo) {
  if (attributeInfo.isQuantized) {
    // Skip initialization, it will be handled in the dequantization stage.
    return;
  }

  const functionId = GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES;
  const variableName = attributeInfo.variableName;
  const lines = [];
  if (variableName === "tangentMC") {
    lines.push("attributes.tangentMC = a_tangentMC.xyz;");
    lines.push("attributes.tangentSignMC = a_tangentMC.w;");
  } else {
    lines.push(`attributes.${variableName} = a_${variableName};`);
  }
  shaderBuilder.addFunctionLines(functionId, lines);
}

function updateSetDynamicVaryingsFunction(shaderBuilder, attributeInfo) {
  const semantic = attributeInfo.attribute.semantic;
  const setIndex = attributeInfo.attribute.setIndex;
  if (defined(semantic) && !defined(setIndex)) {
    // positions, normals, and tangents are handled statically in
    // GeometryStageVS
    return;
  }

  // In the vertex shader, we want things like
  // v_texCoord_1 = attributes.texCoord_1;
  let functionId = GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_VS;
  const variableName = attributeInfo.variableName;
  let line = `v_${variableName} = attributes.${variableName};`;
  shaderBuilder.addFunctionLines(functionId, [line]);

  // In the fragment shader, we do the opposite:
  // attributes.texCoord_1 = v_texCoord_1;
  functionId = GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_FS;
  line = `attributes.${variableName} = v_${variableName};`;
  shaderBuilder.addFunctionLines(functionId, [line]);
}

function handleBitangents(shaderBuilder, attributes) {
  let hasNormals = false;
  let hasTangents = false;
  for (let i = 0; i < attributes.length; i++) {
    const attribute = attributes[i];
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

  shaderBuilder.addVarying("vec3", "v_bitangentEC");
  shaderBuilder.addStructField(
    GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_VS,
    "vec3",
    "bitangentMC"
  );
  shaderBuilder.addStructField(
    GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_FS,
    "vec3",
    "bitangentEC"
  );
}

function updateStatistics(renderResources, primitive) {
  const statistics = renderResources.model.statistics;
  const indicesCount = renderResources.count;
  const mode = primitive.mode;

  if (mode === PrimitiveType.POINTS) {
    statistics.pointsLength += indicesCount;
  } else if (PrimitiveType.isTriangles(mode)) {
    statistics.trianglesLength = countTriangles(mode, indicesCount);
  }

  const attributes = primitive.attributes;
  const length = attributes.length;
  for (let i = 0; i < length; i++) {
    const attribute = attributes[i];
    if (defined(attribute.buffer)) {
      // TODO: Document typedArray vs packedTypeArray better in ModelComponents
      const hasCpuCopy = defined(attribute.typedArray);
      statistics.addBuffer(attribute.buffer, hasCpuCopy);
    } else {
      statistics.geometryByteLength += attribute.typedArray.byteLength;
    }
  }

  const indices = primitive.indices;
  if (defined(indices)) {
    if (defined(indices.buffer)) {
      // Wireframe mode will have both GPU and CPU copies
      const hasCpuCopy = defined(indices.typedArray);
      statistics.addBuffer(indices.buffer, hasCpuCopy);
    } else {
      // No buffer, but we have a typed array
      // TODO: this probably shouldn't happen...
      statistics.geometryByteLength += indices.typedArray.byteLength;
    }
  }
}

function countTriangles(primitiveType, indicesCount) {
  switch (primitiveType) {
    case PrimitiveType.TRIANGLES:
      return indicesCount / 3;
    case PrimitiveType.TRIANGLE_STRIP:
    case PrimitiveType.TRIANGLE_FAN:
      return Math.max(indicesCount - 2, 0);
    default:
      return 0;
  }
}

// TODO: somewhere in this file if an attribute has a typed array but no
// buffer, throw a DeveloperError

export default GeometryPipelineStage;
