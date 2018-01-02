define([
        '../Core/defined'
    ], function(
        defined) {
    'use strict';

    /**
     * Return the uniform or attribute that has the given semantic.
     *
     * @param {Object} gltf The gltf asset.
     * @param {String} semantic The semantic to look for in the technique's attribute and uniform parameters
     * @param {Number} [programId] Only look at techniques that use this program
     *
     * @private
     */
    function getAttributeOrUniformBySemantic(gltf, semantic, programId) {
        var techniques = gltf.techniques;
        var parameter;
        for (var techniqueName in techniques) {
            if (techniques.hasOwnProperty(techniqueName)) {
                var technique = techniques[techniqueName];
                if (defined(programId) && (technique.program !== programId)) {
                    continue;
                }
                var parameters = technique.parameters;
                var attributes = technique.attributes;
                var uniforms = technique.uniforms;
                for (var attributeName in attributes) {
                    if (attributes.hasOwnProperty(attributeName)) {
                        parameter = parameters[attributes[attributeName]];
                        if (defined(parameter) && parameter.semantic === semantic) {
                            return attributeName;
                        }
                    }
                }
                for (var uniformName in uniforms) {
                    if (uniforms.hasOwnProperty(uniformName)) {
                        parameter = parameters[uniforms[uniformName]];
                        if (defined(parameter) && parameter.semantic === semantic) {
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
