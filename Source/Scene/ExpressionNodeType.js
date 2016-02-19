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
        TERNARY : 3,
        LITERAL_NULL : 4,
        LITERAL_BOOLEAN : 5,
        LITERAL_NUMBER : 6,
        LITERAL_STRING: 7,
        LITERAL_COLOR: 8,
        VARIABLE_IN_STRING : 9
    };

    return freezeObject(ExpressionNodeType);
});