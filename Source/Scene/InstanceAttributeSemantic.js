import Check from "../Core/Check.js";

/**
 * An enum describing the built-in instance attribute semantics.
 *
 * @enum {String}
 *
 * @private
 */
var InstanceAttributeSemantic = {
  /**
   * Per-instance translation.
   *
   * @type {String}
   * @constant
   */
  TRANSLATION: "TRANSLATION",

  /**
   * Per-instance rotation.
   *
   * @type {String}
   * @constant
   */
  ROTATION: "ROTATION",

  /**
   * Per-instance scale.
   *
   * @type {String}
   * @constant
   */
  SCALE: "SCALE",

  /**
   * Per-instance feature ID.
   *
   * @type {String}
   * @constant
   */
  FEATURE_ID: "FEATURE_ID",
};

/**
 * Gets the instance attribute semantic matching the glTF attribute semantic.
 *
 * @returns {InstanceAttributeSemantic} The instance attribute semantic, or undefined if there is no match.
 *
 * @private
 */
InstanceAttributeSemantic.fromGltfSemantic = function (gltfSemantic) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("gltfSemantic", gltfSemantic);
  //>>includeEnd('debug')

  var semantic = gltfSemantic;

  // Strip the set index from the semantic
  var setIndexRegex = /^(\w+)_\d+$/;
  var setIndexMatch = setIndexRegex.exec(gltfSemantic);
  if (setIndexMatch !== null) {
    semantic = setIndexMatch[1];
  }

  switch (semantic) {
    case "TRANSLATION":
      return InstanceAttributeSemantic.TRANSLATION;
    case "ROTATION":
      return InstanceAttributeSemantic.ROTATION;
    case "SCALE":
      return InstanceAttributeSemantic.SCALE;
    case "_FEATURE_ID":
      return InstanceAttributeSemantic.FEATURE_ID;
  }

  return undefined;
};

export default Object.freeze(InstanceAttributeSemantic);
