/*global define*/
define([
        'Core/BoundingRectangle',
        'Core/Color',
        'Core/defined',
        'Renderer/ClearCommand',
        'Scene/CreditDisplay',
        'Scene/FrameState',
        'Scene/Pass'
    ], function(
        BoundingRectangle,
        Color,
        defined,
        ClearCommand,
        CreditDisplay,
        FrameState,
        Pass) {
    "use strict";

    function executeCommands(context, passState, commands) {
        var length = commands.length;
        for (var i = 0; i < length; ++i) {
            commands[i].execute(context, passState);
        }
    }

    function pick(frameState, primitives, x, y) {
        frameState.commandList.length = 0;

        var context = frameState.context;

        var rectangle = new BoundingRectangle(x, y, 1, 1);
        var pickFramebuffer = context.createPickFramebuffer();
        var passState = pickFramebuffer.begin(rectangle);

        var oldPasses = frameState.passes;
        frameState.passes = (new FrameState(new CreditDisplay(document.createElement('div')))).passes;
        frameState.passes.pick = true;

        primitives.update(frameState);

        var clear = new ClearCommand({
            color : new Color(0.0, 0.0, 0.0, 0.0),
            depth : 1.0,
            stencil : 1.0
        });
        clear.execute(context, passState);

        var i;
        var renderCommands = new Array(Pass.NUMBER_OF_PASSES);
        for (i = 0; i < Pass.NUMBER_OF_PASSES; ++i) {
            renderCommands[i] = [];
        }

        var commands = frameState.commandList;
        var length = commands.length;
        for (i = 0; i < length; i++) {
            var command = commands[i];
            var pass = defined(command.pass) ? command.pass : Pass.OPAQUE;
            renderCommands[pass].push(command);
        }

        for (i = 0; i < Pass.NUMBER_OF_PASSES; ++i) {
            executeCommands(context, passState, renderCommands[i]);
        }

        frameState.passes = oldPasses;

        var p = pickFramebuffer.end(rectangle);
        pickFramebuffer.destroy();

        return p;
    }

    return pick;
});