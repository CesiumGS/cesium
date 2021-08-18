uniform sampler2D u_noiseTexture;
uniform float u_noiseTextureLength;
uniform float u_noiseDetail;
varying vec2 v_offset;
varying vec3 v_maximumSize;
varying float v_slice;

float wrap(float value, float rangeLength) {
    if(value < 0.0) {
        float absValue = abs(value);
        float modValue = mod(absValue, rangeLength);
        return mod(rangeLength - modValue, rangeLength);
    }
    return mod(value, rangeLength);
}

vec3 wrapVec(vec3 value, float rangeLength) {
    return vec3(wrap(value.x, rangeLength),
                wrap(value.y, rangeLength),
                wrap(value.z, rangeLength));
}

float noiseTextureLengthSquared = u_noiseTextureLength * u_noiseTextureLength;
vec3 dimensions = vec3(noiseTextureLengthSquared,
                       u_noiseTextureLength,
                       u_noiseTextureLength);

vec4 sampleNoiseTexture(vec3 position) {
    vec3 recenteredPos = position + vec3(u_noiseTextureLength / 2.0);
    vec3 lerpValue = fract(recenteredPos);

    vec3 slice = floor(recenteredPos);
    vec3 slice0 = wrapVec(slice, u_noiseTextureLength);
    vec3 slice1 = wrapVec(slice0 + vec3(1.0), u_noiseTextureLength);
    slice0 /= dimensions;
    slice1 /= dimensions;

    float u00 = slice0.x + slice0.z;
    float u01 = slice0.x + slice1.z;
    float u10 = slice1.x + slice0.z;
    float u11 = slice1.x + slice1.z;

    vec2 uv000 = vec2(u00, slice0.y);
    vec2 uv001 = vec2(u01, slice0.y);
    vec2 uv010 = vec2(u00, slice1.y);
    vec2 uv011 = vec2(u01, slice1.y);
    vec2 uv100 = vec2(u10, slice0.y);
    vec2 uv101 = vec2(u11, slice0.y);
    vec2 uv110 = vec2(u10, slice1.y);
    vec2 uv111 = vec2(u11, slice1.y);

    vec4 sample000 = texture2D(u_noiseTexture, uv000);
    vec4 sample001 = texture2D(u_noiseTexture, uv001);
    vec4 sample010 = texture2D(u_noiseTexture, uv010);
    vec4 sample011 = texture2D(u_noiseTexture, uv011);
    vec4 sample100 = texture2D(u_noiseTexture, uv100);
    vec4 sample101 = texture2D(u_noiseTexture, uv101);
    vec4 sample110 = texture2D(u_noiseTexture, uv110);
    vec4 sample111 = texture2D(u_noiseTexture, uv111);

    vec4 xLerp00 = mix(sample000, sample100, lerpValue.x);
    vec4 xLerp01 = mix(sample001, sample101, lerpValue.x);
    vec4 xLerp10 = mix(sample010, sample110, lerpValue.x);
    vec4 xLerp11 = mix(sample011, sample111, lerpValue.x);

    vec4 yLerp0 = mix(xLerp00, xLerp10, lerpValue.y);
    vec4 yLerp1 = mix(xLerp01, xLerp11, lerpValue.y);
    return mix(yLerp0, yLerp1, lerpValue.z);
}

float remap(float val, float in_start, float in_end, float out_start, float out_end) {
    return out_start + ((out_end - out_start) / (in_end - in_start)) * (val - in_start);
}

// Intersection with a unit sphere with radius 0.5 at center (0, 0, 0).
bool intersectSphere(vec3 origin, vec3 dir, float slice,
                     out vec3 point, out vec3 normal) {  
    float A = dot(dir, dir);
    float B = 2.0 * dot(origin, dir);
    float C = dot(origin, origin) - 0.25;
    float discriminant = (B * B) - (4.0 * A * C);
    if(discriminant < 0.0) {
        return false;
    }
    float root = sqrt(discriminant);
    float t = (-B - root) / (2.0 * A);
    if(t < 0.0) {
        t = (-B + root) / (2.0 * A);
    }
    
    if(slice > 0.0) {
        float clampedSlice = clamp(slice, 0.0, 1.0);
        float sliceOffset = clampedSlice * root / (2.0 * A);
        t += sliceOffset;
    } 

    point = origin + t * dir;
    normal = normalize(point);
    point -= 0.01 * normal;
    return true;
}

// Transforms the ray origin and direction into unit sphere space,
// then transforms the result back into the ellipsoid's space.
bool intersectEllipsoid(vec3 origin, vec3 dir, vec3 center, vec3 scale, float slice,
                        out vec3 point, out vec3 normal) {
    if(scale.x <= 0.01 || scale.y < 0.01 || scale.z < 0.01) {
        return false;
    }

    vec3 o = (origin - center) / scale;
    vec3 d = dir / scale;
    vec3 p, n;
    bool intersected = intersectSphere(o, d, slice, p, n);
    if(intersected) {
        point = (p * scale) + center;
        normal = n;
    }
    return intersected;
}

