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

    function executeCommands(context, frameState, commands) {
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

            command.execute(context);
            commandsExecuted++;
        }

        return commandsExecuted;
    }

    function render(context, frameState, primitive, commands) {
        commands = defaultValue(commands, []);
        primitive.update(context, frameState, commands);

        var i;
        var renderCommands = new Array(Pass.NUMBER_OF_PASSES);
        for (i = 0; i < Pass.NUMBER_OF_PASSES; ++i) {
            renderCommands[i] = [];
        }

        var length = commands.length;
        for (i = 0; i < length; i++) {
            var command = commands[i];
            var pass = defined(command.pass) ? command.pass : Pass.OPAQUE;
            renderCommands[pass].push(command);
        }

        var commandsExecuted = 0;
        for (i = 0; i < Pass.NUMBER_OF_PASSES; ++i) {
            commandsExecuted += executeCommands(context, frameState, renderCommands[i]);
        }

        return commandsExecuted;
    }

    return render;
});