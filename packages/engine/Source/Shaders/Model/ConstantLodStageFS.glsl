#ifdef HAS_CONSTANT_LOD

vec4 constantLodTextureLookup(sampler2D textureSampler, vec3 constantLodParams) {
    bool atMaxClamp = v_constantLodUvCustom.z >= constantLodParams.y;
    bool atMinClamp = v_constantLodUvCustom.z <= constantLodParams.x;
    bool atClampBoundary = atMaxClamp || atMinClamp;
    
    float effectiveDistance = atMaxClamp ? constantLodParams.y : 
                              (atMinClamp ? constantLodParams.x : v_constantLodUvCustom.z);
    
    float logDepth = log2(effectiveDistance);
    logDepth = clamp(logDepth, -10.0, 20.0);
    
    float f = fract(logDepth);
    float p = floor(logDepth);
    
    if (atClampBoundary) {
        float clampedP = ceil(logDepth);
        vec2 tc = v_constantLodUvCustom.xy / pow(2.0, clampedP) * constantLodParams.z;
        return texture(textureSampler, tc);
    }

    vec2 tc1 = v_constantLodUvCustom.xy / pow(2.0, p) * constantLodParams.z;
    vec2 tc2 = v_constantLodUvCustom.xy / pow(2.0, p + 1.0) * constantLodParams.z;
    return mix(texture(textureSampler, tc1), texture(textureSampler, tc2), f);
}

vec4 constantLodTextureLookup(sampler2D textureSampler, vec3 constantLodParams, mat3 textureTransform) {
    bool atMaxClamp = v_constantLodUvCustom.z >= constantLodParams.y;
    bool atMinClamp = v_constantLodUvCustom.z <= constantLodParams.x;
    bool atClampBoundary = atMaxClamp || atMinClamp;
    
    float effectiveDistance = atMaxClamp ? constantLodParams.y : 
                              (atMinClamp ? constantLodParams.x : v_constantLodUvCustom.z);
    
    float logDepth = log2(effectiveDistance);
    logDepth = clamp(logDepth, -10.0, 20.0);
    
    float f = fract(logDepth);
    float p = floor(logDepth);
    
    if (atClampBoundary) {
        float clampedP = ceil(logDepth);
        vec2 tc = v_constantLodUvCustom.xy / pow(2.0, clampedP) * constantLodParams.z;
        // Apply texture transform to the final texture coordinates
        tc = czm_computeTextureTransform(tc, textureTransform);
        return texture(textureSampler, tc);
    }

    vec2 tc1 = v_constantLodUvCustom.xy / pow(2.0, p) * constantLodParams.z;
    vec2 tc2 = v_constantLodUvCustom.xy / pow(2.0, p + 1.0) * constantLodParams.z;
    
    // Apply texture transform to both LOD texture coordinates before mixing
    tc1 = czm_computeTextureTransform(tc1, textureTransform);
    tc2 = czm_computeTextureTransform(tc2, textureTransform);
    
    return mix(texture(textureSampler, tc1), texture(textureSampler, tc2), f);
}

#endif
