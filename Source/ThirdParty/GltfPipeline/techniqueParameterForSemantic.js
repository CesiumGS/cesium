define([
        '../../Core/defined'
    ], function(
        defined) {
    'use strict';

    /**
     * Retrieves the technique parameter that has a matching semantic.
     *
     * @param {Object} technique A javascript object containing a glTF technique.
     * @param {String} semantic The search string for semantics.
     * @returns {String} The technique parameter with matching semantic.
     *
     * @private
     */
    function techniqueParameterForSemantic(technique, semantic) {
        var parameters = technique.parameters;
        for (var parameterName in parameters) {
            if (parameters.hasOwnProperty(parameterName)) {
                var parameter = parameters[parameterName];
                var parameterSemantic = parameter.semantic;
                if (defined(parameterSemantic) && parameterSemantic === semantic) {
                    return parameterName;
                }
            }
        }
    }
    return techniqueParameterForSemantic;
});
