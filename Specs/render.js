/*global define*/
define([
        'Core/defaultValue',
        'Core/defined',
        'Core/Intersect',
        'Core/Matrix4',
        'Scene/SceneMode'
     ], function(
         defaultValue,
         defined,
         Intersect,
         Matrix4,
         SceneMode) {
    "use strict";

    function executeOverlayCommands(context, commandLists) {
        var commandsExecuted = 0;
        var length = commandLists.length;
        for (var i = 0; i < length; ++i) {
            var commandList = commandLists[i].overlayList;
            var commandListLength = commandList.length;
            for (var j = 0; j < commandListLength; ++j) {
                commandList[j].execute(context);
                commandsExecuted++;
            }
        }

        return commandsExecuted;
    }

    function executeList(context, frameState, commandLists, listName) {
        var commandsExecuted = 0;
        var cullingVolume = frameState.cullingVolume;
        var occluder;
        if (frameState.mode === SceneMode.SCENE3D) {
            occluder = frameState.occluder;
        }

        var length = commandLists.length;
        for (var i = 0; i < length; ++i) {
            var commandList = commandLists[i][listName];
            var commandListLength = commandList.length;
            for (var j = 0; j < commandListLength; ++j) {
                var command = commandList[j];
                var boundingVolume = command.boundingVolume;
                if (defined(boundingVolume)) {
                    var modelMatrix = defaultValue(command.modelMatrix, Matrix4.IDENTITY);
                    var transformedBV = boundingVolume.transform(modelMatrix);
                    if (cullingVolume.getVisibility(transformedBV) === Intersect.OUTSIDE ||
                            (defined(occluder) && !occluder.isBoundingSphereVisible(transformedBV))) {
                        continue;
                    }
                }

                command.execute(context);
                commandsExecuted++;
            }
        }

        return commandsExecuted;
    }

    function render(context, frameState, primitive, commandLists) {
        commandLists = defaultValue(commandLists, []);
        primitive.update(context, frameState, commandLists);

        var commandsExecuted = executeList(context, frameState, commandLists, 'opaqueList');
        commandsExecuted += executeList(context, frameState, commandLists, 'translucentList');
        commandsExecuted += executeOverlayCommands(context, commandLists);

        return commandsExecuted;
    }

    return render;
});