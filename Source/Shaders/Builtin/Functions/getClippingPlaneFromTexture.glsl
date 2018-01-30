vec4 transformPlane(mat4 transform, vec4 clippingPlane) {
    vec3 transformedDirection = normalize((transform * vec4(clippingPlane.xyz, 0.0)).xyz);
    vec3 transformedPosition = (transform * vec4(clippingPlane.xyz * -clippingPlane.w, 1.0)).xyz;
    vec4 transformedPlane;
    transformedPlane.xyz = transformedDirection;
    transformedPlane.w = -dot(transformedDirection, transformedPosition);
    return transformedPlane;
}

vec4 czm_getClippingPlaneFromTexture(sampler2D packedClippingPlanes, vec2 range, int clippingPlaneNumber, int textureWidth, mat4 transform)
{
    int clippingPlaneStartIndex = clippingPlaneNumber * 2; // clipping planes are two pixels each
    int pixY = clippingPlaneStartIndex / textureWidth;
    int pixX = clippingPlaneStartIndex - (pixY * textureWidth);
    pixY = textureWidth - pixY; // flipped relative to texture
    float pixelWidth = 1.0 / float(textureWidth);
    float u = (float(pixX) + 0.5) * pixelWidth; // sample from center of pixel
    float v = (float(pixY) - 0.5) * pixelWidth;

    vec4 oct32 = texture2D(packedClippingPlanes, vec2(u, v)) * 255.0;
    vec2 oct = vec2(oct32.x * 256.0 + oct32.y, oct32.z * 256.0 + oct32.w);

    vec4 plane;
    plane.xyz = czm_octDecode(oct, 65535.0);
    plane.w = czm_unpackDepth(texture2D(packedClippingPlanes, vec2(u + pixelWidth, v))) * (range.y - range.x) + range.x;

    return transformPlane(transform, plane);
}
