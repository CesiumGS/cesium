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

#define trianglePeriod 1e-2
#define useTriangle
#define dropoutEnabled

uniform float ONE;

uniform sampler2D pointCloud_ECTexture;
uniform float occlusionAngle;
uniform float dropoutFactor;
uniform sampler2D sectorLUT;
in vec2 v_textureCoordinates;

layout(location = 0) out vec4 depthOut;
layout(location = 1) out vec4 aoOut;

// TODO: Include Uber copyright

vec2 split(float a) {
    const float SPLIT = 4097.0;
    float t = a * SPLIT;
    float a_hi = t * ONE - (t - a);
    float a_lo = a * ONE - a_hi;
    return vec2(a_hi, a_lo);
}

vec2 twoSub(float a, float b) {
    float s = (a - b);
    float v = (s * ONE - a) * ONE;
    float err = (a - (s - v) * ONE) * ONE * ONE * ONE - (b + v);
    return vec2(s, err);
}

vec2 twoSum(float a, float b) {
    float s = (a + b);
    float v = (s * ONE - a) * ONE;
    float err = (a - (s - v) * ONE) * ONE * ONE * ONE + (b - v);
    return vec2(s, err);
}

vec2 twoSqr(float a) {
    float prod = a * a;
    vec2 a_fp64 = split(a);
    float err = ((a_fp64.x * a_fp64.x - prod) * ONE + 2.0 * a_fp64.x *
                 a_fp64.y * ONE * ONE) + a_fp64.y * a_fp64.y * ONE * ONE * ONE;
    return vec2(prod, err);
}

vec2 twoProd(float a, float b) {
    float prod = a * b;
    vec2 a_fp64 = split(a);
    vec2 b_fp64 = split(b);
    float err = ((a_fp64.x * b_fp64.x - prod) + a_fp64.x * b_fp64.y +
                 a_fp64.y * b_fp64.x) + a_fp64.y * b_fp64.y;
    return vec2(prod, err);
}

vec2 quickTwoSum(float a, float b) {
    float sum = (a + b) * ONE;
    float err = b - (sum - a) * ONE;
    return vec2(sum, err);
}

vec2 sumFP64(vec2 a, vec2 b) {
    vec2 s, t;
    s = twoSum(a.x, b.x);
    t = twoSum(a.y, b.y);
    s.y += t.x;
    s = quickTwoSum(s.x, s.y);
    s.y += t.y;
    s = quickTwoSum(s.x, s.y);
    return s;
}

vec2 subFP64(vec2 a, vec2 b) {
    vec2 s, t;
    s = twoSub(a.x, b.x);
    t = twoSub(a.y, b.y);
    s.y += t.x;
    s = quickTwoSum(s.x, s.y);
    s.y += t.y;
    s = quickTwoSum(s.x, s.y);
    return s;
}

vec2 mulFP64(vec2 a, vec2 b) {
    vec2 prod = twoProd(a.x, b.x);
    // y component is for the error
    prod.y += a.x * b.y;
    prod.y += a.y * b.x;
    prod = quickTwoSum(prod.x, prod.y);
    return prod;
}

vec2 divFP64(in vec2 a, in vec2 b) {
    float xn = 1.0 / b.x;
    vec2 yn = a * xn;
    float diff = (subFP64(a, mulFP64(b, yn))).x;
    vec2 prod = twoProd(xn, diff);
    return sumFP64(yn, prod);
}

vec2 sqrtFP64(in vec2 a) {
    if (a.x == 0.0 && a.y == 0.0) return vec2(0.0, 0.0);
    if (a.x < 0.0) return vec2(0.0 / 0.0, 0.0 / 0.0);
    float x = 1.0 / sqrt(a.x);
    float yn = a.x * x;
    vec2 yn_sqr = twoSqr(yn) * ONE;
    float diff = subFP64(a, yn_sqr).x;
    vec2 prod = twoProd(x * 0.5, diff);
    return sumFP64(vec2(yn, 0.0), prod);
}

vec2 lengthFP64(in vec3 vec) {
    vec2 highPrecisionX = split(vec.x);
    vec2 highPrecisionY = split(vec.y);
    vec2 highPrecisionZ = split(vec.z);
    vec2 highPrecision =
        sqrtFP64(sumFP64(sumFP64(
                             mulFP64(highPrecisionX, highPrecisionX),
                             mulFP64(highPrecisionY, highPrecisionY)),
                         mulFP64(highPrecisionZ, highPrecisionZ)));
    return highPrecision;
}

float triangle(in float x, in float period) {
    return abs(mod(x, period) / period - 0.5) + EPS;
}

float triangleFP64(in vec2 x, in float period) {
    float lowPrecision = x.x + x.y;
    vec2 floorTerm = split(floor(lowPrecision / period));
    vec2 periodHighPrecision = split(period);
    vec2 term2 = mulFP64(periodHighPrecision, floorTerm);
    vec2 moduloTerm = subFP64(x, term2);
    vec2 normalized = divFP64(moduloTerm, periodHighPrecision);
    normalized = subFP64(normalized, split(0.5));
    return abs(normalized.x + normalized.y) + EPS;
}

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

        // Write out the distance of the point
        //
        // We use the distance of the point rather than
        // the linearized depth. This is because we want
        // to encode as much information about position disparities
        // between points as we can, and the z-values of
        // neighboring points are usually very similar.
        // On the other hand, the x-values and y-values are
        // usually fairly different.
#ifdef useTriangle
        // We can get even more accuracy by passing the 64-bit
        // distance into a triangle wave function that
        // uses 64-bit primitives internally. The region
        // growing pass only cares about deltas between
        // different pixels, so we just have to ensure that
        // the period of triangle function is greater than that
        // of the largest possible delta can arise between
        // different points.
        //
        // The triangle function is C0 continuous, which avoids
        // artifacts from discontinuities. That said, I have noticed
        // some inexplicable artifacts occasionally, so please
        // disable this optimization if that becomes an issue.
        //
        // It's important that the period of the triangle function
        // is at least two orders of magnitude greater than
        // the average depth delta that we are likely to come
        // across. The triangle function works because we have
        // some assumption of locality in the depth domain.
        // Massive deltas break that locality -- but that's
        // actually not an issue. Deltas that are larger than
        // the period function will be "wrapped around", and deltas
        // that are much larger than the period function may be
        // "wrapped around" many times. A similar process occurs
        // in many random number generators. The resulting delta
        // is usually at least an order of magnitude greater than
        // the average delta, so it won't even be considered in
        // the region growing pass.
        vec2 hpl = lengthFP64(centerPosition);
        float triangleResult = triangleFP64(hpl, trianglePeriod);
        depthOut = czm_packDepth(triangleResult);
#else
        vec2 lengthOfFrustum = subFP64(split(czm_clampedFrustum.y),
                                       split(czm_clampedFrustum.x));
        vec2 frustumStart = split(czm_clampedFrustum.x);
        vec2 centerPositionLength = lengthFP64(centerPosition);
        vec2 normalizedDepthFP64 = sumFP64(divFP64(centerPositionLength,
                                           lengthOfFrustum),
                                           frustumStart);
        depthOut = czm_packDepth(normalizedDepthFP64.x + normalizedDepthFP64.y);
#endif
    }
}
