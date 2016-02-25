/*global define*/
define([
    '../Core/freezeObject'
], function(
    freezeObject) {
    'use strict';

    /**
     * @private
     */
    var ExpressionNodeType = {
        VARIABLE : 0,
        UNARY : 1,
        BINARY : 2,
        CONDITIONAL : 3,
        MEMBER : 4,
        FUNCTION_CALL : 5,
        ARRAY : 6,
        LITERAL_NULL : 7,
        LITERAL_BOOLEAN : 8,
        LITERAL_NUMBER : 9,
        LITERAL_STRING: 10,
        LITERAL_COLOR: 11,
        REGEX: 12,
        VARIABLE_IN_STRING : 13
    };

    return freezeObject(ExpressionNodeType);
});