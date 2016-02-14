/*global define*/
define([
       '../Core/defineProperties',
        '../ThirdParty/jsep',
    ], function(
        defineProperties,
        jsep) {
    "use strict";

    // TODO: best name/directory for this?

    /**
     * DOC_TBA
     */
    function Expression(styleEngine, expression) {
        this._styleEngine = styleEngine;

        console.log(jsep(expression));
    }

    defineProperties(Expression.prototype, {
    });

    Expression.prototype.evaluate = function(feature) {
        return true;
    };

    return Expression;
});
