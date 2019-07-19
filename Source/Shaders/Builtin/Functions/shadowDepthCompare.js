//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "\n\
float czm_sampleShadowMap(samplerCube shadowMap, vec3 d)\n\
{\n\
    return czm_unpackDepth(textureCube(shadowMap, d));\n\
}\n\
\n\
float czm_sampleShadowMap(sampler2D shadowMap, vec2 uv)\n\
{\n\
#ifdef USE_SHADOW_DEPTH_TEXTURE\n\
    return texture2D(shadowMap, uv).r;\n\
#else\n\
    return czm_unpackDepth(texture2D(shadowMap, uv));\n\
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
});