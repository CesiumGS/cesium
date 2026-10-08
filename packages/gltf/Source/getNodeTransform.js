import { Cartesian3, Matrix4, Quaternion, defined } from "@cesium/core";

/**
 * Gets the local transform of a glTF node as a column-major array of 16 numbers.
 *
 * @param {object} nodeJson The glTF node.
 * @returns {number[]|undefined} The transform, or <code>undefined</code> if the node has no <code>matrix</code>, <code>translation</code>, <code>rotation</code>, or <code>scale</code>.
 *
 * @internal
 */
function getNodeTransform(nodeJson) {
  const { matrix, translation, rotation, scale } = nodeJson;
  if (defined(matrix)) {
    return matrix;
  }
  if (!defined(translation) && !defined(rotation) && !defined(scale)) {
    return undefined;
  }

  const transform = Matrix4.fromTranslationQuaternionRotationScale(
    defined(translation) ? Cartesian3.unpack(translation) : Cartesian3.ZERO,
    defined(rotation) ? Quaternion.unpack(rotation) : Quaternion.IDENTITY,
    defined(scale) ? Cartesian3.unpack(scale) : new Cartesian3(1.0, 1.0, 1.0),
  );
  return Matrix4.pack(transform, new Array(16));
}

export default getNodeTransform;
