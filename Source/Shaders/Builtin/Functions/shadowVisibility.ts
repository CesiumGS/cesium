//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "\n\
float czm_private_shadowVisibility(float visibility, float nDotL, float normalShadingSmooth, float darkness)\n\
{\n\
#ifdef USE_NORMAL_SHADING\n\
#ifdef USE_NORMAL_SHADING_SMOOTH\n\
    float strength = clamp(nDotL / normalShadingSmooth, 0.0, 1.0);\n\
#else\n\
    float strength = step(0.0, nDotL);\n\
#endif\n\
    visibility *= strength;\n\
#endif\n\
\n\
    visibility = max(visibility, darkness);\n\
    return visibility;\n\
}\n\
\n\
#ifdef USE_CUBE_MAP_SHADOW\n\
float czm_shadowVisibility(samplerCube shadowMap, czm_shadowParameters shadowParameters)\n\
{\n\
    float depthBias = shadowParameters.depthBias;\n\
    float depth = shadowParameters.depth;\n\
    float nDotL = shadowParameters.nDotL;\n\
    float normalShadingSmooth = shadowParameters.normalShadingSmooth;\n\
    float darkness = shadowParameters.darkness;\n\
    vec3 uvw = shadowParameters.texCoords;\n\
\n\
    depth -= depthBias;\n\
    float visibility = czm_shadowDepthCompare(shadowMap, uvw, depth);\n\
    return czm_private_shadowVisibility(visibility, nDotL, normalShadingSmooth, darkness);\n\
}\n\
#else\n\
float czm_shadowVisibility(sampler2D shadowMap, czm_shadowParameters shadowParameters)\n\
{\n\
    float depthBias = shadowParameters.depthBias;\n\
    float depth = shadowParameters.depth;\n\
    float nDotL = shadowParameters.nDotL;\n\
    float normalShadingSmooth = shadowParameters.normalShadingSmooth;\n\
    float darkness = shadowParameters.darkness;\n\
    vec2 uv = shadowParameters.texCoords;\n\
\n\
    depth -= depthBias;\n\
#ifdef USE_SOFT_SHADOWS\n\
    vec2 texelStepSize = shadowParameters.texelStepSize;\n\
    float radius = 1.0;\n\
    float dx0 = -texelStepSize.x * radius;\n\
    float dy0 = -texelStepSize.y * radius;\n\
    float dx1 = texelStepSize.x * radius;\n\
    float dy1 = texelStepSize.y * radius;\n\
    float visibility = (\n\
        czm_shadowDepthCompare(shadowMap, uv, depth) +\n\
        czm_shadowDepthCompare(shadowMap, uv + vec2(dx0, dy0), depth) +\n\
        czm_shadowDepthCompare(shadowMap, uv + vec2(0.0, dy0), depth) +\n\
        czm_shadowDepthCompare(shadowMap, uv + vec2(dx1, dy0), depth) +\n\
        czm_shadowDepthCompare(shadowMap, uv + vec2(dx0, 0.0), depth) +\n\
        czm_shadowDepthCompare(shadowMap, uv + vec2(dx1, 0.0), depth) +\n\
        czm_shadowDepthCompare(shadowMap, uv + vec2(dx0, dy1), depth) +\n\
        czm_shadowDepthCompare(shadowMap, uv + vec2(0.0, dy1), depth) +\n\
        czm_shadowDepthCompare(shadowMap, uv + vec2(dx1, dy1), depth)\n\
    ) * (1.0 / 9.0);\n\
#else\n\
    float visibility = czm_shadowDepthCompare(shadowMap, uv, depth);\n\
#endif\n\
\n\
    return czm_private_shadowVisibility(visibility, nDotL, normalShadingSmooth, darkness);\n\
}\n\
#endif\n\
";
});