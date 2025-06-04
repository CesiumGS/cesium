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
    //uint texIdx = uint(a_splatIndex);
    uint idx = uint(a_splatIndex)>>24u;
    uint mtexIdx = uint(u_megaTextureOffsets[idx-1u]);
    uint localTexIdx = uint(a_splatIndex) & 0x00ffffffu;
    uint texIdx = mtexIdx + localTexIdx;
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

    //if tile bounding volumes are shown, increase transparency so we can see the entire box
    #ifdef DEBUG_BOUNDING_VOLUMES
    v_splatColor.a *= 0.08;
    #endif
}