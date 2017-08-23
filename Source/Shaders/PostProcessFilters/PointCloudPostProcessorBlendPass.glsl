#define EPS 1e-8
#define enableAO
#extension GL_EXT_frag_depth : enable

uniform sampler2D pointCloud_colorTexture;
uniform sampler2D pointCloud_depthTexture;
uniform sampler2D pointCloud_aoTexture;
uniform float sigmoidDomainOffset;
uniform float sigmoidSharpness;
uniform float splitScreenX;
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
    vec4 ec = texture2D(pointCloud_depthTexture, v_textureCoordinates);
    if (length(ec) < EPS) {
        discard;
    } else {
        float depth = czm_eyeToWindowCoordinates(vec4(ec.xyz, 1.0)).z;
        gl_FragColor = color;
        gl_FragDepthEXT = depth;
    }
}
