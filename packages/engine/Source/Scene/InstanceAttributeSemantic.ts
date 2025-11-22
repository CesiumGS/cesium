import Check from "../Core/Check.js";

/**
 * An enum describing the built-in instance attribute semantics.
 *
 * @enum {string}
 *
 * @private
 */
const InstanceAttributeSemantic = {
  /**
   * Per-instance translation.
   *
   * @type {string}
   * @constant
   */
  TRANSLATION: "TRANSLATION",

  /**
   * Per-instance rotation.
   *
   * @type {string}
   * @constant
   */
  ROTATION: "ROTATION",

  /**
   * Per-instance scale.
   *
   * @type {string}
   * @constant
   */
  SCALE: "SCALE",

  /**
   * Per-instance feature ID.
   *
   * @type {string}
   * @constant
   */
  FEATURE_ID: "_FEATURE_ID",
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
  //>>includeEnd('debug');

  let semantic = gltfSemantic;

  // Strip the set index from the semantic
  const setIndexRegex = /^(\w+)_\d+$/;
  const setIndexMatch = setIndexRegex.exec(gltfSemantic);
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
