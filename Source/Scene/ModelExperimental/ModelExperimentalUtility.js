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
    return Promise.reject(new RuntimeError(message));
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

/**
 * Similar to getAttributeBySemantic, but search using the name field only,
 * as custom attributes do not have a semantic.
 *
 * @param {ModelComponents.Primitive|ModelComponents.Instances} object The primitive components or instances object
 * @param {String} name The name of the attribute as it appears in the model file.
 * @return {ModelComponents.Attribute} The selected attribute, or undefined if not found.
 *
 * @private
 */
ModelExperimentalUtility.getAttributeByName = function (object, name) {
  const attributes = object.attributes;
  const attributesLength = attributes.length;
  for (let i = 0; i < attributesLength; ++i) {
    const attribute = attributes[i];
    if (attribute.name === name) {
      return attribute;
    }
  }
};

/**
 * Find a feature ID from an array with label or positionalLabel matching the
 * given label
 * @param {Array.<ModelComponents.FeatureIdAttribute|ModelComponents.FeatureIdImplicitRange|ModelComponents.FeatureIdTexture>} featureIds
 * @param {String} label the label to search for
 * @return {ModelComponents.FeatureIdAttribute|ModelComponents.FeatureIdImplicitRange|ModelComponents.FeatureIdTexture} The feature ID set if found, otherwise <code>undefined</code>
 *
 * @private
 */
ModelExperimentalUtility.getFeatureIdsByLabel = function (featureIds, label) {
  for (let i = 0; i < featureIds.length; i++) {
    const featureIdSet = featureIds[i];
    if (
      featureIdSet.positionalLabel === label ||
      featureIdSet.label === label
    ) {
      return featureIdSet;
    }
  }

  return undefined;
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
 * Get the minimum and maximum values for a primitive's POSITION attribute.
 * This is used to compute the bounding sphere of the primitive, as well as
 * the bounding sphere of the whole model.
 *
 * @param {ModelComponents.Primitive} primitive The primitive components.
 * @param {Cartesian3} [instancingTranslationMin] The component-wise minimum value of the instancing translation attribute.
 * @param {Cartesian3} [instancingTranslationMax] The component-wise maximum value of the instancing translation attribute.
 *
 * @return {Object} An object containing the minimum and maximum position values.
 *
 * @private
 */
ModelExperimentalUtility.getPositionMinMax = function (
  primitive,
  instancingTranslationMin,
  instancingTranslationMax
) {
  const positionGltfAttribute = ModelExperimentalUtility.getAttributeBySemantic(
    primitive,
    "POSITION"
  );

  let positionMax = positionGltfAttribute.max;
  let positionMin = positionGltfAttribute.min;

  if (defined(instancingTranslationMax) && defined(instancingTranslationMin)) {
    positionMin = Cartesian3.add(
      positionMin,
      instancingTranslationMin,
      cartesianMinScratch
    );
    positionMax = Cartesian3.add(
      positionMax,
      instancingTranslationMax,
      cartesianMaxScratch
    );
  }

  return {
    min: positionMin,
    max: positionMax,
  };
};

/**
 * Model matrices in a model file (e.g. glTF) are typically in a different
 * coordinate system, such as with y-up instead of z-up in 3D Tiles.
 * This function returns a matrix that will correct this such that z is up,
 * and x is forward.
 *
 * @param {Axis} upAxis The original up direction
 * @param {Axis} forwardAxis The original forward direction
 * @param {Matrix4} result The matrix in which to store the result.
 * @return {Matrix4} The axis correction matrix
 *
 * @private
 */
ModelExperimentalUtility.getAxisCorrectionMatrix = function (
  upAxis,
  forwardAxis,
  result
) {
  result = Matrix4.clone(Matrix4.IDENTITY, result);

  if (upAxis === Axis.Y) {
    result = Matrix4.clone(Axis.Y_UP_TO_Z_UP, result);
  } else if (upAxis === Axis.X) {
    result = Matrix4.clone(Axis.X_UP_TO_Z_UP, result);
  }

  if (forwardAxis === Axis.Z) {
    // glTF 2.0 has a Z-forward convention that must be adapted here to X-forward.
    result = Matrix4.multiplyTransformation(result, Axis.Z_UP_TO_X_UP, result);
  }

  return result;
};
