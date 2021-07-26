import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian3 from "../Core/Cartesian3.js";
import defined from "../Core/defined.js";
import Matrix4 from "../Core/Matrix4.js";
import Quaternion from "../Core/Quaternion.js";
import RuntimeError from "../Core/RuntimeError.js";
/**
 * @private
 */
export default function ModelExperimentalUtility() {}

ModelExperimentalUtility.getFailedLoadFunction = function (model, type, path) {
  return function (error) {
    var message = "Failed to load " + type + ": " + path;
    if (defined(error)) {
      message += "\n" + error.message;
    }
    model._readyPromise.reject(new RuntimeError(message));
  };
};

ModelExperimentalUtility.getNodeTransform = function (node) {
  if (defined(node.matrix)) {
    return Matrix4.fromColumnMajorArray(node.matrix);
  }

  return Matrix4.fromTranslationQuaternionRotationScale(
    defined(node.translation) ? node.translation : new Cartesian3(),
    defined(node.rotation) ? node.rotation : Quaternion.IDENTITY,
    defined(node.scale) ? node.scale : new Cartesian3(1, 1, 1)
  );
};

ModelExperimentalUtility.getAttributeBySemantic = function (
  primitive,
  semantic
) {
  var i;
  var attributes = primitive.attributes;
  var attributesLength = attributes.length;
  for (i = 0; i < attributesLength; ++i) {
    var attribute = attributes[i];
    if (attribute.semantic === semantic) {
      return attribute;
    }
  }
};

ModelExperimentalUtility.createBoundingSphere = function (
  primitive,
  modelMatrix
) {
  var positionGltfAttribute = ModelExperimentalUtility.getAttributeBySemantic(
    primitive,
    "POSITION"
  );
  var boundingSphere = BoundingSphere.fromCornerPoints(
    positionGltfAttribute.min,
    positionGltfAttribute.max
  );

  boundingSphere.center = Matrix4.getTranslation(modelMatrix, new Cartesian3());
  return boundingSphere;
};
