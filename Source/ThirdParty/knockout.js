define([
        './knockout-3.4.2',
        './knockout-es5',
        '../Widgets/SvgPathBindingHandler'
    ], function(
        knockout,
        knockout_es5,
        SvgPathBindingHandler) {
    "use strict";

    // install the Knockout-ES5 plugin
    knockout_es5.attachToKo(knockout);

    // Register all Cesium binding handlers
    SvgPathBindingHandler.register(knockout);

    return knockout;
});
