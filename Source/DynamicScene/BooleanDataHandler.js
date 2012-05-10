/*global define*/
define(function() {
    "use strict";

    var BooleanDataHandler = {
        unwrapCzmlInterval : function(czmlInterval) {
            var result = czmlInterval.boolean;
            return typeof result === 'undefined' ? Boolean(czmlInterval) : Boolean(result);
        },

        isSampled : function() {
            return false;
        },

        createValue : function(data) {
            return data;
        }
    };

    return BooleanDataHandler;
});