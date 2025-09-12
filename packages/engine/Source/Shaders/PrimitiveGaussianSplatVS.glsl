//
// Vertex shader for Gaussian splats.

// The splats are rendered as quads in view space. Splat attributes are loaded from a texture with precomputed 3D covariance.

// Passes local quad coordinates and color to the fragment shader for Gaussian evaluation. 
//
// Discards splats outside the view frustum or with negligible screen size.
//

#define HAS_SPHERICAL_HARMONICS (defined(SH1_ENABLED) || defined(SH2_ENABLED) || defined(SH3_ENABLED))

ivec2 texelCoord(uint texelIndex, ivec2 textureSize) {
    return ivec2(texelIndex % uint(textureSize.x), texelIndex / uint(textureSize.x));
}

// Color packed as R32UI single channel texture
vec4 unpackRGBAToFloat(uint packed) {
    return vec4(
        float((packed >> 24) & 0xFFu),
        float((packed >> 16) & 0xFFu),
        float((packed >> 8)  & 0xFFu),
        float(packed & 0xFFu)
    ) / 255.0;
}

#if defined(HAS_SPHERICAL_HARMONICS)
const uint coefficientCount[3] = uint[3](3u,8u,15u);
const float SH_C1 = 0.48860251;
const float SH_C2[5] = float[5](
         1.092548430,
        -1.09254843,
        0.315391565,
        -1.09254843,
        0.546274215
);

const float SH_C3[7] = float[7](
         -0.59004358,
        2.890611442,
        -0.45704579,
        0.373176332,
        -0.45704579,
        1.445305721,
        -0.59004358
);

//Unpack RG32UI half float coefficients to vec3
vec3 halfToVec3(uvec2 packed) {
    return vec3(unpackHalf2x16(packed.x), unpackHalf2x16(packed.y).x);
}

vec3 loadAndExpandSHCoeff(uint splatID, int index, highp usampler2D u_sphericalHarmonicsTexture, uint degree) {
    ivec2 shTexSize = textureSize(u_sphericalHarmonicsTexture, 0);
    uint dims = coefficientCount[degree - 1u];
    uint splatsPerRow = uint(shTexSize.x) / dims;
    uint shIndex = (splatID%splatsPerRow) * dims + uint(index);
    ivec2 shPosCoord = ivec2(shIndex, splatID / splatsPerRow);
    uvec2 coeff = texelFetch(u_sphericalHarmonicsTexture, shPosCoord, 0).rg;
    return halfToVec3(coeff);
}

vec3 evaluateSH(uint splatID, vec3 viewDir) {
    vec3 result = vec3(0.0);
    int coeffIndex = 0;
    float x = viewDir.x, y = viewDir.y, z = viewDir.z;

#if defined(SH1_ENABLED)
    vec3 sh1 = loadAndExpandSHCoeff(splatID, coeffIndex++, u_splatSh1Texture, 1u);
    vec3 sh2 = loadAndExpandSHCoeff(splatID, coeffIndex++, u_splatSh2Texture, 2u);
    vec3 sh3 = loadAndExpandSHCoeff(splatID, coeffIndex++, u_splatSh3Texture, 3u);
    result += -SH_C1 * y * sh1 + SH_C1 * z * sh2 - SH_C1 * x * sh3;
#endif

#if defined(SH2_ENABLED)
    float xx = x * x;
    float yy = y * y;
    float zz = z * z;
    float xy = x * y;
    float yz = y * z;
    float xz = x * z;

    vec3 sh4 = loadAndExpandSHCoeff(splatID, coeffIndex++, u_splatSh2Texture, 4u);
    vec3 sh5 = loadAndExpandSHCoeff(splatID, coeffIndex++, u_splatSh2Texture, 5u);
    vec3 sh6 = loadAndExpandSHCoeff(splatID, coeffIndex++, u_splatSh2Texture, 6u);
    vec3 sh7 = loadAndExpandSHCoeff(splatID, coeffIndex++, u_splatSh2Texture, 7u);
    vec3 sh8 = loadAndExpandSHCoeff(splatID, coeffIndex++, u_splatSh2Texture, 8u);
    result += SH_C2[0] * xy * sh4 +
            SH_C2[1] * yz * sh5 +
            SH_C2[2] * (2.0f * zz - xx - yy) * sh6 +
            SH_C2[3] * xz * sh7 +
            SH_C2[4] * (xx - yy) * sh8;
#endif

#if defined(SH3_ENABLED)
    vec3 sh9 = loadAndExpandSHCoeff(splatID, coeffIndex++, u_splatSh3Texture, 9u);
    vec3 sh10 = loadAndExpandSHCoeff(splatID, coeffIndex++, u_splatSh3Texture, 10u);
    vec3 sh11 = loadAndExpandSHCoeff(splatID, coeffIndex++, u_splatSh3Texture, 11u);
    vec3 sh12 = loadAndExpandSHCoeff(splatID, coeffIndex++, u_splatSh3Texture, 12u);
    vec3 sh13 = loadAndExpandSHCoeff(splatID, coeffIndex++, u_splatSh3Texture, 13u);
    vec3 sh14 = loadAndExpandSHCoeff(splatID, coeffIndex++, u_splatSh3Texture, 14u);
    vec3 sh15 = loadAndExpandSHCoeff(splatID, coeffIndex++, u_splatSh3Texture, 15u);
    result += SH_C3[0] * y * (3.0f * xx - yy) * sh9 +
            SH_C3[1] * xy * z * sh10 +
            SH_C3[2] * y * (4.0f * zz - xx - yy) * sh11 +
            SH_C3[3] * z * (2.0f * zz - 3.0f * xx - 3.0f * yy) * sh12 +
            SH_C3[4] * x * (4.0f * zz - xx - yy) * sh13 +
            SH_C3[5] * z * (xx - yy) * sh14 +
            SH_C3[6] * x * (xx - 3.0f * yy) * sh15;
#endif

    return result;
}
#endif

