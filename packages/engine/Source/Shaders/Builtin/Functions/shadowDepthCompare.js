//This file is automatically rebuilt by the Cesium build process.
export default "\n\
float czm_sampleShadowMap(highp samplerCube shadowMap, vec3 d)\n\
{\n\
    return czm_unpackDepth(czm_textureCube(shadowMap, d));\n\
}\n\
\n\
float czm_sampleShadowMap(highp sampler2D shadowMap, vec2 uv)\n\
{\n\
#ifdef USE_SHADOW_DEPTH_TEXTURE\n\
    return texture(shadowMap, uv).r;\n\
#else\n\
    return czm_unpackDepth(texture(shadowMap, uv));\n\
#endif\n\
}\n\
\n\
float czm_shadowDepthCompare(samplerCube shadowMap, vec3 uv, float depth)\n\
{\n\
    return step(depth, czm_sampleShadowMap(shadowMap, uv));\n\
}\n\
\n\
float czm_shadowDepthCompare(sampler2D shadowMap, vec2 uv, float depth)\n\
{\n\
    return step(depth, czm_sampleShadowMap(shadowMap, uv));\n\
}\n\
";
