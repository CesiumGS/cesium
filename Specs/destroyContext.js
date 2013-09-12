/*global define*/
define(['Specs/destroyCanvas'], function(destroyCanvas) {
    "use strict";

    function destroyContext(context) {
        if (context) {
            destroyCanvas(context.getCanvas());
            context = context.destroy();
        }
    }

    return destroyContext;
});
