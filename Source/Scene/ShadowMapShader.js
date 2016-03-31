/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Renderer/ShaderSource'
    ], function(
        defaultValue,
        defined,
        ShaderSource) {
    'use strict';

    /**
     * @private
     */
    function ShadowMapShader() {
    }

    ShadowMapShader.createShadowCastVertexShader = function(vs, frameState, positionVaryingName) {
        var hasPositionVarying = defined(positionVaryingName) && (vs.indexOf(positionVaryingName) > -1);
        var isPointLight = frameState.shadowMap.isPointLight;

        if (isPointLight && !hasPositionVarying) {
            vs = ShaderSource.replaceMain(vs, 'czm_shadow_main');
            vs +=
                'varying vec3 v_positionEC; \n' +
                'void main() \n' +
                '{ \n' +
                '    czm_shadow_main(); \n' +
                '    v_positionEC = (czm_inverseProjection * gl_Position).xyz; \n' +
                '}';
        }

        return vs;
    };

    ShadowMapShader.createShadowCastFragmentShader = function(fs, frameState, opaque, positionVaryingName) {
        // TODO : is there an easy way to tell if a model or primitive is opaque before going here?
        var hasPositionVarying = defined(positionVaryingName) && (fs.indexOf(positionVaryingName) > -1);
        positionVaryingName = hasPositionVarying ? positionVaryingName : 'v_positionEC';
        var isPointLight = frameState.shadowMap.isPointLight;
        var usesDepthTexture = frameState.shadowMap.usesDepthTexture;
        if (opaque) {
            fs =
                'varying vec3 ' + positionVaryingName + ';\n' +
                'void main() \n' +
                '{ \n';
        } else {
            fs = ShaderSource.replaceMain(fs, 'czm_shadow_main');
            fs +=
                'void main() \n' +
                '{ \n' +
                '    czm_shadow_main(); \n' +
                '    if (gl_FragColor.a == 0.0) { \n' +
                '       discard; \n' +
                '    } \n';
        }

        if (isPointLight) {
            fs +=
                'float distance = length(' + positionVaryingName + '); \n' +
                'distance /= czm_shadowMapLightPositionEC.w; // radius \n' +
                'gl_FragColor = czm_packDepth(distance); \n';
        } else if (usesDepthTexture) {
            fs += 'gl_FragColor = vec4(1.0); \n';
        } else {
            fs += 'gl_FragColor = czm_packDepth(gl_FragCoord.z); \n';
        }

        fs += '}';

        if (isPointLight && !hasPositionVarying) {
            fs = 'varying vec3 v_positionEC; \n' + fs;
        }

        return fs;
    };

    ShadowMapShader.createShadowReceiveVertexShader = function(vs, frameState) {
        return vs;
    };

    ShadowMapShader.createShadowReceiveFragmentShader = function(fs, frameState, normalVaryingName, positionVaryingName, isTerrain) {
        var hasNormalVarying = defined(normalVaryingName) && (fs.indexOf(normalVaryingName) > -1);
        var hasPositionVarying = defined(positionVaryingName) && (fs.indexOf(positionVaryingName) > -1);

        var shadowMap = frameState.shadowMap;
        var usesDepthTexture = shadowMap.usesDepthTexture;
        var isPointLight = shadowMap.isPointLight;
        var isSpotLight = shadowMap._isSpotLight;
        var usesCubeMap = shadowMap.usesCubeMap;
        var hasCascades = shadowMap.numberOfCascades > 1;
        var debugVisualizeCascades = shadowMap.debugVisualizeCascades;
        var softShadows = shadowMap.softShadows;
        var bias = isPointLight ? shadowMap._pointBias : (isTerrain ? shadowMap._terrainBias : shadowMap._primitiveBias);
        var exponentialShadows = shadowMap._exponentialShadows;
        
        // Force the shader to use decimals to avoid compilation errors
        var depthBias = Number(bias.depthBias).toFixed(10);
        var normalShadingSmooth = Number(bias.normalShadingSmooth).toFixed(10);
        var normalOffsetScale = Number(bias.normalOffsetScale).toFixed(10);

        fs = ShaderSource.replaceMain(fs, 'czm_shadow_main');

        if (isPointLight && usesCubeMap) {
            fs += '#define USE_CUBE_MAP_SHADOW \n';
        } else if (usesDepthTexture) {
            fs += '#define USE_SHADOW_DEPTH_TEXTURE \n';
        }

        if (softShadows && !isPointLight) {
            fs += '#define USE_SOFT_SHADOWS \n';
        }

        if (bias.normalShading && hasNormalVarying) {
            fs += '#define USE_NORMAL_SHADING \n';
            if (bias.normalShadingSmooth > 0.0) {
                fs += '#define USE_NORMAL_SHADING_SMOOTH \n';
            }
        }

        if (exponentialShadows) {
            fs += '#define USE_EXPONENTIAL_SHADOW_MAPS \n';
        }

        fs += '\n\n';

        fs +=
            'vec4 getPositionEC() \n' +
            '{ \n' +
            (hasPositionVarying ?
            '    return vec4(' + positionVaryingName + ', 1.0); \n' :
            '    return czm_windowToEyeCoordinates(gl_FragCoord); \n') +
            '} \n' +
            'vec3 getNormalEC() \n' +
            '{ \n' +
            '    return normalize(' + normalVaryingName + '); \n' +
            '} \n' +

            'void applyNormalOffset(inout vec4 positionEC, vec3 normalEC, float nDotL) \n' +
            '{ \n' +
            (bias.normalOffset && hasNormalVarying ?
            '    // Offset the shadow position in the direction of the normal for perpendicular and back faces \n' +
            '    float normalOffsetScale = 1.0 - nDotL; \n' +
            '    vec3 offset = ' + normalOffsetScale + ' * normalOffsetScale * normalEC; \n' +
            '    positionEC.xyz += offset; \n' : '') +
            '} \n' +
            'vec2 directionToUV(vec3 d) { \n' +
            ' \n' +
            '    vec3 abs = abs(d); \n' +
            '    float max = max(max(abs.x, abs.y), abs.z); // Get the largest component \n' +
            '    vec3 weights = step(max, abs); // 1.0 for the largest component, 0.0 for the others \n' +
            '    float sign = dot(weights, sign(d)) * 0.5 + 0.5; // 0 or 1 \n' +
            '    float sc = mix(dot(weights, vec3(d.z, d.x, -d.x)), dot(weights, vec3(-d.z, d.x, d.x)), sign); \n' +
            '    float tc = mix(dot(weights, vec3(-d.y, -d.z, -d.y)), dot(weights, vec3(-d.y, d.z, -d.y)), sign); \n' +
            '    vec2 uv = (vec2(sc, tc) / max) * 0.5 + 0.5; \n' +
            '    float offsetX = dot(weights, vec3(0.0, 1.0, 2.0)); \n' +
            '    float offsetY = sign; \n' +
            '    uv.x = (uv.x + offsetX) / 3.0; \n' +
            '    uv.y = (uv.y + offsetY) / 2.0; \n' +
            '    return uv; \n' +
            '} \n';

        if (isPointLight) {
            fs +=
                'void main() \n' +
                '{ \n' +
                '    czm_shadow_main(); \n' +
                '    float depthBias = ' + depthBias + '; \n' +
                '    float normalShadingSmooth = ' + normalShadingSmooth + '; \n' +
                '    vec4 positionEC = getPositionEC(); \n' +
                '    vec3 directionEC = positionEC.xyz - czm_shadowMapLightPositionEC.xyz; \n' +
                '    float distance = length(directionEC); \n' +
                '    directionEC = normalize(directionEC); \n' +
                '    float radius = czm_shadowMapLightPositionEC.w; \n' +
                '    // Stop early if the fragment is beyond the point light radius \n' +
                '    if (distance > radius) { \n' +
                '        return; \n' +
                '    } \n' +
                '    vec3 directionWC  = czm_inverseViewRotation * directionEC; \n' +
                '    distance /= radius; \n' +

                '    vec3 normalEC = getNormalEC(); \n' +
                '    float nDotL = clamp(dot(normalEC, -directionEC), 0.0, 1.0); \n' +

                (usesCubeMap ?
                '    float visibility = czm_shadowVisibility(directionWC, distance, depthBias, nDotL, normalShadingSmooth, radius); \n' :
                '    vec2 uv = directionToUV(directionWC); \n' +
                '    float visibility = czm_shadowVisibility(uv, distance, depthBias, nDotL, normalShadingSmooth, radius); \n') +

                '    gl_FragColor.rgb *= visibility; \n' +
                '} \n';
        } else if (isSpotLight) {
            fs +=
                'void main() \n' +
                '{ \n' +
                '    czm_shadow_main(); \n' +
                '    float depthBias = ' + depthBias + '; \n' +
                '    float normalShadingSmooth = ' + normalShadingSmooth + '; \n' +
                '    vec4 positionEC = getPositionEC(); \n' +
                '    vec3 directionEC = normalize(positionEC.xyz - czm_shadowMapLightPositionEC.xyz); \n' +
                '    vec3 normalEC = getNormalEC(); \n' +
                '    float nDotL = clamp(dot(normalEC, -directionEC), 0.0, 1.0); \n' +
                '    applyNormalOffset(positionEC, normalEC, nDotL); \n' +

                '    vec4 shadowPosition = czm_shadowMapMatrix * positionEC; \n' +
                '    // Spot light uses a perspective projection, so perform the perspective divide \n' +
                '    shadowPosition /= shadowPosition.w; \n' +

                '    // Stop early if the fragment is not in the shadow bounds \n' +
                '    if (any(lessThan(shadowPosition, vec4(0.0))) || any(greaterThan(shadowPosition, vec4(1.001)))) { \n' +
                '        return; \n' +
                '    } \n' +

                '    float visibility = czm_shadowVisibility(shadowPosition.xy, shadowPosition.z, depthBias, nDotL, normalShadingSmooth, czm_shadowMapDistance); \n' +
                '    gl_FragColor.rgb *= visibility; \n' +
                '} \n';
        } else if (hasCascades) {
            fs +=
                'void main() \n' +
                '{ \n' +
                '    czm_shadow_main(); \n' +
                '    float depthBias = ' + depthBias + '; \n' +
                '    float normalShadingSmooth = ' + normalShadingSmooth + '; \n' +
                '    vec4 positionEC = getPositionEC(); \n' +
                '    float depth = -positionEC.z; \n' +
                '    float maxDepth = czm_shadowMapCascadeSplits[1].w; \n' +

                '    // Stop early if the eye depth exceeds the last cascade \n' +
                '    if (depth > maxDepth) { \n' +
                '        return; \n' +
                '    } \n' +

                '    // Get the cascade based on the eye-space depth \n' +
                '    vec4 weights = czm_cascadeWeights(depth); \n' +
                '    float shadowDistance = czm_cascadeDistance(weights); \n' +

                '    // Apply normal offset \n' +
                '    vec3 normalEC = getNormalEC(); \n' +
                '    float nDotL = clamp(dot(normalEC, czm_shadowMapLightDirectionEC), 0.0, 1.0); \n' +
                '    applyNormalOffset(positionEC, normalEC, nDotL); \n' +

                '    // Transform position into the cascade \n' +
                '    vec4 shadowPosition = czm_cascadeMatrix(weights) * positionEC; \n' +

                '    // Get visibility \n' +
                '    float visibility = czm_shadowVisibility(shadowPosition.xy, shadowPosition.z, depthBias, nDotL, normalShadingSmooth, shadowDistance); \n' +

                '    // Fade out shadows that are far away \n' +
                '    float fade = max((depth - maxDepth * 0.8) / (maxDepth * 0.2), 0.0); \n' +
                '    visibility = mix(visibility, 1.0, fade); \n' +
                '    gl_FragColor.rgb *= visibility; \n' +

                (debugVisualizeCascades ?
                '    // Draw cascade colors for debugging \n' +
                '    gl_FragColor *= czm_cascadeColor(weights); \n' : '') +
                '} \n';
        } else {
            fs +=
                'void main() \n' +
                '{ \n' +
                '    czm_shadow_main(); \n' +
                '    float depthBias = ' + depthBias + '; \n' +
                '    float normalShadingSmooth = ' + normalShadingSmooth + '; \n' +
                '    vec4 positionEC = getPositionEC(); \n' +
                '    vec3 normalEC = getNormalEC(); \n' +
                '    float nDotL = clamp(dot(normalEC, czm_shadowMapLightDirectionEC), 0.0, 1.0); \n' +
                '    applyNormalOffset(positionEC, normalEC, nDotL); \n' +
                '    vec4 shadowPosition = czm_shadowMapMatrix * positionEC; \n' +

                '    // Stop early if the fragment is not in the shadow bounds \n' +
                '    if (any(lessThan(shadowPosition, vec4(0.0))) || any(greaterThan(shadowPosition, vec4(1.001)))) { \n' +
                '        return; \n' +
                '    } \n' +

                '    float visibility = czm_shadowVisibility(shadowPosition.xy, shadowPosition.z, depthBias, nDotL, normalShadingSmooth, czm_shadowMapDistance); \n' +
                '    gl_FragColor.rgb *= visibility; \n' +
                '} \n';
        }

        return fs;
    };

    return ShadowMapShader;
});
