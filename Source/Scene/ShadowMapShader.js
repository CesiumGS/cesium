/*global define*/
define([
        '../Core/defaultValue',
        '../Renderer/ShaderSource'
    ], function(
        defaultValue,
        ShaderSource) {
    'use strict';

    function ShadowMapShader() {
    }

    ShadowMapShader.createShadowCastVertexShader = function(vs) {
        return vs;
    };

    ShadowMapShader.createShadowCastFragmentShader = function(fs, frameState, opaque) {
        // TODO : is there an easy way to tell if a model or primitive is opaque before going here?
        opaque = defaultValue(opaque, false);
        if (opaque) {
            fs = 'void main() \n' +
                 '{ \n' +
                 '    gl_FragColor = ' + (frameState.context.depthTexture ? 'vec4(1.0)' : 'czm_packDepth(gl_FragCoord.z)') + '; \n' +
                 '}';
        } else {
            fs = ShaderSource.replaceMain(fs, 'czm_shadow_main');
            fs +=
                'void main() \n' +
                '{ \n' +
                '    czm_shadow_main(); \n' +
                '    if (gl_FragColor.a == 0.0) { \n' +
                '       discard; \n' +
                '    } \n' +
                '    gl_FragColor = ' + (frameState.context.depthTexture ? 'vec4(1.0)' : 'czm_packDepth(gl_FragCoord.z)') + '; \n' +
                '}';
        }

        return fs;
    };

    ShadowMapShader.createShadowReceiveVertexShader = function(vs) {
        vs = ShaderSource.replaceMain(vs, 'czm_shadow_main');
        vs +=
            'varying vec3 v_shadowPosition; \n' +
            'void main() \n' +
            '{ \n' +
            '    czm_shadow_main(); \n' +
            '    v_shadowPosition = (czm_sunShadowMapMatrix * gl_Position).xyz; \n' +
            '} \n';
        return vs;
    };

    ShadowMapShader.createShadowReceiveFragmentShader = function(fs, frameState) {
        var cascadesEnabled = frameState.shadowMap.numberOfCascades > 1;
        var debugVisualizeCascades = frameState.shadowMap.debugVisualizeCascades;
        fs = ShaderSource.replaceMain(fs, 'czm_shadow_main');
        fs +=
            'varying vec3 v_shadowPosition; \n' +
            ' \n' +
            'vec4 getCascadeWeights(float depthEye) \n' +
            '{ \n' +
            '    // One component is set to 1.0 and all others set to 0.0. \n' +
            '    vec4 near = step(czm_sunShadowMapCascadeSplits[0], vec4(depthEye)); \n' +
            '    vec4 far = step(depthEye, czm_sunShadowMapCascadeSplits[1]); \n' +
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
            '    return czm_sunShadowMapCascadeOffsets[0] * weights.x + \n' +
            '           czm_sunShadowMapCascadeOffsets[1] * weights.y + \n' +
            '           czm_sunShadowMapCascadeOffsets[2] * weights.z + \n' +
            '           czm_sunShadowMapCascadeOffsets[3] * weights.w; \n' +
            '} \n' +
            'vec3 getCascadeScale(vec4 weights) \n' +
            '{ \n' +
            '    return czm_sunShadowMapCascadeScales[0] * weights.x + \n' +
            '           czm_sunShadowMapCascadeScales[1] * weights.y + \n' +
            '           czm_sunShadowMapCascadeScales[2] * weights.z + \n' +
            '           czm_sunShadowMapCascadeScales[3] * weights.w; \n' +
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
            '    return czm_projection[3][2] / ((gl_FragCoord.z * 2.0 - 1.0) + czm_projection[2][2]); \n' +
            '} \n' +
            ' \n' +
            'float sampleTexture(vec2 shadowCoordinate) \n' +
            '{ \n' +

            (frameState.context.depthTexture ?
            '    return texture2D(czm_sunShadowMapTexture, shadowCoordinate).r; \n' :
            '    return czm_unpackDepth(texture2D(czm_sunShadowMapTexture, shadowCoordinate)); \n') +

            '} \n' +
            ' \n' +
            'float getVisibility(vec3 shadowPosition) \n' +
            '{ \n' +
            '    float depth = shadowPosition.z; \n' +
            '    float shadowDepth = sampleTexture(shadowPosition.xy); \n' +
            '    if (depth - 0.005 > shadowDepth) { \n' +
            '        return 0.2; // In shadow \n' +
            '    } else { \n' +
            '        return 1.0; \n' +
            '    } \n' +
            '} \n' +
            ' \n' +
            'void main() \n' +
            '{ \n' +
            '    czm_shadow_main(); \n' +
            '    vec3 shadowPosition = v_shadowPosition; \n' +
            '    // Do not apply shadowing if outside of the shadow map bounds \n' +
            '    if (any(lessThan(shadowPosition, vec3(0.0))) || any(greaterThan(shadowPosition, vec3(1.0)))) { \n' +
            '        return; \n' +
            '    } \n' +
            ' \n' +

            (cascadesEnabled ?
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
            '    float visibility = getVisibility(shadowPosition); \n' +
            '    gl_FragColor.rgb *= visibility; \n' +
            '} \n';

        return fs;
    };

    return ShadowMapShader;
});
