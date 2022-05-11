import AttributeType from "../AttributeType.js";
import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Cartographic from "../../Core/Cartographic.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defined from "../../Core/defined.js";
import GeometryStageFS from "../../Shaders/ModelExperimental/GeometryStageFS.js";
import GeometryStageVS from "../../Shaders/ModelExperimental/GeometryStageVS.js";
import Matrix4 from "../../Core/Matrix4.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import ModelExperimentalType from "./ModelExperimentalType.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import SceneMode from "../SceneMode.js";
import SelectedFeatureIdPipelineStage from "./SelectedFeatureIdPipelineStage.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";

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
 * @param {FrameState} frameState The frame state.
 *
 * @private
 */
GeometryPipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
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
  const modelType = renderResources.model.type;
  if (modelType === ModelExperimentalType.TILE_PNTS) {
    shaderBuilder.addDefine(
      "HAS_SRGB_COLOR",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }

  for (let i = 0; i < primitive.attributes.length; i++) {
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
    processAttribute(
      renderResources,
      attribute,
      index,
      attributeLocationCount,
      frameState
    );
  }

  handleBitangents(shaderBuilder, primitive.attributes);

  if (primitive.primitiveType === PrimitiveType.POINTS) {
    shaderBuilder.addDefine("PRIMITIVE_TYPE_POINTS");
  }

  shaderBuilder.addVertexLines([GeometryStageVS]);
  shaderBuilder.addFragmentLines([GeometryStageFS]);
};

