import AttributeType from "../AttributeType.js";
import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import clone from "../../Core/clone.js";
import combine from "../../Core/combine.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defined from "../../Core/defined.js";
import InstanceAttributeSemantic from "../InstanceAttributeSemantic.js";
import InstancingStageCommon from "../../Shaders/ModelExperimental/InstancingStageCommon.js";
import InstancingStageVS from "../../Shaders/ModelExperimental/InstancingStageVS.js";
import LegacyInstancingStageVS from "../../Shaders/ModelExperimental/LegacyInstancingStageVS.js";
import Matrix4 from "../../Core/Matrix4.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import Quaternion from "../../Core/Quaternion.js";
import SceneMode from "../SceneMode.js";
import SceneTransforms from "../SceneTransforms.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import Transforms from "../../Core/Transforms.js";

const modelViewScratch = new Matrix4();
const nodeTransformScratch = new Matrix4();
const modelView2DScratch = new Matrix4();

/**
 * The instancing pipeline stage is responsible for handling GPU mesh instancing at the node
 * level.
 *
 * @namespace InstancingPipelineStage
 * @private
 */
const InstancingPipelineStage = {};
InstancingPipelineStage.name = "InstancingPipelineStage"; // Helps with debugging

/**
 * Process a node. This modifies the following parts of the render resources:
 * <ul>
 *  <li> creates buffers for the typed arrays of each attribute, if they do not yet exist
 *  <li> adds attribute declarations for the instancing vertex attributes in the vertex shader</li>
 *  <li> adds an instancing translation min and max to compute an accurate bounding volume</li>
 * </ul>
 *
 * If the scene is in either 2D or CV mode, this stage also:
 * <ul>
 *  <li> adds additional attributes for the transformation attributes projected to 2D
 *  <li> adds a flag to the shader to use the 2D instanced attributes
 *  <li> adds a uniform for the view model matrix in 2D
 * </ul>
 *
 * @param {NodeRenderResources} renderResources The render resources for this node.
 * @param {ModelComponents.Node} node The node.
 * @param {FrameState} frameState The frame state.
 */
