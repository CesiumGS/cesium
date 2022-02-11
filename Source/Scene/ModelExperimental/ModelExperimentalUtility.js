import BoundingSphere from "../../Core/BoundingSphere.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";
import Quaternion from "../../Core/Quaternion.js";
import RuntimeError from "../../Core/RuntimeError.js";
import Axis from "../Axis.js";
import AttributeType from "../AttributeType.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";

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
 * @return {Function} An error function that throws an error for the failed model
 *
 * @private
 */
ModelExperimentalUtility.getFailedLoadFunction = function (model, type, path) {
  return function (error) {
    let message = `Failed to load ${type}: ${path}`;
    if (defined(error)) {
      message += `\n${error.message}`;
    }
    model._readyPromise.reject(new RuntimeError(message));
  };
};

/**
 * Get a transformation matrix from a node in the model.
 *
 * @param {ModelComponents.Node} node The node components
 * @return {Matrix4} The computed transformation matrix. If no transformation matrix or parameters are specified, this will be the identity matrix.
 *
 * @private
 */
ModelExperimentalUtility.getNodeTransform = function (node) {
  if (defined(node.matrix)) {
    return node.matrix;
  }

  return Matrix4.fromTranslationQuaternionRotationScale(
    defined(node.translation) ? node.translation : Cartesian3.ZERO,
    defined(node.rotation) ? node.rotation : Quaternion.IDENTITY,
    defined(node.scale) ? node.scale : Cartesian3.ONE
  );
};

/**
 * Find an attribute by semantic such as POSITION or TANGENT.
 *
 * @param {ModelComponents.Primitive|ModelComponents.Instances} object The primitive components or instances object
 * @param {VertexAttributeSemantic|InstanceAttributeSemantic} semantic The semantic to search for
 * @param {Number} setIndex The set index of the semantic. May be undefined for some semantics (POSITION, NORMAL, TRANSLATION, ROTATION, for example)
 * @return {ModelComponents.Attribute} The selected attribute, or undefined if not found.
 *
 * @private
 */
ModelExperimentalUtility.getAttributeBySemantic = function (
  object,
  semantic,
  setIndex
) {
  const attributes = object.attributes;
  const attributesLength = attributes.length;
  for (let i = 0; i < attributesLength; ++i) {
    const attribute = attributes[i];
    const matchesSetIndex = defined(setIndex)
      ? attribute.setIndex === setIndex
      : true;
    if (attribute.semantic === semantic && matchesSetIndex) {
      return attribute;
    }
  }
};

ModelExperimentalUtility.hasQuantizedAttributes = function (attributes) {
  if (!defined(attributes)) {
    return false;
  }

  for (let i = 0; i < attributes.length; i++) {
    const attribute = attributes[i];
    if (defined(attribute.quantization)) {
      return true;
    }
  }
  return false;
};

/**
 * @param {ModelComponents.Attribute} attribute
 *
 * @private
 */
ModelExperimentalUtility.getAttributeInfo = function (attribute) {
  const semantic = attribute.semantic;
  const setIndex = attribute.setIndex;

  let variableName;
  let hasSemantic = false;
  if (defined(semantic)) {
    variableName = VertexAttributeSemantic.getVariableName(semantic, setIndex);
    hasSemantic = true;
  } else {
    variableName = attribute.name;
    // According to the glTF 2.0 spec, custom attributes must be prepended with
    // an underscore.
    variableName = variableName.replace(/^_/, "");
    variableName = variableName.toLowerCase();
  }

  const isVertexColor = /^color_\d+$/.test(variableName);
  const attributeType = attribute.type;
  let glslType = AttributeType.getGlslType(attributeType);

  // color_n can be either a vec3 or a vec4. But in GLSL we can always use
  // attribute vec4 since GLSL promotes vec3 attribute data to vec4 with
  // the .a channel set to 1.0.
  if (isVertexColor) {
    glslType = "vec4";
  }

  const isQuantized = defined(attribute.quantization);
  let quantizedGlslType;
  if (isQuantized) {
    // The quantized color_n attribute also is promoted to a vec4 in the shader
    quantizedGlslType = isVertexColor
      ? "vec4"
      : AttributeType.getGlslType(attribute.quantization.type);
  }

  return {
    attribute: attribute,
    isQuantized: isQuantized,
    variableName: variableName,
    hasSemantic: hasSemantic,
    glslType: glslType,
    quantizedGlslType: quantizedGlslType,
  };
};

const cartesianMaxScratch = new Cartesian3();
const cartesianMinScratch = new Cartesian3();
/**
 * Create a bounding sphere from a primitive's POSITION attribute and model
 * matrix.
 *
 * @param {ModelComponents.Primitive} primitive The primitive components.
 * @param {Matrix4} modelMatrix The primitive's model matrix.
 * @param {Cartesian3} [instancingTranslationMax] The component-wise maximum value of the instancing translation attribute.
 * @param {Cartesian3} [instancingTranslationMin] The component-wise minimum value of the instancing translation attribute.
 */
ModelExperimentalUtility.createBoundingSphere = function (
  primitive,
  modelMatrix,
  instancingTranslationMax,
  instancingTranslationMin
) {
  const positionGltfAttribute = ModelExperimentalUtility.getAttributeBySemantic(
    primitive,
    "POSITION"
  );

  const positionMax = positionGltfAttribute.max;
  const positionMin = positionGltfAttribute.min;

  let boundingSphere;
  if (defined(instancingTranslationMax) && defined(instancingTranslationMin)) {
    const computedMin = Cartesian3.add(
      positionMin,
      instancingTranslationMin,
      cartesianMinScratch
    );
    const computedMax = Cartesian3.add(
      positionMax,
      instancingTranslationMax,
      cartesianMaxScratch
    );
    boundingSphere = BoundingSphere.fromCornerPoints(computedMin, computedMax);
  } else {
    boundingSphere = BoundingSphere.fromCornerPoints(positionMin, positionMax);
  }

  BoundingSphere.transform(boundingSphere, modelMatrix, boundingSphere);
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
 *
 * @private
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
