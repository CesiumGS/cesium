import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";

/**
 * An enum describing the input semantics available for use in the
 * styling language and custom shaders.
 *
 * @enum {String}
 *
 * @private
 */
var InputSemantic = {
  /**
   * A vec3 storing the local Cartesian position before any transforms are applied.
   *
   * @type {String}
   * @constant
   */
  POSITION: "POSITION",

  /**
   * A vec3 storing the global Cartesian position after transforms are applied.
   *
   * <p>
   * POSITION_ABSOLUTE is derived from the POSITION attribute.
   * </p>
   *
   * <p>
   * Supported for backwards compatibility with pnts styling.
   * See https://github.com/CesiumGS/3d-tiles/tree/master/specification/Styling#point-cloud
   * </p>
   *
   * @type {String}
   * @constant
   */
  POSITION_ABSOLUTE: "POSITION_ABSOLUTE",

  /**
   * A vec3 storing the local normal before any transforms are applied.
   *
   * @type {String}
   * @constant
   */
  NORMAL: "NORMAL",

  /**
   * A vec3 storing the local tangent before any transforms are applied.
   *
   * @type {String}
   * @constant
   */
  TANGENT: "TANGENT",

  /**
   * A vec3 storing the local bitangent before any transforms are applied.
   *
   * @type {String}
   * @constant
   */
  BITANGENT: "BITANGENT",

  /**
   * A vec2 storing the texture coordinates.
   *
   * @type {String}
   * @constant
   */
  TEXCOORD: "TEXCOORD",

  /**
   * A vec4 storing the color.
   *
   * @type {String}
   * @constant
   */
  COLOR: "COLOR",

  /**
   * An int storing the feature ID.
   *
   * @type {String}
   * @constant
   */
  FEATURE_ID: "FEATURE_ID",
};

function variableNameToSemantic(name) {
  switch (name) {
    case "position":
      return InputSemantic.POSITION;
    case "positionAbsolute":
      return InputSemantic.POSITION_ABSOLUTE;
    case "normal":
      return InputSemantic.NORMAL;
    case "tangent":
      return InputSemantic.TANGENT;
    case "bitangent":
      return InputSemantic.BITANGENT;
    case "texCoord":
      return InputSemantic.TEXCOORD;
    case "color":
      return InputSemantic.COLOR;
    case "featureId":
      return InputSemantic.FEATURE_ID;
  }
  return undefined;
}

function semanticToVariableName(semantic) {
  switch (semantic) {
    case InputSemantic.POSITION:
      return "position";
    case InputSemantic.POSITION_ABSOLUTE:
      return "positionAbsolute";
    case InputSemantic.NORMAL:
      return "normal";
    case InputSemantic.TANGENT:
      return "tangent";
    case InputSemantic.BITANGENT:
      return "bitangent";
    case InputSemantic.TEXCOORD:
      return "texCoord";
    case InputSemantic.COLOR:
      return "color";
    case InputSemantic.FEATURE_ID:
      return "featureId";
  }
  return undefined;
}

function getVertexAttributeSemantics(semantic) {
  switch (semantic) {
    case InputSemantic.POSITION:
    case InputSemantic.POSITION_ABSOLUTE:
      return [VertexAttributeSemantic.POSITION];
    case InputSemantic.NORMAL:
      return [VertexAttributeSemantic.NORMAL];
    case InputSemantic.TANGENT:
      return [VertexAttributeSemantic.TANGENT];
    case InputSemantic.BITANGENT:
      return [VertexAttributeSemantic.TANGENT, VertexAttributeSemantic.NORMAL];
    case InputSemantic.TEXCOORD:
      return [VertexAttributeSemantic.TEXCOORD];
    case InputSemantic.COLOR:
      return [VertexAttributeSemantic.COLOR];
    case InputSemantic.FEATURE_ID:
      return [VertexAttributeSemantic.FEATURE_ID];
  }
  return [];
}

/**
 * An object containing information about the input semantic.
 *
 * @typedef {Object} InputSemanticInfo
 * @property {InputSemantic} semantic The input semantic.
 * @property {VertexAttributeSemantic[]} vertexAttributeSemantics An array of vertex attribute semantics that the input semantic is derived from.
 * @property {Number[]} setIndices An array of set indices corresponding to the vertex attribute semantics. Elements may be undefined.
 * @private
 */

/**
 * Gets the input semantic for the given variable name. Example matches include:
 *
 * <ul>
 * <li>position</li>
 * <li>positionAbsolute</li>
 * <li>featureId</li>
 * <li>featureId0</li>
 * <li>featureId1</li>
 * </ul>
 *
 * @param {String} name The variable name.
 *
 * @returns {InputSemanticInfo|undefined} An object containing information about the input semantic, or undefined if there is no match.
 *
 * @private
 */
