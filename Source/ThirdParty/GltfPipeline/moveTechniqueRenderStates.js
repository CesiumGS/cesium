import addExtensionsUsed from './addExtensionsUsed.js'
import ForEach from './ForEach.js'
import defaultValue from '../../Core/defaultValue.js'
import defined from '../../Core/defined.js'
import WebGLConstants from '../../Core/WebGLConstants.js'

    var defaultBlendEquation = [
        WebGLConstants.FUNC_ADD,
        WebGLConstants.FUNC_ADD
    ];

    var defaultBlendFactors = [
        WebGLConstants.ONE,
        WebGLConstants.ZERO,
        WebGLConstants.ONE,
        WebGLConstants.ZERO
    ];

    function isStateEnabled(renderStates, state) {
        var enabled = renderStates.enable;
        if (!defined(enabled)) {
            return false;
        }

        return (enabled.indexOf(state) > -1);
    }

    var supportedBlendFactors = [
        WebGLConstants.ZERO,
        WebGLConstants.ONE,
        WebGLConstants.SRC_COLOR,
        WebGLConstants.ONE_MINUS_SRC_COLOR,
        WebGLConstants.SRC_ALPHA,
        WebGLConstants.ONE_MINUS_SRC_ALPHA,
        WebGLConstants.DST_ALPHA,
        WebGLConstants.ONE_MINUS_DST_ALPHA,
        WebGLConstants.DST_COLOR,
        WebGLConstants.ONE_MINUS_DST_COLOR
    ];

    // If any of the blend factors are not supported, return the default
    function getSupportedBlendFactors(value, defaultValue) {
        if (!defined(value)) {
            return defaultValue;
        }

        for (var i = 0; i < 4; i++) {
            if (supportedBlendFactors.indexOf(value[i]) === -1) {
                return defaultValue;
            }
        }

        return value;
    }

    /**
     * Move glTF 1.0 technique render states to glTF 2.0 materials properties and KHR_blend extension.
     *
     * @param {Object} gltf A javascript object containing a glTF asset.
     * @returns {Object} The updated glTF asset.
     *
     * @private
     */
    function moveTechniqueRenderStates(gltf) {
        var blendingForTechnique = {};
        var materialPropertiesForTechnique = {};
        var techniquesLegacy = gltf.techniques;
        if (!defined(techniquesLegacy)) {
            return gltf;
        }

        ForEach.technique(gltf, function (techniqueLegacy, techniqueIndex) {
            var renderStates = techniqueLegacy.states;
            if (defined(renderStates)) {
                var materialProperties = materialPropertiesForTechnique[techniqueIndex] = {};

                // If BLEND is enabled, the material should have alpha mode BLEND
                if (isStateEnabled(renderStates, WebGLConstants.BLEND)) {
                    materialProperties.alphaMode = 'BLEND';

                    var blendFunctions = renderStates.functions;
                    if (defined(blendFunctions) && (defined(blendFunctions.blendEquationSeparate)
                            || defined(blendFunctions.blendFuncSeparate))) {
                        blendingForTechnique[techniqueIndex] = {
                            blendEquation: defaultValue(blendFunctions.blendEquationSeparate, defaultBlendEquation),
                            blendFactors: getSupportedBlendFactors(blendFunctions.blendFuncSeparate, defaultBlendFactors)
                        };
                    }
                }

                // If CULL_FACE is not enabled, the material should be doubleSided
                if (!isStateEnabled(renderStates, WebGLConstants.CULL_FACE)) {
                    materialProperties.doubleSided = true;
                }

                delete techniqueLegacy.states;
            }
        });

        if (Object.keys(blendingForTechnique).length > 0) {
            if (!defined(gltf.extensions)) {
                gltf.extensions = {};
            }

            addExtensionsUsed(gltf, 'KHR_blend');
        }

        ForEach.material(gltf, function (material) {
            if (defined(material.technique)) {
                var materialProperties = materialPropertiesForTechnique[material.technique];
                ForEach.objectLegacy(materialProperties, function (value, property) {
                    material[property] = value;
                });

                var blending = blendingForTechnique[material.technique];
                if (defined(blending)) {
                    if (!defined(material.extensions)) {
                        material.extensions = {};
                    }

                    material.extensions.KHR_blend = blending;
                }
            }
        });

        return gltf;
    }

    export default moveTechniqueRenderStates;
