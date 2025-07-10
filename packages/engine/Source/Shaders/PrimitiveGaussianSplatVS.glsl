//
// Vertex shader for Gaussian splats.

// The splats are rendered as quads in view space. Splat attributes are loaded from a texture with precomputed 3D covariance.

// Passes local quad coordinates and color to the fragment shader for Gaussian evaluation. 
//
// Discards splats outside the view frustum or with negligible screen size.
//

const uint coefficientCount[3] = uint[3](3u,8u,15u);
const float SH_C1 = 0.4886025119029199f;
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

vec3 loadSHCoeff(uint splatID, int index) {
    ivec2 shTexSize = textureSize(u_gaussianSplatSHTexture, 0);
    uint dims = coefficientCount[uint(u_shDegree)-1u];
    uint splatsPerRow = uint(shTexSize.x) / dims;
    uint shIndex = (splatID%splatsPerRow) * dims + uint(index);
    ivec2 shPosCoord = ivec2(shIndex, splatID / splatsPerRow);
    return texelFetch(u_gaussianSplatSHTexture, shPosCoord, 0).rgb;
}


vec3 evaluateSHLighting(uint splatID, vec3 viewDir) {
    vec3 result = vec3(0.0);
    int coeffIndex = 0;
    float x = viewDir.x, y = viewDir.y, z = viewDir.z;

    if (u_shDegree >= 1.) {
        vec3 sh1 = loadSHCoeff(splatID, coeffIndex++);
        vec3 sh2 = loadSHCoeff(splatID, coeffIndex++);
        vec3 sh3 = loadSHCoeff(splatID, coeffIndex++);
        result += -SH_C1 * y * sh1 + SH_C1 * z * sh2 - SH_C1 * x * sh3;

        if (u_shDegree >= 2.) {
            float xx = x * x, yy = y * y, zz = z * z;
            float xy = x * y, yz = y * z, xz = x * z;

            vec3 sh4 = loadSHCoeff(splatID, coeffIndex++);
            vec3 sh5 = loadSHCoeff(splatID, coeffIndex++);
            vec3 sh6 = loadSHCoeff(splatID, coeffIndex++);
            vec3 sh7 = loadSHCoeff(splatID, coeffIndex++);
            vec3 sh8 = loadSHCoeff(splatID, coeffIndex++);
            result += SH_C2[0] * xy * sh4 +
                    SH_C2[1] * yz * sh5 +
                    SH_C2[2] * (2.0f * zz - xx - yy) * sh6 +
                    SH_C2[3] * xz * sh7 +
                    SH_C2[4] * (xx - yy) * sh8;

            if (u_shDegree >= 3.) {
                float xx = x * x, yy = y * y, zz = z * z;
                float xxy = x * x * y;
                float xyy = x * y * y;
                float x3  = x * xx;
                float y3  = y * yy;

                vec3 sh9 = loadSHCoeff(splatID, coeffIndex++);
                vec3 sh10 = loadSHCoeff(splatID, coeffIndex++);
                vec3 sh11 = loadSHCoeff(splatID, coeffIndex++);
                vec3 sh12 = loadSHCoeff(splatID, coeffIndex++);
                vec3 sh13 = loadSHCoeff(splatID, coeffIndex++);
                vec3 sh14 = loadSHCoeff(splatID, coeffIndex++);
                vec3 sh15 = loadSHCoeff(splatID, coeffIndex++);
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
// Transforms and projects splat covariance into screen space and extracts the major and minor axes of the Gaussian ellipsoid
// which is used to calculate the vertex position in clip space.
vec4 calcCovVectors(vec3 viewPos, mat3 Vrk) {
    vec4 t = vec4(viewPos, 1.0);
    float focal = czm_viewport.z * czm_projection[0][0];

    float J1 = focal / t.z;
    vec2 J2 = -J1 / t.z * t.xy;
    mat3 J = mat3(
        J1, 0.0, J2.x,
        0.0, J1, J2.y,
        0.0, 0.0, 0.0
    );

    //We need to take our view and remove the scale component
    //quantized models can have a scaled matrix which will throw our splat size off
    mat3 R = mat3(czm_modelView);
    vec3 scale;
    scale.x = length(R[0].xyz);
    scale.y = length(R[1].xyz);
    scale.z = length(R[2].xyz);

    mat3 Rs = mat3(
    R[0].xyz / scale.x,
    R[1].xyz / scale.y,
    R[2].xyz / scale.z
    );

    //transform our covariance into view space
    //ensures orientation is correct
    mat3 Vrk_view = Rs * Vrk * transpose(Rs);

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

    //we can still apply scale here even though cov3d is pre-computed
    Vrk *= u_splatScale;

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

    if(u_shDegree > 0.) {
        vec4 splatWC = czm_inverseView * splatViewPos;
        vec3 viewDir = normalize((u_cameraPositionWC.xyz - splatWC.xyz));
        v_splatColor.rgb += evaluateSHLighting(texIdx, viewDir).rgb;
    }
    v_splitDirection = u_splitDirection;
}