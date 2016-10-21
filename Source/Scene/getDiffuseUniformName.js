/*global define*/
define([
        '../Core/defined'
], function(
        defined) {
    'use strict';

    function getDiffuseUniformName(gltf) {
        var techniques = gltf.techniques;
        for (var techniqueName in techniques) {
            if (techniques.hasOwnProperty(techniqueName)) {
                var technique = techniques[techniqueName];
                var parameters = technique.parameters;
                var uniforms = technique.uniforms;
                for (var uniformName in uniforms) {
                    if (uniforms.hasOwnProperty(uniformName)) {
                        var parameterName = uniforms[uniformName];
                        var parameter = parameters[parameterName];
                        var semantic = parameter.semantic;
                        if (defined(semantic) && (semantic === '_3DTILESDIFFUSE')) {
                            return uniformName;
                        }
                    }
                }
            }
        }
        return undefined;
    }

    return getDiffuseUniformName;
});
