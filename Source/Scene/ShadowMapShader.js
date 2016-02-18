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

    ShadowMapShader.createShadowCastFragmentShader = function(fs, context, opaque) {
        // TODO : is there an easy way to tell if a model or primitive is opaque before going here?
        opaque = defaultValue(opaque, false);
        if (opaque) {
            fs = 'void main() \n' +
                 '{ \n' +
                 '    gl_FragColor = ' + (context.depthTexture ? 'vec4(1.0)' : 'czm_packDepth(gl_FragCoord.z)') + '; \n' +
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
                '    gl_FragColor = ' + (context.depthTexture ? 'vec4(1.0)' : 'czm_packDepth(gl_FragCoord.z)') + '; \n' +
                '}';
        }

        return fs;
    };

    ShadowMapShader.createReceiveShadowsVertexShader = function(vs) {
        vs = ShaderSource.replaceMain(vs, 'czm_shadow_main');
        vs +=
            'varying vec3 czm_shadowMapCoordinate; \n' +
            'void main() \n' +
            '{ \n' +
            '    czm_shadow_main(); \n' +
            '    czm_shadowMapCoordinate = (czm_sunShadowMapMatrix * gl_Position).xyz; \n' +
            '} \n';
        return vs;
    };

    ShadowMapShader.createReceiveShadowsFragmentShader = function(fs, context) {
        fs = ShaderSource.replaceMain(fs, 'czm_shadow_main');
        fs +=
            'varying vec3 czm_shadowMapCoordinate; \n' +
            'void main() \n' +
            '{ \n' +
            '    czm_shadow_main(); \n' +
            // TODO : remove this debugging code once frustum fits scene better
            '    if (any(lessThan(czm_shadowMapCoordinate, vec3(0.0))) || any(greaterThan(czm_shadowMapCoordinate, vec3(1.0)))) \n' +
            '    { \n' +
            '        return; \n' +
            '    } \n' +
            '    float depth = czm_shadowMapCoordinate.z; \n' +

            (context.depthTexture ?
            '    float shadowDepth = texture2D(czm_sunShadowMapTexture, czm_shadowMapCoordinate.xy).r; \n' :
            '    float shadowDepth = czm_unpackDepth(texture2D(czm_sunShadowMapTexture, czm_shadowMapCoordinate.xy)); \n') +

            // TODO : remove if
            '    if (depth - 0.005 > shadowDepth) { \n' +
            '        gl_FragColor.rgb *= 0.2; \n' +
            '    } \n' +
            '} \n';
        return fs;
    };

    return ShadowMapShader;
});
