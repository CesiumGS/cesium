import Cartesian3 from "../../Core/Cartesian3.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";
import Quaternion from "../../Core/Quaternion.js";
import RuntimeError from "../../Core/RuntimeError.js";
import Axis from "../Axis.js";
import AttributeType from "../AttributeType.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import CullFace from "../CullFace.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import Matrix3 from "../../Core/Matrix3.js";

/**
 * Utility functions for {@link Model}.
 *
 * @private
 */
function ModelUtility() {}

/**
 * Create a function for reporting when a model fails to load
 *
 * @param {Model} model The model to report about
 * @param {String} type The type of object to report about
 * @param {String} path The URI of the model file
 * @returns {Function} An error function that throws an error for the failed model
 *
 * @private
 */
ModelUtility.getFailedLoadFunction = function (model, type, path) {
  return function (error) {
    let message = `Failed to load ${type}: ${path}`;
    if (defined(error)) {
      message += `\n${error.message}`;
    }

    const runtimeError = new RuntimeError(message);
    if (defined(error)) {
      // the original call stack is often more useful than the new error's stack,
      // so add the information here
      runtimeError.stack = `Original stack:\n${error.stack}\nHandler stack:\n${runtimeError.stack}`;
    }

    return Promise.reject(runtimeError);
  };
};

/**
 * Get a transformation matrix from a node in the model.
 *
 * @param {ModelComponents.Node} node The node components
 * @returns {Matrix4} The computed transformation matrix. If no transformation matrix or parameters are specified, this will be the identity matrix.
 *
 * @private
 */
ModelUtility.getNodeTransform = function (node) {
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
 * @param {Number} [setIndex] The set index of the semantic. May be undefined for some semantics (POSITION, NORMAL, TRANSLATION, ROTATION, for example)
 * @return {ModelComponents.Attribute} The selected attribute, or undefined if not found.
 *
 * @private
 */
ModelUtility.getAttributeBySemantic = function (object, semantic, setIndex) {
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
ModelUtility.getAttributeByName = function (object, name) {
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
 * @returns {ModelComponents.FeatureIdAttribute|ModelComponents.FeatureIdImplicitRange|ModelComponents.FeatureIdTexture} The feature ID set if found, otherwise <code>undefined</code>
 *
 * @private
 */
ModelUtility.getFeatureIdsByLabel = function (featureIds, label) {
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

ModelUtility.hasQuantizedAttributes = function (attributes) {
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
ModelUtility.getAttributeInfo = function (attribute) {
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
 * @returns {Object} An object containing the minimum and maximum position values.
 *
 * @private
 */
ModelUtility.getPositionMinMax = function (
  primitive,
  instancingTranslationMin,
  instancingTranslationMax
) {
  const positionGltfAttribute = ModelUtility.getAttributeBySemantic(
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
 * @returns {Matrix4} The axis correction matrix
 *
 * @private
 */
ModelUtility.getAxisCorrectionMatrix = function (upAxis, forwardAxis, result) {
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

const scratchMatrix3 = new Matrix3();

/**
 * Get the cull face to use in the command's render state.
 * <p>
 * From the glTF spec section 3.7.4:
 * When a mesh primitive uses any triangle-based topology (i.e., triangles,
 * triangle strip, or triangle fan), the determinant of the node’s global
 * transform defines the winding order of that primitive. If the determinant
 * is a positive value, the winding order triangle faces is counterclockwise;
 * in the opposite case, the winding order is clockwise.
 * </p>
 *
 * @param {Matrix4} modelMatrix The model matrix
 * @param {PrimitiveType} primitiveType The primitive type
 * @returns {CullFace} The cull face
 *
 * @private
 */
ModelUtility.getCullFace = function (modelMatrix, primitiveType) {
  if (!PrimitiveType.isTriangles(primitiveType)) {
    return CullFace.BACK;
  }

  const matrix3 = Matrix4.getMatrix3(modelMatrix, scratchMatrix3);
  return Matrix3.determinant(matrix3) < 0.0 ? CullFace.FRONT : CullFace.BACK;
};

/**
 * Sanitize the identifier to be used in a GLSL shader. The identifier
 * is sanitized as follows:
 * - Replace all sequences of non-alphanumeric characters with a single `_`.
 * - If the gl_ prefix is present, remove it. The prefix is reserved in GLSL.
 * - If the identifier starts with a digit, prefix it with an underscore.
 *
 * @example
 * // Returns "customProperty"
 * ModelUtility.sanitizeGlslIdentifier("gl_customProperty");
 *
 * @example
 * // Returns "_1234"
 * ModelUtility.sanitizeGlslIdentifier("1234");
 *
 * @param {String} identifier The original identifier.
 *
 * @returns {String} The sanitized version of the identifier.
 */
ModelUtility.sanitizeGlslIdentifier = function (identifier) {
  // Remove non-alphanumeric characters and replace with a single underscore.
  // This regex is designed so that the result won't have multiple underscores
  // in a row.
  let sanitizedIdentifier = identifier.replaceAll(/[^A-Za-z0-9]+/g, "_");
  // Remove the gl_ prefix if present.
  sanitizedIdentifier = sanitizedIdentifier.replace(/^gl_/, "");
  // Add an underscore if first character is a digit.
  if (/^\d/.test(sanitizedIdentifier)) {
    sanitizedIdentifier = `_${sanitizedIdentifier}`;
  }

  return sanitizedIdentifier;
};

ModelUtility.supportedExtensions = {
  AGI_articulations: true,
  CESIUM_primitive_outline: true,
  CESIUM_RTC: true,
  EXT_feature_metadata: true,
  EXT_instance_features: true,
  EXT_mesh_features: true,
  EXT_mesh_gpu_instancing: true,
  EXT_meshopt_compression: true,
  EXT_structural_metadata: true,
  EXT_texture_webp: true,
  KHR_blend: true,
  KHR_draco_mesh_compression: true,
  KHR_techniques_webgl: true,
  KHR_materials_common: true,
  KHR_materials_pbrSpecularGlossiness: true,
  KHR_materials_unlit: true,
  KHR_mesh_quantization: true,
  KHR_texture_basisu: true,
  KHR_texture_transform: true,
};

/**
 * Checks whether or not the extensions required by the glTF are
 * supported. If an unsupported extension is found, this throws
 * a {@link RuntimeError} with the extension name.
 *
 * @param {Array<String>} extensionsRequired The extensionsRequired array in the glTF.
 */
ModelUtility.checkSupportedExtensions = function (extensionsRequired) {
  const length = extensionsRequired.length;
  for (let i = 0; i < length; i++) {
    const extension = extensionsRequired[i];
    if (!ModelUtility.supportedExtensions[extension]) {
      throw new RuntimeError(`Unsupported glTF Extension: ${extension}`);
    }
  }
};

export default ModelUtility;
