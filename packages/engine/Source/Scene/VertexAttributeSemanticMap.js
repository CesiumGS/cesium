import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";

/**
 * An enum describing the built-in vertex attribute semantics.
 *
 * @enum {string}
 *
 * @private
 */
const VertexAttributeSemantic = {
  /**
   * Per-vertex position.
   *
   * @type {string}
   * @constant
   */
  POSITION: "POSITION",

  /**
   * Per-vertex normal.
   *
   * @type {string}
   * @constant
   */
  NORMAL: "NORMAL",

  /**
   * Per-vertex tangent.
   *
   * @type {string}
   * @constant
   */
  TANGENT: "TANGENT",

  /**
   * Per-vertex texture coordinates.
   *
   * @type {string}
   * @constant
   */
  TEXCOORD: "TEXCOORD",

  /**
   * Per-vertex color.
   *
   * @type {string}
   * @constant
   */
  COLOR: "COLOR",

  /**
   * Per-vertex joint IDs for skinning.
   *
   * @type {string}
   * @constant
   */
  JOINTS: "JOINTS",

  /**
   * Per-vertex joint weights for skinning.
   *
   * @type {string}
   * @constant
   */
  WEIGHTS: "WEIGHTS",

  /**
   * Per-vertex feature ID.
   *
   * @type {string}
   * @constant
   */
  FEATURE_ID: "_FEATURE_ID",
  /**
   * Gaussian Splat Scale
   *
   * @type {string}
   * @constant
   */
  SCALE: "_SCALE",
  /**
   * Gaussian Splat Rotation
   *
   * @type {string}
   * @constant
   */
  ROTATION: "_ROTATION",
};

function semanticToVariableName(semantic) {
  switch (semantic) {
    case VertexAttributeSemantic.POSITION:
      return "positionMC";
    case VertexAttributeSemantic.NORMAL:
      return "normalMC";
    case VertexAttributeSemantic.TANGENT:
      return "tangentMC";
    case VertexAttributeSemantic.TEXCOORD:
      return "texCoord";
    case VertexAttributeSemantic.COLOR:
      return "color";
    case VertexAttributeSemantic.JOINTS:
      return "joints";
    case VertexAttributeSemantic.WEIGHTS:
      return "weights";
    case VertexAttributeSemantic.FEATURE_ID:
      return "featureId";
    case VertexAttributeSemantic.SCALE:
      return "scale";
    case VertexAttributeSemantic.ROTATION:
      return "rotation";
    //>>includeStart('debug', pragmas.debug);
    default:
      throw new DeveloperError("semantic is not a valid value.");
    //>>includeEnd('debug');
  }
}

/**
 * Returns whether the vertex attribute semantic can have a set index.
 *
 * @param {VertexAttributeSemantic} semantic The semantic.
 *
 * @returns {boolean} Whether the semantic can have a set index.
 *
 * @private
 */
VertexAttributeSemantic.hasSetIndex = function (semantic) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("semantic", semantic);
  //>>includeEnd('debug');

  switch (semantic) {
    case VertexAttributeSemantic.POSITION:
    case VertexAttributeSemantic.NORMAL:
    case VertexAttributeSemantic.TANGENT:
      return false;
    case VertexAttributeSemantic.TEXCOORD:
    case VertexAttributeSemantic.COLOR:
    case VertexAttributeSemantic.JOINTS:
    case VertexAttributeSemantic.WEIGHTS:
    case VertexAttributeSemantic.FEATURE_ID:
    case VertexAttributeSemantic.SCALE:
    case VertexAttributeSemantic.ROTATION:
      return true;
    //>>includeStart('debug', pragmas.debug);
    default:
      throw new DeveloperError("semantic is not a valid value.");
    //>>includeEnd('debug');
  }
};

/**
 * Gets the vertex attribute semantic matching the glTF semantic.
 *
 * @param {string} gltfSemantic The glTF semantic.
 *
 * @returns {VertexAttributeSemantic|undefined} The vertex attribute semantic, or undefined if there is no match.
 *
 * @private
 */
