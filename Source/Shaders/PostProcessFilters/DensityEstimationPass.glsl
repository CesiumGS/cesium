#extension GL_EXT_draw_buffers : enable

#define EPS 1e-8

#define densityScaleFactor 10.0

varying float centerPos;

uniform sampler2D pointCloud_depthTexture;
uniform float neighborhoodVectorSize;
uniform float maxAbsRatio;

void main() {
    vec2 v_textureCoordinates = gl_FragCoord.xy / czm_viewport.zw;
    float center = czm_unpackDepth(texture2D(pointCloud_depthTexture,
                                   v_textureCoordinates));
    ivec2 pos = ivec2(int(gl_FragCoord.x), int(gl_FragCoord.y));
    int densityValue = 0;

    if (center < EPS) {
        ivec2 centerValue = ivec2(int(mod(centerPos, czm_viewport.z)),
                                  int(centerPos) / int(czm_viewport.z));
        vec2 diff = vec2(pos - centerValue);
        densityValue = int(max(abs(diff.x), abs(diff.y)));
    } else {
        densityValue = 1;
    }

    gl_FragData[0] =
        vec4(vec3(float(densityValue) / densityScaleFactor), 1.0);
}
