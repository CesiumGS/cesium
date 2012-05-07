/*global define*/
define(function() {
    "use strict";

    var StringDataHandler = {

        isSampled : function() {
            return false;
        },

        createValue : function(data) {
            return data;
        },

        getCzmlIntervalValue : function(czmlInterval) {
            var result = czmlInterval.string;
            return typeof result === 'undefined' ? String(czmlInterval) : String(result);
        }
    };

    return StringDataHandler;
});