InstancingPipelineStage.process = function (renderResources, node, frameState) {
  const instances = node.instances;
  const count = instances.attributes[0].count;

  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine("HAS_INSTANCING");
  shaderBuilder.addVertexLines([InstancingStageCommon]);

  const model = renderResources.model;
  const sceneGraph = model.sceneGraph;
  const use2D =
    frameState.mode !== SceneMode.SCENE3D &&
    !frameState.scene3DOnly &&
    model._projectTo2D;

  const instancingVertexAttributes = [];

  processTransformAttributes(
    renderResources,
    frameState,
    instances,
    instancingVertexAttributes,
    use2D
  );

  processFeatureIdAttributes(
    renderResources,
    frameState,
    instances,
    instancingVertexAttributes
  );

  const uniformMap = {};

  if (instances.transformInWorldSpace) {
    shaderBuilder.addDefine(
      "USE_LEGACY_INSTANCING",
      undefined,
      ShaderDestination.VERTEX
    );
    shaderBuilder.addUniform(
      "mat4",
      "u_instance_modifiedModelView",
      ShaderDestination.VERTEX
    );
    shaderBuilder.addUniform(
      "mat4",
      "u_instance_nodeTransform",
      ShaderDestination.VERTEX
    );

    // The i3dm format applies the instancing transforms in world space.
    // Instancing matrices come from a vertex attribute rather than a
    // uniform, and they are multiplied in the middle of the modelView matrix
    // product. This means czm_modelView can't be used. Instead, we split the
    // matrix into two parts, modifiedModelView and nodeTransform, and handle
    // this in LegacyInstancingStageVS.glsl. Conceptually the product looks like
    // this:
    //
    // modelView = u_modifiedModelView * a_instanceTransform * u_nodeTransform
    uniformMap.u_instance_modifiedModelView = function () {
      // Model matrix without the node hierarchy or axis correction
      // (see u_instance_nodeTransform).
      let modifiedModelMatrix = Matrix4.multiplyTransformation(
        // For 3D Tiles, model.modelMatrix is the computed tile
        // transform (which includes tileset.modelMatrix). This always applies
        // for i3dm, since such models are always part of a tileset.
        model.modelMatrix,
        // For i3dm models, components.transform contains the RTC_CENTER
        // translation.
        sceneGraph.components.transform,
        modelViewScratch
      );

      if (use2D) {
        // If projectTo2D is enabled, the 2D view matrix
        // will be accounted for in the u_modelView2D
        // uniform.
        //
        // modifiedModelView = view3D * modifiedModel
        return Matrix4.multiplyTransformation(
          frameState.context.uniformState.view3D,
          modifiedModelMatrix,
          modelViewScratch
        );
      }

      // For projection to 2D without projectTo2D enabled,
      // project the model matrix to 2D.
      if (frameState.mode !== SceneMode.SCENE3D) {
        modifiedModelMatrix = Transforms.basisTo2D(
          frameState.mapProjection,
          modifiedModelMatrix,
          modelViewScratch
        );
      }

      // modifiedModelView = view * modifiedModel
      return Matrix4.multiplyTransformation(
        frameState.context.uniformState.view,
        modifiedModelMatrix,
        modelViewScratch
      );
    };

    uniformMap.u_instance_nodeTransform = function () {
      // nodeTransform = axisCorrection * nodeHierarchyTransform
      return Matrix4.multiplyTransformation(
        // glTF y-up to 3D Tiles z-up
        sceneGraph.axisCorrectionMatrix,
        // This transforms from the node's coordinate system to the root
        // of the node hierarchy
        renderResources.runtimeNode.computedTransform,
        nodeTransformScratch
      );
    };

    shaderBuilder.addVertexLines([LegacyInstancingStageVS]);
  } else {
    shaderBuilder.addVertexLines([InstancingStageVS]);
  }

  if (use2D) {
    shaderBuilder.addDefine(
      "USE_2D_INSTANCING",
      undefined,
      ShaderDestination.VERTEX
    );

    shaderBuilder.addUniform("mat4", "u_modelView2D", ShaderDestination.VERTEX);

    const context = frameState.context;
    const modelMatrix2D = Matrix4.fromTranslation(
      renderResources.instancingReferencePoint2D,
      new Matrix4()
    );

    uniformMap.u_modelView2D = function () {
      return Matrix4.multiplyTransformation(
        context.uniformState.view,
        modelMatrix2D,
        modelView2DScratch
      );
    };
  }

  renderResources.uniformMap = combine(uniformMap, renderResources.uniformMap);

  renderResources.instanceCount = count;
  renderResources.attributes.push.apply(
    renderResources.attributes,
    instancingVertexAttributes
  );
};

const projectedTransformScratch = new Matrix4();
const projectedPositionScratch = new Cartesian3();

function projectTransformTo2D(
  transform,
  modelMatrix,
  nodeTransform,
  frameState,
  result
) {
  let projectedTransform = Matrix4.multiplyTransformation(
    modelMatrix,
    transform,
    projectedTransformScratch
  );

  projectedTransform = Matrix4.multiplyTransformation(
    projectedTransform,
    nodeTransform,
    projectedTransformScratch
  );

  result = Transforms.basisTo2D(
    frameState.mapProjection,
    projectedTransform,
    result
  );

  return result;
}

function projectPositionTo2D(
  position,
  modelMatrix,
  nodeTransform,
  frameState,
  result
) {
  const translationMatrix = Matrix4.fromTranslation(
    position,
    projectedTransformScratch
  );

  let projectedTransform = Matrix4.multiplyTransformation(
    modelMatrix,
    translationMatrix,
    projectedTransformScratch
  );

  projectedTransform = Matrix4.multiplyTransformation(
    projectedTransform,
    nodeTransform,
    projectedTransformScratch
  );

  const finalPosition = Matrix4.getTranslation(
    projectedTransform,
    projectedPositionScratch
  );

  result = SceneTransforms.computeActualWgs84Position(
    frameState,
    finalPosition,
    result
  );

  return result;
}

