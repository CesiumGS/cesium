uniform sampler2D u_noiseTexture;
uniform float u_noiseTextureLength;
uniform float u_noiseDetail;
varying vec2 v_offset;
varying vec3 v_maximumSize;
varying float v_slice;
varying float v_brightness;

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
vec2 invNoiseTextureDimensions = vec2(1.0 / noiseTextureLengthSquared * 4.0, 1.0 / u_noiseTextureLength * 0.25);
float numSlices = u_noiseTextureLength;

vec2 voxelToUV(vec3 voxelIndex) {
    vec3 vi = mod(voxelIndex, numSlices);
    float column = mod(vi.z, numSlices / 4.0);
    float row = floor(vi.z / numSlices * 4.0);

    float xPixelCoord = vi.x + column * u_noiseTextureLength;
    float yPixelCoord = vi.y + row * u_noiseTextureLength;
    return vec2(xPixelCoord, yPixelCoord) * invNoiseTextureDimensions;
}

vec4 sampleNoiseTexture(vec3 position) {
    vec3 recenteredPos = position + vec3(u_noiseTextureLength / 2.0);
    vec3 lerpValue = fract(recenteredPos);
    vec3 voxelIndex = floor(recenteredPos);

    vec4 sample000 = texture2D(u_noiseTexture, voxelToUV(voxelIndex));
    vec4 sample001 = texture2D(u_noiseTexture, voxelToUV(voxelIndex + vec3(0.0, 0.0, 1.0)));
    vec4 sample010 = texture2D(u_noiseTexture, voxelToUV(voxelIndex + vec3(0.0, 1.0, 0.0)));
    vec4 sample011 = texture2D(u_noiseTexture, voxelToUV(voxelIndex + vec3(0.0, 1.0, 1.0)));
    vec4 sample100 = texture2D(u_noiseTexture, voxelToUV(voxelIndex + vec3(1.0, 0.0, 0.0)));
    vec4 sample101 = texture2D(u_noiseTexture, voxelToUV(voxelIndex + vec3(1.0, 0.0, 1.0)));
    vec4 sample110 = texture2D(u_noiseTexture, voxelToUV(voxelIndex + vec3(1.0, 1.0, 0.0)));
    vec4 sample111 = texture2D(u_noiseTexture, voxelToUV(voxelIndex + vec3(1.0, 1.0, 1.0)));

    vec4 xLerp00 = mix(sample000, sample100, lerpValue.x);
    vec4 xLerp01 = mix(sample001, sample101, lerpValue.x);
    vec4 xLerp10 = mix(sample010, sample110, lerpValue.x);
    vec4 xLerp11 = mix(sample011, sample111, lerpValue.x);

    vec4 yLerp0 = mix(xLerp00, xLerp10, lerpValue.y);
    vec4 yLerp1 = mix(xLerp01, xLerp11, lerpValue.y);
    return mix(yLerp0, yLerp1, lerpValue.z);
}

