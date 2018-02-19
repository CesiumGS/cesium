/**
 * Get a clipping plane packed to a RGBA float texture. Each plane is just a float vec4, so a single pixel in the texture.
 *
 * @name czm_getClippingPlaneFromRgbaFloat
 * @glslFunction
 *
 * @param {sampler2D} clippingPlanes RGBA float Texture containing planes used to clip, defined in the ClippingPlaneCollection's model space.
 * @param {int} clippingPlaneNumber The number of the plane to get.
 * @param {int} textureWidth The width of the clipping planes texture.
 * @param {int} textureHeight The height of the clipping planes texture.
 * @param {mat4} transform The matrix for transforming the clipping plane to eyespace.
 * @returns {vec4} The clipping plane transformed to eyespace.
 */
vec4 czm_getClippingPlaneFromRgbaFloat(sampler2D packedClippingPlanes, int clippingPlaneNumber, int textureWidth, int textureHeight, mat4 transform)
{
    int pixY = clippingPlaneNumber / textureWidth;
    int pixX = clippingPlaneNumber - (pixY * textureWidth);
    float pixelWidth = 1.0 / float(textureWidth);
    float pixelHeight = 1.0 / float(textureHeight);
    float u = (float(pixX) + 0.5) * pixelWidth; // sample from center of pixel
    float v = (float(pixY) + 0.5) * pixelHeight;

    vec4 plane = texture2D(packedClippingPlanes, vec2(u, v));
    return czm_transformPlane(transform, plane);
}
