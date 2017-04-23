/*global define*/
define([
        '../Core/defined',
        '../Renderer/ShaderSource'
    ], function(
        defined,
        ShaderSource) {
    'use strict';

    /**
     * @private
     */
    function ShadowMapShader() {
    }

    ShadowMapShader.getShadowCastShaderKeyword = function(isPointLight, isTerrain, usesDepthTexture, isOpaque) {
        return 'castShadow ' + isPointLight + ' ' + isTerrain + ' ' + usesDepthTexture + ' ' + isOpaque;
    };

    ShadowMapShader.createShadowCastVertexShader = function(vs, isPointLight, isTerrain) {
        var defines = vs.defines.slice(0);
        var sources = vs.sources.slice(0);

        if (isTerrain) {
            defines.push('GENERATE_POSITION');
        }

        var positionVaryingName = ShaderSource.findPositionVarying(vs);
        var hasPositionVarying = defined(positionVaryingName);

        if (isPointLight && !hasPositionVarying) {
            var length = sources.length;
            for (var j = 0; j < length; ++j) {
                sources[j] = ShaderSource.replaceMain(sources[j], 'czm_shadow_cast_main');
            }

            var shadowVS =
                'varying vec3 v_positionEC; \n' +
                'void main() \n' +
                '{ \n' +
                '    czm_shadow_cast_main(); \n' +
                '    v_positionEC = (czm_inverseProjection * gl_Position).xyz; \n' +
                '}';
            sources.push(shadowVS);
        }

        return new ShaderSource({
            defines : defines,
            sources : sources
        });
    };

    ShadowMapShader.createShadowCastFragmentShader = function(fs, isPointLight, usesDepthTexture, opaque) {
        var defines = fs.defines.slice(0);
        var sources = fs.sources.slice(0);

        var positionVaryingName = ShaderSource.findPositionVarying(fs);
        var hasPositionVarying = defined(positionVaryingName);
        if (!hasPositionVarying) {
            positionVaryingName = 'v_positionEC';
        }

        var length = sources.length;
        for (var i = 0; i < length; ++i) {
            sources[i] = ShaderSource.replaceMain(sources[i], 'czm_shadow_cast_main');
        }

        var fsSource = '';

        if (isPointLight) {
            if (!hasPositionVarying) {
                fsSource += 'varying vec3 v_positionEC; \n';
            }
            fsSource += 'uniform vec4 shadowMap_lightPositionEC; \n';
        }

        if (opaque) {
            fsSource +=
                'void main() \n' +
                '{ \n';
        } else {
            fsSource +=
                'void main() \n' +
                '{ \n' +
                '    czm_shadow_cast_main(); \n' +
                '    if (gl_FragColor.a == 0.0) \n' +
                '    { \n' +
                '       discard; \n' +
                '    } \n';
        }

        if (isPointLight) {
            fsSource +=
                'float distance = length(' + positionVaryingName + '); \n' +
                'distance /= shadowMap_lightPositionEC.w; // radius \n' +
                'gl_FragColor = czm_packDepth(distance); \n';
        } else if (usesDepthTexture) {
            fsSource += 'gl_FragColor = vec4(1.0); \n';
        } else {
            fsSource += 'gl_FragColor = czm_packDepth(gl_FragCoord.z); \n';
        }

        fsSource += '} \n';

        sources.push(fsSource);

        return new ShaderSource({
            defines : defines,
            sources : sources
        });
    };

    ShadowMapShader.getShadowReceiveShaderKeyword = function(shadowMap, castShadows, isTerrain, hasTerrainNormal) {
        var usesDepthTexture = shadowMap._usesDepthTexture;
        var polygonOffsetSupported = shadowMap._polygonOffsetSupported;
        var isPointLight = shadowMap._isPointLight;
        var isSpotLight = shadowMap._isSpotLight;
        var hasCascades = shadowMap._numberOfCascades > 1;
        var debugCascadeColors = shadowMap.debugCascadeColors;
        var softShadows = shadowMap.softShadows;

        return 'receiveShadow ' + usesDepthTexture + polygonOffsetSupported + isPointLight + isSpotLight +
               hasCascades + debugCascadeColors + softShadows + castShadows + isTerrain + hasTerrainNormal;
    };

    ShadowMapShader.createShadowReceiveVertexShader = function(vs, isTerrain, hasTerrainNormal) {
        var defines = vs.defines.slice(0);
        var sources = vs.sources.slice(0);

        if (isTerrain) {
            if (hasTerrainNormal) {
                defines.push('GENERATE_POSITION_AND_NORMAL');
            } else {
                defines.push('GENERATE_POSITION');
            }
        }

        return new ShaderSource({
            defines : defines,
            sources : sources
        });
    };

    ShadowMapShader.createShadowReceiveFragmentShader = function(fs, shadowMap, castShadows, isTerrain, hasTerrainNormal) {
        var normalVaryingName = ShaderSource.findNormalVarying(fs);
        var hasNormalVarying = (!isTerrain && defined(normalVaryingName)) || (isTerrain && hasTerrainNormal);

        var positionVaryingName = ShaderSource.findPositionVarying(fs);
        var hasPositionVarying = defined(positionVaryingName);

        var usesDepthTexture = shadowMap._usesDepthTexture;
        var polygonOffsetSupported = shadowMap._polygonOffsetSupported;
        var isPointLight = shadowMap._isPointLight;
        var isSpotLight = shadowMap._isSpotLight;
        var hasCascades = shadowMap._numberOfCascades > 1;
        var debugCascadeColors = shadowMap.debugCascadeColors;
        var softShadows = shadowMap.softShadows;
        var bias = isPointLight ? shadowMap._pointBias : (isTerrain ? shadowMap._terrainBias : shadowMap._primitiveBias);

        var defines = fs.defines.slice(0);
        var sources = fs.sources.slice(0);

        var length = sources.length;
        for (var i = 0; i < length; ++i) {
            sources[i] = ShaderSource.replaceMain(sources[i], 'czm_shadow_receive_main');
        }

        if (isPointLight) {
            defines.push('USE_CUBE_MAP_SHADOW');
        } else if (usesDepthTexture) {
            defines.push('USE_SHADOW_DEPTH_TEXTURE');
        }

        if (softShadows && !isPointLight) {
            defines.push('USE_SOFT_SHADOWS');
        }

        // Enable day-night shading so that the globe is dark when the light is below the horizon
        if (hasCascades && castShadows && isTerrain) {
            if (hasNormalVarying) {
                defines.push('ENABLE_VERTEX_LIGHTING');
            } else {
                defines.push('ENABLE_DAYNIGHT_SHADING');
            }
        }

        if (castShadows && bias.normalShading && hasNormalVarying) {
            defines.push('USE_NORMAL_SHADING');
            if (bias.normalShadingSmooth > 0.0) {
                defines.push('USE_NORMAL_SHADING_SMOOTH');
            }
        }

        var fsSource = '';

        if (isPointLight) {
            fsSource += 'uniform samplerCube shadowMap_textureCube; \n';
        } else {
            fsSource += 'uniform sampler2D shadowMap_texture; \n';
        }

        fsSource +=
            'uniform mat4 shadowMap_matrix; \n' +
            'uniform vec3 shadowMap_lightDirectionEC; \n' +
            'uniform vec4 shadowMap_lightPositionEC; \n' +
            'uniform vec4 shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness; \n' +
            'uniform vec4 shadowMap_texelSizeDepthBiasAndNormalShadingSmooth; \n' +
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

            // Offset the shadow position in the direction of the normal for perpendicular and back faces
            'void applyNormalOffset(inout vec4 positionEC, vec3 normalEC, float nDotL) \n' +
            '{ \n' +
            (bias.normalOffset && hasNormalVarying ?
            '    float normalOffset = shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness.x; \n' +
            '    float normalOffsetScale = 1.0 - nDotL; \n' +
            '    vec3 offset = normalOffset * normalOffsetScale * normalEC; \n' +
            '    positionEC.xyz += offset; \n' : '') +
            '} \n';

        fsSource +=
            'void main() \n' +
            '{ \n' +
            '    czm_shadow_receive_main(); \n' +
            '    vec4 positionEC = getPositionEC(); \n' +
            '    vec3 normalEC = getNormalEC(); \n' +
            '    float depth = -positionEC.z; \n';

        fsSource +=
            '    czm_shadowParameters shadowParameters; \n' +
            '    shadowParameters.texelStepSize = shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.xy; \n' +
            '    shadowParameters.depthBias = shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.z; \n' +
            '    shadowParameters.normalShadingSmooth = shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.w; \n' +
            '    shadowParameters.darkness = shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness.w; \n';

        if (isTerrain) {
            // Scale depth bias based on view distance to reduce z-fighting in distant terrain
            fsSource += '    shadowParameters.depthBias *= max(depth * 0.01, 1.0); \n';
        } else if (!polygonOffsetSupported) {
            // If polygon offset isn't supported push the depth back based on view, however this
            // causes light leaking at further away views
            fsSource += '    shadowParameters.depthBias *= mix(1.0, 100.0, depth * 0.0015); \n';
        }

        if (isPointLight) {
            fsSource +=
                '    vec3 directionEC = positionEC.xyz - shadowMap_lightPositionEC.xyz; \n' +
                '    float distance = length(directionEC); \n' +
                '    directionEC = normalize(directionEC); \n' +
                '    float radius = shadowMap_lightPositionEC.w; \n' +
                '    // Stop early if the fragment is beyond the point light radius \n' +
                '    if (distance > radius) \n' +
                '    { \n' +
                '        return; \n' +
                '    } \n' +
                '    vec3 directionWC  = czm_inverseViewRotation * directionEC; \n' +

                '    shadowParameters.depth = distance / radius; \n' +
                '    shadowParameters.nDotL = clamp(dot(normalEC, -directionEC), 0.0, 1.0); \n' +

                '    shadowParameters.texCoords = directionWC; \n' +
                '    float visibility = czm_shadowVisibility(shadowMap_textureCube, shadowParameters); \n';
        } else if (isSpotLight) {
            fsSource +=
                '    vec3 directionEC = normalize(positionEC.xyz - shadowMap_lightPositionEC.xyz); \n' +
                '    float nDotL = clamp(dot(normalEC, -directionEC), 0.0, 1.0); \n' +
                '    applyNormalOffset(positionEC, normalEC, nDotL); \n' +

                '    vec4 shadowPosition = shadowMap_matrix * positionEC; \n' +
                '    // Spot light uses a perspective projection, so perform the perspective divide \n' +
                '    shadowPosition /= shadowPosition.w; \n' +

                '    // Stop early if the fragment is not in the shadow bounds \n' +
                '    if (any(lessThan(shadowPosition.xyz, vec3(0.0))) || any(greaterThan(shadowPosition.xyz, vec3(1.0)))) \n' +
                '    { \n' +
                '        return; \n' +
                '    } \n' +

                '    shadowParameters.texCoords = shadowPosition.xy; \n' +
                '    shadowParameters.depth = shadowPosition.z; \n' +
                '    shadowParameters.nDotL = nDotL; \n' +

                '    float visibility = czm_shadowVisibility(shadowMap_texture, shadowParameters); \n';
        } else if (hasCascades) {
            fsSource +=
                '    float maxDepth = shadowMap_cascadeSplits[1].w; \n' +

                '    // Stop early if the eye depth exceeds the last cascade \n' +
                '    if (depth > maxDepth) \n' +
                '    { \n' +
                '        return; \n' +
                '    } \n' +

                '    // Get the cascade based on the eye-space depth \n' +
                '    vec4 weights = czm_cascadeWeights(depth); \n' +

                '    // Apply normal offset \n' +
                '    float nDotL = clamp(dot(normalEC, shadowMap_lightDirectionEC), 0.0, 1.0); \n' +
                '    applyNormalOffset(positionEC, normalEC, nDotL); \n' +

                '    // Transform position into the cascade \n' +
                '    vec4 shadowPosition = czm_cascadeMatrix(weights) * positionEC; \n' +

                '    // Get visibility \n' +
                '    shadowParameters.texCoords = shadowPosition.xy; \n' +
                '    shadowParameters.depth = shadowPosition.z; \n' +
                '    shadowParameters.nDotL = nDotL; \n' +
                '    float visibility = czm_shadowVisibility(shadowMap_texture, shadowParameters); \n' +

                '    // Fade out shadows that are far away \n' +
                '    float shadowMapMaximumDistance = shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness.z; \n' +
                '    float fade = max((depth - shadowMapMaximumDistance * 0.8) / (shadowMapMaximumDistance * 0.2), 0.0); \n' +
                '    visibility = mix(visibility, 1.0, fade); \n' +

                (debugCascadeColors ?
                '    // Draw cascade colors for debugging \n' +
                '    gl_FragColor *= czm_cascadeColor(weights); \n' : '');
        } else {
            fsSource +=
                '    float nDotL = clamp(dot(normalEC, shadowMap_lightDirectionEC), 0.0, 1.0); \n' +
                '    applyNormalOffset(positionEC, normalEC, nDotL); \n' +
                '    vec4 shadowPosition = shadowMap_matrix * positionEC; \n' +

                '    // Stop early if the fragment is not in the shadow bounds \n' +
                '    if (any(lessThan(shadowPosition.xyz, vec3(0.0))) || any(greaterThan(shadowPosition.xyz, vec3(1.0)))) \n' +
                '    { \n' +
                '        return; \n' +
                '    } \n' +

                '    shadowParameters.texCoords = shadowPosition.xy; \n' +
                '    shadowParameters.depth = shadowPosition.z; \n' +
                '    shadowParameters.nDotL = nDotL; \n' +
                '    float visibility = czm_shadowVisibility(shadowMap_texture, shadowParameters); \n';
        }

        fsSource +=
            '    gl_FragColor.rgb *= visibility; \n' +
            '} \n';

        sources.push(fsSource);

        return new ShaderSource({
            defines : defines,
            sources : sources
        });
    };

    return ShadowMapShader;
});
