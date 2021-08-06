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

export default function InstancingPiplineStage() {}

InstancingPiplineStage.process = function (renderResources, node, frameState) {
  var instances = node.instances;
  var instancingVertexAttributes = [];

  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine("HAS_INSTANCING");
  shaderBuilder.addVertexLines([InstancingStageVS]);

  var translationAttribute = ModelExperimentalUtility.getAttributeBySemantic(
    instances,
    InstanceAttributeSemantic.TRANSLATION
  );
  var translationMax = translationAttribute.max;
  var translationMin = translationAttribute.min;

  var rotationAttribute = ModelExperimentalUtility.getAttributeBySemantic(
    instances,
    InstanceAttributeSemantic.ROTATION
  );
  if (
    defined(rotationAttribute) ||
    (!defined(translationMax) && !defined(translationMin))
  ) {
    var transformsTypedArray = getInstanceTransformsTypedArray(
      instances,
      renderResources
    );
    var transformsVertexBuffer = Buffer.createVertexBuffer({
      context: frameState.context,
      typedArray: transformsTypedArray.buffer,
      usage: BufferUsage.STATIC_DRAW,
    });

    var vertexSizeInFloats = 12;
    var componentByteSize = ComponentDatatype.getSizeInBytes(
      ComponentDatatype.FLOAT
    );

    instancingVertexAttributes = [
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

    shaderBuilder.addDefine("HAS_INSTANCE_MATRICES");
    shaderBuilder.addAttribute("vec4", "a_instancingTransformRow0");
    shaderBuilder.addAttribute("vec4", "a_instancingTransformRow1");
    shaderBuilder.addAttribute("vec4", "a_instancingTransformRow2");
  } else {
    if (defined(translationAttribute)) {
      instancingVertexAttributes.push({
        index: renderResources.attributeIndex++,
        vertexBuffer: translationAttribute.buffer,
        componentsPerAttribute: AttributeType.getComponentsPerAttribute(
          translationAttribute.type
        ),
        componentDatatype: translationAttribute.componentDatatype,
        normalize: false,
        offsetInBytes: 0,
        strideInBytes: 0,
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
        componentsPerAttribute: AttributeType.getComponentsPerAttribute(
          scaleAttribute.type
        ),
        componentDatatype: scaleAttribute.componentDatatype,
        normalize: false,
        offsetInBytes: 0,
        strideInBytes: 0,
        instanceDivisor: 1,
      });

      shaderBuilder.addDefine("HAS_INSTANCE_SCALE");
      shaderBuilder.addAttribute("vec3", "a_instanceScale");
    }
  }

  renderResources.instanceCount = node.instances.attributes[0].count;
  renderResources.attributes.push.apply(
    renderResources.attributes,
    instancingVertexAttributes
  );
};

var transformScratch = new Matrix4();

function getInstanceTransformsTypedArray(instances, renderResources) {
  var count = instances.attributes[0].count;
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

  var instancingTranslationMax = new Cartesian3(0, 0, 0);
  var instancingTranslationMin = new Cartesian3(0, 0, 0);

  // Translations get initialized to (0, 0, 0).
  var translationTypedArray = defined(translationAttribute)
    ? translationAttribute.typedArray
    : new Float32Array(count * 3);
  var rotationTypedArray = rotationAttribute.typedArray;
  // Scales get initialized to (1, 1, 1).
  var scaleTypedArray = defined(scaleAttribute)
    ? scaleAttribute.typedArray
    : new Float32Array(count * 3);
  scaleTypedArray.fill(1);

  for (var i = 0; i < count; i++) {
    var translation = new Cartesian3(
      translationTypedArray[i * 3],
      translationTypedArray[i * 3 + 1],
      translationTypedArray[i * 3 + 2]
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
      rotationTypedArray[i * 4 + 3]
    );

    var scale = new Cartesian3(
      scaleTypedArray[i * 3],
      scaleTypedArray[i * 3 + 1],
      scaleTypedArray[i * 3 + 2]
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
