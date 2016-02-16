/*global define*/
define([
    '../Core/freezeObject'
], function(
    freezeObject) {
    'use strict';

    /**
     * @private
     */
    var ExpressionType = {
        LITERAL : 0,
        UNARY : 1,
        BINARY : 2,
        TERNARY : 3
    };

    return freezeObject(ExpressionType);
});