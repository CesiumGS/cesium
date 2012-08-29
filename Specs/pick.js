/*global define*/
define(function() {
    "use strict";

    function pick(context, frameState, primitives, x, y) {
        var pickFramebuffer = context.createPickFramebuffer();
        var fb = pickFramebuffer.begin();

        var oldPick = frameState.passes.pick;
        frameState.passes.pick = true;

        primitives.update(context, frameState);
        primitives.renderForPick(context, fb);

        frameState.passes.pick = oldPick;

        var primitive = pickFramebuffer.end({
            x : x,
            y : y
        });
        pickFramebuffer.destroy();

        return primitive;
    }

    return pick;
});