function getModelMatrixAndNodeTransform(
  renderResources,
  modelMatrix,
  nodeComputedTransform
) {
  const model = renderResources.model;
  const sceneGraph = model.sceneGraph;

  const instances = renderResources.runtimeNode.node.instances;
  if (instances.transformInWorldSpace) {
    // Replicate the multiplication order in LegacyInstancingStageVS.
    modelMatrix = Matrix4.multiplyTransformation(
      model.modelMatrix,
      sceneGraph.components.transform,
      modelMatrix
    );

    nodeComputedTransform = Matrix4.multiplyTransformation(
      sceneGraph.axisCorrectionMatrix,
      renderResources.runtimeNode.computedTransform,
      nodeComputedTransform
    );
  } else {
    // The node transform should be pre-multiplied with the instancing transform.
    modelMatrix = Matrix4.clone(sceneGraph.computedModelMatrix, modelMatrix);
    modelMatrix = Matrix4.multiplyTransformation(
      modelMatrix,
      renderResources.runtimeNode.computedTransform,
      modelMatrix
    );

    nodeComputedTransform = Matrix4.clone(
      Matrix4.IDENTITY,
      nodeComputedTransform
    );
  }
}

const modelMatrixScratch = new Matrix4();
const nodeComputedTransformScratch = new Matrix4();
const transformScratch = new Matrix4();
const positionScratch = new Cartesian3();

function projectTransformsTo2D(
  transforms,
  renderResources,
  frameState,
  result
) {
  const modelMatrix = modelMatrixScratch;
  const nodeComputedTransform = nodeComputedTransformScratch;

  getModelMatrixAndNodeTransform(
    renderResources,
    modelMatrix,
    nodeComputedTransform
  );

  const referencePoint = renderResources.instancingReferencePoint2D;
  const count = transforms.length;
  for (let i = 0; i < count; i++) {
    const transform = transforms[i];

    const projectedTransform = projectTransformTo2D(
      transform,
      modelMatrix,
      nodeComputedTransform,
      frameState,
      transformScratch
    );

    const position = Matrix4.getTranslation(
      projectedTransform,
      positionScratch
    );

    const finalTranslation = Cartesian3.subtract(
      position,
      referencePoint,
      position
    );

    result[i] = Matrix4.setTranslation(
      projectedTransform,
      finalTranslation,
      result[i]
    );
  }

  return result;
}

function projectTranslationsTo2D(
  translations,
  renderResources,
  frameState,
  result
) {
  const modelMatrix = modelMatrixScratch;
  const nodeComputedTransform = nodeComputedTransformScratch;

  getModelMatrixAndNodeTransform(
    renderResources,
    modelMatrix,
    nodeComputedTransform
  );

  const referencePoint = renderResources.instancingReferencePoint2D;
  const count = translations.length;
  for (let i = 0; i < count; i++) {
    const translation = translations[i];

    const projectedPosition = projectPositionTo2D(
      translation,
      modelMatrix,
      nodeComputedTransform,
      frameState,
      translation
    );

    result[i] = Cartesian3.subtract(
      projectedPosition,
      referencePoint,
      result[i]
    );
  }

  return result;
}

const scratchProjectedMin = new Cartesian3();
const scratchProjectedMax = new Cartesian3();

function computeReferencePoint2D(renderResources, frameState) {
  // Compute the reference point by averaging the instancing translation
  // min / max values after they are projected to 2D.
  const modelMatrix = renderResources.model.sceneGraph.computedModelMatrix;
  const transformedPositionMin = Matrix4.multiplyByPoint(
    modelMatrix,
    renderResources.instancingTranslationMin,
    scratchProjectedMin
  );

  const projectedMin = SceneTransforms.computeActualWgs84Position(
    frameState,
    transformedPositionMin,
    transformedPositionMin
  );

  const transformedPositionMax = Matrix4.multiplyByPoint(
    modelMatrix,
    renderResources.instancingTranslationMax,
    scratchProjectedMax
  );

  const projectedMax = SceneTransforms.computeActualWgs84Position(
    frameState,
    transformedPositionMax,
    transformedPositionMax
  );

  return Cartesian3.lerp(projectedMin, projectedMax, 0.5, new Cartesian3());
}

