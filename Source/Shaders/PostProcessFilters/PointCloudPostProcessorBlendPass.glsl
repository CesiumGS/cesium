#define EPS 1e-8
#define enableAO
#extension GL_EXT_frag_depth : enable

uniform sampler2D pointCloud_colorTexture;
uniform sampler2D pointCloud_depthTexture;
uniform sampler2D pointCloud_aoTexture;
uniform float sigmoidDomainOffset;
uniform float sigmoidSharpness;
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

float sigmoid(float x, float sharpness) {
    return sharpness * x / (sharpness - x + 1.0);
}

void main() {
    vec4 color = texture2D(pointCloud_colorTexture, v_textureCoordinates);
#ifdef enableAO
    float ao = czm_unpackDepth(texture2D(pointCloud_aoTexture,
                                         v_textureCoordinates));
    ao = clamp(sigmoid(clamp(ao + sigmoidDomainOffset, 0.0, 1.0), sigmoidSharpness),
               0.0, 1.0);
    color.xyz = color.xyz * ao;
#endif // enableAO
    vec4 ec = texture2D(pointCloud_depthTexture, v_textureCoordinates);
    if (length(ec) < EPS) {
        discard;
    } else {
        float depth = czm_eyeToWindowCoordinates(vec4(ec.xyz, 1.0)).z;
        gl_FragColor = color;
        gl_FragDepthEXT = depth;
    }
}
