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
        LITERAL_NULL : 5,
        LITERAL_BOOLEAN : 6,
        LITERAL_NUMBER : 7,
        LITERAL_STRING: 8,
        LITERAL_COLOR: 9,
        LITERAL_REGEX: 10,
        VARIABLE_IN_STRING : 11
    };

    return freezeObject(ExpressionNodeType);
});