function processAttribute(
  renderResources,
  attribute,
  attributeIndex,
  attributeLocationCount,
  frameState
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
    addAttributeToRenderResources(
      renderResources,
      attribute,
      attributeIndex,
      frameState
    );
  }

  const use2D =
    frameState.mode === SceneMode.SCENE2D ||
    frameState.mode === SceneMode.COLUMBUS_VIEW;
  const isPositionAttribute =
    attribute.semantic === VertexAttributeSemantic.POSITION;
  const skipQuantization = use2D && isPositionAttribute;

  addAttributeDeclaration(shaderBuilder, attributeInfo, skipQuantization);
  addVaryingDeclaration(shaderBuilder, attributeInfo);

  // For common attributes like positions, normals and tangents, the code is
  // already in GeometryStageVS, we just need to enable it
  if (defined(attribute.semantic)) {
    addSemanticDefine(shaderBuilder, attribute);
  }

  // Some GLSL code must be dynamically generated
  updateAttributesStruct(shaderBuilder, attributeInfo);
  updateInitializeAttributesFunction(
    shaderBuilder,
    attributeInfo,
    skipQuantization
  );
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
  attributeIndex,
  frameState
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

  const isPositionAttribute = semantic === VertexAttributeSemantic.POSITION;
  if (isPositionAttribute && defined(attribute.typedArray)) {
    createPositionBufferFor2D(renderResources, attribute, frameState);
  }

  // Unload the typed array
  attribute.typedArray = undefined;

  const mode = frameState.mode;
  const sceneMode2D =
    mode === SceneMode.SCENE2D || mode === SceneMode.COLUMBUS_VIEW;
  const useBuffer2D = isPositionAttribute && sceneMode2D;
  const buffer = useBuffer2D ? attribute.buffer2D : attribute.buffer;

  const vertexAttribute = {
    index: attributeIndex,
    value: defined(buffer) ? undefined : attribute.constant,
    vertexBuffer: buffer,
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

function addAttributeDeclaration(
  shaderBuilder,
  attributeInfo,
  skipQuantization
) {
  const semantic = attributeInfo.attribute.semantic;
  const variableName = attributeInfo.variableName;

  let attributeName;
  let glslType;
  if (attributeInfo.isQuantized && !skipQuantization) {
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

function updateInitializeAttributesFunction(
  shaderBuilder,
  attributeInfo,
  skipQuantization
) {
  if (attributeInfo.isQuantized && !skipQuantization) {
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

const scratchProjectedPosition = new Cartesian3();
const scratchCartographic = new Cartographic();

function projectPositionTo2D(position, modelMatrix, projection, result) {
  const transformedPosition = Matrix4.multiplyByPoint(
    modelMatrix,
    position,
    scratchProjectedPosition
  );

  const ellipsoid = projection.ellipsoid;
  const cartographic = ellipsoid.cartesianToCartographic(
    transformedPosition,
    scratchCartographic
  );

  const projectedPosition = projection.project(
    cartographic,
    scratchProjectedPosition
  );
  result = Cartesian3.fromElements(
    projectedPosition.z,
    projectedPosition.x,
    projectedPosition.y,
    result
  );

  return result;
}

const scratchPosition = new Cartesian3();

function createPositionsTypedArrayFor2D(
  attribute,
  modelMatrix,
  projection,
  referencePoint
) {
  const typedArray = attribute.typedArray;

  let floatArray;
  if (defined(attribute.quantization)) {
    // Dequantize the positions if necessary.
    floatArray = dequantizePositionsTypedArray(
      attribute.typedArray,
      attribute.quantization
    );
  } else {
    floatArray = new Float32Array(
      typedArray.buffer,
      typedArray.byteOffset,
      typedArray.byteLength / Float32Array.BYTES_PER_ELEMENT
    );
  }

  const projectedArray = floatArray.slice();
  const startIndex = attribute.byteOffset / Float32Array.BYTES_PER_ELEMENT;
  const length = projectedArray.length;
  for (let i = startIndex; i < length; i += 3) {
    const initialPosition = Cartesian3.fromArray(
      floatArray,
      i,
      scratchPosition
    );

    const projectedPosition = projectPositionTo2D(
      initialPosition,
      modelMatrix,
      projection,
      initialPosition
    );

    const relativePosition = Cartesian3.subtract(
      projectedPosition,
      referencePoint,
      projectedPosition
    );

    projectedArray[i] = relativePosition.x;
    projectedArray[i + 1] = relativePosition.y;
    projectedArray[i + 2] = relativePosition.z;
  }

  return projectedArray;
}

function dequantizePositionsTypedArray(typedArray, quantization) {
  const length = typedArray.length;
  const dequantizedArray = new Float32Array(length);
  const quantizedVolumeOffset = quantization.quantizedVolumeOffset;
  const quantizedVolumeStepSize = quantization.quantizedVolumeStepSize;
  for (let i = 0; i < length; i += 3) {
    const initialPosition = Cartesian3.fromArray(
      typedArray,
      i,
      scratchPosition
    );
    const scaledPosition = Cartesian3.multiplyComponents(
      initialPosition,
      quantizedVolumeStepSize,
      initialPosition
    );
    const dequantizedPosition = Cartesian3.add(
      scaledPosition,
      quantizedVolumeOffset,
      scaledPosition
    );

    dequantizedArray[i] = dequantizedPosition.x;
    dequantizedArray[i + 1] = dequantizedPosition.y;
    dequantizedArray[i + 2] = dequantizedPosition.z;
  }

  return dequantizedArray;
}

const scratchMatrix = new Matrix4();
const scratchReferencePoint = new Cartesian3();

function createPositionBufferFor2D(renderResources, attribute, frameState) {
  const sceneGraph = renderResources.model.sceneGraph;
  const modelMatrix = sceneGraph.computedModelMatrix;
  const nodeComputedTransform = renderResources.runtimeNode.computedTransform;
  const computedModelMatrix = Matrix4.multiplyTransformation(
    modelMatrix,
    nodeComputedTransform,
    scratchMatrix
  );
  const projection = frameState.mapProjection;
  const boundingSphere = renderResources.boundingSphere;

  // Project the center of the bounding sphere in 2D.
  const referencePoint = projectPositionTo2D(
    boundingSphere.center,
    computedModelMatrix,
    projection,
    scratchReferencePoint
  );

  // Project positions relative to the bounding sphere's projected center.
  const projectedPositions = createPositionsTypedArrayFor2D(
    attribute,
    computedModelMatrix,
    projection,
    referencePoint
  );

  // Put the resulting data in a GPU buffer.
  const buffer = Buffer.createVertexBuffer({
    context: frameState.context,
    typedArray: projectedPositions,
    usage: BufferUsage.STATIC_DRAW,
  });
  buffer.vertexArrayDestroyable = false;

  attribute.buffer2D = buffer;
}

export default GeometryPipelineStage;
