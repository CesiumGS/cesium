//
// Vertex shader for Gaussian splats.

// The splats are rendered as quads in view space. Splat attributes are loaded from a texture with precomputed 3D covariance.

// Passes local quad coordinates and color to the fragment shader for Gaussian evaluation. 
//
// Discards splats outside the view frustum or with negligible screen size.
//
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

//Retrieve SH coefficient. Currently RG32UI format
uvec2 loadSHCoeff(uint splatID, int index) {
    ivec2 shTexSize = textureSize(u_sphericalHarmonicsTexture, 0);
    uint dims = coefficientCount[uint(u_sphericalHarmonicsDegree)-1u];
    uint splatsPerRow = uint(shTexSize.x) / dims;
    uint shIndex = (splatID%splatsPerRow) * dims + uint(index);
    ivec2 shPosCoord = ivec2(shIndex, splatID / splatsPerRow);
    return texelFetch(u_sphericalHarmonicsTexture, shPosCoord, 0).rg;
}

//Unpack RG32UI half float coefficients to vec3
vec3 halfToVec3(uvec2 packed) {
    return vec3(unpackHalf2x16(packed.x), unpackHalf2x16(packed.y).x);
}

vec3 loadAndExpandSHCoeff(uint splatID, int index) {
    uvec2 coeff = loadSHCoeff(splatID, index);
    return halfToVec3(coeff);
}

vec3 evaluateSH(uint splatID, vec3 viewDir) {
    vec3 result = vec3(0.0);
    int coeffIndex = 0;
    float x = viewDir.x, y = viewDir.y, z = viewDir.z;

    if (u_sphericalHarmonicsDegree >= 1.) {
        vec3 sh1 = loadAndExpandSHCoeff(splatID, coeffIndex++);
        vec3 sh2 = loadAndExpandSHCoeff(splatID, coeffIndex++);
        vec3 sh3 = loadAndExpandSHCoeff(splatID, coeffIndex++);
        result += -SH_C1 * y * sh1 + SH_C1 * z * sh2 - SH_C1 * x * sh3;

        if (u_sphericalHarmonicsDegree >= 2.) {
            float xx = x * x;
            float yy = y * y;
            float zz = z * z;
            float xy = x * y;
            float yz = y * z;
            float xz = x * z;

            vec3 sh4 = loadAndExpandSHCoeff(splatID, coeffIndex++);
            vec3 sh5 = loadAndExpandSHCoeff(splatID, coeffIndex++);
            vec3 sh6 = loadAndExpandSHCoeff(splatID, coeffIndex++);
            vec3 sh7 = loadAndExpandSHCoeff(splatID, coeffIndex++);
            vec3 sh8 = loadAndExpandSHCoeff(splatID, coeffIndex++);
            result += SH_C2[0] * xy * sh4 +
                    SH_C2[1] * yz * sh5 +
                    SH_C2[2] * (2.0f * zz - xx - yy) * sh6 +
                    SH_C2[3] * xz * sh7 +
                    SH_C2[4] * (xx - yy) * sh8;

            if (u_sphericalHarmonicsDegree >= 3.) {
                vec3 sh9 = loadAndExpandSHCoeff(splatID, coeffIndex++);
                vec3 sh10 = loadAndExpandSHCoeff(splatID, coeffIndex++);
                vec3 sh11 = loadAndExpandSHCoeff(splatID, coeffIndex++);
                vec3 sh12 = loadAndExpandSHCoeff(splatID, coeffIndex++);
                vec3 sh13 = loadAndExpandSHCoeff(splatID, coeffIndex++);
                vec3 sh14 = loadAndExpandSHCoeff(splatID, coeffIndex++);
                vec3 sh15 = loadAndExpandSHCoeff(splatID, coeffIndex++);
                result += SH_C3[0] * y * (3.0f * xx - yy) * sh9 +
                        SH_C3[1] * xy * z * sh10 +
                        SH_C3[2] * y * (4.0f * zz - xx - yy) * sh11 +
                        SH_C3[3] * z * (2.0f * zz - 3.0f * xx - 3.0f * yy) * sh12 +
                        SH_C3[4] * x * (4.0f * zz - xx - yy) * sh13 +
                        SH_C3[5] * z * (xx - yy) * sh14 +
                        SH_C3[6] * x * (xx - 3.0f * yy) * sh15;
            }
        }
    }
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
    uint texIdx = uint(a_splatIndex);
    ivec2 posCoord = ivec2((texIdx & 0x3ffu) << 1, texIdx >> 10);
    vec4 splatPosition = vec4( uintBitsToFloat(uvec4(texelFetch(u_splatAttributeTexture, posCoord, 0))) );

    vec4 splatViewPos = czm_modelView * vec4(splatPosition.xyz, 1.0);
    vec4 clipPosition = czm_projection * splatViewPos;

    float clip = 1.2 * clipPosition.w;
    if (clipPosition.z < -clip || clipPosition.x < -clip || clipPosition.x > clip ||
        clipPosition.y < -clip || clipPosition.y > clip) {
        gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
        return;
    }

    ivec2 covCoord = ivec2(((texIdx & 0x3ffu) << 1) | 1u, texIdx >> 10);
    uvec4 covariance = uvec4(texelFetch(u_splatAttributeTexture, covCoord, 0));

    gl_Position = clipPosition;

    vec2 u1 = unpackHalf2x16(covariance.x) ;
    vec2 u2 = unpackHalf2x16(covariance.y);
    vec2 u3 = unpackHalf2x16(covariance.z);
    mat3 Vrk = mat3(u1.x, u1.y, u2.x, u1.y, u2.y, u3.x, u2.x, u3.x, u3.y);

    vec4 covVectors = calcCovVectors(splatViewPos.xyz, Vrk);

    if (dot(covVectors.xy, covVectors.xy) < 4.0 && dot(covVectors.zw, covVectors.zw) < 4.0) {
        gl_Position = discardVec;
        return;
    }

    vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2) - 1.;

    gl_Position += vec4((corner.x * covVectors.xy + corner.y * covVectors.zw) / czm_viewport.zw * gl_Position.w, 0, 0);
    gl_Position.z = clamp(gl_Position.z, -abs(gl_Position.w), abs(gl_Position.w));

    v_vertPos = corner ;
    v_splatColor = vec4(covariance.w & 0xffu, (covariance.w >> 8) & 0xffu, (covariance.w >> 16) & 0xffu, (covariance.w >> 24) & 0xffu) / 255.0;
#if defined(HAS_SPHERICAL_HARMONICS)
    vec4 splatWC = czm_inverseView * splatViewPos;
    vec3 viewDirModel = normalize(u_inverseModelRotation * (splatWC.xyz - u_cameraPositionWC.xyz));

    v_splatColor.rgb += evaluateSH(texIdx, viewDirModel).rgb;
#endif
    v_splitDirection = u_splitDirection;
}