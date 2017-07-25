#extension GL_EXT_draw_buffers : enable

#define EPS 1e-8

#define densityScaleFactor 10.0

varying float centerPos;

uniform sampler2D pointCloud_depthTexture;
uniform sampler2D pointCloud_edgeCullingTexture;

uniform float neighborhoodVectorSize;
uniform float maxAbsRatio;

void main() {
    vec2 v_textureCoordinates = gl_FragCoord.xy / czm_viewport.zw;
    float depth = czm_unpackDepth(texture2D(pointCloud_depthTexture,
                                            v_textureCoordinates));
    vec4 rawEdgeCull = texture2D(pointCloud_edgeCullingTexture,
                                 v_textureCoordinates);
    vec2 neighborhoodAccum = rawEdgeCull.xy;
    vec2 absNeighborhoodAccum = rawEdgeCull.zw;
    ivec2 pos = ivec2(int(gl_FragCoord.x), int(gl_FragCoord.y));
    int densityValue = 0;

    if (depth < EPS) {
        ivec2 centerValue = ivec2(int(mod(centerPos, czm_viewport.z)),
                                  int(centerPos) / int(czm_viewport.z));
        vec2 diff = vec2(pos - centerValue);
        densityValue = int(max(abs(diff.x), abs(diff.y)));
    } else {
        densityValue = 1;
    }

    float absNeighborhoodAccumLength = length(absNeighborhoodAccum);
    float absRatio = 0.0;
    if (absNeighborhoodAccumLength > EPS) {
        absRatio = length(neighborhoodAccum) / absNeighborhoodAccumLength;
    }
    if (!(length(neighborhoodAccum) > neighborhoodVectorSize &&
            absRatio > maxAbsRatio)) {
        gl_FragData[0] = vec4(float(densityValue) / densityScaleFactor,
                              0.0, 0.0, 0.0);
    } else {
        gl_FragData[0] = vec4(0.0);
    }
}
