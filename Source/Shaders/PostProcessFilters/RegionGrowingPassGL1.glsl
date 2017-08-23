#extension GL_EXT_frag_depth : enable
#extension GL_EXT_draw_buffers : enable

#define neighborhoodHalfWidth 1  // TUNABLE PARAMETER -- half-width of region-growing kernel
#define neighborhoodFullWidth 3
#define neighborhoodSize 8
#define EPS 1e-8
#define SQRT2 1.414213562
#define densityScaleFactor 10.0
#define densityView
#define stencilView
#define DELAY 1

uniform sampler2D pointCloud_colorTexture;
uniform sampler2D pointCloud_densityTexture;
uniform sampler2D pointCloud_depthTexture;
uniform sampler2D pointCloud_aoTexture;
uniform float rangeParameter;
uniform int densityHalfWidth;
uniform int iterationNumber;

varying vec2 v_textureCoordinates;

#define otherswap(a, b, aO, bO, aC, bC) if (a > b) { temp = a; a = b; b = temp; tempAO = aO; aO = bO; bO = tempAO; tempColor = aC; aC = bC; bC = tempColor; }

vec4 testColor(in int value) {
    if (value == 0) {
        return vec4(1.0, 0.0, 0.0, 1.0);
    } else if (value == 1) {
        return vec4(1.0, 0.5, 0.0, 1.0);
    } else if (value == 2) {
        return vec4(1.0, 1.0, 0.0, 1.0);
    } else if (value == 3) {
        return vec4(0.5, 1.0, 0.0, 1.0);
    } else if (value == 4) {
        return vec4(0.0, 1.0, 0.0, 1.0);
    } else if (value == 5) {
        return vec4(0.0, 1.0, 0.5, 1.0);
    } else if (value == 6) {
        return vec4(0.0, 1.0, 1.0, 1.0);
    } else if (value == 7) {
        return vec4(0.0, 0.5, 1.0, 1.0);
    } else if (value == 8) {
        return vec4(0.0, 0.0, 1.0, 1.0);
    } else {
        return vec4(1.0, 1.0, 1.0, 1.0);
    }
}


void comparisonNetwork8(inout float[neighborhoodSize] neighbors,
                        inout float[neighborhoodSize] aoNeighbors,
                        inout vec4[neighborhoodSize] neighborsColor) {
    float temp;
    float tempAO;
    vec4 tempColor;

    otherswap(neighbors[0], neighbors[1], aoNeighbors[0], aoNeighbors[1],
              neighborsColor[0], neighborsColor[1]);
    otherswap(neighbors[2], neighbors[3], aoNeighbors[2], aoNeighbors[3],
              neighborsColor[2], neighborsColor[3]);
    otherswap(neighbors[0], neighbors[2], aoNeighbors[0], aoNeighbors[2],
              neighborsColor[0], neighborsColor[2]);
    otherswap(neighbors[1], neighbors[3], aoNeighbors[1], aoNeighbors[3],
              neighborsColor[1], neighborsColor[3]);
    otherswap(neighbors[1], neighbors[2], aoNeighbors[1], aoNeighbors[2],
              neighborsColor[1], neighborsColor[2]);
    otherswap(neighbors[4], neighbors[5], aoNeighbors[4], aoNeighbors[5],
              neighborsColor[4], neighborsColor[5]);
    otherswap(neighbors[6], neighbors[7], aoNeighbors[6], aoNeighbors[7],
              neighborsColor[6], neighborsColor[7]);
    otherswap(neighbors[4], neighbors[6], aoNeighbors[4], aoNeighbors[6],
              neighborsColor[4], neighborsColor[6]);
    otherswap(neighbors[5], neighbors[7], aoNeighbors[5], aoNeighbors[7],
              neighborsColor[5], neighborsColor[7]);
    otherswap(neighbors[5], neighbors[6], aoNeighbors[5], aoNeighbors[6],
              neighborsColor[5], neighborsColor[6]);
    otherswap(neighbors[0], neighbors[4], aoNeighbors[0], aoNeighbors[4],
              neighborsColor[0], neighborsColor[4]);
    otherswap(neighbors[1], neighbors[5], aoNeighbors[1], aoNeighbors[5],
              neighborsColor[1], neighborsColor[5]);
    otherswap(neighbors[1], neighbors[4], aoNeighbors[1], aoNeighbors[4],
              neighborsColor[1], neighborsColor[4]);
    otherswap(neighbors[2], neighbors[6], aoNeighbors[2], aoNeighbors[6],
              neighborsColor[2], neighborsColor[6]);
    otherswap(neighbors[3], neighbors[7], aoNeighbors[3], aoNeighbors[7],
              neighborsColor[3], neighborsColor[7]);
    otherswap(neighbors[3], neighbors[6], aoNeighbors[3], aoNeighbors[6],
              neighborsColor[3], neighborsColor[6]);
    otherswap(neighbors[2], neighbors[4], aoNeighbors[2], aoNeighbors[4],
              neighborsColor[2], neighborsColor[4]);
    otherswap(neighbors[3], neighbors[5], aoNeighbors[3], aoNeighbors[5],
              neighborsColor[3], neighborsColor[5]);
    otherswap(neighbors[3], neighbors[4], aoNeighbors[3], aoNeighbors[4],
              neighborsColor[3], neighborsColor[4]);
}

