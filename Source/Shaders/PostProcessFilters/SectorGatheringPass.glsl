#define TAU 6.28318530718
#define PI 3.14159265359
#define EPS 1e-6
#define numSectors 8
#define maxAngle 1.57079632679  // The maximum sector angle is PI / 2

#define trianglePeriod 1e-5
#define useTriangle

uniform sampler2D sectorFirst;
uniform sampler2D sectorSecond;
uniform sampler2D pointCloud_ECTexture;
uniform float occlusionAngle;
uniform float ONE;

varying vec2 v_textureCoordinates;

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

void main() {
    vec4 sh1 = texture2D(sectorFirst, v_textureCoordinates) * maxAngle;
    vec4 sh2 = texture2D(sectorSecond, v_textureCoordinates) * maxAngle;

    float accumulator = sh1.x + sh1.y + sh1.z + sh1.w +
                        sh2.x + sh2.y + sh2.z + sh2.w;

    // The solid angle is too small, so we occlude this point
    if (accumulator < (2.0 * PI) * (1.0 - occlusionAngle)) {
        gl_FragData[0] = vec4(0.0);
    } else {
        vec3 centerPosition = texture2D(pointCloud_ECTexture, v_textureCoordinates).xyz;
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
        gl_FragData[0] = czm_packDepth(triangleResult);
#else
        vec2 lengthOfFrustum = subFP64(split(czm_clampedFrustum.y),
                                       split(czm_clampedFrustum.x));
        vec2 frustumStart = split(czm_clampedFrustum.x);
        vec2 centerPositionLength = lengthFP64(centerPosition);
        vec2 normalizedDepthFP64 = sumFP64(divFP64(centerPositionLength,
                                           lengthOfFrustum),
                                           frustumStart);
        gl_FragData[0] = czm_packDepth(normalizedDepthFP64.x + normalizedDepthFP64.y);
#endif
    }
}
