/*global define*/
define([
        'Core/defaultValue',
        'Core/defined',
        'Core/Intersect',
        'Scene/Pass',
        'Scene/SceneMode'
    ], function(
        defaultValue,
        defined,
        Intersect,
        Pass,
        SceneMode) {
    "use strict";

    function executeCommands(frameState, commands) {
        var commandsExecuted = 0;
        var cullingVolume = frameState.cullingVolume;
        var occluder;
        if (frameState.mode === SceneMode.SCENE3D) {
            occluder = frameState.occluder;
        }

        var length = commands.length;
        for (var i = 0; i < length; ++i) {
            var command = commands[i];
            var boundingVolume = command.boundingVolume;
            if (defined(boundingVolume)) {
                if (cullingVolume.computeVisibility(boundingVolume) === Intersect.OUTSIDE ||
                        (defined(occluder) && !occluder.isBoundingSphereVisible(boundingVolume))) {
                    continue;
                }
            }

            command.execute(frameState.context);
            commandsExecuted++;
        }

        return commandsExecuted;
    }

    function render(frameState, primitive) {
        frameState.commandList.length = 0;
        primitive.update(frameState);

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

        var commandsExecuted = 0;
        for (i = 0; i < Pass.NUMBER_OF_PASSES; ++i) {
            commandsExecuted += executeCommands(frameState, renderCommands[i]);
        }

        return commandsExecuted;
    }

    return render;
});