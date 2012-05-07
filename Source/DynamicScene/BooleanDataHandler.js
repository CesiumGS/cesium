/*global define*/
define(function() {
    "use strict";

    var BooleanDataHandler = {

        isSampled : function() {
            return false;
        },

        createValue : function(data) {
            return data;
        },

        getCzmlIntervalValue : function(czmlInterval) {
            var result = czmlInterval.boolean;
            return typeof result === 'undefined' ? Boolean(czmlInterval) : Boolean(result);
        }
    };

    return BooleanDataHandler;
});