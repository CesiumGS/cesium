/*global define*/
define(['../Scene/LabelStyle'
       ], function(
        LabelStyle) {
    "use strict";

    var CzmlLabelStyle = {
        unwrapInterval : function(czmlInterval) {
            var result = czmlInterval.labelStyle;
            return typeof result === 'undefined' ? czmlInterval : result;
        },

        isSampled : function() {
            return false;
        },

        getValue : function(unwrappedInterval) {
            return LabelStyle[unwrappedInterval];
        }
    };

    return CzmlLabelStyle;
});