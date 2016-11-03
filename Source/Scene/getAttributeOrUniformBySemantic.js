/*global define*/
define([], function() {
    'use strict';

    /**
     * Return the uniform or attribute that has the given semantic.
     *
     * @private
     */
    function getAttributeOrUniformBySemantic(gltf, semantic) {
        var techniques = gltf.techniques;
        for (var techniqueName in techniques) {
            if (techniques.hasOwnProperty(techniqueName)) {
                var technique = techniques[techniqueName];
                var parameters = technique.parameters;
                var attributes = technique.attributes;
                var uniforms = technique.uniforms;
                for (var attributeName in attributes) {
                    if (attributes.hasOwnProperty(attributeName)) {
                        if (parameters[attributes[attributeName]].semantic === semantic) {
                            return attributeName;
                        }
                    }
                }
                for (var uniformName in uniforms) {
                    if (uniforms.hasOwnProperty(uniformName)) {
                        if (parameters[uniforms[uniformName]].semantic === semantic) {
                            return uniformName;
                        }
                    }
                }
            }
        }
        return undefined;
    }

    return getAttributeOrUniformBySemantic;
});
