import Check from "../Core/Check.js";

/**
 * Gets a GLSL snippet that clips a fragment using the `clip` function from {@link getClippingFunction} and styles it.
 *
 * @param {string} samplerUniformName Name of the uniform for the clipping planes texture sampler.
 * @param {string} matrixUniformName Name of the uniform for the clipping planes matrix.
 * @param {string} styleUniformName Name of the uniform for the clipping planes style, a vec4.
 * @returns {string} A string containing GLSL that clips and styles the current fragment.
 * @private
 */
function getClipAndStyleCode(
  samplerUniformName,
  matrixUniformName,
  styleUniformName
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("samplerUniformName", samplerUniformName);
  Check.typeOf.string("matrixUniformName", matrixUniformName);
  Check.typeOf.string("styleUniformName", styleUniformName);
  //>>includeEnd('debug');

  const shaderCode =
    `    float clipDistance = clip(gl_FragCoord, ${samplerUniformName}, ${matrixUniformName}); \n` +
    `    vec4 clippingPlanesEdgeColor = vec4(1.0); \n` +
    `    clippingPlanesEdgeColor.rgb = ${styleUniformName}.rgb; \n` +
    `    float clippingPlanesEdgeWidth = ${styleUniformName}.a; \n` +
    `    if (clipDistance > 0.0 && clipDistance < clippingPlanesEdgeWidth) \n` +
    `    { \n` +
    `        out_FragColor = clippingPlanesEdgeColor;\n` +
    `    } \n`;
  return shaderCode;
}
export default getClipAndStyleCode;