#define M_PI 3.1415927
// Assume that if phase shift is being called for octave i,
// the frequency is of i - 1. This saves us from doing extra
// division / multiplication operations.
vec2 phaseShift2D(vec2 p, vec2 freq) {
    return (M_PI / 2.0) * sin(freq.yx * p.yx); 
}

vec2 phaseShift3D(vec3 p, vec2 freq) {
    return phaseShift2D(p.xy, freq) + M_PI * vec2(sin(freq.x * p.z));
}

// The cloud texture function derived from Gardner's paper.
const float T0    = 0.6;  // contrast of the texture pattern
const float k     = 0.1;  // computed to produce a maximum value of 1 
const float C0    = 0.8;  // coefficient
const float FX0   = 0.6;  // frequency X
const float FY0   = 0.6;  // frequency Y
const int octaves = 5;

float T(vec3 point) {
    vec2 sum = vec2(0.0);
    float Ci = C0;
    vec2 FXY = vec2(FX0, FY0);
    vec2 PXY = vec2(0.0);
    for(int i = 1; i <= octaves; i++) {
        PXY = phaseShift3D(point, FXY);
        Ci *= 0.707;
        FXY *= 2.0;
        vec2 sinTerm = sin(FXY * point.xy + PXY);
        sum += Ci * sinTerm + vec2(T0);
    }
    return k * sum.x * sum.y;
}

const float a = 0.5; // fraction of surface reflection due to ambient or scattered light, 
const float t = 0.4; // fraction of texture shading 
const float s = 0.25; // fraction of specular reflection

float I(float Id, float Is, float It) {
    return (1.0 - a) * ((1.0 - t) * ((1.0 - s) * Id + s * Is) + t * It) + a;
}

const vec3 lightDir = normalize(vec3(0.2, -1.0, 0.7));

vec4 drawCloud(vec3 rayOrigin, vec3 rayDir, vec3 cloudCenter, vec3 cloudScale, float cloudSlice) {
    vec3 cloudPoint, cloudNormal;
    if(!intersectEllipsoid(rayOrigin, rayDir, cloudCenter, cloudScale, cloudSlice,
                            cloudPoint, cloudNormal)) {
        return vec4(0.0);
    }

    float ndDot = clamp(dot(cloudNormal, -rayDir), 0.0, 1.0);
    float Id = clamp(dot(cloudNormal, -lightDir), 0.0, 1.0);  // diffuse reflection
    float Is = max(pow(dot(-lightDir, -rayDir), 2.0), 0.0);   // specular reflection
    float It = T(cloudPoint);                                 // texture function
    float intensity = I(Id, Is, It);
    vec3 color = intensity * vec3(1.0);

    vec4 noise = sampleNoiseTexture(u_noiseDetail * cloudPoint);
    float W = noise.y;
    float W2 = noise.z;
    float W3 = noise.w;
    float TR = pow(ndDot, 3.0) - W;
    float minusDot = 0.5 - ndDot;
    float heightSignal = clamp((cloudPoint.y + cloudScale.y * 0.5) / cloudScale.y, 0.0, 1.0);
    float heightSignalPow = heightSignal * heightSignal;
    TR *= heightSignalPow + 1.5;
    TR -= max(1.8 * minusDot * W2 * W2, 0.0);
    TR -= 0.8 * (minusDot + 0.13) * W3;
    float shading = mix(1.0 - 0.5 * W * W, 1.0, Id * (1.0 - TR));
    shading = clamp(shading + 0.2, 0.5, 1.0);
    vec3 finalColor = mix(vec3(0.5), shading * color, 1.2);
    return vec4(finalColor, clamp(TR, 0.0, 1.0));
}

void main() {
#ifdef DEBUG_BILLBOARDS
    gl_FragColor = vec4(0.0, 0.5, 0.5, 1.0);
#endif
    
    // To avoid calculations with high values,
    // we raycast from an arbitrarily smaller space.
    vec2 coordinate = v_maximumSize.xy * v_offset;

    vec3 ellipsoidScale = 0.82 * v_maximumSize;
    vec3 ellipsoidCenter = vec3(0.0);

    float zOffset = max(ellipsoidScale.z - 10.0, 0.0);
    vec3 eye = vec3(0, 0, -10.0 - zOffset);
    vec3 rayDir = normalize(vec3(coordinate, 1.0) - eye);
    vec3 rayOrigin = eye;

#ifdef DEBUG_ELLIPSOIDS
    vec3 point, normal;
    if(intersectEllipsoid(rayOrigin, rayDir, ellipsoidCenter, ellipsoidScale, v_slice,
                        point, normal)) {
        gl_FragColor = vec4(1.0);
    }
#else
    #ifndef DEBUG_BILLBOARDS
    vec4 cloud = drawCloud(rayOrigin, rayDir, ellipsoidCenter, ellipsoidScale, v_slice);    
    if(cloud.w < 0.01) {
        discard;
    }
    gl_FragColor = cloud;
    #endif
#endif
}