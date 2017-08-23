#version 300 es

#define TAU 6.28318530718
#define PI 3.14159265359
#define PI_4 0.785398163
#define C0 1.57073
#define C1 -0.212053
#define C2 0.0740935
#define C3 -0.0186166
#define EPS 1e-6
#define neighborhoodHalfWidth 4  // TUNABLE PARAMETER -- half-width of point-occlusion neighborhood
#define neighborhoodSize 9
#define numSectors 8

#define trianglePeriod 1.0
#define useTriangle
#define dropoutEnabled

uniform sampler2D pointCloud_ECTexture;
uniform float occlusionAngle;
uniform float dropoutFactor;
uniform sampler2D sectorLUT;
in vec2 v_textureCoordinates;

layout(location = 0) out vec4 depthOut;
layout(location = 1) out vec4 aoOut;

float acosFast(in float inX) {
    float x = abs(inX);
    float res = ((C3 * x + C2) * x + C1) * x + C0; // p(x)
    res *= sqrt(1.0 - x);

    return (inX >= 0.0) ? res : PI - res;
}

ivec2 readSectors(in ivec2 sectorPosition) {
    vec2 texCoordinate = vec2(sectorPosition + ivec2(neighborhoodHalfWidth)) /
                         float(neighborhoodHalfWidth * 2);
    vec2 unscaled = texture(sectorLUT, texCoordinate).rg;
    return ivec2(unscaled * float(numSectors));
}

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    float near = czm_entireFrustum.x;
    float far = czm_entireFrustum.y;
    ivec2 pos = ivec2(int(gl_FragCoord.x), int(gl_FragCoord.y));

    // The position of this pixel in 3D (i.e the position of the point)
    vec3 centerPosition = texture(pointCloud_ECTexture, v_textureCoordinates).xyz;
    bool invalid = false;

    // If the EC of this pixel is zero, that means that it's not a valid
    // pixel. We don't care about reprojecting it.
    if (length(centerPosition) < EPS) {
        depthOut = vec4(0.0);
        aoOut = vec4(1.0 - EPS);
    }

    // We split our region of interest (the point of interest and its
    // neighbors)
    // into sectors. For the purposes of this shader, we have eight
    // sectors.
    //
    // Each entry of sector_histogram contains the current best horizon
    // pixel angle
    ivec2 halfNeighborhood = ivec2(neighborhoodHalfWidth / 2,
                                   neighborhoodHalfWidth / 2);
    // Upper left corner of the neighborhood
    ivec2 upperLeftCorner = pos - halfNeighborhood;
    // Lower right corner of the neighborhood
    ivec2 lowerRightCorner = pos + halfNeighborhood;

    // The widest the cone can be is 90 degrees
    float maxAngle = PI / 2.0;

    // Our sector array defaults to an angle of "maxAngle" in each sector
    // (i.e no horizon pixels!)
    float sh[numSectors];
    for (int i = 0; i < numSectors; i++) {
        sh[i] = maxAngle;
    }

    // Right now this is obvious because everything happens in eye space,
    // but this kind of statement is nice for a reference implementation
    vec3 viewer = vec3(0.0);

    int width = neighborhoodHalfWidth;

#ifdef dropoutEnabled
    float seed = random(v_textureCoordinates);
    if (seed < dropoutFactor) {
        width = int(float(width) * (1.0 - dropoutFactor));
    }
#endif //dropoutEnabled

    for (int i = -width; i <= width; i++) {
        for (int j = -width; j <= width; j++) {
            // d is the relative offset from the horizon pixel to the center pixel
            // in 2D
            ivec2 d = ivec2(i, j);
            ivec2 pI = pos + d;

            // We now calculate the actual 3D position of the horizon pixel (the horizon point)
            vec3 neighborPosition = texelFetch(pointCloud_ECTexture, ivec2(pI), 0).xyz;

            // If our horizon pixel doesn't exist, ignore it and move on
            if (length(neighborPosition) < EPS || pI == pos) {
                continue;
            }

            // sectors contains both possible sectors that the
            // neighbor pixel could be in
            ivec2 sectors = readSectors(d);

            // This is the offset of the horizon point from the center in 3D
            // (a 3D analog of d)
            vec3 c = neighborPosition - centerPosition;

            // Now we calculate the dot product between the vector
            // from the viewer to the center and the vector to the horizon pixel.
            // We normalize both vectors first because we only care about their relative
            // directions
            // TODO: Redo the math and figure out whether the result should be negated or not
            float dotProduct = dot(normalize(viewer - centerPosition),
                                   normalize(c));

            // We calculate the angle that this horizon pixel would make
            // in the cone. The dot product is be equal to
            // |vec_1| * |vec_2| * cos(angle_between), and in this case,
            // the magnitude of both vectors is 1 because they are both
            // normalized.
            float angle = acosFast(dotProduct);

            // This horizon point is behind the current point. That means that it can't
            // occlude the current point. So we ignore it and move on.
            if (angle > maxAngle || angle <= 0.0)
                continue;
            // If we've found a horizon pixel, store it in the histogram
            if (sh[sectors.x] > angle) {
                sh[sectors.x] = angle;
            }
            if (sh[sectors.y] > angle) {
                sh[sectors.y] = angle;
            }
        }
    }

    float accumulator = 0.0;
    for (int i = 0; i < numSectors; i++) {
        float angle = sh[i];
        // If the z component is less than zero,
        // that means that there is no valid horizon pixel
        if (angle <= 0.0 || angle > maxAngle)
            angle = maxAngle;
        accumulator += angle;
    }

    // The solid angle is too small, so we occlude this point
    if (accumulator < (2.0 * PI) * (1.0 - occlusionAngle)) {
        depthOut = vec4(0);
        aoOut = vec4(1.0 - EPS);
    } else {
        float occlusion = clamp(accumulator / (4.0 * PI), 0.0, 1.0);
        aoOut = czm_packDepth(occlusion);
        depthOut = vec4(centerPosition, 0.0);
    }
}
