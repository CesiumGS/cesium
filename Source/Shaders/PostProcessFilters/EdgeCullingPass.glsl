#extension GL_EXT_draw_buffers : enable

#define EPS 1e-8

#define densityScaleFactor 10.0

varying float centerPos;

uniform sampler2D pointCloud_depthTexture;

void main() {
    ivec2 pos = ivec2(int(gl_FragCoord.x), int(gl_FragCoord.y));
    ivec2 centerValue = ivec2(int(mod(centerPos, czm_viewport.z)),
                                  int(centerPos) / int(czm_viewport.z));

    vec2 diff = vec2(pos - centerValue);

    vec4 result;
    result.xy = diff;
    result.zw = abs(diff);
    gl_FragData[0] = result;
}
