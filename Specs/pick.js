/*global define*/
define(function() {
    "use strict";

    function pick(context, primitives, x, y) {
        var pickFramebuffer = context.createPickFramebuffer();
        var fb = pickFramebuffer.begin();

        primitives.updateForPick(context);
        primitives.renderForPick(context, fb);

        var primitive = pickFramebuffer.end({
            x : x,
            y : y
        });
        pickFramebuffer.destroy();

        return primitive;
    }

    return pick;
});