/*global define*/
define([
        'Specs/destroyCanvas'
    ], function(
        destroyCanvas) {
    "use strict";

    function destroyContext(context) {
        if (context) {
            destroyCanvas(context.canvas);
            context = context.destroy();
        }
    }

    return destroyContext;
});
