#extension GL_EXT_frag_depth : enable
uniform sampler2D pointCloud_colorTexture;
uniform sampler2D pointCloud_ECTexture;
varying vec2 v_textureCoordinates;
void main() {
    float near = czm_currentFrustum.x;
    float far = czm_currentFrustum.y;
    vec4 color = texture2D(pointCloud_colorTexture, v_textureCoordinates);
    vec4 EC = texture2D(pointCloud_ECTexture, v_textureCoordinates);

    // If the EC of this pixel is zero, that means that it's not a valid
    // pixel. We don't care about reprojecting it.
    if (length(EC) == 0.)
        discard;

    // We discard pixels here

    // This is the depth of this pixel... assuming that it's valid.
    float linearizedDepth = (-EC.z - near) / (far - near);
    gl_FragDepthEXT = linearizedDepth;
}
