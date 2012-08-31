/*global define*/
define(function() {
    "use strict";

    function render(context, commandList) {
        var length = commandList.length;
        for (var i = 0; i < length; ++i) {
            context.draw(commandList[i]);
        }
    }

    return render;
});