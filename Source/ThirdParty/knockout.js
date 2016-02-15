/*global define*/
define([
        './knockout-3.2.0',
        './knockout-es5',
        '../Widgets/SvgPathBindingHandler'
    ], function(
        ko,
        ko_es5,
        SvgPathBindingHandler) {
    "use strict";
    if (window.knockout){
        return window.knockout
    }
    // install the Knockout-ES5 plugin
    ko_es5.attachToKo(ko);

    // Register all Cesium binding handlers
    SvgPathBindingHandler.register(ko);
    window.knockout = ko;
    return window.knockout;
});