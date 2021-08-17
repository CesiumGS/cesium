uniform sampler2D u_noiseTexture;
uniform float u_noiseTextureLength;
uniform float u_noiseDetail;
varying vec2 v_textureCoordinates;
varying vec3 v_cloudSize;
varying float v_cloudFlat;

float wrap(float value, float rangeLength) {
    if(value < 0.0) {
        return 0.0;
    }
    if(value > rangeLength - 1.0) {
        return rangeLength - 1.0;
    }
    return value;
}

vec4 sampleNoiseTextureNoFiltering(vec3 position) {
    vec3 recenteredPos = position + vec3(u_noiseTextureLength / 2.0);
    recenteredPos = mod(recenteredPos, u_noiseTextureLength);
    vec3 normalizedPos = recenteredPos / u_noiseTextureLength;
    float lerpValue = fract(z);
    
    // calculate the discrete slices that the input position is in
    float zslice = floor(z);
    float zslice0 = wrap(zslice, u_noiseTextureLength);
    float zslice1 = wrap(zslice0 + 1.0, u_noiseTextureLength);

    float u0 = (zslice0 + normalizedPos.x) / u_noiseTextureLength;
    float u1 = (zslice1 + normalizedPos.x) / u_noiseTextureLength;

    vec2 uv0 = vec2(u0, normalizedPos.y);
    vec2 uv1 = vec2(u1, normalizedPos.y);

    vec4 sample0 = texture2D(u_noiseTexture, uv0);
    vec4 sample1 = texture2D(u_noiseTexture, uv1);
    return mix(sample0, sample1, lerpValue);
}

vec4 sampleNoiseTexture(vec3 position) {
    vec3 recenteredPos = position + vec3(u_noiseTextureLength / 2.0);
    recenteredPos = mod(recenteredPos, u_noiseTextureLength);
    recenteredPos -= vec3(0.5);
    vec3 lerpValue = fract(recenteredPos);
    
    // calculate the discrete slices that the input position is in
    float zslice = floor(recenteredPos.z);
    float zslice0 = wrap(zslice, u_noiseTextureLength);
    float zslice1 = wrap(zslice0 + 1.0, u_noiseTextureLength);

    float yslice = floor(recenteredPos.y);
    float yslice0 = wrap(yslice, u_noiseTextureLength);
    float yslice1 = wrap(yslice0 + 1.0, u_noiseTextureLength);
    yslice0 /= u_noiseTextureLength;
    yslice1 /= u_noiseTextureLength;
    
    float xslice = floor(recenteredPos.x);
    float xslice0 = wrap(xslice, u_noiseTextureLength);
    float xslice1 = wrap(xslice0 + 1.0, u_noiseTextureLength);
    xslice0 = recenteredPos.x / u_noiseTextureLength;
    xslice1 = recenteredPos.x / u_noiseTextureLength;

    float u00 = (zslice0 + xslice0) / u_noiseTextureLength;
    float u01 = (zslice0 + xslice1) / u_noiseTextureLength;
    float u10 = (zslice1 + xslice0) / u_noiseTextureLength;
    float u11 = (zslice1 + xslice1) / u_noiseTextureLength;

    vec2 uv000 = vec2(u00, yslice0);
    vec2 uv001 = vec2(u01, yslice0);
    vec2 uv010 = vec2(u00, yslice1);
    vec2 uv011 = vec2(u01, yslice1);
    vec2 uv100 = vec2(u10, yslice0);
    vec2 uv101 = vec2(u11, yslice0);
    vec2 uv110 = vec2(u10, yslice1);
    vec2 uv111 = vec2(u11, yslice1);

    vec4 sample000 = texture2D(u_noiseTexture, uv000);
    vec4 sample001 = texture2D(u_noiseTexture, uv001);
    vec4 sample010 = texture2D(u_noiseTexture, uv010);
    vec4 sample011 = texture2D(u_noiseTexture, uv011);
    vec4 sample100 = texture2D(u_noiseTexture, uv100);
    vec4 sample101 = texture2D(u_noiseTexture, uv101);
    vec4 sample110 = texture2D(u_noiseTexture, uv110);
    vec4 sample111 = texture2D(u_noiseTexture, uv111);

    /*vec4 xLerp00 = mix(sample000, sample100, lerpValue.x);
    vec4 xLerp01 = mix(sample001, sample101, lerpValue.x);
    vec4 xLerp10 = mix(sample010, sample110, lerpValue.x);
    vec4 xLerp11 = mix(sample011, sample111, lerpValue.x);*/

    /*vec4 yLerp0 = mix(xLerp00, xLerp10, lerpValue.y);
    vec4 yLerp1 = mix(xLerp01, xLerp11, lerpValue.y);*/
    vec4 yLerp0 = mix(sample000, sample010, lerpValue.y);
    vec4 yLerp1 = mix(sample001, sample011, lerpValue.y);

    return mix(yLerp0, yLerp1, lerpValue.z);
}

float remap(float val, float in_start, float in_end, float out_start, float out_end) {
    return out_start + ((out_end - out_start) / (in_end - in_start)) * (val - in_start);
}

// Intersection with a unit sphere with radius 0.5 at center (0, 0, 0).
bool intersectSphere(vec3 origin, vec3 dir,
                     out vec3 point, out vec3 normal) {  
    float A = dot(dir, dir);
    float B = 2.0 * dot(origin, dir);
    float C = dot(origin, origin) - 0.25;
    float discriminant = (B * B) - (4.0 * A * C);
    if(discriminant < 0.0) {
        return false;
    }
    float t = (-B - sqrt(discriminant)) / (2.0 * A);
    if(t < 0.0) {
        t = (-B + sqrt(discriminant)) / (2.0 * A);
    }
    point = origin + t * dir;
    normal = normalize(point);
    point -= 0.01 * normal;
    return true;
}