function transformsToTypedArray(transforms) {
  const elements = 12;
  const count = transforms.length;
  const transformsTypedArray = new Float32Array(count * elements);

  for (let i = 0; i < count; i++) {
    const transform = transforms[i];
    const offset = elements * i;

    transformsTypedArray[offset + 0] = transform[0];
    transformsTypedArray[offset + 1] = transform[4];
    transformsTypedArray[offset + 2] = transform[8];
    transformsTypedArray[offset + 3] = transform[12];
    transformsTypedArray[offset + 4] = transform[1];
    transformsTypedArray[offset + 5] = transform[5];
    transformsTypedArray[offset + 6] = transform[9];
    transformsTypedArray[offset + 7] = transform[13];
    transformsTypedArray[offset + 8] = transform[2];
    transformsTypedArray[offset + 9] = transform[6];
    transformsTypedArray[offset + 10] = transform[10];
    transformsTypedArray[offset + 11] = transform[14];
  }

  return transformsTypedArray;
}

function translationsToTypedArray(translations) {
  const elements = 3;
  const count = translations.length;
  const transationsTypedArray = new Float32Array(count * elements);

  for (let i = 0; i < count; i++) {
    const translation = translations[i];
    const offset = elements * i;

    transationsTypedArray[offset + 0] = translation[0];
    transationsTypedArray[offset + 1] = translation[4];
    transationsTypedArray[offset + 2] = translation[8];
  }

  return transationsTypedArray;
}

const translationScratch = new Cartesian3();
const rotationScratch = new Quaternion();
const scaleScratch = new Cartesian3();

function getInstanceTransformsAsMatrices(instances, count, renderResources) {
  const transforms = new Array(count);

  const translationAttribute = ModelExperimentalUtility.getAttributeBySemantic(
    instances,
    InstanceAttributeSemantic.TRANSLATION
  );
  const rotationAttribute = ModelExperimentalUtility.getAttributeBySemantic(
    instances,
    InstanceAttributeSemantic.ROTATION
  );
  const scaleAttribute = ModelExperimentalUtility.getAttributeBySemantic(
    instances,
    InstanceAttributeSemantic.SCALE
  );

  const instancingTranslationMax = new Cartesian3(
    -Number.MAX_VALUE,
    -Number.MAX_VALUE,
    -Number.MAX_VALUE
  );
  const instancingTranslationMin = new Cartesian3(
    Number.MAX_VALUE,
    Number.MAX_VALUE,
    Number.MAX_VALUE
  );

  const hasTranslation = defined(translationAttribute);
  const hasRotation = defined(rotationAttribute);
  const hasScale = defined(scaleAttribute);

  // Translations get initialized to (0, 0, 0).
  const translationTypedArray = hasTranslation
    ? translationAttribute.packedTypedArray
    : new Float32Array(count * 3);
  // Rotations get initialized to (0, 0, 0, 0). The w-component is set to 1 in the loop below.
  const rotationTypedArray = hasRotation
    ? rotationAttribute.packedTypedArray
    : new Float32Array(count * 4);
  // Scales get initialized to (1, 1, 1).
  let scaleTypedArray;
  if (hasScale) {
    scaleTypedArray = scaleAttribute.packedTypedArray;
  } else {
    scaleTypedArray = new Float32Array(count * 3);
    scaleTypedArray.fill(1);
  }

  for (let i = 0; i < count; i++) {
    const translation = new Cartesian3(
      translationTypedArray[i * 3],
      translationTypedArray[i * 3 + 1],
      translationTypedArray[i * 3 + 2],
      translationScratch
    );

    Cartesian3.maximumByComponent(
      instancingTranslationMax,
      translation,
      instancingTranslationMax
    );
    Cartesian3.minimumByComponent(
      instancingTranslationMin,
      translation,
      instancingTranslationMin
    );

    const rotation = new Quaternion(
      rotationTypedArray[i * 4],
      rotationTypedArray[i * 4 + 1],
      rotationTypedArray[i * 4 + 2],
      hasRotation ? rotationTypedArray[i * 4 + 3] : 1,
      rotationScratch
    );

    const scale = new Cartesian3(
      scaleTypedArray[i * 3],
      scaleTypedArray[i * 3 + 1],
      scaleTypedArray[i * 3 + 2],
      scaleScratch
    );

    const transform = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale,
      new Matrix4()
    );

    transforms[i] = transform;
  }

  renderResources.instancingTranslationMax = instancingTranslationMax;
  renderResources.instancingTranslationMin = instancingTranslationMin;

  return transforms;
}

