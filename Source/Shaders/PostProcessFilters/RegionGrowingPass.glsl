#extension GL_EXT_frag_depth : enable

#define neighborhoodHalfWidth 1  // TUNABLE PARAMETER -- half-width of region-growing kernel
#define neighborhoodFullWidth 3
#define neighborhoodSize 8
#define EPS 1e-6

uniform sampler2D pointCloud_colorTexture;
uniform sampler2D pointCloud_depthTexture;
uniform float rangeParameter;

varying vec2 v_textureCoordinates;

#define otherswap(a, b, aC, bC) if (a > b) { temp = a; a = b; b = temp; tempColor = aC; aC = bC; bC = tempColor; }

void comparisonNetwork8(inout float[neighborhoodSize] neighbors,
                        inout vec4[neighborhoodSize] neighborsColor) {
    float temp;
    vec4 tempColor;

    otherswap(neighbors[0], neighbors[1], neighborsColor[0], neighborsColor[1]);
    otherswap(neighbors[2], neighbors[3], neighborsColor[2], neighborsColor[3]);
    otherswap(neighbors[0], neighbors[2], neighborsColor[0], neighborsColor[2]);
    otherswap(neighbors[1], neighbors[3], neighborsColor[1], neighborsColor[3]);
    otherswap(neighbors[1], neighbors[2], neighborsColor[1], neighborsColor[2]);
    otherswap(neighbors[4], neighbors[5], neighborsColor[4], neighborsColor[5]);
    otherswap(neighbors[6], neighbors[7], neighborsColor[6], neighborsColor[7]);
    otherswap(neighbors[4], neighbors[6], neighborsColor[4], neighborsColor[6]);
    otherswap(neighbors[5], neighbors[7], neighborsColor[5], neighborsColor[7]);
    otherswap(neighbors[5], neighbors[6], neighborsColor[5], neighborsColor[6]);
    otherswap(neighbors[0], neighbors[4], neighborsColor[0], neighborsColor[4]);
    otherswap(neighbors[1], neighbors[5], neighborsColor[1], neighborsColor[5]);
    otherswap(neighbors[1], neighbors[4], neighborsColor[1], neighborsColor[4]);
    otherswap(neighbors[2], neighbors[6], neighborsColor[2], neighborsColor[6]);
    otherswap(neighbors[3], neighbors[7], neighborsColor[3], neighborsColor[7]);
    otherswap(neighbors[3], neighbors[6], neighborsColor[3], neighborsColor[6]);
    otherswap(neighbors[2], neighbors[4], neighborsColor[2], neighborsColor[4]);
    otherswap(neighbors[3], neighbors[5], neighborsColor[3], neighborsColor[5]);
    otherswap(neighbors[3], neighbors[4], neighborsColor[3], neighborsColor[4]);
}

// NOTE: This can be sped up a lot by replacing the depth
// primitive array with two vec4s and using swizzle operations!
// (assuming that the neighborhood is exactly 3x3)
void fastMedianFinder(in float[neighborhoodSize] neighbors,
                      in vec4[neighborhoodSize] colorNeighbors,
                      out float outDepth,
                      out vec4 outColor) {
    /*for (int i = 0; i < neighborhoodSize; i++) {
        float key = neighbors[i];
        int modifiedFlag = 0;

        for (int c = neighborhoodSize - 1; c >= 0; c--) {
            if (c > i - 1)
                continue;

            if (neighbors[c] <= key) {
                neighbors[c + 1] = key;
                modifiedFlag = 1;
                break;
            }
            neighbors[c + 1] = neighbors[c];
        }
        if (modifiedFlag == 0)
            neighbors[0] = key;
            }*/
    comparisonNetwork8(neighbors, colorNeighbors);

    for (int i = neighborhoodSize - 1; i >= 0; i--) {
        if (neighbors[i] <= 1.0 - EPS) {
            outDepth = neighbors[i / 2];
            outColor = colorNeighbors[i / 2];
            //outColor = vec4(1, 0, 0, 1);
            return;
        }
    }

    outDepth = 0.0;
    outColor = vec4(0, 0, 0, 0);
}

void main() {
    vec4 color = texture2D(pointCloud_colorTexture, v_textureCoordinates);
    float depth = texture2D(pointCloud_depthTexture, v_textureCoordinates).r;

    vec4 finalColor = color;
    float finalDepth = depth;

    // If our depth value is invalid
    if (depth > 1.0 - EPS) {
        float depthNeighbors[neighborhoodSize];
        vec4 colorNeighbors[neighborhoodSize];

        int pastCenter = 0;
        for (int j = -neighborhoodHalfWidth; j <= neighborhoodHalfWidth; j++) {
            for (int i = -neighborhoodHalfWidth; i <= neighborhoodHalfWidth; i++) {
                ivec2 d = ivec2(i, j);
                if (d == ivec2(0, 0)) {
                    pastCenter = 1;
                    continue;
                }
                vec2 neighborCoords = vec2(vec2(d) + gl_FragCoord.xy) / czm_viewport.zw;
                float neighbor = texture2D(pointCloud_depthTexture, neighborCoords).r;
                vec4 colorNeighbor = texture2D(pointCloud_colorTexture, neighborCoords);
                if (pastCenter == 1) {
                    depthNeighbors[(j + 1) * neighborhoodFullWidth + i] =
                        neighbor;
                    colorNeighbors[(j + 1) * neighborhoodFullWidth + i] =
                        colorNeighbor;
                } else {
                    depthNeighbors[(j + 1) * neighborhoodFullWidth + i + 1] =
                        neighbor;
                    colorNeighbors[(j + 1) * neighborhoodFullWidth + i + 1] =
                        colorNeighbor;
                }
            }
        }

        fastMedianFinder(depthNeighbors, colorNeighbors, finalDepth, finalColor);
    }
    // Otherwise if our depth value is valid
    else {
        float depthAccum = 0.0;
        vec4 colorAccum = vec4(0);
        float normalization = 0.0;

        for (int j = -neighborhoodHalfWidth; j <= neighborhoodHalfWidth; j++) {
            for (int i = -neighborhoodHalfWidth; i <= neighborhoodHalfWidth; i++) {
                ivec2 d = ivec2(i, j);

                // Does this even make sense?
                /*if (d == ivec2(0, 0)) {
                    continue;
                }*/

                float rI = sqrt(float(d.x * d.x + d.y * d.y));

                vec2 neighborCoords = vec2(vec2(d) + gl_FragCoord.xy) / czm_viewport.zw;
                float neighbor = texture2D(pointCloud_depthTexture, neighborCoords).r;
                vec4 colorNeighbor = texture2D(pointCloud_colorTexture, neighborCoords);

                float depthDelta = abs(neighbor - depth);

                float weight = (1.0 - rI / 2.0) * (1.0 - min(1.0, depthDelta / max(1e-5, rangeParameter)));
                depthAccum += weight * neighbor;
                colorAccum += weight * colorNeighbor;
                normalization += weight;
            }
        }

        finalDepth = depthAccum / normalization;
        finalColor = colorAccum / normalization;
    }

    gl_FragColor = finalColor;
    gl_FragDepthEXT = finalDepth;
}
