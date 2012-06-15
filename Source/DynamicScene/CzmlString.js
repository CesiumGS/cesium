/*global define*/
define(function() {
    "use strict";

    var CzmlString = {
        unwrapInterval : function(czmlInterval) {
            var result = czmlInterval.string;
            return typeof result === 'undefined' ? String(czmlInterval) : String(result);
        },

        isSampled : function() {
            return false;
        },

        getValue : function(unwrappedInterval) {
            return unwrappedInterval;
        }
    };

    return CzmlString;
});