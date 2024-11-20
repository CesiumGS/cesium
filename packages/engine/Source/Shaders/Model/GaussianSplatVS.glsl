#ifndef HAS_SPLAT_TEXTURE

// Dequantize a float that was quantized with EXPONENTIAL filter
float meshopt_dequantize_exponential(uint quantized, float min_value, float max_value) {
    // Convert from 16-bit normalized to [0,1]
    float normalized = float(quantized) / 65535.0;

    // Apply exponential curve
    float exponential = exp2(normalized * 19.0 - 9.0); // Assuming 10-bit precision

    // Rescale to original range
    return min_value + (max_value - min_value) * exponential;
}

void calcCov3D(vec3 scale, vec4 rot, out float[6] cov3D)
{
    mat3 S = mat3(
        u_splatScale * scale[0], 0, 0,
        0, u_splatScale * scale[1], 0,
        0, 0, u_splatScale * scale[2]
    );

    float r = rot.w;
    float x = rot.x;
    float y = rot.y;
    float z = rot.z;

    // Compute rotation matrix from quaternion
    mat3 R = mat3(
        1. - 2. * (y * y + z * z),
        2. * (x * y - r * z),
        2. * (x * z + r * y),
        2. * (x * y + r * z),
        1. - 2. * (x * x + z * z),
        2. * (y * z - r * x),
        2. * (x * z - r * y),
        2. * (y * z + r * x),
        1. - 2. * (x * x + y * y)
    );

    mat3 M = S * R;
    mat3 Sigma = transpose(M) * M;

    //we only need part of it, symmetric
    cov3D = float[6](
        Sigma[0][0], Sigma[0][1], Sigma[0][2],
        Sigma[1][1], Sigma[1][2], Sigma[2][2]
    );

}

vec3 calcCov2D(vec3 worldPos, float focal_x, float focal_y, float tan_fovx, float tan_fovy, float[6] cov3D, mat4 viewmatrix) {
    vec4 t = viewmatrix * vec4(worldPos, 1.0);

    float limx = 1.3 * tan_fovx;
    float limy = 1.3 * tan_fovy;
    float txtz = t.x / t.z;
    float tytz = t.y / t.z;
    t.x = min(limx, max(-limx, txtz)) * t.z;
    t.y = min(limy, max(-limy, tytz)) * t.z;

    mat3 J = mat3(
        focal_x / t.z, 0, -(focal_x * t.x) / (t.z * t.z),
        0, focal_y / t.z, -(focal_y * t.y) / (t.z * t.z),
        0, 0, 0
    );

    mat3 W =  mat3(
        viewmatrix[0][0], viewmatrix[1][0], viewmatrix[2][0],
        viewmatrix[0][1], viewmatrix[1][1], viewmatrix[2][1],
        viewmatrix[0][2], viewmatrix[1][2], viewmatrix[2][2]
    );
    mat3 T = W * J;
    mat3 Vrk = mat3(
        cov3D[0], cov3D[1], cov3D[2],
        cov3D[1], cov3D[3], cov3D[4],
        cov3D[2], cov3D[4], cov3D[5]
    );

    mat3 cov = transpose(T) * transpose(Vrk) * T;

    cov[0][0] += .3;
    cov[1][1] += .3;
    return vec3(cov[0][0], cov[0][1], cov[1][1]);
}

void gaussianSplatStage(ProcessedAttributes attributes, inout vec4 positionClip) {
    mat4 viewMatrix = czm_modelView;

    vec4 clipPosition = czm_modelViewProjection * vec4(a_splatPosition ,1.0);
    positionClip = clipPosition;

    float[6] cov3D;
    calcCov3D(attributes.scale, attributes.rotation, cov3D);
    vec3 cov = calcCov2D(a_splatPosition, u_focalX, u_focalY, u_tan_fovX, u_tan_fovY, cov3D, viewMatrix);

    float mid = (cov.x + cov.z) / 2.0;
    float radius = length(vec2((cov.x - cov.z) / 2.0, cov.y));
    float lambda1 = mid + radius, lambda2 = mid - radius;

    if(lambda2 < 0.0) return;
    vec2 diagonalVector = normalize(vec2(cov.y, lambda1 - cov.x));
    vec2 v1 = min(sqrt(2.0 * lambda1), 1024.0) * diagonalVector;
    vec2 v2 = min(sqrt(2.0 * lambda2), 1024.0) * vec2(diagonalVector.y, -diagonalVector.x);

    vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2) - 1.;
    positionClip += vec4((corner.x * v1 + corner.y * v2) * 1.0 / czm_viewport.zw * positionClip.w, 0, 0);
    positionClip.z = clamp(positionClip.z, -abs(positionClip.w), abs(positionClip.w));
    v_vertPos = corner ;
    v_splatColor = a_splatColor;
}