// Transforms the ray origin and direction into unit sphere space,
// then transforms the result back into the ellipsoid's space.
bool intersectEllipsoid(vec3 origin, vec3 dir, vec3 center, vec3 scale,
                        out vec3 point, out vec3 normal) {
    if(scale.x <= 0.0 || scale.y <= 0.0 || scale.z < 0.0) {
        return false;
    }

    vec3 o = (origin - center) / scale;
    vec3 d = dir / scale;
    vec3 p, n;
    bool intersected = intersectSphere(o, d, p, n);
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
const float T0_2D    = 0.67;  // contrast of the texture pattern
const float k_2D     = 0.05;  // computed to produce a maximum value of 1 
const float C0_2D    = 0.7;  // coefficient
const float FX0_2D   = 0.35;  // frequency X
const float FY0_2D   = 0.35;  // frequency Y
const int octaves_2D = 5;

float T2D(vec2 point) {
    vec2 sum = vec2(0.0);
    float Ci = C0_2D;
    vec2 FXY = vec2(FX0_2D, FY0_2D);
    vec2 PXY = vec2(0.0);
    for(int i = 1; i <= octaves_2D; i++) {
        PXY = phaseShift2D(point, FXY);
        Ci *= 0.707;
        FXY *= 2.0;
        vec2 sinTerm = sin(FXY * point + PXY);
        sum += Ci * sinTerm + vec2(T0_2D);
    }
    return k_2D * sum.x * sum.y;
}

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

const float a_2D = 0.4; // fraction of surface reflection due to ambient or scattered light, 
const float t_2D = 0.5; // fraction of texture shading 
const float s_2D = 0.2; // fraction of specular reflection

float I2D(float Id, float Is, float It) {
    return (1.0 - a_2D) * ((1.0 - t_2D) * ((1.0 - s_2D) * Id + s_2D * Is) + t_2D * It) + a_2D;
}

float I(float Id, float Is, float It) {
    return (1.0 - a) * ((1.0 - t) * ((1.0 - s) * Id + s * Is) + t * It) + a;
}

const vec3 lightDir = normalize(vec3(0.2, -1.0, 0.7));

const float T1 = 0.35;
const float D = 0.9;
vec4 drawCirrusCloud(vec3 point, vec3 rayDir) {
    point *= vec3(20.0, 7.0, 2.0);
    //point.xy += vec2(perlinNoise(point * 0.125));
    float Id = clamp(dot(vec3(0.0, 1.0, 0.0), -lightDir), 0.0, 1.0);  // diffuse reflection
    float Is = max(pow(dot(-lightDir, -rayDir), 2.0), 0.0);           // specular reflection
    float It = T2D(point.xy);                                         // texture function
    float intensity = I2D(Id, Is, It);
    vec3 color = intensity * vec3(1.0);
    float TR = 1.0 - (It - T1) / (D * It * It);
    TR *= TR - 0.3;
    return vec4(color, clamp(TR, 0.0, 1.0));
}

vec4 drawCloud(vec3 rayOrigin, vec3 rayDir, vec3 cloudCenter, vec3 cloudScale) {
    vec3 cloudPoint, cloudNormal;
    if(!intersectEllipsoid(rayOrigin, rayDir, cloudCenter, cloudScale,
                            cloudPoint, cloudNormal)) {
        return vec4(0.0);
    }

    vec4 noise = sampleNoiseTextureNoFiltering(u_noiseDetail * cloudPoint);

    float ndDot = clamp(dot(cloudNormal, -rayDir), 0.0, 1.0);
    float Id = clamp(dot(cloudNormal, -lightDir), 0.0, 1.0);  // diffuse reflection
    float Is = max(pow(dot(-lightDir, -rayDir), 2.0), 0.0);   // specular reflection
    float It = T(cloudPoint);                                 // texture function
    float intensity = I(Id, Is, It);
    vec3 color = intensity * vec3(1.0);

    float W = noise.x;
    float W2 = noise.y;
    float W3 = noise.z;

    float TR = pow(ndDot, 3.0) - W;

    float heightSignal = clamp((cloudPoint.y + cloudScale.y * 0.5) / cloudScale.y, 0.0, 1.0);
    float heightSignalPow = heightSignal * heightSignal;
    TR *= heightSignalPow + 1.5;
    //TR -= 1.1 * W2 - ndDot * W3;
    //float shading = mix(1.0 - 0.8 * W * W, 1.0, clamp(Id * TR * heightSignalPow, 0.0, 1.0));
    //shading = clamp(shading + 0.1, 0.3, 1.0);
    return vec4(color, clamp(TR, 0.0, 1.0));
}

void main() {
    // To avoid calculations with high values,
    // we raycast from an arbitrarily smaller space.
    vec2 coordinate = v_cloudSize.xy * v_textureCoordinates;
    if(v_cloudFlat > 0.0) {
        coordinate = v_cloudSize.xz * v_textureCoordinates;
    }

    float z = min(v_cloudSize.x, v_cloudSize.y);
    vec3 ellipsoidScale = vec3(v_cloudSize.xy, z);
    vec3 ellipsoidCenter = vec3(0.0);

    vec3 eye = vec3(0, 0, -10.0);
    vec3 rayDir = normalize(vec3(coordinate, 1.0) - eye);
    vec3 rayOrigin = eye;

    vec4 cloud = drawCloud(rayOrigin, rayDir, ellipsoidCenter, ellipsoidScale);
    if(cloud.w < 0.01) {
        discard;
    }

    gl_FragColor = cloud;
}