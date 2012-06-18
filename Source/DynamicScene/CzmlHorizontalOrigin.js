/*global define*/
define(['../Scene/HorizontalOrigin'
       ], function(
        HorizontalOrigin) {
    "use strict";

    var CzmlHorizontalOrigin = {
        unwrapInterval : function(czmlInterval) {
            var result = czmlInterval.horizontalOrigin;
            return typeof result === 'undefined' ? czmlInterval : result;
        },

        isSampled : function() {
            return false;
        },

        getValue : function(unwrappedInterval) {
            return HorizontalOrigin[unwrappedInterval];
        }
    };

    return CzmlHorizontalOrigin;
});