import Cartesian3 from "../../Core/Cartesian3.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";
import AttributeType from "../AttributeType.js";
import Quaternion from "../../Core/Quaternion.js";
import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import InstanceAttributeSemantic from "../InstanceAttributeSemantic.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import InstancingStageCommon from "../../Shaders/ModelExperimental/InstancingStageCommon.js";
import InstancingStageVS from "../../Shaders/ModelExperimental/InstancingStageVS.js";
import LegacyInstancingStageVS from "../../Shaders/ModelExperimental/LegacyInstancingStageVS.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";

const matrixScratch = new Matrix4();

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
 *  <li>adds attribute declarations for the instancing vertex attributes in the vertex shader</li>
 *  <li>adds an instancing translation min and max to compute an accurate bounding volume</li>
 * </ul>
 * @param {NodeRenderResources} renderResources The render resources for this node.
 * @param {ModelComponents.Node} node The node.
 * @param {FrameState} frameState The frame state.
 */
InstancingPipelineStage.process = function (renderResources, node, frameState) {
  const instances = node.instances;
  const count = instances.attributes[0].count;
  let instancingVertexAttributes = [];
  const sceneGraph = renderResources.model.sceneGraph;

  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine("HAS_INSTANCING");
  shaderBuilder.addVertexLines([InstancingStageCommon]);

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
  if (
    defined(rotationAttribute) ||
    !defined(translationMax) ||
    !defined(translationMin)
  ) {
    instancingVertexAttributes = processMatrixAttributes(
      node,
      count,
      renderResources,
      frameState
    );
  } else {
    if (defined(translationAttribute)) {
      instancingVertexAttributes.push({
        index: renderResources.attributeIndex++,
        vertexBuffer: translationAttribute.buffer,
        componentsPerAttribute: AttributeType.getNumberOfComponents(
          translationAttribute.type
        ),
        componentDatatype: translationAttribute.componentDatatype,
        normalize: false,
        offsetInBytes: translationAttribute.byteOffset,
        strideInBytes: translationAttribute.byteStride,
        instanceDivisor: 1,
      });

      renderResources.instancingTranslationMax = translationMax;
      renderResources.instancingTranslationMin = translationMin;

      shaderBuilder.addDefine("HAS_INSTANCE_TRANSLATION");
      shaderBuilder.addAttribute("vec3", "a_instanceTranslation");
    }

    const scaleAttribute = ModelExperimentalUtility.getAttributeBySemantic(
      instances,
      InstanceAttributeSemantic.SCALE
    );

    if (defined(scaleAttribute)) {
      instancingVertexAttributes.push({
        index: renderResources.attributeIndex++,
        vertexBuffer: scaleAttribute.buffer,
        componentsPerAttribute: AttributeType.getNumberOfComponents(
          scaleAttribute.type
        ),
        componentDatatype: scaleAttribute.componentDatatype,
        normalize: false,
        offsetInBytes: scaleAttribute.byteOffset,
        strideInBytes: scaleAttribute.byteStride,
        instanceDivisor: 1,
      });

      shaderBuilder.addDefine("HAS_INSTANCE_SCALE");
      shaderBuilder.addAttribute("vec3", "a_instanceScale");
    }
  }

  processFeatureIdAttributes(
    renderResources,
    frameState,
    instances,
    instancingVertexAttributes
  );

  if (instances.transformInWorldSpace) {
    const uniformMap = renderResources.uniformMap;
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
    uniformMap.u_instance_modifiedModelView = function () {
      return Matrix4.multiply(
        frameState.context.uniformState.view,
        sceneGraph.components.transform,
        matrixScratch
      );
    };
    uniformMap.u_instance_nodeTransform = function () {
      return renderResources.runtimeNode.axisCorrectedTransform;
    };
    shaderBuilder.addVertexLines([LegacyInstancingStageVS]);
  } else {
    shaderBuilder.addVertexLines([InstancingStageVS]);
  }

  renderResources.instanceCount = count;
  renderResources.attributes.push.apply(
    renderResources.attributes,
    instancingVertexAttributes
  );
};

const translationScratch = new Cartesian3();
const rotationScratch = new Quaternion();
const scaleScratch = new Cartesian3();
const transformScratch = new Matrix4();

function getInstanceTransformsTypedArray(instances, count, renderResources) {
  const elements = 12;
  const transformsTypedArray = new Float32Array(count * elements);

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
      transformScratch
    );

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

    renderResources.instancingTranslationMax = instancingTranslationMax;
    renderResources.instancingTranslationMin = instancingTranslationMin;
  }

  return transformsTypedArray;
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

function processMatrixAttributes(node, count, renderResources, frameState) {
  const transformsTypedArray = getInstanceTransformsTypedArray(
    node.instances,
    count,
    renderResources
  );
  const transformsVertexBuffer = Buffer.createVertexBuffer({
    context: frameState.context,
    typedArray: transformsTypedArray,
    usage: BufferUsage.STATIC_DRAW,
  });
  // Destruction of resources allocated by the ModelExperimental is handled by ModelExperimental.destroy().
  transformsVertexBuffer.vertexArrayDestroyable = false;
  renderResources.model._resources.push(transformsVertexBuffer);

  const vertexSizeInFloats = 12;
  const componentByteSize = ComponentDatatype.getSizeInBytes(
    ComponentDatatype.FLOAT
  );
  const strideInBytes = componentByteSize * vertexSizeInFloats;

  const instancingVertexAttributes = [
    {
      index: renderResources.attributeIndex++,
      vertexBuffer: transformsVertexBuffer,
      componentsPerAttribute: 4,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
      offsetInBytes: 0,
      strideInBytes: strideInBytes,
      instanceDivisor: 1,
    },
    {
      index: renderResources.attributeIndex++,
      vertexBuffer: transformsVertexBuffer,
      componentsPerAttribute: 4,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
      offsetInBytes: componentByteSize * 4,
      strideInBytes: strideInBytes,
      instanceDivisor: 1,
    },
    {
      index: renderResources.attributeIndex++,
      vertexBuffer: transformsVertexBuffer,
      componentsPerAttribute: 4,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
      offsetInBytes: componentByteSize * 8,
      strideInBytes: strideInBytes,
      instanceDivisor: 1,
    },
  ];

  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine("HAS_INSTANCE_MATRICES");
  shaderBuilder.addAttribute("vec4", "a_instancingTransformRow0");
  shaderBuilder.addAttribute("vec4", "a_instancingTransformRow1");
  shaderBuilder.addAttribute("vec4", "a_instancingTransformRow2");

  return instancingVertexAttributes;
}

// Exposed for testing
InstancingPipelineStage._getInstanceTransformsTypedArray = getInstanceTransformsTypedArray;

export default InstancingPipelineStage;
