import BoundingSphere from "../../Core/BoundingSphere.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";
import Quaternion from "../../Core/Quaternion.js";
import RuntimeError from "../../Core/RuntimeError.js";
import Axis from "../Axis.js";

/**
 * Utility functions for {@link ModelExperimental}.
 *
 * @private
 */
export default function ModelExperimentalUtility() {}

/**
 * Create a function for reporting when a model fails to load
 *
 * @param {ModelExperimental} model The model to report about
 * @param {String} type The type of object to report about
 * @param {String} path The URI of the model file
 * @return {Function} An error function that
 */
ModelExperimentalUtility.getFailedLoadFunction = function (model, type, path) {
  return function (error) {
    var message = "Failed to load " + type + ": " + path;
    if (defined(error)) {
      message += "\n" + error.message;
    }
    model._readyPromise.reject(new RuntimeError(message));
  };
};

/**
 * Get a transformation matrix from a node in the model.
 *
 * @param {ModelComponents.Node} node The node components
 * @return {Matrix4} The computed transformation matrix. If no transformation matrix or parameters are specified, this will be the identity matrix.
 */
ModelExperimentalUtility.getNodeTransform = function (node) {
  if (defined(node.matrix)) {
    return node.matrix;
  }

  return Matrix4.fromTranslationQuaternionRotationScale(
    defined(node.translation) ? node.translation : new Cartesian3(),
    defined(node.rotation) ? node.rotation : Quaternion.IDENTITY,
    defined(node.scale) ? node.scale : new Cartesian3(1, 1, 1)
  );
};

/**
 * Find an attribute by semantic such as POSITION or TANGENT.
 *
 * @param {ModelComponents.Primitive} primitive The primitive components
 * @param {VertexAttributeSemantic} semantic The semantic to search for
 * @return {ModelComponents.Attribute} The selected. attribute, or undefined if not found.
 */
ModelExperimentalUtility.getAttributeBySemantic = function (
  object,
  semantic,
  setIndex
) {
  var i;
  var attributes = object.attributes;
  var attributesLength = attributes.length;
  for (i = 0; i < attributesLength; ++i) {
    var attribute = attributes[i];
    var matchesSetIndex = defined(setIndex)
      ? attribute.setIndex === setIndex
      : true;
    if (attribute.semantic === semantic && matchesSetIndex) {
      return attribute;
    }
  }
};

/**
 * Create a bounding sphere from a primitive's POSITION attribute and model
 * matrix.
 *
 * @param {ModelComponents.Primitive} primitive The primitive components.
 * @param {Matrix4} modelMatrix The primitive's model matrix.
 */
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

/**
 * Model matrices in a model file (e.g. glTF) are typically in a different
 * coordinate system, such as with y-up instead of z-up. This method adjusts
 * the matrix so z is up, x is forward.
 *
 * @param {Matrix4} modelMatrix The original model matrix. This will be updated in place
 * @param {Axis} upAxis The original up direction
 * @param {Axis} forwardAxis The original forward direction
 */
ModelExperimentalUtility.correctModelMatrix = function (
  modelMatrix,
  upAxis,
  forwardAxis
) {
  if (upAxis === Axis.Y) {
    Matrix4.multiplyTransformation(modelMatrix, Axis.Y_UP_TO_Z_UP, modelMatrix);
  } else if (upAxis === Axis.X) {
    Matrix4.multiplyTransformation(modelMatrix, Axis.X_UP_TO_Z_UP, modelMatrix);
  }

  if (forwardAxis === Axis.Z) {
    // glTF 2.0 has a Z-forward convention that must be adapted here to X-forward.
    Matrix4.multiplyTransformation(modelMatrix, Axis.Z_UP_TO_X_UP, modelMatrix);
  }
};
