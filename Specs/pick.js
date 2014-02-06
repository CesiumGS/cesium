/*global define*/
define([
        'Core/BoundingRectangle',
        'Core/Color',
        'Renderer/ClearCommand',
        'Renderer/Pass',
        'Scene/CreditDisplay',
        'Scene/FrameState'
    ], function(
        BoundingRectangle,
        Color,
        ClearCommand,
        Pass,
        CreditDisplay,
        FrameState) {
    "use strict";

    function executeCommands(context, passState, commands) {
        var length = commands.length;
        for (var i = 0; i < length; ++i) {
            commands[i].execute(context, passState);
        }
    }

    function pick(context, frameState, primitives, x, y) {
        var rectangle = new BoundingRectangle(x, y, 1, 1);
        var pickFramebuffer = context.createPickFramebuffer();
        var passState = pickFramebuffer.begin(rectangle);

        var oldPasses = frameState.passes;
        frameState.passes = (new FrameState(new CreditDisplay(document.createElement('div')))).passes;
        frameState.passes.pick = true;

        var commands = [];
        primitives.update(context, frameState, commands);

        var clear = new ClearCommand();
        clear.color = new Color(0.0, 0.0, 0.0, 0.0);
        clear.depth = 1.0;
        clear.stencil = 1.0;
        clear.execute(context, passState);

        var opaqueCommands = [];
        var translucentCommands = [];

        var length = commands.length;
        for (var i = 0; i < length; i++) {
            var command = commands[i];
            if (command.pass === Pass.OPAQUE) {
                opaqueCommands.push(command);
            } else if (command.pass === Pass.TRANSLUCENT) {
                translucentCommands.push(command);
            }
        }

        executeCommands(context, passState, opaqueCommands);
        executeCommands(context, passState, translucentCommands);

        frameState.passes = oldPasses;

        var p = pickFramebuffer.end(rectangle);
        pickFramebuffer.destroy();

        return p;
    }

    return pick;
});