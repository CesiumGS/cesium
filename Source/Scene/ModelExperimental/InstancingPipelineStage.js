import Cartesian3 from "../../Core/Cartesian3.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";
import Quaternion from "../../Core/Quaternion.js";
import InstanceAttributeSemantic from "../InstanceAttributeSemantic.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";

export default function InstancingPiplineStage() {}

InstancingPiplineStage.process = function (renderResources, node) {
  console.log(node);

  var attributes = node.instances.attributes;
};

var transformScratch = new Matrix4();

function buildInstancingMatrices(instances) {
  var count = instances.attributes[0].count;

  var instanceTransformRow0 = new Float32Array(count * 4);
  var instanceTransformRow1 = new Float32Array(count * 4);
  var instanceTransformRow2 = new Float32Array(count * 4);

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
    ? rotationAttribute.typedArray
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
  }
}
