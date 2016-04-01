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
        var maximumDistance = Number(shadowMap._maximumDistance).toFixed(10);

        fs = ShaderSource.replaceMain(fs, 'czm_shadow_main');
        fs +=
            'vec4 getCascadeWeights(float depthEye) \n' +
            '{ \n' +
            '    // One component is set to 1.0 and all others set to 0.0. \n' +
            '    vec4 near = step(czm_shadowMapCascadeSplits[0], vec4(depthEye)); \n' +
            '    vec4 far = step(depthEye, czm_shadowMapCascadeSplits[1]); \n' +
            '    return near * far; \n' +
            '} \n' +
            'mat4 getCascadeMatrix(vec4 weights) \n' +
            '{ \n' +
            '    return czm_shadowMapCascadeMatrices[0] * weights.x + \n' +
            '           czm_shadowMapCascadeMatrices[1] * weights.y + \n' +
            '           czm_shadowMapCascadeMatrices[2] * weights.z + \n' +
            '           czm_shadowMapCascadeMatrices[3] * weights.w; \n' +
            '} \n' +
            'float getCascadeDistance(vec4 weights) \n' +
            '{ \n' +
            '    return dot(czm_shadowMapCascadeDistances, weights); \n' +
            '} \n' +
            'vec4 getCascadeColor(vec4 weights) \n' +
            '{ \n' +
            '    return vec4(1.0, 0.0, 0.0, 1.0) * weights.x + \n' +
            '           vec4(0.0, 1.0, 0.0, 1.0) * weights.y + \n' +
            '           vec4(0.0, 0.0, 1.0, 1.0) * weights.z + \n' +
            '           vec4(1.0, 0.0, 1.0, 1.0) * weights.w; \n' +
            '} \n' +
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

            (isPointLight && usesCubeMap ?
            'float sampleTexture(vec3 d) \n' +
            '{ \n' +
            '    return czm_unpackDepth(textureCube(czm_shadowMapTextureCube, d)); \n' +
            '} \n' :
            'float sampleTexture(vec2 uv) \n' +
            '{ \n' +
            (usesDepthTexture ?
            '    return texture2D(czm_shadowMapTexture, uv).r; \n' :
            '    return czm_unpackDepth(texture2D(czm_shadowMapTexture, uv)); \n') +
            '} \n' +
            ' \n') +
            (isPointLight && usesCubeMap ?
            'float depthCompare(vec3 uv, float depth) \n' :
            'float depthCompare(vec2 uv, float depth) \n') +
            '{ \n' +
            '    return step(depth, sampleTexture(uv)); \n' +
            '} \n' +
            (isPointLight && usesCubeMap ?
            'float exponentialCompare(vec3 uv, float depth, float shadowDistance) \n' :
            'float exponentialCompare(vec2 uv, float depth, float shadowDistance) \n') +
            '{ \n' +
            '    float shadowDepth = sampleTexture(uv); \n' +
            '    float darknessFactor = 10.0 * shadowDistance; \n' +
            '    return clamp(exp(darknessFactor * (shadowDepth - depth)), 0.0, 1.1); \n' +
            '} \n' +
            (isPointLight && usesCubeMap ?
            'float getVisibility(vec3 uv, float depth, float nDotL, float shadowDistance)' :
            'float getVisibility(vec2 uv, float depth, float nDotL, float shadowDistance)') +
            '{ \n' +

            (softShadows && !isPointLight ?
            '    float radius = 1.0; \n' +
            '    float dx0 = -czm_shadowMapTexelStepSize.x * radius; \n' +
            '    float dy0 = -czm_shadowMapTexelStepSize.y * radius; \n' +
            '    float dx1 = czm_shadowMapTexelStepSize.x * radius; \n' +
            '    float dy1 = czm_shadowMapTexelStepSize.y * radius; \n' +
            '    float visibility = ( \n' +
            '        depthCompare(uv, depth) + \n' +
            '        depthCompare(uv + vec2(dx0, dy0), depth) + \n' +
            '        depthCompare(uv + vec2(0.0, dy0), depth) + \n' +
            '        depthCompare(uv + vec2(dx1, dy0), depth) + \n' +
            '        depthCompare(uv + vec2(dx0, 0.0), depth) + \n' +
            '        depthCompare(uv + vec2(dx1, 0.0), depth) + \n' +
            '        depthCompare(uv + vec2(dx0, dy1), depth) + \n' +
            '        depthCompare(uv + vec2(0.0, dy1), depth) + \n' +
            '        depthCompare(uv + vec2(dx1, dy1), depth) \n' +
            '    ) * (1.0 / 9.0); \n' :

            '    depth -= ' + depthBias + '; \n' +
            (exponentialShadows ?
            '    float visibility = exponentialCompare(uv, depth, shadowDistance); \n' :
            '    float visibility = depthCompare(uv, depth); \n')) +
            (bias.normalShading && hasNormalVarying ?
            '    // If the normal is facing away from the light, then it is in shadow \n' +
            (bias.normalShadingSmooth > 0.0 ?
            '    float strength = clamp(nDotL / ' + normalShadingSmooth + ', 0.0, 1.0); \n' :
            '    float strength = step(0.0, nDotL); \n') +
            '    visibility *= strength; \n' : '') +

            '    visibility = max(visibility, 0.3); \n' +
            '    return visibility; \n' +
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
                '    float visibility = getVisibility(directionWC, distance, nDotL, radius); \n' :
                '    vec2 uv = directionToUV(directionWC); \n' +
                '    float visibility = getVisibility(uv, distance, nDotL, radius); \n') +

                '    gl_FragColor.rgb *= visibility; \n' +
                '} \n';
        } else if (isSpotLight) {
            fs +=
                'void main() \n' +
                '{ \n' +
                '    czm_shadow_main(); \n' +
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

                '    float visibility = getVisibility(shadowPosition.xy, shadowPosition.z, nDotL, czm_shadowMapDistance); \n' +
                '    gl_FragColor.rgb *= visibility; \n' +
                '} \n';
        } else if (hasCascades) {
            fs +=
                'void main() \n' +
                '{ \n' +
                '    czm_shadow_main(); \n' +
                '    vec4 positionEC = getPositionEC(); \n' +
                '    float depth = -positionEC.z; \n' +
                '    float maxDepth = czm_shadowMapCascadeSplits[1].w; \n' +

                '    // Stop early if the eye depth exceeds the last cascade \n' +
                '    if (depth > maxDepth) { \n' +
                '        return; \n' +
                '    } \n' +

                '    // Get the cascade based on the eye-space depth \n' +
                '    vec4 weights = getCascadeWeights(depth); \n' +
                '    float shadowDistance = getCascadeDistance(weights); \n' +

                '    // Apply normal offset \n' +
                '    vec3 normalEC = getNormalEC(); \n' +
                '    float nDotL = clamp(dot(normalEC, czm_shadowMapLightDirectionEC), 0.0, 1.0); \n' +
                '    applyNormalOffset(positionEC, normalEC, nDotL); \n' +

                '    // Transform position into the cascade \n' +
                '    vec4 shadowPosition = getCascadeMatrix(weights) * positionEC; \n' +

                '    // Get visibility \n' +
                '    float visibility = getVisibility(shadowPosition.xy, shadowPosition.z, nDotL, shadowDistance); \n' +

                '    // Fade out shadows that are far away \n' +
                '    float fade = max((depth - ' + maximumDistance + ' * 0.8) / (' + maximumDistance + ' * 0.2), 0.0); \n' +
                '    visibility = mix(visibility, 1.0, fade); \n' +
                '    gl_FragColor.rgb *= visibility; \n' +

                (debugVisualizeCascades ?
                '    // Draw cascade colors for debugging \n' +
                '    gl_FragColor *= getCascadeColor(weights); \n' : '') +
                '} \n';
        } else {
            fs +=
                'void main() \n' +
                '{ \n' +
                '    czm_shadow_main(); \n' +
                '    vec4 positionEC = getPositionEC(); \n' +
                '    vec3 normalEC = getNormalEC(); \n' +
                '    float nDotL = clamp(dot(normalEC, czm_shadowMapLightDirectionEC), 0.0, 1.0); \n' +
                '    applyNormalOffset(positionEC, normalEC, nDotL); \n' +
                '    vec4 shadowPosition = czm_shadowMapMatrix * positionEC; \n' +

                '    // Stop early if the fragment is not in the shadow bounds \n' +
                '    if (any(lessThan(shadowPosition, vec4(0.0))) || any(greaterThan(shadowPosition, vec4(1.001)))) { \n' +
                '        return; \n' +
                '    } \n' +

                '    float visibility = getVisibility(shadowPosition.xy, shadowPosition.z, nDotL, czm_shadowMapDistance); \n' +
                '    gl_FragColor.rgb *= visibility; \n' +
                '} \n';
        }

        return fs;
    };

    return ShadowMapShader;
});
