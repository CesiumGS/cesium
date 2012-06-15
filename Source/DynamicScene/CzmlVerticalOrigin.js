/*global define*/
define(['../Scene/VerticalOrigin'
       ], function(
        VerticalOrigin) {
    "use strict";

    var CzmlVerticalOrigin = {
        unwrapInterval : function(czmlInterval) {
            var result = czmlInterval.verticalOrigin;
            return typeof result === 'undefined' ? czmlInterval : result;
        },

        isSampled : function() {
            return false;
        },

        getValue : function(unwrappedInterval) {
            return VerticalOrigin[unwrappedInterval];
        }
    };

    return CzmlVerticalOrigin;
});