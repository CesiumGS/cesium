/*global define*/
define(function() {
    "use strict";

    function render(context, frameState, primitive) {
        var commandLists = [];
        primitive.update(context, frameState, commandLists);
        var length = commandLists.length;
        for (var i = 0; i < length; ++i) {
            var commandList = commandLists[i].colorList;
            var commandListLength = commandList.length;
            for (var j = 0; j < commandListLength; ++j) {
                var command = commandList[j];
                context.draw(command);
            }
        }
        return length;
    }

    return render;
});