InputSemantic.fromVariableName = function (variableName) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("variableName", variableName);
  //>>includeEnd('debug');

  var regex = /([a-zA-Z_]+)(\d*)/;
  var match = regex.exec(name);

  if (match === null) {
    return;
  }

  variableName = match[1];
  var semantic = variableNameToSemantic(variableName);
  if (!defined(semantic)) {
    return;
  }

  var vertexAttributeSemantics = getVertexAttributeSemantics(semantic);
  var vertexAttributeSemanticsLength = vertexAttributeSemantics.length;

  var setIndices = new Array(vertexAttributeSemanticsLength);

  for (var i = 0; i < vertexAttributeSemanticsLength; ++i) {
    if (VertexAttributeSemantic.hasSetIndex(vertexAttributeSemantics[i])) {
      if (match[2] === "") {
        setIndices[i] = 0;
      } else {
        setIndices[i] = parseInt(match[2]);
      }
    }
  }

  return {
    semantic: semantic,
    vertexAttributeSemantics: vertexAttributeSemantics,
    setIndices: setIndices,
  };
};

/**
 * Gets the input semantic for the given enum name. Example matches include:
 *
 * <ul>
 * <li>POSITION</li
 * <li>POSITION_ABSOLUTE</li>
 * <li>FEATURE_ID</li>
 * <li>FEATURE_ID_0</li>
 * <li>FEATURE_ID_1</li>
 * </ul>
 *
 * @param {String} enumName The enum name.
 *
 * @returns {InputSemanticInfo|undefined} An object containing information about the input semantic, or undefined if there is no match.
 *
 * @private
 */
InputSemantic.fromEnumName = function (enumName) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("enumName", enumName);
  //>>includeEnd('debug');

  var regex = /([a-zA-Z_]+)(_(\d+))?/;
  var match = regex.exec(enumName);

  if (match === null) {
    return;
  }

  var semantic = match[1];
  if (!defined(InputSemantic[semantic])) {
    return;
  }

  var vertexAttributeSemantics = getVertexAttributeSemantics(semantic);
  var vertexAttributeSemanticsLength = vertexAttributeSemantics.length;

  var setIndices = new Array(vertexAttributeSemanticsLength);

  for (var i = 0; i < vertexAttributeSemanticsLength; ++i) {
    if (VertexAttributeSemantic.hasSetIndex(vertexAttributeSemantics[i])) {
      if (match[2] === "") {
        setIndices[i] = 0;
      } else {
        setIndices[i] = parseInt(match[2]);
      }
    }
  }

  return {
    semantic: semantic,
    vertexAttributeSemantics: vertexAttributeSemantics,
    setIndices: setIndices,
  };
};

/**
 * Gets the GLSL type (such as <code>vec3</code> or <code>int</code>) for the
 * given input semantic.
 *
 * @param {InputSemantic} semantic The input semantic.
 * @returns {String} The GLSL type.
 *
 * @private
 */
InputSemantic.getGlslType = function (semantic) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("semantic", semantic);
  //>>includeEnd('debug');

  switch (semantic) {
    case InputSemantic.POSITION:
    case InputSemantic.POSITION_ABSOLUTE:
    case InputSemantic.NORMAL:
    case InputSemantic.TANGENT:
    case InputSemantic.BITANGENT:
      return "vec3";
    case InputSemantic.TEXCOORD:
      return "vec2";
    case InputSemantic.COLOR:
      return "vec4";
    case InputSemantic.FEATURE_ID:
      return "int";
    //>>includeStart('debug', pragmas.debug);
    default:
      throw new DeveloperError("semantic is not a valid value.");
    //>>includeEnd('debug');
  }
};

/**
 * Gets the variable name for the given input semantic info.
 *
 * @param {InputSemanticInfo} inputSemanticInfo An object containing information about the input semantic.
 *
 * @returns {String} The variable name.
 *
 * @private
 */
InputSemantic.getVariableName = function (inputSemanticInfo) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("inputSemanticInfo", inputSemanticInfo);
  //>>includeEnd('debug');

  var semantic = inputSemanticInfo.semantic;

  // If any derived vertex attributes have a set index use it
  var setIndex;
  var setIndices = inputSemanticInfo.setIndices;
  var setIndicesLength = setIndices.length;
  for (var i = 0; i < setIndicesLength; ++i) {
    if (defined(setIndices[i])) {
      setIndex = setIndices[i];
      break;
    }
  }

  var variableName = semanticToVariableName(semantic);
  if (defined(setIndex)) {
    variableName += setIndex;
  }
  return variableName;
};

export default Object.freeze(InputSemantic);
