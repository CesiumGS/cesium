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
import InstancingStageVS from "../../Shaders/ModelExperimental/InstancingStageVS.js";

/**
 * The instancing pipeline stage is responsible for handling GPU mesh instancing at the node
 * level.
 *
 * @namespace InstancingPipelineStage
 * @private
 */
var InstancingPipelineStage = {};
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
  var instances = node.instances;
  var count = instances.attributes[0].count;
  var instancingVertexAttributes = [];

  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine("HAS_INSTANCING");
  shaderBuilder.addVertexLines([InstancingStageVS]);

  var translationAttribute = ModelExperimentalUtility.getAttributeBySemantic(
    instances,
    InstanceAttributeSemantic.TRANSLATION
  );

  var translationMax;
  var translationMin;
  if (defined(translationAttribute)) {
    translationMax = translationAttribute.max;
    translationMin = translationAttribute.min;
  }

  var rotationAttribute = ModelExperimentalUtility.getAttributeBySemantic(
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

    var scaleAttribute = ModelExperimentalUtility.getAttributeBySemantic(
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

  renderResources.instanceCount = count;
  renderResources.attributes.push.apply(
    renderResources.attributes,
    instancingVertexAttributes
  );
};

var translationScratch = new Cartesian3();
var rotationScratch = new Quaternion();
var scaleScratch = new Cartesian3();
var transformScratch = new Matrix4();

function getInstanceTransformsTypedArray(instances, count, renderResources) {
  var elements = 12;
  var transformsTypedArray = new Float32Array(count * elements);

  var translationAttribute = ModelExperimentalUtility.getAttributeBySemantic(
    instances,
    InstanceAttributeSemantic.TRANSLATION
  );
  var rotationAttribute = ModelExperimentalUtility.getAttributeBySemantic(
    instances,
    InstanceAttributeSemantic.ROTATION
  );
  var scaleAttribute = ModelExperimentalUtility.getAttributeBySemantic(
    instances,
    InstanceAttributeSemantic.SCALE
  );

  var instancingTranslationMax = new Cartesian3(
    -Number.MAX_VALUE,
    -Number.MAX_VALUE,
    -Number.MAX_VALUE
  );
  var instancingTranslationMin = new Cartesian3(
    Number.MAX_VALUE,
    Number.MAX_VALUE,
    Number.MAX_VALUE
  );

  var hasTranslation = defined(translationAttribute);
  var hasRotation = defined(rotationAttribute);
  var hasScale = defined(scaleAttribute);

  // Translations get initialized to (0, 0, 0).
  var translationTypedArray = hasTranslation
    ? translationAttribute.typedArray
    : new Float32Array(count * 3);
  // Rotations get initialized to (0, 0, 0, 0). The w-component is set to 1 in the loop below.
  var rotationTypedArray = hasRotation
    ? rotationAttribute.typedArray
    : new Float32Array(count * 4);
  // Scales get initialized to (1, 1, 1).
  var scaleTypedArray;
  if (hasScale) {
    scaleTypedArray = scaleAttribute.typedArray;
  } else {
    scaleTypedArray = new Float32Array(count * 3);
    scaleTypedArray.fill(1);
  }

  for (var i = 0; i < count; i++) {
    var translation = new Cartesian3(
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

    var rotation = new Quaternion(
      rotationTypedArray[i * 4],
      rotationTypedArray[i * 4 + 1],
      rotationTypedArray[i * 4 + 2],
      hasRotation ? rotationTypedArray[i * 4 + 3] : 1,
      rotationScratch
    );

    var scale = new Cartesian3(
      scaleTypedArray[i * 3],
      scaleTypedArray[i * 3 + 1],
      scaleTypedArray[i * 3 + 2],
      scaleScratch
    );

    var transform = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale,
      transformScratch
    );

    var offset = elements * i;

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
  var attributes = instances.attributes;
  var model = renderResources.model;
  var shaderBuilder = renderResources.shaderBuilder;

  // Load Feature ID vertex attributes. These are loaded as typed arrays in GltfLoader
  // because we want to expose the instance feature ID when picking.
  for (var i = 0; i < attributes.length; i++) {
    var attribute = attributes[i];
    if (attribute.semantic !== InstanceAttributeSemantic.FEATURE_ID) {
      continue;
    }

    if (
      attribute.setIndex >= renderResources.featureIdVertexAttributeSetIndex
    ) {
      renderResources.featureIdVertexAttributeSetIndex = attribute.setIndex + 1;
    }

    var vertexBuffer = Buffer.createVertexBuffer({
      context: frameState.context,
      typedArray: attribute.typedArray,
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
      "a_instanceFeatureId_" + attribute.setIndex
    );
  }

  var featureIdAttributes = instances.featureIdAttributes;
  var featureIdAttributeIndex = model.featureIdAttributeIndex;
  if (featureIdAttributeIndex < featureIdAttributes.length) {
    renderResources.featureTableId =
      featureIdAttributes[featureIdAttributeIndex].featureTableId;
  }
}

function processMatrixAttributes(node, count, renderResources, frameState) {
  var transformsTypedArray = getInstanceTransformsTypedArray(
    node.instances,
    count,
    renderResources
  );
  var transformsVertexBuffer = Buffer.createVertexBuffer({
    context: frameState.context,
    typedArray: transformsTypedArray,
    usage: BufferUsage.STATIC_DRAW,
  });
  // Destruction of resources allocated by the ModelExperimental is handled by ModelExperimental.destroy().
  transformsVertexBuffer.vertexArrayDestroyable = false;
  renderResources.model._resources.push(transformsVertexBuffer);

  var vertexSizeInFloats = 12;
  var componentByteSize = ComponentDatatype.getSizeInBytes(
    ComponentDatatype.FLOAT
  );

  var instancingVertexAttributes = [
    {
      index: renderResources.attributeIndex++,
      vertexBuffer: transformsVertexBuffer,
      componentsPerAttribute: 4,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
      offsetInBytes: 0,
      strideInBytes: componentByteSize * vertexSizeInFloats,
      instanceDivisor: 1,
    },
    {
      index: renderResources.attributeIndex++,
      vertexBuffer: transformsVertexBuffer,
      componentsPerAttribute: 4,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
      offsetInBytes: componentByteSize * 4,
      strideInBytes: componentByteSize * vertexSizeInFloats,
      instanceDivisor: 1,
    },
    {
      index: renderResources.attributeIndex++,
      vertexBuffer: transformsVertexBuffer,
      componentsPerAttribute: 4,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
      offsetInBytes: componentByteSize * 8,
      strideInBytes: componentByteSize * vertexSizeInFloats,
      instanceDivisor: 1,
    },
  ];

  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine("HAS_INSTANCE_MATRICES");
  shaderBuilder.addAttribute("vec4", "a_instancingTransformRow0");
  shaderBuilder.addAttribute("vec4", "a_instancingTransformRow1");
  shaderBuilder.addAttribute("vec4", "a_instancingTransformRow2");

  return instancingVertexAttributes;
}

// Exposed for testing
InstancingPipelineStage._getInstanceTransformsTypedArray = getInstanceTransformsTypedArray;

export default InstancingPipelineStage;