function getInstanceTranslationsAsCartesian3s(translationAttribute, count) {
  const translations = new Array(count);
  const translationTypedArray = translationAttribute.packedTypedArray;

  for (let i = 0; i < count; i++) {
    translations[i] = new Cartesian3(
      translationTypedArray[i * 3],
      translationTypedArray[i * 3 + 1],
      translationTypedArray[i * 3 + 2]
    );
  }

  return translations;
}

function createVertexBuffer(typedArray, frameState) {
  const buffer = Buffer.createVertexBuffer({
    context: frameState.context,
    typedArray: typedArray,
    usage: BufferUsage.STATIC_DRAW,
  });

  // Destruction of resources allocated by the ModelExperimental
  // is handled by ModelExperimental.destroy().
  buffer.vertexArrayDestroyable = false;

  return buffer;
}

function processTransformAttributes(
  renderResources,
  frameState,
  instances,
  instancingVertexAttributes,
  use2D
) {
  const translationAttribute = ModelExperimentalUtility.getAttributeBySemantic(
    instances,
    InstanceAttributeSemantic.TRANSLATION
  );

  let translationMax;
  let translationMin;
  if (defined(translationAttribute)) {
    translationMax = translationAttribute.max;
    translationMin = translationAttribute.min;
  }

  const rotationAttribute = ModelExperimentalUtility.getAttributeBySemantic(
    instances,
    InstanceAttributeSemantic.ROTATION
  );

  const shaderBuilder = renderResources.shaderBuilder;
  const count = instances.attributes[0].count;
  const useMatrices =
    defined(rotationAttribute) ||
    !defined(translationMax) ||
    !defined(translationMin);

  const statistics = renderResources.model.statistics;

  // Packed typed arrays are omitted from statistics because they don't
  // necessarily correspond to the size of the GPU buffer containing
  // their data. It's also difficult to track which typed arrays have
  // already been counted.
  const hasCpuCopy = false;

  let transforms;
  if (useMatrices) {
    shaderBuilder.addDefine("HAS_INSTANCE_MATRICES");
    const attributeString = "Transform";

    transforms = getInstanceTransformsAsMatrices(
      instances,
      count,
      renderResources
    );

    const transformsTypedArray = transformsToTypedArray(transforms);
    const buffer = createVertexBuffer(transformsTypedArray, frameState);
    renderResources.model._resources.push(buffer);

    processMatrixAttributes(
      renderResources,
      buffer,
      instancingVertexAttributes,
      attributeString
    );

    // Count the buffer here since it had to be allocated
    // in this stage.
    statistics.addBuffer(buffer, hasCpuCopy);
  } else {
    if (defined(translationAttribute)) {
      shaderBuilder.addDefine("HAS_INSTANCE_TRANSLATION");

      const translationMax = translationAttribute.max;
      const translationMin = translationAttribute.min;
      renderResources.instancingTranslationMax = translationMax;
      renderResources.instancingTranslationMin = translationMin;

      let buffer = translationAttribute.buffer;
      let byteOffset = translationAttribute.byteOffset;
      let byteStride = translationAttribute.byteStride;

      if (!defined(buffer)) {
        buffer = createVertexBuffer(
          translationAttribute.packedTypedArray,
          frameState
        );
        renderResources.model._resources.push(buffer);

        byteOffset = 0;
        byteStride = undefined;

        // Count the buffer here if it had to be allocated
        // in this stage. Otherwise, it will be counted in
        // NodeStatisticsPipelineStage.
        statistics.addBuffer(buffer, hasCpuCopy);
      }

      const attributeString = "Translation";

      processVec3Attribute(
        renderResources,
        buffer,
        byteOffset,
        byteStride,
        instancingVertexAttributes,
        attributeString
      );
    }

    const scaleAttribute = ModelExperimentalUtility.getAttributeBySemantic(
      instances,
      InstanceAttributeSemantic.SCALE
    );

    if (defined(scaleAttribute)) {
      shaderBuilder.addDefine("HAS_INSTANCE_SCALE");

      let buffer = scaleAttribute.buffer;
      let byteOffset = scaleAttribute.byteOffset;
      let byteStride = scaleAttribute.byteStride;

      if (!defined(buffer)) {
        buffer = createVertexBuffer(
          scaleAttribute.packedTypedArray,
          frameState
        );
        renderResources.model._resources.push(buffer);

        byteOffset = 0;
        byteStride = undefined;

        // Count the buffer here if it had to be allocated
        // in this stage. Otherwise, it will be counted in
        // NodeStatisticsPipelineStage.
        statistics.addBuffer(buffer, hasCpuCopy);
      }

      const attributeString = "Scale";

      processVec3Attribute(
        renderResources,
        buffer,
        byteOffset,
        byteStride,
        instancingVertexAttributes,
        attributeString
      );
    }
  }

  if (!use2D) {
    return;
  }

  // Force the scene mode to be CV. In 2D, projected positions will have
  // an x-coordinate of 0, which eliminates the height data that is
  // necessary for rendering in CV mode.
  const frameStateCV = clone(frameState);
  frameStateCV.mode = SceneMode.COLUMBUS_VIEW;

  // To prevent jitter, the positions are defined relative to a common
  // reference point. For convenience, this is the center of the instanced
  // translation bounds projected to 2D.
  const referencePoint = computeReferencePoint2D(renderResources, frameStateCV);
  renderResources.instancingReferencePoint2D = referencePoint;

  const runtimeNode = renderResources.runtimeNode;

  if (useMatrices) {
    let buffer = runtimeNode.instancingTransformsBuffer2D;
    if (!defined(buffer)) {
      const projectedTransforms = projectTransformsTo2D(
        transforms,
        renderResources,
        frameStateCV,
        transforms
      );
      const projectedTypedArray = transformsToTypedArray(projectedTransforms);

      // This memory is counted during the statistics stage at the end
      // of the pipeline.
      buffer = createVertexBuffer(projectedTypedArray, frameState);
      renderResources.model._modelResources.push(buffer);

      runtimeNode.instancingTransformsBuffer2D = buffer;
    }

    const attributeString2D = "Transform2D";
    processMatrixAttributes(
      renderResources,
      buffer,
      instancingVertexAttributes,
      attributeString2D
    );
  } else {
    let buffer = runtimeNode.instancingTranslationBuffer2D;

    if (!defined(buffer)) {
      const translations = getInstanceTranslationsAsCartesian3s(
        translationAttribute,
        count
      );
      const projectedTranslations = projectTranslationsTo2D(
        translations,
        renderResources,
        frameStateCV,
        translations
      );
      const projectedTypedArray = translationsToTypedArray(
        projectedTranslations
      );

      // This memory is counted during the statistics stage at the end
      // of the pipeline.
      buffer = createVertexBuffer(projectedTypedArray, frameState);
      renderResources.model._modelResources.push(buffer);

      runtimeNode.instancingTranslationBuffer2D = buffer;
    }

    const byteOffset = 0;
    const byteStride = undefined;

    const attributeString2D = "Translation2D";
    processVec3Attribute(
      renderResources,
      buffer,
      byteOffset,
      byteStride,
      instancingVertexAttributes,
      attributeString2D
    );
  }
}

