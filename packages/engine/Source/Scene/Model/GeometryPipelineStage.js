import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import GeometryStageFS from "../../Shaders/Model/GeometryStageFS.js";
import GeometryStageVS from "../../Shaders/Model/GeometryStageVS.js";
import AttributeType from "../AttributeType.js";
import SceneMode from "../SceneMode.js";
import ModelType from "./ModelType.js";
import ModelUtility from "./ModelUtility.js";
import SelectedFeatureIdPipelineStage from "./SelectedFeatureIdPipelineStage.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";

/**
 * The geometry pipeline stage processes the vertex attributes of a primitive.
 *
 * @namespace GeometryPipelineStage
 *
 * @private
 */
const GeometryPipelineStage = {
  name: "GeometryPipelineStage", // Helps with debugging

  STRUCT_ID_PROCESSED_ATTRIBUTES_VS: "ProcessedAttributesVS",
  STRUCT_ID_PROCESSED_ATTRIBUTES_FS: "ProcessedAttributesFS",
  STRUCT_NAME_PROCESSED_ATTRIBUTES: "ProcessedAttributes",
  FUNCTION_ID_INITIALIZE_ATTRIBUTES: "initializeAttributes",
  FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES:
    "void initializeAttributes(out ProcessedAttributes attributes)",
  FUNCTION_ID_SET_DYNAMIC_VARYINGS_VS: "setDynamicVaryingsVS",
  FUNCTION_ID_SET_DYNAMIC_VARYINGS_FS: "setDynamicVaryingsFS",
  FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS:
    "void setDynamicVaryings(inout ProcessedAttributes attributes)",
};

/**
 * This pipeline stage processes the vertex attributes of a primitive,
 * adding attribute declarations to the shaders, adding attribute objects to the
 * render resources, and setting define flags as needed.
 *
 * Processes a primitive. This stage modifies the following parts of the render resources:
 * <ul>
 *  <li> adds attribute and varying declarations for the vertex attributes in the vertex and fragment shaders
 *  <li> creates the objects required to create VertexArrays
 *  <li> sets the flag for point primitive types
 * </ul>
 *
 * If the scene is in either 2D or CV mode, this stage also:
 * <ul>
 *  <li> adds a struct field for the 2D positions
 *  <li> adds an additional attribute object and declaration if the node containing this primitive is not instanced
 * </ul>
 *
 * @param {PrimitiveRenderResources} renderResources The render resources for this primitive.
 * @param {ModelComponents.Primitive} primitive The primitive.
 * @param {FrameState} frameState The frame state.
 *
 * @private
 */
GeometryPipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  const { shaderBuilder, model } = renderResources;

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

  // The Feature struct is always added since it's required for compilation.
  // It may be unused if features are not present.
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
  if (model.type === ModelType.TILE_PNTS) {
    shaderBuilder.addDefine(
      "HAS_SRGB_COLOR",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }

  // Attributes, structs, and functions will need to be modified for 2D / CV.
  const use2D =
    frameState.mode !== SceneMode.SCENE3D &&
    !frameState.scene3DOnly &&
    model._projectTo2D;

  // If the model is instanced, the work for 2D projection will have been done
  // in InstancingPipelineStage. The attribute struct will be updated with
  // position2D, but nothing else should be modified.
  const instanced = defined(renderResources.runtimeNode.node.instances);

  // If the scene is in 3D or the model is instanced, the 2D position attribute
  // is not needed, so don't increment attributeIndex.
  const incrementIndexFor2D = use2D && !instanced;
  const length = primitive.attributes.length;
  for (let i = 0; i < length; i++) {
    const attribute = primitive.attributes[i];
    const attributeLocationCount = AttributeType.getAttributeLocationCount(
      attribute.type
    );

    //>>includeStart('debug', pragmas.debug);
    if (!defined(attribute.buffer) && !defined(attribute.constant)) {
      throw new DeveloperError(
        "Attributes must be provided as a Buffer or constant value"
      );
    }
    //>>includeEnd('debug');

    const isPositionAttribute =
      attribute.semantic === VertexAttributeSemantic.POSITION;

    let index;
    if (attributeLocationCount > 1) {
      index = renderResources.attributeIndex;
      renderResources.attributeIndex += attributeLocationCount;
    } else if (isPositionAttribute && !incrementIndexFor2D) {
      index = 0;
    } else {
      index = renderResources.attributeIndex++;
    }

    processAttribute(
      renderResources,
      attribute,
      index,
      attributeLocationCount,
      use2D,
      instanced
    );
  }

  handleBitangents(shaderBuilder, primitive.attributes);

  if (primitive.primitiveType === PrimitiveType.POINTS) {
    shaderBuilder.addDefine("PRIMITIVE_TYPE_POINTS");
  }

  shaderBuilder.addVertexLines(GeometryStageVS);
  shaderBuilder.addFragmentLines(GeometryStageFS);
};