// NOTE: This can be sped up a lot by replacing the depth
// primitive array with two vec4s and using swizzle operations!
// (assuming that the neighborhood is exactly 3x3)
void fastMedian3(in float[neighborhoodSize] neighbors,
                 in float[neighborhoodSize] aoNeighbors,
                 in vec4[neighborhoodSize] colorNeighbors,
                 out float outDepth,
                 out float outAO,
                 out vec4 outColor) {
    comparisonNetwork8(neighbors, aoNeighbors, colorNeighbors);

    for (int i = 0; i < neighborhoodSize; i++) {
        if (abs(neighbors[i]) > EPS) {
            outDepth = neighbors[i + (neighborhoodSize - 1 - i) / 2];
            outAO = aoNeighbors[i + (neighborhoodSize - 1 - i) / 2];
            outColor = colorNeighbors[i + (neighborhoodSize - 1 - i) / 2];
            return;
        }
    }

    outDepth = 0.0;
    outAO = 1.0;
    outColor = vec4(0, 0, 0, 0);
}

void genericMedianFinder(in float[neighborhoodSize] neighbors,
                         in float[neighborhoodSize] aoNeighbors,
                         in vec4[neighborhoodSize] colorNeighbors,
                         out float outDepth,
                         out float outAO,
                         out vec4 outColor) {
    // Perhaps we should have a valid way of handling the
    // difficult-to-optimize cases.
    // For now this does nothing.
    outDepth = 0.0;
    outAO = 1.0;
    outColor = vec4(1, 0, 0, 1);
}

void loadIntoArray(inout vec4[neighborhoodSize] ecNeighbors,
                   inout float[neighborhoodSize] depthNeighbors,
                   inout float[neighborhoodSize] aoNeighbors,
                   inout vec4[neighborhoodSize] colorNeighbors) {
    bool pastCenter = false;
    for (int j = -neighborhoodHalfWidth; j <= neighborhoodHalfWidth; j++) {
        for (int i = -neighborhoodHalfWidth; i <= neighborhoodHalfWidth; i++) {
            ivec2 d = ivec2(i, j);
            if (d == ivec2(0, 0)) {
                pastCenter = true;
                continue;
            }
            vec2 neighborCoords = vec2(vec2(d) + gl_FragCoord.xy) / czm_viewport.zw;
            vec4 neighborEC = texture2D(pointCloud_depthTexture,
                                        neighborCoords);
            float neighbor = length(neighborEC);
            float aoNeighbor = czm_unpackDepth(texture2D(pointCloud_aoTexture,
                                               neighborCoords));
            vec4 colorNeighbor = texture2D(pointCloud_colorTexture, neighborCoords);
            if (pastCenter) {
                ecNeighbors[(j + 1) * neighborhoodFullWidth + i] =
                    neighborEC;
                depthNeighbors[(j + 1) * neighborhoodFullWidth + i] =
                    neighbor;
                aoNeighbors[(j + 1) * neighborhoodFullWidth + i] =
                    aoNeighbor;
                colorNeighbors[(j + 1) * neighborhoodFullWidth + i] =
                    colorNeighbor;
            } else {
                ecNeighbors[(j + 1) * neighborhoodFullWidth + i + 1] =
                    neighborEC;
                depthNeighbors[(j + 1) * neighborhoodFullWidth + i + 1] =
                    neighbor;
                aoNeighbors[(j + 1) * neighborhoodFullWidth + i + 1] =
                    aoNeighbor;
                colorNeighbors[(j + 1) * neighborhoodFullWidth + i + 1] =
                    colorNeighbor;
            }
        }
    }
}