function processMatrixAttributes(
  renderResources,
  buffer,
  instancingVertexAttributes,
  attributeString
) {
  const vertexSizeInFloats = 12;
  const componentByteSize = ComponentDatatype.getSizeInBytes(
    ComponentDatatype.FLOAT
  );
  const strideInBytes = componentByteSize * vertexSizeInFloats;

  const matrixAttributes = [
    {
      index: renderResources.attributeIndex++,
      vertexBuffer: buffer,
      componentsPerAttribute: 4,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
      offsetInBytes: 0,
      strideInBytes: strideInBytes,
      instanceDivisor: 1,
    },
    {
      index: renderResources.attributeIndex++,
      vertexBuffer: buffer,
      componentsPerAttribute: 4,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
      offsetInBytes: componentByteSize * 4,
      strideInBytes: strideInBytes,
      instanceDivisor: 1,
    },
    {
      index: renderResources.attributeIndex++,
      vertexBuffer: buffer,
      componentsPerAttribute: 4,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
      offsetInBytes: componentByteSize * 8,
      strideInBytes: strideInBytes,
      instanceDivisor: 1,
    },
  ];

  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addAttribute("vec4", `a_instancing${attributeString}Row0`);
  shaderBuilder.addAttribute("vec4", `a_instancing${attributeString}Row1`);
  shaderBuilder.addAttribute("vec4", `a_instancing${attributeString}Row2`);

  instancingVertexAttributes.push.apply(
    instancingVertexAttributes,
    matrixAttributes
  );
}

