import Cartesian3 from "../../Core/Cartesian3.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";
import Quaternion from "../../Core/Quaternion.js";
import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import InstanceAttributeSemantic from "../InstanceAttributeSemantic.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import InstancingStageVS from "../../Shaders/ModelExperimental/InstancingStageVS.js";

export default function InstancingPiplineStage() {}

InstancingPiplineStage.process = function (renderResources, node, frameState) {
  if (defined(node.instances.attributes.ROTATION)) {
  }

  var transformsTypedArray = getInstanceTransformsTypedArray(node.instances);
  var transformsVertexBuffer = Buffer.createVertexBuffer({
    context: frameState.context,
    typedArray: transformsTypedArray.buffer,
    usage: BufferUsage.STATIC_DRAW,
  });

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

  renderResources.instanceCount = node.instances.attributes[0].count;
  renderResources.attributes.push.apply(
    renderResources.attributes,
    instancingVertexAttributes
  );

  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine("HAS_INSTANCING");

  shaderBuilder.addAttribute("vec4", "instancingTransformRow0");
  shaderBuilder.addAttribute("vec4", "instancingTransformRow1");
  shaderBuilder.addAttribute("vec4", "instancingTransformRow2");

  shaderBuilder.addVertexLines([InstancingStageVS]);
};

var transformScratch = new Matrix4();

function getInstanceTransformsTypedArray(instances) {
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

    var offset = count * elements * i;

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