function processAttribute(
  renderResources,
  attribute,
  attributeIndex,
  attributeLocationCount,
  use2D,
  instanced
) {
  const shaderBuilder = renderResources.shaderBuilder;
  const attributeInfo = ModelUtility.getAttributeInfo(attribute);

  // This indicates to only modify the resources for 2D if the model is
  // not instanced.
  const modifyFor2D = use2D && !instanced;

  if (attributeLocationCount > 1) {
    // Matrices are stored as multiple attributes, one per column vector.
    addMatrixAttributeToRenderResources(
      renderResources,
      attribute,
      attributeIndex,
      attributeLocationCount
    );
  } else {
    addAttributeToRenderResources(
      renderResources,
      attribute,
      attributeIndex,
      modifyFor2D
    );
  }

  addAttributeDeclaration(shaderBuilder, attributeInfo, modifyFor2D);
  addVaryingDeclaration(shaderBuilder, attributeInfo);

  // For common attributes like normals and tangents, the code is
  // already in GeometryStageVS, we just need to enable it.
  if (defined(attribute.semantic)) {
    addSemanticDefine(shaderBuilder, attribute);
  }

  // Dynamically generate GLSL code for the current attribute.
  // For 2D projection, the position2D field will always be added
  // to the attributes struct, even if the model is instanced.
  updateAttributesStruct(shaderBuilder, attributeInfo, use2D);
  updateInitializeAttributesFunction(shaderBuilder, attributeInfo, modifyFor2D);
  updateSetDynamicVaryingsFunction(shaderBuilder, attributeInfo);
}

function addSemanticDefine(shaderBuilder, attribute) {
  const { semantic, setIndex } = attribute;
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
  attributeIndex,
  modifyFor2D
) {
  const { quantization, semantic, setIndex } = attribute;
  const { type, componentDatatype } = defined(quantization)
    ? quantization
    : attribute;

  if (
    semantic === VertexAttributeSemantic.FEATURE_ID &&
    setIndex >= renderResources.featureIdVertexAttributeSetIndex
  ) {
    renderResources.featureIdVertexAttributeSetIndex = setIndex + 1;
  }

  // The position attribute should always be in the first index.
  const isPositionAttribute = semantic === VertexAttributeSemantic.POSITION;
  const index = isPositionAttribute ? 0 : attributeIndex;
  const componentsPerAttribute = AttributeType.getNumberOfComponents(type);

  const vertexAttribute = {
    index: index,
    value: defined(attribute.buffer) ? undefined : attribute.constant,
    vertexBuffer: attribute.buffer,
    count: attribute.count,
    componentsPerAttribute: componentsPerAttribute,
    componentDatatype: componentDatatype,
    offsetInBytes: attribute.byteOffset,
    strideInBytes: attribute.byteStride,
    normalize: attribute.normalized,
  };

  renderResources.attributes.push(vertexAttribute);

  if (!isPositionAttribute || !modifyFor2D) {
    return;
  }

  // Add an additional attribute for the projected positions in 2D / CV.
  const buffer2D = renderResources.runtimePrimitive.positionBuffer2D;
  const positionAttribute2D = {
    index: attributeIndex,
    vertexBuffer: buffer2D,
    count: attribute.count,
    componentsPerAttribute: componentsPerAttribute,
    componentDatatype: ComponentDatatype.FLOAT, // Projected positions will always be floats.
    offsetInBytes: 0,
    strideInBytes: undefined,
    normalize: attribute.normalized,
  };

  renderResources.attributes.push(positionAttribute2D);
}

function addMatrixAttributeToRenderResources(
  renderResources,
  attribute,
  attributeIndex,
  columnCount
) {
  const { quantization, normalized } = attribute;
  const { type, componentDatatype } = defined(quantization)
    ? quantization
    : attribute;

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

function addAttributeDeclaration(shaderBuilder, attributeInfo, modifyFor2D) {
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

  const isPosition = semantic === VertexAttributeSemantic.POSITION;
  if (isPosition) {
    shaderBuilder.setPositionAttribute(glslType, attributeName);
  } else {
    shaderBuilder.addAttribute(glslType, attributeName);
  }

  if (isPosition && modifyFor2D) {
    shaderBuilder.addAttribute("vec3", "a_position2D");
  }
}

function updateAttributesStruct(shaderBuilder, attributeInfo, use2D) {
  const vsStructId = GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_VS;
  const fsStructId = GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_FS;
  const { variableName, glslType } = attributeInfo;

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
    shaderBuilder.addStructField(vsStructId, glslType, variableName);
    shaderBuilder.addStructField(fsStructId, glslType, variableName);
  }

  if (variableName === "positionMC" && use2D) {
    shaderBuilder.addStructField(vsStructId, "vec3", "position2D");
  }
}

function updateInitializeAttributesFunction(
  shaderBuilder,
  attributeInfo,
  use2D
) {
  const functionId = GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES;
  const variableName = attributeInfo.variableName;

  // If the scene is in 2D / CV mode, this line should always be added
  // regardless of whether the data is quantized.
  const use2DPosition = variableName === "positionMC" && use2D;
  if (use2DPosition) {
    const line = "attributes.position2D = a_position2D;";
    shaderBuilder.addFunctionLines(functionId, [line]);
  }

  if (attributeInfo.isQuantized) {
    // Skip initialization, it will be handled in the dequantization stage.
    return;
  }

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
  const { semantic, setIndex } = attributeInfo.attribute;
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

export default GeometryPipelineStage;