void main() {
    vec4 color = texture2D(pointCloud_colorTexture, v_textureCoordinates);
    vec4 ec = texture2D(pointCloud_depthTexture, v_textureCoordinates);
    float depth = length(ec);
    float ao = czm_unpackDepth(texture2D(pointCloud_aoTexture,
                                         v_textureCoordinates));

    vec4 finalColor = color;
    float finalAO = ao;
    vec4 finalEC = ec;

    vec4 ecNeighbors[neighborhoodSize];
    float depthNeighbors[neighborhoodSize];
    float aoNeighbors[neighborhoodSize];
    vec4 colorNeighbors[neighborhoodSize];
    float rIs[neighborhoodSize];
    rIs[0] = SQRT2;
    rIs[1] = 1.0;
    rIs[2] = SQRT2;
    rIs[3] = 1.0;
    rIs[4] = 1.0;
    rIs[5] = SQRT2;
    rIs[6] = 1.0;
    rIs[7] = SQRT2;

    loadIntoArray(ecNeighbors, depthNeighbors, aoNeighbors, colorNeighbors);

    float density = ceil(densityScaleFactor *
                         texture2D(pointCloud_densityTexture, v_textureCoordinates).r);

    // If our depth value is invalid
    if (abs(depth) < EPS) {
        // If the area that we want to region grow is sufficently sparse
        if (float(iterationNumber - DELAY) <= density + EPS) {
            float finalDepth = depth;
#if neighborhoodFullWidth == 3
            fastMedian3(depthNeighbors, aoNeighbors, colorNeighbors,
                        finalDepth, finalAO, finalColor);
#else
            genericMedianFinder(depthNeighbors, aoNeighbors, colorNeighbors,
                                finalDepth, finalAO, finalColor);
#endif
            for (int i = 0; i < neighborhoodSize; i++) {
                if (abs(depthNeighbors[i] - finalDepth) < EPS) {
                    finalEC = ecNeighbors[i];
                }
            }
        }
    }
    // Otherwise if our depth value is valid
    else {
        vec4 ecAccum = vec4(0.0);
        float aoAccum = 0.0;
        vec4 colorAccum = vec4(0);
        float normalization = 0.0;

        for (int i = 0; i < neighborhoodSize; i++) {
            vec4 ecNeighbor = ecNeighbors[i];
            float aoNeighbor = aoNeighbors[i];
            vec4 colorNeighbor = colorNeighbors[i];
            float rI = rIs[i];

            if (length(ecNeighbor) > EPS) {
                float ecDelta = length(ecNeighbor - ec);

                float weight =
                    (1.0 - rI / 2.0) *
                    (1.0 - min(1.0, ecDelta / max(1e-38, rangeParameter)));

                ecAccum += ecNeighbor * weight;
                aoAccum += aoNeighbor * weight;
                colorAccum += colorNeighbor * weight;
                normalization += weight;
            }
        }

        if (length(ecAccum) > EPS) {
            finalEC = ecAccum / normalization;
            finalColor = colorAccum / normalization;
            finalAO = aoAccum / normalization;
        }
    }

#ifdef densityView
    gl_FragData[0] = vec4(vec3(density / float(densityHalfWidth)), 1.0);
#else
#ifdef stencilView
    gl_FragData[0] = testColor(iterationNumber);
#else
    gl_FragData[0] = finalColor;
#endif
#endif
    gl_FragData[1] = finalEC;
    gl_FragData[2] = czm_packDepth(finalAO - 1e-7);
}
