/*global define*/
define(function() {
    "use strict";

    function destroyContext(context) {
        if (context) {
            document.body.removeChild(context.getCanvas());
            context = context.destroy();
        }
    }

    return destroyContext;
});
