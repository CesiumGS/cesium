#define EPS 1e-6
#define kernelSize 9.0
#define useReduction

attribute vec4 position;
varying float centerPos;

uniform sampler2D pointCloud_depthTexture;
uniform float reductionFactor;

// Adapted from https://thebookofshaders.com/10/
float random(in vec3 st) {
    return fract(sin(dot(st.xyz, vec3(17.537, 78.233, 14.206))) * 43758.5453123);
}

void main() {
    vec2 textureCoordinates = 0.5 * position.xy + vec2(0.5);
    ivec2 screenSpaceCoordinates = ivec2(textureCoordinates * czm_viewport.zw);
    vec4 pseudoDepth = texture2D(pointCloud_depthTexture, textureCoordinates);
    if (length(pseudoDepth) > EPS) {
        gl_Position = position;
        float pointSize = kernelSize;
#ifdef useReduction
        float reductionScalar = random(pseudoDepth.xyz);
        if (reductionScalar > reductionFactor) {
            pointSize *= reductionScalar;
        }
#endif
        gl_PointSize = pointSize;
        centerPos = float(screenSpaceCoordinates.x + screenSpaceCoordinates.y * int(
                              czm_viewport.z));
    } else {
        gl_Position = vec4(-10);
        centerPos = 0.0;
    }
}
