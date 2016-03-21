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
            fs = 'void main() \n' +
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
        var isPointLight = frameState.shadowMap.isPointLight;
        if (!isPointLight) {
            vs = ShaderSource.replaceMain(vs, 'czm_shadow_main');
            vs +=
                'varying vec3 v_shadowPosition; \n' +
                'void main() \n' +
                '{ \n' +
                '    czm_shadow_main(); \n' +
                '    v_shadowPosition = (czm_shadowMapMatrix * gl_Position).xyz; \n' +
                '} \n';
        }

        return vs;
    };

    ShadowMapShader.createShadowReceiveFragmentShader = function(fs, frameState, normalVaryingName, positionVaryingName) {
        var hasNormalVarying = defined(normalVaryingName) && (fs.indexOf(normalVaryingName) > -1);
        var hasPositionVarying = defined(positionVaryingName) && (fs.indexOf(positionVaryingName) > -1);
        var usesDepthTexture = frameState.shadowMap.usesDepthTexture;
        var isPointLight = frameState.shadowMap.isPointLight;
        var usesCubeMap = frameState.shadowMap.usesCubeMap;
        var hasCascades = frameState.shadowMap.numberOfCascades > 1;
        var debugVisualizeCascades = frameState.shadowMap.debugVisualizeCascades;
        var softShadows = frameState.shadowMap.softShadows;

        fs = ShaderSource.replaceMain(fs, 'czm_shadow_main');
        fs +=
            'vec4 getCascadeWeights(float depthEye) \n' +
            '{ \n' +
            '    // One component is set to 1.0 and all others set to 0.0. \n' +
            '    vec4 near = step(czm_shadowMapCascadeSplits[0], vec4(depthEye)); \n' +
            '    vec4 far = step(depthEye, czm_shadowMapCascadeSplits[1]); \n' +
            '    return near * far; \n' +
            '} \n' +
            'vec4 getCascadeViewport(vec4 weights) \n' +
            '{ \n' +
            '    return vec4(0.0, 0.0, 0.5, 0.5) * weights.x + \n' +
            '           vec4(0.5, 0.0, 0.5, 0.5) * weights.y + \n' +
            '           vec4(0.0, 0.5, 0.5, 0.5) * weights.z + \n' +
            '           vec4(0.5, 0.5, 0.5, 0.5) * weights.w; \n' +
            '} \n' +
            'vec3 getCascadeOffset(vec4 weights) \n' +
            '{ \n' +
            '    return czm_shadowMapCascadeOffsets[0] * weights.x + \n' +
            '           czm_shadowMapCascadeOffsets[1] * weights.y + \n' +
            '           czm_shadowMapCascadeOffsets[2] * weights.z + \n' +
            '           czm_shadowMapCascadeOffsets[3] * weights.w; \n' +
            '} \n' +
            'vec3 getCascadeScale(vec4 weights) \n' +
            '{ \n' +
            '    return czm_shadowMapCascadeScales[0] * weights.x + \n' +
            '           czm_shadowMapCascadeScales[1] * weights.y + \n' +
            '           czm_shadowMapCascadeScales[2] * weights.z + \n' +
            '           czm_shadowMapCascadeScales[3] * weights.w; \n' +
            '} \n' +
            'vec4 getCascadeColor(vec4 weights) \n' +
            '{ \n' +
            '    return vec4(1.0, 0.0, 0.0, 1.0) * weights.x + \n' +
            '           vec4(0.0, 1.0, 0.0, 1.0) * weights.y + \n' +
            '           vec4(0.0, 0.0, 1.0, 1.0) * weights.z + \n' +
            '           vec4(1.0, 0.0, 1.0, 1.0) * weights.w; \n' +
            '} \n' +
            ' \n' +
            'float getDepthEye() \n' +
            '{ \n' +

            (hasPositionVarying ?
            '    return -' + positionVaryingName + '.z; \n' :
            '    return czm_projection[3][2] / ((gl_FragCoord.z * 2.0 - 1.0) + czm_projection[2][2]); \n') +

            '} \n' +
            ' \n' +

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
            '    float shadowDepth = sampleTexture(uv); \n' +
            '    return step(depth, shadowDepth); \n' +
            '} \n' +
            
            (isPointLight && usesCubeMap ?
            'float getVisibility(vec3 uv, float depth, vec3 lightDirectionEC)' :
            'float getVisibility(vec2 uv, float depth, vec3 lightDirectionEC)') +

            '{ \n' +

            (softShadows ?
            '    float radius = 1.0; \n' +
            '    float dx0 = -czm_shadowMapTexelSize.x * radius; \n' +
            '    float dy0 = -czm_shadowMapTexelSize.y * radius; \n' +
            '    float dx1 = czm_shadowMapTexelSize.x * radius; \n' +
            '    float dy1 = czm_shadowMapTexelSize.y * radius; \n' +
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

            '    float visibility = depthCompare(uv, depth); \n') +
            
            (hasNormalVarying ?
            '    // If the normal is facing away from the light, then it is in shadow \n' +
            '    float angle = dot(normalize(' + normalVaryingName + '), lightDirectionEC); \n' +
            '    //float strength = step(0.0, angle); \n' +
            '    float strength = clamp(angle * 10.0, 0.0, 1.0); \n' +
            '    visibility *= strength; \n' : '') +

            '    visibility = max(visibility, 0.3); \n' +
            '    return visibility; \n' +
            '} \n' +
            ' \n' +
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

                (hasPositionVarying ?
                '    vec3 positionEC = ' + positionVaryingName + '; \n' :
                '    vec3 positionEC = czm_windowToEyeCoordinates(gl_FragCoord).xyz; \n') +

                '    vec3 directionEC = positionEC - czm_shadowMapLightPositionEC.xyz; \n' +
                '    float distance = length(directionEC); \n' +
                '    float radius = czm_shadowMapLightPositionEC.w; \n' +
                '    if (distance > radius) { \n' +
                '        return; \n' +
                '    } \n' +
                '    vec3 directionWC  = czm_inverseViewRotation * directionEC; \n' +
                '    distance /= radius; \n' +

                (usesCubeMap ?
                '    float visibility = getVisibility(directionWC, distance, -directionEC); \n' :

                '    vec2 uv = directionToUV(directionWC); \n' +
                '    float visibility = getVisibility(uv, distance, -directionEC); \n') +

                '    gl_FragColor.rgb *= visibility; \n' +
                '} \n';
        } else {
            fs +=
                'varying vec3 v_shadowPosition; \n' +
                'void main() \n' +
                '{ \n' +
                '    czm_shadow_main(); \n' +
                '    vec3 shadowPosition = v_shadowPosition; \n' +
                '    // Do not apply shadowing if outside of the shadow map bounds \n' +
                '    if (any(lessThan(shadowPosition, vec3(0.0))) || any(greaterThan(shadowPosition, vec3(1.0)))) { \n' +
                '        return; \n' +
                '    } \n' +
                ' \n' +

                (hasCascades ?
                '    // Get the cascade \n' +
                '    float depthEye = getDepthEye(); \n' +
                '    vec4 weights = getCascadeWeights(depthEye); \n' +
                ' \n' +
                '    // Transform shadowPosition into the cascade \n' +
                '    shadowPosition += getCascadeOffset(weights); \n' +
                '    shadowPosition *= getCascadeScale(weights); \n' +
                ' \n' +
                '    // Modify texture coordinates to read from the correct cascade in the texture atlas \n' +
                '    vec4 viewport = getCascadeViewport(weights); \n' +
                '    shadowPosition.xy = shadowPosition.xy * viewport.zw + viewport.xy; \n' +
                ' \n' +

                (debugVisualizeCascades ?
                '    // Draw cascade colors for debugging \n' +
                '    gl_FragColor *= getCascadeColor(weights); \n' : '') : '') +

                ' \n' +
                '    // Apply shadowing \n' +
                '    float visibility = getVisibility(shadowPosition.xy, shadowPosition.z, czm_shadowMapLightDirectionEC); \n' +
                '    gl_FragColor.rgb *= visibility; \n' +
                '} \n';
        }

        return fs;
    };

    return ShadowMapShader;
});
