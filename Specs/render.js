/*global define*/
define(function() {
    "use strict";

    function render(context, frameState, primitive) {
        var commandList = [];
        primitive.update(context, frameState, commandList);
        var length = commandList.length;
        for (var i = 0; i < length; ++i) {
            context.draw(commandList[i]);
        }
        return length;
    }

    return render;
});