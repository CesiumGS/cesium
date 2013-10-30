/*global define*/
define([
        'Core/BoundingRectangle',
        'Core/Color',
        'Renderer/ClearCommand',
        'Scene/CreditDisplay',
        'Scene/FrameState'
    ], function(
        BoundingRectangle,
        Color,
        ClearCommand,
        CreditDisplay,
        FrameState) {
    "use strict";

    function executeList(context, passState, commandLists, listName) {
        var length = commandLists.length;
        for (var i = 0; i < length; ++i) {
            var commandList = commandLists[i].pickList[listName];
            var commandListLength = commandList.length;
            for (var j = 0; j < commandListLength; ++j) {
                var command = commandList[j];
                command.execute(context, passState);
            }
        }
    }

    function pick(context, frameState, primitives, x, y) {
        var rectangle = new BoundingRectangle(x, y, 1, 1);
        var pickFramebuffer = context.createPickFramebuffer();
        var passState = pickFramebuffer.begin(rectangle);

        var oldPasses = frameState.passes;
        frameState.passes = (new FrameState(new CreditDisplay(document.createElement('div')))).passes;
        frameState.passes.pick = true;

        var commandLists = [];
        primitives.update(context, frameState, commandLists);

        var clear = new ClearCommand();
        clear.color = new Color(0.0, 0.0, 0.0, 0.0);
        clear.depth = 1.0;
        clear.stencil = 1.0;
        clear.execute(context, passState);

        executeList(context, passState, commandLists, 'opaqueList');
        executeList(context, passState, commandLists, 'translucentList');

        frameState.passes = oldPasses;

        var p = pickFramebuffer.end(rectangle);
        pickFramebuffer.destroy();

        return p;
    }

    return pick;
});