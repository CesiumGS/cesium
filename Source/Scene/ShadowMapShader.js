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
                'distance /= u_shadowMapLightPositionEC.w; // radius \n' +
                'gl_FragColor = czm_packDepth(distance); \n';
        } else if (usesDepthTexture) {
            fs += 'gl_FragColor = vec4(1.0); \n';
        } else {
            fs += 'gl_FragColor = czm_packDepth(gl_FragCoord.z); \n';
        }

        fs += '} \n';

        if (isPointLight) {
            if (!hasPositionVarying) {
                fs = 'varying vec3 v_positionEC; \n' + fs;
            }
            fs = 'uniform vec4 u_shadowMapLightPositionEC; \n' + fs;
        }

        return fs;
    };

    ShadowMapShader.createShadowReceiveVertexShader = function(vs, frameState) {
        return vs;
    };

    ShadowMapShader.createShadowReceiveFragmentShader = function(fs, frameState, normalVaryingName, positionVaryingName, isTerrain, defines) {
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

        fs = ShaderSource.replaceMain(fs, 'czm_shadow_main');

        if (isPointLight && usesCubeMap) {
            defines.push('USE_CUBE_MAP_SHADOW');
        } else if (usesDepthTexture) {
            defines.push('USE_SHADOW_DEPTH_TEXTURE');
        }

        if (softShadows && !isPointLight) {
            defines.push('USE_SOFT_SHADOWS');
        }

        if (bias.normalShading && hasNormalVarying) {
            defines.push('USE_NORMAL_SHADING');
            if (bias.normalShadingSmooth > 0.0) {
                defines.push('USE_NORMAL_SHADING_SMOOTH');
            }
        }

        if (exponentialShadows) {
            defines.push('USE_EXPONENTIAL_SHADOW_MAPS');
        }

        fs += '\n\n';

        fs +=
            'uniform mat4 u_shadowMapMatrix; \n' +
            'uniform vec3 u_shadowMapLightDirectionEC; \n' +
            'uniform vec4 u_shadowMapLightPositionEC; \n' +
            'uniform vec3 u_shadowMapNormalOffsetScaleDistanceAndMaxDistance; \n' +
            'uniform vec4 u_shadowMapTexelSizeDepthBiasAndNormalShadingSmooth; \n' +
            'uniform sampler2D u_shadowMapTexture; \n' +
            'uniform samplerCube u_shadowMapTextureCube; \n' +
            'vec4 getPositionEC() \n' +
            '{ \n' +
            (hasPositionVarying ?
            '    return vec4(' + positionVaryingName + ', 1.0); \n' :
            '    return czm_windowToEyeCoordinates(gl_FragCoord); \n') +
            '} \n' +
            'vec3 getNormalEC() \n' +
            '{ \n' +
            (hasNormalVarying ?
            '    return normalize(' + normalVaryingName + '); \n' :
            '    return vec3(1.0); \n') +
            '} \n' +

            'void applyNormalOffset(inout vec4 positionEC, vec3 normalEC, float nDotL) \n' +
            '{ \n' +
            (bias.normalOffset && hasNormalVarying ?
            '    float normalOffset = u_shadowMapNormalOffsetScaleDistanceAndMaxDistance.x; \n' +
            '    // Offset the shadow position in the direction of the normal for perpendicular and back faces \n' +
            '    float normalOffsetScale = 1.0 - nDotL; \n' +
            '    vec3 offset = normalOffset * normalOffsetScale * normalEC; \n' +
            '    positionEC.xyz += offset; \n' : '') +
            '} \n';

        fs +=
            'void main() \n' +
            '{ \n' +
            '    czm_shadow_main(); \n' +
            '    vec4 positionEC = getPositionEC(); \n' +
            '    vec3 normalEC = getNormalEC(); \n' +
            '    float shadowMapMaximumDistance = u_shadowMapNormalOffsetScaleDistanceAndMaxDistance.z; \n';

        fs +=
            '    czm_shadowParameters shadowParameters; \n' +
            '    shadowParameters.texelStepSize = u_shadowMapTexelSizeDepthBiasAndNormalShadingSmooth.xy; \n' +
            '    shadowParameters.depthBias = u_shadowMapTexelSizeDepthBiasAndNormalShadingSmooth.z; \n' +
            '    shadowParameters.normalShadingSmooth = u_shadowMapTexelSizeDepthBiasAndNormalShadingSmooth.w; \n' +
            '    shadowParameters.distance = u_shadowMapNormalOffsetScaleDistanceAndMaxDistance.y; \n';

        if (isPointLight) {
            fs +=
                '    vec3 directionEC = positionEC.xyz - u_shadowMapLightPositionEC.xyz; \n' +
                '    float distance = length(directionEC); \n' +
                '    directionEC = normalize(directionEC); \n' +
                '    float radius = u_shadowMapLightPositionEC.w; \n' +
                '    // Stop early if the fragment is beyond the point light radius \n' +
                '    if (distance > radius) { \n' +
                '        return; \n' +
                '    } \n' +
                '    vec3 directionWC  = czm_inverseViewRotation * directionEC; \n' +

                '    shadowParameters.depth = distance / radius; \n' +
                '    shadowParameters.nDotL = clamp(dot(normalEC, -directionEC), 0.0, 1.0); \n' +
                '    shadowParameters.distance = radius; \n' +


                (usesCubeMap ?
                '    shadowParameters.texCoords = directionWC; \n' +
                '    float visibility = czm_shadowVisibility(u_shadowMapTextureCube, shadowParameters); \n' :
                '    shadowParameters.texCoords = czm_cubeMapToUV(directionWC); \n' +
                '    float visibility = czm_shadowVisibility(u_shadowMapTexture, shadowParameters); \n');
        } else if (isSpotLight) {
            fs +=
                '    vec3 directionEC = normalize(positionEC.xyz - u_shadowMapLightPositionEC.xyz); \n' +
                '    float nDotL = clamp(dot(normalEC, -directionEC), 0.0, 1.0); \n' +
                '    applyNormalOffset(positionEC, normalEC, nDotL); \n' +

                '    vec4 shadowPosition = u_shadowMapMatrix * positionEC; \n' +
                '    // Spot light uses a perspective projection, so perform the perspective divide \n' +
                '    shadowPosition /= shadowPosition.w; \n' +

                '    // Stop early if the fragment is not in the shadow bounds \n' +
                '    if (any(lessThan(shadowPosition, vec4(0.0))) || any(greaterThan(shadowPosition, vec4(1.001)))) { \n' +
                '        return; \n' +
                '    } \n' +

                '    shadowParameters.texCoords = shadowPosition.xy; \n' +
                '    shadowParameters.depth = shadowPosition.z; \n' +
                '    shadowParameters.nDotL = nDotL; \n' +

                '    float visibility = czm_shadowVisibility(u_shadowMapTexture, shadowParameters); \n';
        } else if (hasCascades) {
            fs +=
                '    float depth = -positionEC.z; \n' +
                '    float maxDepth = u_shadowMapCascadeSplits[1].w; \n' +

                '    // Stop early if the eye depth exceeds the last cascade \n' +
                '    if (depth > maxDepth) { \n' +
                '        return; \n' +
                '    } \n' +

                '    // Get the cascade based on the eye-space depth \n' +
                '    vec4 weights = czm_cascadeWeights(depth); \n' +
                '    float shadowDistance = czm_cascadeDistance(weights); \n' +

                '    // Apply normal offset \n' +
                '    float nDotL = clamp(dot(normalEC, u_shadowMapLightDirectionEC), 0.0, 1.0); \n' +
                '    applyNormalOffset(positionEC, normalEC, nDotL); \n' +

                '    // Transform position into the cascade \n' +
                '    vec4 shadowPosition = czm_cascadeMatrix(weights) * positionEC; \n' +

                '    // Get visibility \n' +
                '    shadowParameters.texCoords = shadowPosition.xy; \n' +
                '    shadowParameters.depth = shadowPosition.z; \n' +
                '    shadowParameters.nDotL = nDotL; \n' +
                '    float visibility = czm_shadowVisibility(u_shadowMapTexture, shadowParameters); \n' +

                '    // Fade out shadows that are far away \n' +
                '    float fade = max((depth - shadowMapMaximumDistance * 0.8) / (shadowMapMaximumDistance * 0.2), 0.0); \n' +
                '    visibility = mix(visibility, 1.0, fade); \n' +

                (debugVisualizeCascades ?
                '    // Draw cascade colors for debugging \n' +
                '    gl_FragColor *= czm_cascadeColor(weights); \n' : '');
        } else {
            fs +=
                '    float nDotL = clamp(dot(normalEC, u_shadowMapLightDirectionEC), 0.0, 1.0); \n' +
                '    applyNormalOffset(positionEC, normalEC, nDotL); \n' +
                '    vec4 shadowPosition = u_shadowMapMatrix * positionEC; \n' +

                '    // Stop early if the fragment is not in the shadow bounds \n' +
                '    if (any(lessThan(shadowPosition, vec4(0.0))) || any(greaterThan(shadowPosition, vec4(1.001)))) { \n' +
                '        return; \n' +
                '    } \n' +

                '    shadowParameters.texCoords = shadowPosition.xy; \n' +
                '    shadowParameters.depth = shadowPosition.z; \n' +
                '    shadowParameters.nDotL = nDotL; \n' +
                '    float visibility = czm_shadowVisibility(u_shadowMapTexture, shadowParameters); \n';
        }

        fs +=
            '    gl_FragColor.rgb *= visibility; \n' +
            '} \n';

        return fs;
    };

    return ShadowMapShader;
});