#else

vec4 calcCovVectors(vec3 worldPos, float focal_x, float focal_y, float tan_fovx, float tan_fovy, mat3 Vrk/*float[6] cov3D*/, mat3 viewmatrix) {
    vec4 t = vec4(worldPos, 1.0);

    float limx = 1.3 * tan_fovx;
    float limy = 1.3 * tan_fovy;
    float txtz = t.x / t.z;
    float tytz = t.y / t.z;
    t.x = min(limx, max(-limx, txtz)) * t.z;
    t.y = min(limy, max(-limy, tytz)) * t.z;

    mat3 J = mat3(
        focal_x / t.z, 0, -(focal_x * t.x) / (t.z * t.z),
        0, focal_y / t.z, -(focal_y * t.y) / (t.z * t.z),
        0, 0, 0
    );

    mat3 T = viewmatrix * J;
    mat3 cov = transpose(T) * transpose(Vrk) * T;

    float diag1 = cov[0][0] + .3;
    float offDiag = cov[0][1];
    float diag2 = cov[1][1] + .3;

    float mid = (diag1 + diag2) * 0.5;
    float radius = length(vec2((diag1 - diag2) * 0.5, offDiag));
    float lambda1 = mid + radius;
    float lambda2 = mid - radius;

    if(lambda2 < 0.0) {
        return vec4(0.0);
    }

    vec2 diagonalVector = normalize(vec2(offDiag, lambda1 - diag1));
    vec2 v1 = min(sqrt(2.0 * lambda1), 1024.0) * diagonalVector;
    vec2 v2 = min(sqrt(2.0 * lambda2), 1024.0) * vec2(diagonalVector.y, -diagonalVector.x);

    return vec4(v1, v2);
}

highp vec4 discardVec = vec4(0.0, 0.0, 2.0, 1.0);

void gaussianSplatStage(ProcessedAttributes attributes, inout vec4 positionClip) {
    uint index = uint(gl_InstanceID);

    ivec2 idxCoord = ivec2(index & 0x3ffu, index >> 10);
    uint sortedIndex = uint(texelFetch(u_splatIndexTexture, idxCoord, 0).r);

    ivec2 posCoord = ivec2((sortedIndex & 0x3ffu) << 1, sortedIndex >> 10);
    vec4 splatPosition = vec4( uintBitsToFloat(uvec4(texelFetch(u_splatAttributeTexture, posCoord, 0))) );
    vec4 splatViewPos = czm_modelView * vec4(splatPosition.xyz, 1.0);
    vec4 clipPosition = czm_projection * splatViewPos;

    float clip = 1.2 * clipPosition.w;
    if (clipPosition.z < -clip || clipPosition.x < -clip || clipPosition.x > clip ||
        clipPosition.y < -clip || clipPosition.y > clip) {
        positionClip = vec4(0.0, 0.0, 2.0, 1.0);
        return;
    }

    ivec2 covCoord = ivec2(((sortedIndex & 0x3ffu) << 1) | 1u, sortedIndex >> 10);
    uvec4 covariance = uvec4(texelFetch(u_splatAttributeTexture, covCoord, 0));

    positionClip = clipPosition;

    vec2 u1 = unpackHalf2x16(covariance.x);
    vec2 u2 = unpackHalf2x16(covariance.y);
    vec2 u3 = unpackHalf2x16(covariance.z);
    mat3 Vrk = mat3(u1.x, u1.y, u2.x, u1.y, u2.y, u3.x, u2.x, u3.x, u3.y);

    vec4 covVectors = calcCovVectors(
        splatViewPos.xyz,
        u_focalX,
        u_focalY,
        u_tan_fovX,
        u_tan_fovY,
        Vrk,
       transpose(mat3(czm_modelView))// czm_modelView
    );

    if (dot(covVectors.xy, covVectors.xy) < 4.0 && dot(covVectors.zw, covVectors.zw) < 4.0) {
        gl_Position = discardVec;
        return;
    }

    vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2) - 1.;

    positionClip += vec4((corner.x * covVectors.xy + corner.y * covVectors.zw)  / czm_viewport.zw * positionClip.w, 0, 0);
    positionClip.z = clamp(positionClip.z, -abs(positionClip.w), abs(positionClip.w));

    v_vertPos = corner ;
    v_splatColor = vec4(covariance.w & 0xffu, (covariance.w >> 8) & 0xffu, (covariance.w >> 16) & 0xffu, (covariance.w >> 24) & 0xffu) / 255.0;
}

#endif