// Intersection with a unit sphere with radius 0.5 at center (0, 0, 0).
bool intersectSphere(vec3 origin, vec3 dir, float slice,
                     out vec3 point, out vec3 normal) {
    float A = dot(dir, dir);
    float B = dot(origin, dir);
    float C = dot(origin, origin) - 0.25;
    float discriminant = (B * B) - (A * C);
    if(discriminant < 0.0) {
        return false;
    }
    float root = sqrt(discriminant);
    float t = (-B - root) / A;
    if(t < 0.0) {
        t = (-B + root) / A;
    }
    point = origin + t * dir;

    if(slice >= 0.0) {
        point.z = (slice / 2.0) - 0.5;
        if(length(point) > 0.5) {
            return false;
        }
    }

    normal = normalize(point);
    point -= czm_epsilon2 * normal;
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

// Assume that if phase shift is being called for octave i,
// the frequency is of i - 1. This saves us from doing extra
// division / multiplication operations.
vec2 phaseShift2D(vec2 p, vec2 freq) {
    return (czm_pi / 2.0) * sin(freq.yx * p.yx);
}

vec2 phaseShift3D(vec3 p, vec2 freq) {
    return phaseShift2D(p.xy, freq) + czm_pi * vec2(sin(freq.x * p.z));
}

// The cloud texture function derived from Gardner's 1985 paper,
// "Visual Simulation of Clouds."
// https://www.cs.drexel.edu/~david/Classes/Papers/p297-gardner.pdf
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

const float a = 0.5;  // fraction of surface reflection due to ambient or scattered light,
const float t = 0.4;  // fraction of texture shading
const float s = 0.25; // fraction of specular reflection

float I(float Id, float Is, float It) {
    return (1.0 - a) * ((1.0 - t) * ((1.0 - s) * Id + s * Is) + t * It) + a;
}

const vec3 lightDir = normalize(vec3(0.2, -1.0, 0.7));

vec4 drawCloud(vec3 rayOrigin, vec3 rayDir, vec3 cloudCenter, vec3 cloudScale, float cloudSlice,
               float brightness) {
    vec3 cloudPoint, cloudNormal;
    if(!intersectEllipsoid(rayOrigin, rayDir, cloudCenter, cloudScale, cloudSlice,
                            cloudPoint, cloudNormal)) {
        return vec4(0.0);
    }

    float Id = clamp(dot(cloudNormal, -lightDir), 0.0, 1.0);  // diffuse reflection
    float Is = max(pow(dot(-lightDir, -rayDir), 2.0), 0.0);   // specular reflection
    float It = T(cloudPoint);                                 // texture function
    float intensity = I(Id, Is, It);
    vec3 color = intensity * clamp(brightness, 0.1, 1.0) * vec3(1.0);

    vec4 noise = sampleNoiseTexture(u_noiseDetail * cloudPoint);
    float W = noise.x;
    float W2 = noise.y;
    float W3 = noise.z;

    // The dot product between the cloud's normal and the ray's direction is greatest
    // in the center of the ellipsoid's surface. It decreases towards the edge.
    // Thus, it is used to blur the areas leading to the edges of the ellipsoid,
    // so that no harsh lines appear.

    // The first (and biggest) layer of worley noise is then subtracted from this.
    // The final result is scaled up so that the base cloud is not too translucent.
    float ndDot = clamp(dot(cloudNormal, -rayDir), 0.0, 1.0);
    float TR = pow(ndDot, 3.0) - W; // translucency
    TR *= 1.3;

    // Subtracting the second and third layers of worley noise is more complicated.
    // If these layers of noise were simply subtracted from the current translucency,
    // the shape derived from the first layer of noise would be completely deleted.
    // The erosion of this noise should thus be constricted to the edges of the cloud.
    // However, because the edges of the ellipsoid were already blurred away, mapping
    // the noise to (1.0 - ndDot) will have no impact on most of the cloud's appearance.
    // The value of (0.5 - ndDot) provides the best compromise.
    float minusDot = 0.5 - ndDot;

    // Even with the previous calculation, subtracting the second layer of wnoise
    // erode too much of the cloud. The addition of it, however, will detailed
    // volume to the cloud. As long as the noise is only added and not subtracted,
    // the results are aesthetically pleasing.

    // The minusDot product is mapped in a way that it is larger at the edges of
    // the ellipsoid, so a subtraction and min operation are used instead of
    // an addition and max one.
    TR -= min(minusDot * W2, 0.0);

    // The third level of worley noise is subtracted from the result, with some
    // modifications. First, a scalar is added to minusDot so that the noise
    // starts affecting the shape farther away from the center of the ellipsoid's
    // surface. Then, it is scaled down so its impact is not too intense.
    TR -= 0.8 * (minusDot + 0.25) * W3;

    // The texture function's shading does not correlate with the shape of the cloud
    // produced by the layers of noise, so an extra shading scalar is calculated.
    // The darkest areas of the cloud are assigned to be where the noise erodes
    // the cloud the most. This is then interpolated based on the translucency
    // and the diffuse shading term of that point in the cloud.
    float shading = mix(1.0 - 0.8 * W * W, 1.0, Id * TR);

    // To avoid values that are too dark, this scalar is increased by a small amount
    // and clamped so it never goes to zero.
    shading = clamp(shading + 0.2, 0.3, 1.0);

    // Finally, the contrast of the cloud's color is increased.
    vec3 finalColor = mix(vec3(0.5), shading * color, 1.15);
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
        gl_FragColor = v_brightness * vec4(1.0);
    }
#else
#ifndef DEBUG_BILLBOARDS
    vec4 cloud = drawCloud(rayOrigin, rayDir,
                           ellipsoidCenter, ellipsoidScale, v_slice, v_brightness);
    if(cloud.w < 0.01) {
        discard;
    }
    gl_FragColor = cloud;
#endif
#endif
}
