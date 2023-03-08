//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D u_noiseTexture;\n\
uniform vec3 u_noiseTextureDimensions;\n\
uniform float u_noiseDetail;\n\
varying vec2 v_offset;\n\
varying vec3 v_maximumSize;\n\
varying vec4 v_color;\n\
varying float v_slice;\n\
varying float v_brightness;\n\
\n\
float wrap(float value, float rangeLength) {\n\
    if(value < 0.0) {\n\
        float absValue = abs(value);\n\
        float modValue = mod(absValue, rangeLength);\n\
        return mod(rangeLength - modValue, rangeLength);\n\
    }\n\
    return mod(value, rangeLength);\n\
}\n\
\n\
vec3 wrapVec(vec3 value, float rangeLength) {\n\
    return vec3(wrap(value.x, rangeLength),\n\
                wrap(value.y, rangeLength),\n\
                wrap(value.z, rangeLength));\n\
}\n\
\n\
float textureSliceWidth = u_noiseTextureDimensions.x;\n\
float noiseTextureRows = u_noiseTextureDimensions.y;\n\
float inverseNoiseTextureRows = u_noiseTextureDimensions.z;\n\
\n\
float textureSliceWidthSquared = textureSliceWidth * textureSliceWidth;\n\
vec2 inverseNoiseTextureDimensions = vec2(noiseTextureRows / textureSliceWidthSquared,\n\
                                          inverseNoiseTextureRows / textureSliceWidth);\n\
