/**
 * Get a clipping plane packed to a RGBA uint8 texture. Each plane is a oct32 normal quantized to a pixel and
 * a floating point distance normalized to a range and then packed to a pixel.
 *
 * @name czm_getClippingPlaneFromRgbaUint8
 * @glslFunction
 *
 * @param {sampler2D} clippingPlanes RGBA Uint8 Texture containing planes used to clip, defined in the ClippingPlaneCollection's model space.
 * @param {vec2} range The range for denormalizing the clipping plane distance.
 * @param {int} clippingPlaneNumber The number of the plane to get.
 * @param {int} textureWidth The width of the clipping planes texture.
 * @param {mat4} transform The matrix for transforming the clipping plane to eyespace.
 * @returns {vec4} The clipping plane transformed to eyespace.
 */
vec4 czm_getClippingPlaneFromRgbaUint8(sampler2D packedClippingPlanes, vec2 range, int clippingPlaneNumber, int textureWidth, mat4 transform)
{
    int clippingPlaneStartIndex = clippingPlaneNumber * 2; // clipping planes are two pixels each
    int pixY = clippingPlaneStartIndex / textureWidth;
    int pixX = clippingPlaneStartIndex - (pixY * textureWidth);
    float pixelWidth = 1.0 / float(textureWidth);
    float u = (float(pixX) + 0.5) * pixelWidth; // sample from center of pixel
    float v = (float(pixY) + 0.5) * pixelWidth;

    vec4 oct32 = texture2D(packedClippingPlanes, vec2(u, v)) * 255.0;
    vec2 oct = vec2(oct32.x * 256.0 + oct32.y, oct32.z * 256.0 + oct32.w);

    vec4 plane;
    plane.xyz = czm_octDecode(oct, 65535.0);
    plane.w = czm_unpackDepth(texture2D(packedClippingPlanes, vec2(u + pixelWidth, v))) * (range.y - range.x) + range.x;

    return czm_transformPlane(transform, plane);
}
