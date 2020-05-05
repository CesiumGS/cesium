import Cartesian2 from "../Core/Cartesian2.js";
import Check from "../Core/Check.js";
import ClippingPlaneCollection from "./ClippingPlaneCollection.js";

var textureResolutionScratch = new Cartesian2();
/**
 * Gets the GLSL functions needed to retrieve clipping planes from a ClippingPlaneCollection's texture.
 *
 * @param {ClippingPlaneCollection} clippingPlaneCollection ClippingPlaneCollection with a defined texture.
 * @param {Context} context The current rendering context.
 * @returns {String} A string containing GLSL functions for retrieving clipping planes.
 * @private
 */
function getClippingFunction(clippingPlaneCollection, context) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("clippingPlaneCollection", clippingPlaneCollection);
  Check.typeOf.object("context", context);
  //>>includeEnd('debug');
  var unionClippingRegions = clippingPlaneCollection.unionClippingRegions;
  var usingFloatTexture = ClippingPlaneCollection.useFloatTexture(context);
  var textureResolution = ClippingPlaneCollection.getTextureResolution(
    clippingPlaneCollection,
    context,
    textureResolutionScratch
  );
  var width = textureResolution.x;
  var height = textureResolution.y;
  var groups = clippingPlaneCollection._groups;
  var functions = usingFloatTexture
    ? getClippingPlaneFloat(width, height)
    : getClippingPlaneUint8(width, height);
  functions += "\n";
  functions += unionClippingRegions
    ? clippingFunctionUnion(groups)
    : clippingFunctionIntersect(groups);
  return functions;
}

function clippingFunctionUnion(groups) {
  var functionString =
    "float clip(vec4 fragCoord, sampler2D clippingPlanes, mat4 clippingPlanesMatrix)\n" +
    "{\n" +
    "    vec4 position = czm_windowToEyeCoordinates(fragCoord);\n" +
    "    float pixelWidth = czm_metersPerPixel(position);\n" +
    "    bool discarded = true;\n" +
    "    bool clipped;\n" +
    "    vec3 clipNormal;\n" +
    "    vec3 clipPosition;\n" +
    "    float clipAmount;\n" +
    "    float clipAmountMax;\n" +
    "    vec4 clippingPlane;\n" +
    "    float amount; \n";

  var groupsLength = groups.length;
  for (var i = 0; i < groupsLength; ++i) {
    functionString += "    clipped = false;\n";

    var clippingPlanes = groups[i];
    var clippingPlanesLength = clippingPlanes.length;
    for (var j = 0; j < clippingPlanesLength; ++j) {
      var index = clippingPlanes[j];
      functionString +=
        "    clippingPlane = getClippingPlane(clippingPlanes, " +
        index +
        ", clippingPlanesMatrix);\n" +
        "    clipNormal = clippingPlane.xyz;\n" +
        "    clipPosition = -clippingPlane.w * clipNormal;\n" +
        "    amount = dot(clipNormal, (position.xyz - clipPosition)) / pixelWidth;\n" +
        "    clipped = clipped || (amount <= 0.0);\n";

      if (j === 0) {
        functionString += "    clipAmount = amount;\n";
      } else {
        functionString += "    clipAmount = min(amount, clipAmount);\n";
      }
    }

    functionString +=
      "    discarded = discarded && clipped;\n" +
      "    clipAmountMax = max(clipAmountMax, clipAmount);\n";
  }

  functionString +=
    "    if (discarded)\n" +
    "    {\n" +
    "        discard;\n" +
    "    }\n" +
    "    return clipAmountMax;\n" +
    "}";

  return functionString;
}

