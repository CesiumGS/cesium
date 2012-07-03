/*global define*/
define(function() {
    "use strict";

    function destroyCanvas(canvas) {
        if (canvas) {
            document.body.removeChild(canvas);
        }
    }

    return destroyCanvas;
});