// Transforms and projects splat covariance into screen space and extracts the major and minor axes of the Gaussian ellipsoid
// which is used to calculate the vertex position in clip space.
vec4 calcCovVectors(vec3 viewPos, mat3 Vrk) {
    vec4 t = vec4(viewPos, 1.0);
    vec2 focal = vec2(czm_projection[0][0] * czm_viewport.z, czm_projection[1][1] * czm_viewport.w);

    vec2 J1 = focal / t.z;
    vec2 J2 = -focal * vec2(t.x, t.y) / (t.z * t.z);
    mat3 J = mat3(
        J1.x, 0.0, J2.x,
        0.0, J1.y, J2.y,
        0.0, 0.0, 0.0
    );

    mat3 R = mat3(czm_modelView);

    //transform our covariance into view space
    //ensures orientation is correct
    mat3 Vrk_view = R * Vrk * transpose(R);
    mat3 cov = transpose(J) * Vrk_view * J;

    float diagonal1 = cov[0][0] + .3;
    float offDiagonal = cov[0][1];
    float diagonal2 = cov[1][1] + .3;

    float mid = 0.5 * (diagonal1 + diagonal2);
    float radius = length(vec2((diagonal1 - diagonal2) * 0.5, offDiagonal));
    float lambda1 = mid + radius;
    float lambda2 = max(mid - radius, 0.1);

    vec2 diagonalVector = normalize(vec2(offDiagonal, lambda1 - diagonal1));

    return vec4(
        min(sqrt(2.0 * lambda1), 1024.0) * diagonalVector,
        min(sqrt(2.0 * lambda2), 1024.0) * vec2(diagonalVector.y, -diagonalVector.x)
    );
}

highp vec4 discardVec = vec4(0.0, 0.0, 2.0, 1.0);

void main() {
    uint splatTextureIndex = uint(a_splatIndex);
    ivec2 posTextureSize = textureSize(u_splatPositionTexture, 0);
    ivec2 covTextureSize = textureSize(u_splatCovarianceTexture, 0);
    ivec2 colorTextureSize = textureSize(u_splatColorTexture, 0);

    ivec2 posTextureIdx = texelCoord(splatTextureIndex, posTextureSize);
    vec3 splatPosition = texelFetch(u_splatPositionTexture, posTextureIdx, 0).xyz;

    ivec2 colorTextureIdx = texelCoord(splatTextureIndex, colorTextureSize);
    v_splatColor = unpackRGBAToFloat(uvec4(texelFetch(u_splatColorTexture, colorTextureIdx, 0)).r);

    uint covBaseIdx = splatTextureIndex;
    ivec2 covTextureIdx = texelCoord(covBaseIdx, covTextureSize);
    uvec4 splatCovariancePacked = uvec4(texelFetch(u_splatCovarianceTexture, covTextureIdx, 0));

    vec4 splatViewPos = czm_modelView * vec4(splatPosition.xyz, 1.0);
    vec4 clipPosition = czm_projection * splatViewPos;

    float clip = 1.2 * clipPosition.w;
    if (clipPosition.z < -clip || clipPosition.x < -clip || clipPosition.x > clip ||
        clipPosition.y < -clip || clipPosition.y > clip) {
        gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
        return;
    }

    gl_Position = clipPosition;

    vec2 sigma1 = unpackHalf2x16(splatCovariancePacked.x);
    vec2 sigma2 = unpackHalf2x16(splatCovariancePacked.y);
    vec2 sigma3 = unpackHalf2x16(splatCovariancePacked.z);
    float factor = uintBitsToFloat(splatCovariancePacked.w);

    mat3 Vrk = mat3(sigma1.x, sigma1.y, sigma2.x,
                    sigma1.y, sigma2.y, sigma3.x,
                    sigma2.x, sigma3.x, sigma3.y) * factor;
                    
    vec4 covVectors = calcCovVectors(splatViewPos.xyz, Vrk);
    vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2) - 1.;

    gl_Position += vec4((corner.x * covVectors.xy + corner.y * covVectors.zw) / czm_viewport.zw * gl_Position.w, 0, 0);
    gl_Position.z = clamp(gl_Position.z, -abs(gl_Position.w), abs(gl_Position.w));

    v_vertPos = corner;

#if defined(HAS_SPHERICAL_HARMONICS)
    vec4 splatWC = czm_inverseView * splatViewPos;
    vec3 viewDirModel = normalize(u_inverseModelRotation * (splatWC.xyz - u_cameraPositionWC.xyz));

    v_splatColor.rgb += evaluateSH(splatTextureIndex, viewDirModel).rgb;
#endif
    v_splitDirection = u_splitDirection;
}