function clippingFunctionIntersect(groups) {
  var functionString =
    "float clip(vec4 fragCoord, sampler2D clippingPlanes, mat4 clippingPlanesMatrix)\n" +
    "{\n" +
    "    vec4 position = czm_windowToEyeCoordinates(fragCoord);\n" +
    "    float pixelWidth = czm_metersPerPixel(position);\n" +
    "    bool clipped;\n" +
    "    vec3 clipNormal;\n" +
    "    vec3 clipPosition;\n" +
    "    float clipAmount;\n" +
    "    float clipAmountMin;\n" +
    "    vec4 clippingPlane;\n" +
    "    float amount; \n";

  var groupsLength = groups.length;
  for (var i = 0; i < groupsLength; ++i) {
    functionString += "    clipped = true;\n" + "    clipAmount = 0.0;\n";

    var clippingPlanes = groups[i];
    var clippingPlanesLength = clippingPlanes.length;
    for (var j = 0; j < clippingPlanesLength; ++j) {
      var index = clippingPlanes[j];
      functionString +=
        "    clippingPlane = getClippingPlane(clippingPlanes, " +
        index +
        ", clippingPlanesMatrix);\n" +
        "    clipNormal = clippingPlane.xyz;\n" +
        "    clipPosition = -clippingPlane.w * clipNormal;\n" +
        "    amount = dot(clipNormal, (position.xyz - clipPosition)) / pixelWidth;\n" +
        "    clipAmount = max(amount, clipAmount);\n" +
        "    clipped = clipped && (amount <= 0.0);\n";
    }
    functionString +=
      "    if (clipped)\n" + "    {\n" + "        discard;\n" + "    };\n";

    if (i === 0) {
      functionString += "    clipAmountMin = clipAmount;\n";
    } else {
      functionString += "    clipAmountMin = min(clipAmountMin, clipAmount);\n";
    }
  }

  functionString += "    return clipAmountMin;\n" + "}";

  return functionString;
}

function getClippingPlaneFloat(width, height) {
  var pixelWidth = 1.0 / width;
  var pixelHeight = 1.0 / height;

  var pixelWidthString = pixelWidth + "";
  if (pixelWidthString.indexOf(".") === -1) {
    pixelWidthString += ".0";
  }
  var pixelHeightString = pixelHeight + "";
  if (pixelHeightString.indexOf(".") === -1) {
    pixelHeightString += ".0";
  }

  var functionString =
    "vec4 getClippingPlane(sampler2D packedClippingPlanes, int clippingPlaneNumber, mat4 transform)\n" +
    "{\n" +
    "    int pixY = clippingPlaneNumber / " +
    width +
    ";\n" +
    "    int pixX = clippingPlaneNumber - (pixY * " +
    width +
    ");\n" +
    "    float u = (float(pixX) + 0.5) * " +
    pixelWidthString +
    ";\n" + // sample from center of pixel
    "    float v = (float(pixY) + 0.5) * " +
    pixelHeightString +
    ";\n" +
    "    vec4 plane = texture2D(packedClippingPlanes, vec2(u, v));\n" +
    "    return czm_transformPlane(plane, transform);\n" +
    "}\n";
  return functionString;
}

function getClippingPlaneUint8(width, height) {
  var pixelWidth = 1.0 / width;
  var pixelHeight = 1.0 / height;

  var pixelWidthString = pixelWidth + "";
  if (pixelWidthString.indexOf(".") === -1) {
    pixelWidthString += ".0";
  }
  var pixelHeightString = pixelHeight + "";
  if (pixelHeightString.indexOf(".") === -1) {
    pixelHeightString += ".0";
  }

  var functionString =
    "vec4 getClippingPlane(sampler2D packedClippingPlanes, int clippingPlaneNumber, mat4 transform)\n" +
    "{\n" +
    "    int clippingPlaneStartIndex = clippingPlaneNumber * 2;\n" + // clipping planes are two pixels each
    "    int pixY = clippingPlaneStartIndex / " +
    width +
    ";\n" +
    "    int pixX = clippingPlaneStartIndex - (pixY * " +
    width +
    ");\n" +
    "    float u = (float(pixX) + 0.5) * " +
    pixelWidthString +
    ";\n" + // sample from center of pixel
    "    float v = (float(pixY) + 0.5) * " +
    pixelHeightString +
    ";\n" +
    "    vec4 oct32 = texture2D(packedClippingPlanes, vec2(u, v)) * 255.0;\n" +
    "    vec2 oct = vec2(oct32.x * 256.0 + oct32.y, oct32.z * 256.0 + oct32.w);\n" +
    "    vec4 plane;\n" +
    "    plane.xyz = czm_octDecode(oct, 65535.0);\n" +
    "    plane.w = czm_unpackFloat(texture2D(packedClippingPlanes, vec2(u + " +
    pixelWidthString +
    ", v)));\n" +
    "    return czm_transformPlane(plane, transform);\n" +
    "}\n";
  return functionString;
}
export default getClippingFunction;
