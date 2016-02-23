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
        ARRAY : 5,
        LITERAL_NULL : 6,
        LITERAL_BOOLEAN : 7,
        LITERAL_NUMBER : 8,
        LITERAL_STRING: 9,
        LITERAL_COLOR: 10,
        LITERAL_REGEX: 11,
        VARIABLE_IN_STRING : 12
    };

    return freezeObject(ExpressionNodeType);
});