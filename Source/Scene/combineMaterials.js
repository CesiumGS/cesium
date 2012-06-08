/*global define*/
define(function() {
    "use strict";

    /**
     * DOC_TBA
     */
    function combineMaterials() {
        var unforms = {};
        var concatenatedSource = '';
        var duplicateUniforms = {};

        var length = arguments.length;
        for ( var i = 0; i < length; ++i) {
            var material = arguments[i].material;
            var materialSource = material._getShaderSource();
            var materialUniforms = material._uniforms;

            for ( var name in materialUniforms) {
                if (materialUniforms.hasOwnProperty(name)) {
                    if (unforms[name]) {
                        // Rename uniform
                        var count = duplicateUniforms[name] || 1;
                        var uniqueName = '_agi_' + name + count.toString();

                        // PERFORMANCE_IDEA:  We could cache the RegExp for duplicate uniforms
                        // or see if a pure JavaScript search-and-replace is faster.

                        // This could rename other things like GLSL comments and other identifiers
                        // with the same name.
                        materialSource = materialSource.replace(new RegExp(name, 'g'), uniqueName);
                        unforms[uniqueName] = materialUniforms[name];

                        duplicateUniforms[name] = count + 1;
                    } else {
                        unforms[name] = materialUniforms[name];
                    }
                }
            }

            if (arguments[i].sourceTransform) {
                materialSource = arguments[i].sourceTransform(materialSource);
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