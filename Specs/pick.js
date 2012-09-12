/*global define*/
define([
        'Scene/FrameState'
    ], function(
        FrameState) {
    "use strict";

    function pick(context, frameState, primitives, x, y) {
        var pickFramebuffer = context.createPickFramebuffer();
        var fb = pickFramebuffer.begin();

        var oldPasses = frameState.passes;
        frameState.passes = (new FrameState()).passes;
        frameState.passes.pick = true;

        var commandList = [];
        primitives.update(context, frameState, commandList);

        var length = commandList.length;
        for (var i = 0; i < length; ++i) {
            var command = commandList[i];
            command.framebuffer = fb;
            context.draw(command);
        }

        frameState.passes = oldPasses;

        var primitive = pickFramebuffer.end({
            x : x,
            y : y
        });
        pickFramebuffer.destroy();

        return primitive;
    }

    return pick;
});