\n\
vec2 voxelToUV(vec3 voxelIndex) {\n\
    vec3 wrappedIndex = wrapVec(voxelIndex, textureSliceWidth);\n\
    float column = mod(wrappedIndex.z, textureSliceWidth * inverseNoiseTextureRows);\n\
    float row = floor(wrappedIndex.z / textureSliceWidth * noiseTextureRows);\n\
\n\
    float xPixelCoord = wrappedIndex.x + column * textureSliceWidth;\n\
    float yPixelCoord = wrappedIndex.y + row * textureSliceWidth;\n\
    return vec2(xPixelCoord, yPixelCoord) * inverseNoiseTextureDimensions;\n\
}\n\
\n\
// Interpolate a voxel with its neighbor (along the positive X-axis)\n\
vec4 lerpSamplesX(vec3 voxelIndex, float x) {\n\
    vec2 uv0 = voxelToUV(voxelIndex);\n\
    vec2 uv1 = voxelToUV(voxelIndex + vec3(1.0, 0.0, 0.0));\n\
    vec4 sample0 = texture2D(u_noiseTexture, uv0);\n\
    vec4 sample1 = texture2D(u_noiseTexture, uv1);\n\
    return mix(sample0, sample1, x);\n\
}\n\
\n\
vec4 sampleNoiseTexture(vec3 position) {\n\
    vec3 recenteredPos = position + vec3(textureSliceWidth / 2.0);\n\
    vec3 lerpValue = fract(recenteredPos);\n\
    vec3 voxelIndex = floor(recenteredPos);\n\
\n\
    vec4 xLerp00 = lerpSamplesX(voxelIndex, lerpValue.x);\n\
    vec4 xLerp01 = lerpSamplesX(voxelIndex + vec3(0.0, 0.0, 1.0), lerpValue.x);\n\
    vec4 xLerp10 = lerpSamplesX(voxelIndex + vec3(0.0, 1.0, 0.0), lerpValue.x);\n\
    vec4 xLerp11 = lerpSamplesX(voxelIndex + vec3(0.0, 1.0, 1.0), lerpValue.x);\n\
\n\
    vec4 yLerp0 = mix(xLerp00, xLerp10, lerpValue.y);\n\
    vec4 yLerp1 = mix(xLerp01, xLerp11, lerpValue.y);\n\
    return mix(yLerp0, yLerp1, lerpValue.z);\n\
}\n\
\n\
// Intersection with a unit sphere with radius 0.5 at center (0, 0, 0).\n\
bool intersectSphere(vec3 origin, vec3 dir, float slice,\n\
                     out vec3 point, out vec3 normal) {\n\
    float A = dot(dir, dir);\n\
    float B = dot(origin, dir);\n\
    float C = dot(origin, origin) - 0.25;\n\
    float discriminant = (B * B) - (A * C);\n\
    if(discriminant < 0.0) {\n\
        return false;\n\
    }\n\
    float root = sqrt(discriminant);\n\
    float t = (-B - root) / A;\n\
    if(t < 0.0) {\n\
        t = (-B + root) / A;\n\
    }\n\
    point = origin + t * dir;\n\
\n\
    if(slice >= 0.0) {\n\
        point.z = (slice / 2.0) - 0.5;\n\
        if(length(point) > 0.5) {\n\
            return false;\n\
        }\n\
    }\n\
\n\
    normal = normalize(point);\n\
    point -= czm_epsilon2 * normal;\n\
    return true;\n\
}\n\
\n\
// Transforms the ray origin and direction into unit sphere space,\n\
// then transforms the result back into the ellipsoid's space.\n\
bool intersectEllipsoid(vec3 origin, vec3 dir, vec3 center, vec3 scale, float slice,\n\
                        out vec3 point, out vec3 normal) {\n\
    if(scale.x <= 0.01 || scale.y < 0.01 || scale.z < 0.01) {\n\
        return false;\n\
    }\n\
\n\
    vec3 o = (origin - center) / scale;\n\
    vec3 d = dir / scale;\n\
    vec3 p, n;\n\
    bool intersected = intersectSphere(o, d, slice, p, n);\n\
    if(intersected) {\n\
        point = (p * scale) + center;\n\
        normal = n;\n\
    }\n\
    return intersected;\n\
}\n\
\n\
// Assume that if phase shift is being called for octave i,\n\
// the frequency is of i - 1. This saves us from doing extra\n\
// division / multiplication operations.\n\
vec2 phaseShift2D(vec2 p, vec2 freq) {\n\
    return (czm_pi / 2.0) * sin(freq.yx * p.yx);\n\
}\n\
\n\
vec2 phaseShift3D(vec3 p, vec2 freq) {\n\
    return phaseShift2D(p.xy, freq) + czm_pi * vec2(sin(freq.x * p.z));\n\
}\n\
\n\
// The cloud texture function derived from Gardner's 1985 paper,\n\
// \"Visual Simulation of Clouds.\"\n\
// https://www.cs.drexel.edu/~david/Classes/Papers/p297-gardner.pdf\n\
const float T0    = 0.6;  // contrast of the texture pattern\n\
const float k     = 0.1;  // computed to produce a maximum value of 1\n\
const float C0    = 0.8;  // coefficient\n\
const float FX0   = 0.6;  // frequency X\n\
const float FY0   = 0.6;  // frequency Y\n\
const int octaves = 5;\n\
\n\
float T(vec3 point) {\n\
    vec2 sum = vec2(0.0);\n\
    float Ci = C0;\n\
    vec2 FXY = vec2(FX0, FY0);\n\
    vec2 PXY = vec2(0.0);\n\
    for(int i = 1; i <= octaves; i++) {\n\
        PXY = phaseShift3D(point, FXY);\n\
        Ci *= 0.707;\n\
        FXY *= 2.0;\n\
        vec2 sinTerm = sin(FXY * point.xy + PXY);\n\
        sum += Ci * sinTerm + vec2(T0);\n\
    }\n\
    return k * sum.x * sum.y;\n\
}\n\
\n\
const float a = 0.5;  // fraction of surface reflection due to ambient or scattered light,\n\
const float t = 0.4;  // fraction of texture shading\n\
const float s = 0.25; // fraction of specular reflection\n\
\n\
float I(float Id, float Is, float It) {\n\
    return (1.0 - a) * ((1.0 - t) * ((1.0 - s) * Id + s * Is) + t * It) + a;\n\
}\n\
\n\
const vec3 lightDir = normalize(vec3(0.2, -1.0, 0.7));\n\
\n\
vec4 drawCloud(vec3 rayOrigin, vec3 rayDir, vec3 cloudCenter, vec3 cloudScale, float cloudSlice,\n\
               float brightness) {\n\
    vec3 cloudPoint, cloudNormal;\n\
    if(!intersectEllipsoid(rayOrigin, rayDir, cloudCenter, cloudScale, cloudSlice,\n\
                            cloudPoint, cloudNormal)) {\n\
        return vec4(0.0);\n\
    }\n\
\n\
    float Id = clamp(dot(cloudNormal, -lightDir), 0.0, 1.0);  // diffuse reflection\n\
    float Is = max(pow(dot(-lightDir, -rayDir), 2.0), 0.0);   // specular reflection\n\
    float It = T(cloudPoint);                                 // texture function\n\
    float intensity = I(Id, Is, It);\n\
    vec3 color = vec3(intensity * clamp(brightness, 0.1, 1.0));\n\
\n\
    vec4 noise = sampleNoiseTexture(u_noiseDetail * cloudPoint);\n\
    float W = noise.x;\n\
    float W2 = noise.y;\n\
    float W3 = noise.z;\n\
\n\
    // The dot product between the cloud's normal and the ray's direction is greatest\n\
    // in the center of the ellipsoid's surface. It decreases towards the edge.\n\
    // Thus, it is used to blur the areas leading to the edges of the ellipsoid,\n\
    // so that no harsh lines appear.\n\
\n\
    // The first (and biggest) layer of worley noise is then subtracted from this.\n\
    // The final result is scaled up so that the base cloud is not too translucent.\n\
    float ndDot = clamp(dot(cloudNormal, -rayDir), 0.0, 1.0);\n\
    float TR = pow(ndDot, 3.0) - W; // translucency\n\
    TR *= 1.3;\n\
\n\
    // Subtracting the second and third layers of worley noise is more complicated.\n\
    // If these layers of noise were simply subtracted from the current translucency,\n\
    // the shape derived from the first layer of noise would be completely deleted.\n\
    // The erosion of this noise should thus be constricted to the edges of the cloud.\n\
    // However, because the edges of the ellipsoid were already blurred away, mapping\n\
    // the noise to (1.0 - ndDot) will have no impact on most of the cloud's appearance.\n\
    // The value of (0.5 - ndDot) provides the best compromise.\n\
    float minusDot = 0.5 - ndDot;\n\
\n\
    // Even with the previous calculation, subtracting the second layer of wnoise\n\
    // erode too much of the cloud. The addition of it, however, will detailed\n\
    // volume to the cloud. As long as the noise is only added and not subtracted,\n\
    // the results are aesthetically pleasing.\n\
\n\
    // The minusDot product is mapped in a way that it is larger at the edges of\n\
    // the ellipsoid, so a subtraction and min operation are used instead of\n\
    // an addition and max one.\n\
    TR -= min(minusDot * W2, 0.0);\n\
\n\
    // The third level of worley noise is subtracted from the result, with some\n\
    // modifications. First, a scalar is added to minusDot so that the noise\n\
    // starts affecting the shape farther away from the center of the ellipsoid's\n\
    // surface. Then, it is scaled down so its impact is not too intense.\n\
    TR -= 0.8 * (minusDot + 0.25) * W3;\n\
\n\
    // The texture function's shading does not correlate with the shape of the cloud\n\
    // produced by the layers of noise, so an extra shading scalar is calculated.\n\
    // The darkest areas of the cloud are assigned to be where the noise erodes\n\
    // the cloud the most. This is then interpolated based on the translucency\n\
    // and the diffuse shading term of that point in the cloud.\n\
    float shading = mix(1.0 - 0.8 * W * W, 1.0, Id * TR);\n\
\n\
    // To avoid values that are too dark, this scalar is increased by a small amount\n\
    // and clamped so it never goes to zero.\n\
    shading = clamp(shading + 0.2, 0.3, 1.0);\n\
\n\
    // Finally, the contrast of the cloud's color is increased.\n\
    vec3 finalColor = mix(vec3(0.5), shading * color, 1.15);\n\
    return vec4(finalColor, clamp(TR, 0.0, 1.0)) * v_color;\n\
}\n\
\n\
void main() {\n\
#ifdef DEBUG_BILLBOARDS\n\
    gl_FragColor = vec4(0.0, 0.5, 0.5, 1.0);\n\
#endif\n\
    // To avoid calculations with high values,\n\
    // we raycast from an arbitrarily smaller space.\n\
    vec2 coordinate = v_maximumSize.xy * v_offset;\n\
\n\
    vec3 ellipsoidScale = 0.82 * v_maximumSize;\n\
    vec3 ellipsoidCenter = vec3(0.0);\n\
\n\
    float zOffset = max(ellipsoidScale.z - 10.0, 0.0);\n\
    vec3 eye = vec3(0, 0, -10.0 - zOffset);\n\
    vec3 rayDir = normalize(vec3(coordinate, 1.0) - eye);\n\
    vec3 rayOrigin = eye;\n\
#ifdef DEBUG_ELLIPSOIDS\n\
    vec3 point, normal;\n\
    if(intersectEllipsoid(rayOrigin, rayDir, ellipsoidCenter, ellipsoidScale, v_slice,\n\
                          point, normal)) {\n\
        gl_FragColor = v_brightness * v_color;\n\
    }\n\
#else\n\
#ifndef DEBUG_BILLBOARDS\n\
    vec4 cloud = drawCloud(rayOrigin, rayDir,\n\
                           ellipsoidCenter, ellipsoidScale, v_slice, v_brightness);\n\
    if(cloud.w < 0.01) {\n\
        discard;\n\
    }\n\
    gl_FragColor = cloud;\n\
#endif\n\
#endif\n\
}\n\
";
