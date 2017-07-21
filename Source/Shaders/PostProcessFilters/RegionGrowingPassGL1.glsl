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
uniform float rangeParameter;
uniform int densityHalfWidth;
uniform int iterationNumber;

varying vec2 v_textureCoordinates;

#define otherswap(a, b, aC, bC) if (a > b) { temp = a; a = b; b = temp; tempColor = aC; aC = bC; bC = tempColor; }

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
void fastMedian3(in float[neighborhoodSize] neighbors,
                 in vec4[neighborhoodSize] colorNeighbors,
                 out float outDepth,
                 out vec4 outColor) {
    comparisonNetwork8(neighbors, colorNeighbors);

    for (int i = 0; i < neighborhoodSize; i++) {
        if (abs(neighbors[i]) > EPS) {
            outDepth = neighbors[i + (neighborhoodSize - 1 - i) / 2];
            outColor = colorNeighbors[i + (neighborhoodSize - 1 - i) / 2];
            return;
        }
    }

    outDepth = 0.0;
    outColor = vec4(0, 0, 0, 0);
}

void genericMedianFinder(in float[neighborhoodSize] neighbors,
                         in vec4[neighborhoodSize] colorNeighbors,
                         out float outDepth,
                         out vec4 outColor) {
    // Perhaps we should have a valid way of handling the
    // difficult-to-optimize cases.
    // For now this does nothing.
    outDepth = 0.0;
    outColor = vec4(1, 0, 0, 1);
}

void loadIntoArray(inout float[neighborhoodSize] depthNeighbors,
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
            float neighbor = czm_unpackDepth(texture2D(pointCloud_depthTexture,
                                             neighborCoords));
            vec4 colorNeighbor = texture2D(pointCloud_colorTexture, neighborCoords);
            if (pastCenter) {
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
}

void main() {
    vec4 color = texture2D(pointCloud_colorTexture, v_textureCoordinates);
    float depth = texture2D(pointCloud_depthTexture, v_textureCoordinates).r;

    vec4 finalColor = color;
    float finalDepth = depth;

    float depthNeighbors[neighborhoodSize];
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

    loadIntoArray(depthNeighbors, colorNeighbors);

    float density = ceil(densityScaleFactor *
                         texture2D(pointCloud_densityTexture, v_textureCoordinates).r);

    // If our depth value is invalid
    if (abs(depth) < EPS) {
        // If the area that we want to region grow is sufficently sparse
        if (float(iterationNumber - DELAY) <= density + EPS) {
#if neighborhoodFullWidth == 3
            fastMedian3(depthNeighbors, colorNeighbors, finalDepth, finalColor);
#else
            genericMedianFinder(depthNeighbors, colorNeighbors, finalDepth, finalColor);
#endif
        }
    }
    // Otherwise if our depth value is valid
    else {
        float depthAccum = 0.0;
        vec4 colorAccum = vec4(0);
        float normalization = 0.0;

        for (int i = 0; i < neighborhoodSize; i++) {
            float neighbor = depthNeighbors[i];
            vec4 colorNeighbor = colorNeighbors[i];
            float rI = rIs[i];

            if (abs(neighbor) > EPS) {
                float depthDelta = abs(neighbor - depth);

                float weight =
                    (1.0 - rI / 2.0) *
                    (1.0 - min(1.0, depthDelta / max(1e-38, rangeParameter)));

                depthAccum += neighbor * weight;
                colorAccum += colorNeighbor * weight;
                normalization += weight;
            }
        }

        if (abs(depthAccum) > EPS) {
            finalDepth = depthAccum / normalization;
            finalColor = colorAccum / normalization;
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
    gl_FragData[1] = czm_packDepth(finalDepth);
}
