/*global define*/
define(function() {
    "use strict";

    var CzmlBoolean = {
        unwrapInterval : function(czmlInterval) {
            var result = czmlInterval.boolean;
            return typeof result === 'undefined' ? Boolean(czmlInterval) : Boolean(result);
        },

        isSampled : function() {
            return false;
        },

        createValue : function(unwrappedInterval) {
            return unwrappedInterval;
        }
    };

    return CzmlBoolean;
});