import Cartesian2 from "../Core/Cartesian2.js";
import Check from "../Core/Check.js";
import ClippingPlaneCollection from "./ClippingPlaneCollection.js";

const textureResolutionScratch = new Cartesian2();
/**
 * Gets the GLSL functions needed to retrieve clipping planes from a ClippingPlaneCollection's texture.
 *
 * @param {ClippingPlaneCollection} clippingPlaneCollection ClippingPlaneCollection with a defined texture.
 * @param {Context} context The current rendering context.
 * @returns {string} A string containing GLSL functions for retrieving clipping planes.
 * @private
 */
function getClippingFunction(clippingPlaneCollection, context) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("clippingPlaneCollection", clippingPlaneCollection);
  Check.typeOf.object("context", context);
  //>>includeEnd('debug');
  const unionClippingRegions = clippingPlaneCollection.unionClippingRegions;
  const clippingPlanesLength = clippingPlaneCollection.length;
  const usingFloatTexture = ClippingPlaneCollection.useFloatTexture(context);
  const textureResolution = ClippingPlaneCollection.getTextureResolution(
    clippingPlaneCollection,
    context,
    textureResolutionScratch,
  );
  const width = textureResolution.x;
  const height = textureResolution.y;

  let functions = usingFloatTexture
    ? getClippingPlaneFloat(width, height)
    : getClippingPlaneUint8(width, height);
  functions += "\n";
  functions += unionClippingRegions
    ? clippingFunctionUnion(clippingPlanesLength)
    : clippingFunctionIntersect(clippingPlanesLength);
  return functions;
}

function clippingFunctionUnion(clippingPlanesLength) {
  return `float clip(vec4 fragCoord, sampler2D clippingPlanes, mat4 clippingPlanesMatrix)
{
    vec4 position = czm_windowToEyeCoordinates(fragCoord);
    vec3 clipNormal = vec3(0.0);
    vec3 clipPosition = vec3(0.0);
    float clipAmount;
    float pixelWidth = czm_metersPerPixel(position);
    bool breakAndDiscard = false;
    for (int i = 0; i < ${clippingPlanesLength}; ++i)
    {
        vec4 clippingPlane = getClippingPlane(clippingPlanes, i, clippingPlanesMatrix);
        clipNormal = clippingPlane.xyz;
        clipPosition = -clippingPlane.w * clipNormal;
        float amount = dot(clipNormal, (position.xyz - clipPosition)) / pixelWidth;
        clipAmount = czm_branchFreeTernary(i == 0, amount, min(amount, clipAmount));
        if (amount <= 0.0)
        {
            breakAndDiscard = true;
            // HLSL compiler bug if we discard here: https://bugs.chromium.org/p/angleproject/issues/detail?id=1945#c6
            break;
         }
    }
    if (breakAndDiscard) {
        discard;
    }
    return clipAmount;
}
`;
}

function clippingFunctionIntersect(clippingPlanesLength) {
  return `float clip(vec4 fragCoord, sampler2D clippingPlanes, mat4 clippingPlanesMatrix)
{
    bool clipped = true;
    vec4 position = czm_windowToEyeCoordinates(fragCoord);
    vec3 clipNormal = vec3(0.0);
    vec3 clipPosition = vec3(0.0);
    float clipAmount = 0.0;
    float pixelWidth = czm_metersPerPixel(position);
    for (int i = 0; i < ${clippingPlanesLength}; ++i)
    {
        vec4 clippingPlane = getClippingPlane(clippingPlanes, i, clippingPlanesMatrix);
        clipNormal = clippingPlane.xyz;
        clipPosition = -clippingPlane.w * clipNormal;
        float amount = dot(clipNormal, (position.xyz - clipPosition)) / pixelWidth;
        clipAmount = max(amount, clipAmount);
        clipped = clipped && (amount <= 0.0);
    }
    if (clipped)
    {
        discard;
    }
    return clipAmount;
 }
`;
}

function getClippingPlaneFloat(width, height) {
  const pixelWidth = 1.0 / width;
  const pixelHeight = 1.0 / height;

  let pixelWidthString = `${pixelWidth}`;
  if (pixelWidthString.indexOf(".") === -1) {
    pixelWidthString += ".0";
  }
  let pixelHeightString = `${pixelHeight}`;
  if (pixelHeightString.indexOf(".") === -1) {
    pixelHeightString += ".0";
  }

  return `vec4 getClippingPlane(highp sampler2D packedClippingPlanes, int clippingPlaneNumber, mat4 transform)
{
    int pixY = clippingPlaneNumber / ${width};
    int pixX = clippingPlaneNumber - (pixY * ${width});
    // Sample from center of pixel
    float u = (float(pixX) + 0.5) * ${pixelWidthString};
    float v = (float(pixY) + 0.5) * ${pixelHeightString};
    vec4 plane = texture(packedClippingPlanes, vec2(u, v));
    return czm_transformPlane(plane, transform);
}
`;
}

function getClippingPlaneUint8(width, height) {
  const pixelWidth = 1.0 / width;
  const pixelHeight = 1.0 / height;

  let pixelWidthString = `${pixelWidth}`;
  if (pixelWidthString.indexOf(".") === -1) {
    pixelWidthString += ".0";
  }
  let pixelHeightString = `${pixelHeight}`;
  if (pixelHeightString.indexOf(".") === -1) {
    pixelHeightString += ".0";
  }

  return `vec4 getClippingPlane(highp sampler2D packedClippingPlanes, int clippingPlaneNumber, mat4 transform)
{
    int clippingPlaneStartIndex = clippingPlaneNumber * 2;
    int pixY = clippingPlaneStartIndex / ${width};
    int pixX = clippingPlaneStartIndex - (pixY * ${width});
    // Sample from center of pixel
    float u = (float(pixX) + 0.5) * ${pixelWidthString};
    float v = (float(pixY) + 0.5) * ${pixelHeightString};
    vec4 oct32 = texture(packedClippingPlanes, vec2(u, v)) * 255.0;
    vec2 oct = vec2(oct32.x * 256.0 + oct32.y, oct32.z * 256.0 + oct32.w);
    vec4 plane;
    plane.xyz = czm_octDecode(oct, 65535.0);
    plane.w = czm_unpackFloat(texture(packedClippingPlanes, vec2(u + ${pixelWidthString}, v)));
    return czm_transformPlane(plane, transform);
}
`;
}
export default getClippingFunction;