function processVec3Attribute(
  renderResources,
  buffer,
  byteOffset,
  byteStride,
  instancingVertexAttributes,
  attributeString
) {
  instancingVertexAttributes.push({
    index: renderResources.attributeIndex++,
    vertexBuffer: buffer,
    componentsPerAttribute: 3,
    componentDatatype: ComponentDatatype.FLOAT,
    normalize: false,
    offsetInBytes: byteOffset,
    strideInBytes: byteStride,
    instanceDivisor: 1,
  });

  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addAttribute("vec3", `a_instance${attributeString}`);
}

function processFeatureIdAttributes(
  renderResources,
  frameState,
  instances,
  instancingVertexAttributes
) {
  const attributes = instances.attributes;
  const model = renderResources.model;
  const shaderBuilder = renderResources.shaderBuilder;

  // Load Feature ID vertex attributes. These are loaded as typed arrays in GltfLoader
  // because we want to expose the instance feature ID when picking.
  for (let i = 0; i < attributes.length; i++) {
    const attribute = attributes[i];
    if (attribute.semantic !== InstanceAttributeSemantic.FEATURE_ID) {
      continue;
    }

    if (
      attribute.setIndex >= renderResources.featureIdVertexAttributeSetIndex
    ) {
      renderResources.featureIdVertexAttributeSetIndex = attribute.setIndex + 1;
    }

    const vertexBuffer = Buffer.createVertexBuffer({
      context: frameState.context,
      typedArray: attribute.packedTypedArray,
      usage: BufferUsage.STATIC_DRAW,
    });
    vertexBuffer.vertexArrayDestroyable = false;
    model._resources.push(vertexBuffer);

    // Packed typed arrays are omitted from statistics because they don't
    // necessarily correspond to the size of the GPU buffer containing
    // their data. It's also difficult to track which typed arrays have
    // already been counted.
    const hasCpuCopy = false;
    model.statistics.addBuffer(vertexBuffer, hasCpuCopy);

    instancingVertexAttributes.push({
      index: renderResources.attributeIndex++,
      vertexBuffer: vertexBuffer,
      componentsPerAttribute: AttributeType.getNumberOfComponents(
        attribute.type
      ),
      componentDatatype: attribute.componentDatatype,
      normalize: false,
      offsetInBytes: attribute.byteOffset,
      strideInBytes: attribute.byteStride,
      instanceDivisor: 1,
    });

    shaderBuilder.addAttribute(
      "float",
      `a_instanceFeatureId_${attribute.setIndex}`
    );
  }
}

// Exposed for testing
InstancingPipelineStage._getInstanceTransformsAsMatrices = getInstanceTransformsAsMatrices;
InstancingPipelineStage._transformsToTypedArray = transformsToTypedArray;

export default InstancingPipelineStage;
