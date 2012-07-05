/*global define*/
define(function() {
    "use strict";

    /**
     * DOC_TBA
     * @exports combineMaterials
     */
    function combineMaterials(materialTemplates) {
        var unforms = {};
        var concatenatedSource = '';
        var duplicateUniforms = {};

        var length = materialTemplates.length;
        for ( var i = 0; i < length; ++i) {
            var material = materialTemplates[i].material;
            var materialSource = material._getShaderSource();
            var materialUniforms = material._uniforms;

            for ( var name in materialUniforms) {
                if (materialUniforms.hasOwnProperty(name)) {
                    var uniqueName = name;
                    while (unforms[uniqueName]) {
                        // Rename uniform
                        var count = duplicateUniforms[name] || 1;
                        uniqueName = '_agi_' + name + count.toString();
                        duplicateUniforms[name] = count + 1;
                    }
                    materialSource = materialSource.replace(new RegExp(name, 'g'), uniqueName);
                    unforms[uniqueName] = materialUniforms[name];
                }
            }

            if (materialTemplates[i].sourceTransform) {
                materialSource = materialTemplates[i].sourceTransform(materialSource);
            }

            concatenatedSource += '#line 0\n' + materialSource;
        }

        return {
            _uniforms : unforms,
            _getShaderSource : function() {
                return concatenatedSource;
            }
        };
    }

    return combineMaterials;
});