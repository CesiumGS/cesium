import defined from "../../Core/defined.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Matrix4 from "../../Core/Matrix4.js";
import Quaternion from "../../Core/Quaternion.js";

var Model2Utility = {};

Model2Utility.getAttributeBySemantic = function (primitive, semantic) {
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

Model2Utility.getNodeTransform = function (node) {
  if (defined(node.matrix)) {
    return Matrix4.fromColumnMajorArray(node.matrix);
  }

  return Matrix4.fromTranslationQuaternionRotationScale(
    defined(node.translation) ? node.translation : new Cartesian3(),
    defined(node.rotation) ? node.rotation : Quaternion.IDENTITY,
    defined(node.scale) ? node.scale : new Cartesian3(1, 1, 1)
  );
};
export default Model2Utility;
