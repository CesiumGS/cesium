#define EPS 1e-8
#define enableAO
#extension GL_EXT_frag_depth : enable

uniform sampler2D pointCloud_colorTexture;
uniform sampler2D pointCloud_depthTexture;
uniform sampler2D pointCloud_aoTexture;
uniform float sigmoidDomainOffset;
uniform float sigmoidSharpness;
varying vec2 v_textureCoordinates;
float sigmoid(float x, float sharpness) {
    return sharpness * x / (sharpness - x + 1.0);
}
void main() {
    vec4 color = texture2D(pointCloud_colorTexture, v_textureCoordinates);
#ifdef enableAO
    float ao = czm_unpackDepth(texture2D(pointCloud_aoTexture,
                                         v_textureCoordinates));
    ao = clamp(sigmoid(clamp(ao + sigmoidDomainOffset, 0.0, 1.0), sigmoidSharpness),
               0.0, 1.0);
    color.xyz = color.xyz * ao;
#endif // enableAO
    float rayDist = czm_unpackDepth(texture2D(pointCloud_depthTexture,
                                    v_textureCoordinates));
    if (length(rayDist) < EPS) {
        discard;
    } else {
        float frustumLength = czm_clampedFrustum.y - czm_clampedFrustum.x;
        float scaledRayDist = rayDist * frustumLength + czm_clampedFrustum.x;
        vec3 ray = normalize(czm_windowToEyeCoordinates(vec4(gl_FragCoord)).xyz);
        float depth = czm_eyeToWindowCoordinates(vec4(ray * scaledRayDist, 1.0)).z;
        gl_FragColor = color;
        gl_FragDepthEXT = depth;
    }
}