VertexAttributeSemantic.fromGltfSemantic = function (gltfSemantic) {
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
    case "POSITION":
      return VertexAttributeSemantic.POSITION;
    case "NORMAL":
      return VertexAttributeSemantic.NORMAL;
    case "TANGENT":
      return VertexAttributeSemantic.TANGENT;
    case "TEXCOORD":
      return VertexAttributeSemantic.TEXCOORD;
    case "COLOR":
      return VertexAttributeSemantic.COLOR;
    case "JOINTS":
      return VertexAttributeSemantic.JOINTS;
    case "WEIGHTS":
      return VertexAttributeSemantic.WEIGHTS;
    case "_FEATURE_ID":
      return VertexAttributeSemantic.FEATURE_ID;
    case "_SCALE":
      return VertexAttributeSemantic.SCALE;
    case "_ROTATION":
      return VertexAttributeSemantic.ROTATION;
  }

  return undefined;
};

/**
 * Gets the vertex attribute semantic matching the pnts semantic.
 *
 * @param {string} pntsSemantic The pnts semantic.
 *
 * @returns {VertexAttributeSemantic|undefined} The vertex attribute semantic, or undefined if there is no match.
 *
 * @private
 */
VertexAttributeSemantic.fromPntsSemantic = function (pntsSemantic) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("pntsSemantic", pntsSemantic);
  //>>includeEnd('debug');

  switch (pntsSemantic) {
    case "POSITION":
    case "POSITION_QUANTIZED":
      return VertexAttributeSemantic.POSITION;
    case "RGBA":
    case "RGB":
    case "RGB565":
      return VertexAttributeSemantic.COLOR;
    case "NORMAL":
    case "NORMAL_OCT16P":
      return VertexAttributeSemantic.NORMAL;
    case "BATCH_ID":
      return VertexAttributeSemantic.FEATURE_ID;
    //>>includeStart('debug', pragmas.debug);
    default:
      throw new DeveloperError("pntsSemantic is not a valid value.");
    //>>includeEnd('debug');
  }
};

/**
 * Gets the GLSL type (such as <code>vec3</code> or <code>int</code>) for the
 * given vertex attribute.
 *
 * @param {VertexAttributeSemantic} semantic The semantic.
 *
 * @returns {string} The shader type.
 *
 * @private
 */
VertexAttributeSemantic.getGlslType = function (semantic) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("semantic", semantic);
  //>>includeEnd('debug');

  switch (semantic) {
    case VertexAttributeSemantic.POSITION:
    case VertexAttributeSemantic.NORMAL:
    case VertexAttributeSemantic.TANGENT:
      return "vec3";
    case VertexAttributeSemantic.TEXCOORD:
      return "vec2";
    case VertexAttributeSemantic.COLOR:
      return "vec4";
    case VertexAttributeSemantic.JOINTS:
      return "ivec4";
    case VertexAttributeSemantic.WEIGHTS:
      return "vec4";
    case VertexAttributeSemantic.FEATURE_ID:
      return "int";
    case VertexAttributeSemantic.SCALE:
      return "vec3";
    case VertexAttributeSemantic.ROTATION:
      return "vec4";
    case VertexAttributeSemantic.OPACITY:
      return "float";
    //>>includeStart('debug', pragmas.debug);
    default:
      throw new DeveloperError("semantic is not a valid value.");
    //>>includeEnd('debug');
  }
};

/**
 * Gets the variable name for the given semantic and set index.
 *
 * @param {VertexAttributeSemantic} semantic The semantic.
 * @param {number} [setIndex] The set index.
 *
 * @returns {string} The variable name.
 *
 * @private
 */
VertexAttributeSemantic.getVariableName = function (semantic, setIndex) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("semantic", semantic);
  //>>includeEnd('debug');

  let variableName = semanticToVariableName(semantic);
  if (defined(setIndex)) {
    variableName += `_${setIndex}`;
  }
  return variableName;
};

export default Object.freeze(VertexAttributeSemantic);
