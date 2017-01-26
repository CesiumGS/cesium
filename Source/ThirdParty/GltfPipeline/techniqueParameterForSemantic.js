/*global define*/
define([
        '../../Core/defined'
    ], function(
        defined) {
    'use strict';

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
