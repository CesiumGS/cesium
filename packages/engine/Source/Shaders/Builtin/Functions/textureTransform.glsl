/**
 * Applies a 2D texture transformation matrix to texture coordinates.
 * This function applies translation, rotation, and scaling transformations
 * as specified by the KHR_texture_transform glTF extension.
 *
 * @name czm_textureTransform
 * @glslFunction
 *
 * @param {vec2} texCoord The texture coordinates to transform.
 * @param {mat3} textureTransform The 3x3 transformation matrix.
 *
 * @returns {vec2} The transformed texture coordinates.
 *
 * @example
 * // GLSL declaration
 * vec2 czm_textureTransform(vec2 texCoord, mat3 textureTransform);
 *
 * // Apply texture transform to UV coordinates
 * vec2 transformedUV = czm_textureTransform(uv, u_textureTransform);
 */
vec2 czm_textureTransform(vec2 texCoord, mat3 textureTransform)
{
    return vec2(textureTransform * vec3(texCoord, 1.0));
}