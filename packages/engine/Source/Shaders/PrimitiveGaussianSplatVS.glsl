//
// Vertex shader for Gaussian splats.

// The splats are rendered as quads in view space. Splat attributes are loaded from a texture with precomputed 3D covariance.

// Passes local quad coordinates and color to the fragment shader for Gaussian evaluation. 
//
// Discards splats outside the view frustum or with negligible screen size.
//

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

// Transforms and projects splat covariance into screen space and extracts the major and minor axes of the Gaussian ellipsoid
// which is used to calculate the vertex position in clip space.
// vec4 calcCovVectors(vec3 viewPos, mat3 Vrk) {
//     vec4 t = vec4(viewPos, 1.0);
//     vec2 focal = vec2(czm_projection[0][0] * czm_viewport.z, czm_projection[1][1] * czm_viewport.w);

//     vec2 J1 = focal / t.z;
//     vec2 J2 = -focal * vec2(t.x, t.y) / (t.z * t.z);
//     mat3 J = mat3(
//         J1.x, 0.0, J2.x,
//         0.0, J1.y, J2.y,
//         0.0, 0.0, 0.0
//     );

//     mat3 R = mat3(czm_modelView);
//     mat3 Vrk_view = R * Vrk * transpose(R);
//     mat3 cov = transpose(J) * Vrk_view * J;

//     float diagonal1 = cov[0][0] + .3;
//     float offDiagonal = cov[0][1];
//     float diagonal2 = cov[1][1] + .3;

//     float mid = 0.5 * (diagonal1 + diagonal2);
//     float radius = length(vec2((diagonal1 - diagonal2) * 0.5, offDiagonal));
//     float lambda1 = mid + radius;
//     float lambda2 = max(mid - radius, 0.1);

//     vec2 diagonalVector = normalize(vec2(offDiagonal, lambda1 - diagonal1));

//     return vec4(
//         min(sqrt(2.0 * lambda1), 1024.0) * diagonalVector,
//         min(sqrt(2.0 * lambda2), 1024.0) * vec2(diagonalVector.y, -diagonalVector.x)
//     );
// }
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

    float diagonal1 = cov[0][0] + .001;
    float offDiagonal = cov[0][1];
    float diagonal2 = cov[1][1] + .001;

    float mid = 0.5 * (diagonal1 + diagonal2);
    float radius = length(vec2((diagonal1 - diagonal2) * 0.5, offDiagonal));
    float lambda1 = mid + radius;
    float lambda2 = max(mid - radius, 0.001);

    vec2 diagonalVector = normalize(vec2(offDiagonal, lambda1 - diagonal1));

    float detOrig = cov[0][0] * cov[1][1] - cov[0][1] * cov[0][1]; // Before kernel
    float detBlur = diagonal1 * diagonal2 - offDiagonal * offDiagonal; // After kernel
    float compensation = sqrt(max(0.0, detOrig / detBlur));
    v_splatColor.w *= compensation;

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

    //single RGBA32UI texel
    ivec2 posTextureIdx = texelCoord(splatTextureIndex, posTextureSize);
   // uvec2 splatPositionPacked = uvec2(uvec4(texelFetch(u_splatPositionTexture, posTextureIdx, 0)).rg);

  //  vec2 positionXY = unpackHalf2x16(splatPositionPacked.x);
   // vec3 splatPosition = vec3(positionXY.x, positionXY.y, unpackHalf2x16(splatPositionPacked.y).x);
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

    v_vertPos = corner ;

    v_splitDirection = u_splitDirection;
}