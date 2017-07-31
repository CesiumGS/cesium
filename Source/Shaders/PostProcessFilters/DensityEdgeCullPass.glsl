#define neighborhoodHalfWidth 4  // TUNABLE PARAMETER -- half-width of region-growing kernel

#define EPS 1e-8

#define densityScaleFactor 10.0
#define dropoutEnabled

uniform sampler2D pointCloud_depthTexture;
uniform float neighborhoodVectorSize;
uniform float maxAbsRatio;
uniform float dropoutFactor;
varying vec2 v_textureCoordinates;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    float center = czm_unpackDepth(texture2D(pointCloud_depthTexture,
                                   v_textureCoordinates));
    ivec2 pos = ivec2(int(gl_FragCoord.x), int(gl_FragCoord.y));

    float closestNeighbor = float(neighborhoodHalfWidth) + 1.0;
    vec2 neighborhoodAccum = vec2(0.0);
    vec2 absNeighborhoodAccum = vec2(0.0);

    if (center < EPS) {
        float seed = random(v_textureCoordinates);
        for (int i = -neighborhoodHalfWidth; i <= neighborhoodHalfWidth; i++) {
            for (int j = -neighborhoodHalfWidth; j <= neighborhoodHalfWidth; j++) {
                ivec2 d = ivec2(i, j);
                ivec2 pI = pos + d;
                vec2 normPI = vec2(pI) / czm_viewport.zw;

#ifdef dropoutEnabled
                // A cheap approximation of randomness -- local neighborhoods are not
                // sufficiently random, but small changes in the seed yield different
                // neighborhoods
                if (fract(seed * dot(normPI, vec2(902433.23341, 303403.963351)))
                        < dropoutFactor) {
                    continue;
                }
#endif // dropoutEnabled

                float neighbor = czm_unpackDepth(texture2D(pointCloud_depthTexture,
                                                 normPI));
                if (neighbor < EPS || pI == pos) {
                    continue;
                }

                neighborhoodAccum += vec2(d);
                absNeighborhoodAccum += abs(vec2(d));
                closestNeighbor = min(closestNeighbor,
                                      max(abs(float(i)),
                                          abs(float(j))));
            }
        }

        float absRatio = length(neighborhoodAccum) /
                         length(absNeighborhoodAccum);
        if (int(closestNeighbor) <= neighborhoodHalfWidth &&
                !(absRatio > maxAbsRatio &&
                  length(neighborhoodAccum) > neighborhoodVectorSize)) {
            gl_FragData[0] = vec4(vec3(closestNeighbor /
                                       densityScaleFactor), 0.0);
        } else {
            gl_FragData[0] = vec4(vec4(0.0));
        }
    } else {
        gl_FragData[0] = vec4(1.0 / densityScaleFactor, 0.0, 0.0, 0.0);
    }
}
