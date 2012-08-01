/*global define*/
define(function() {
    "use strict";

    /**
     * DOC_TBA
     * @exports combineMaterials
     */
    var combineMaterials = function(materials) {
        var unforms = {};
        var concatenatedSource = '';
        var duplicateUniforms = {};

        for ( var i = 0; i < materials.length; ++i) {
            var material = materials[i].material;
            var materialSource = material.shaderSource;
            var materialUniforms = material._uniforms;

            for ( var name in materialUniforms) {
                if (materialUniforms.hasOwnProperty(name)) {
                    if (unforms[name]) {
                        // Rename uniform
                        var count = duplicateUniforms[name] || 1;
                        var uniqueName = '_agi_' + name + count.toString();
                        materialSource = materialSource.replace(new RegExp(name, 'g'), uniqueName);
                        unforms[uniqueName] = materialUniforms[name];

                        duplicateUniforms[name] = count + 1;
                    } else {
                        unforms[name] = materialUniforms[name];
                    }
                }
            }

            if (materials[i].sourceTransform) {
                materialSource = materials[i].sourceTransform(materialSource);
            }

            concatenatedSource += '#line 0\n' + materialSource;
        }

        return {
            _uniforms : unforms,
            shaderSource : concatenatedSource
        };
    };

    return combineMaterials;
});