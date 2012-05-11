/*global define*/
define(function() {
    "use strict";

    var StringDataHandler = {
        unwrapCzmlInterval : function(czmlInterval) {
            var result = czmlInterval.string;
            return typeof result === 'undefined' ? String(czmlInterval) : String(result);
        },

        isSampled : function() {
            return false;
        },

        createValue : function(data) {
            return data;
        }
    };

    return StringDataHandler;
});