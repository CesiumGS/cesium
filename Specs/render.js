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

        var opaqueCommands = [];
        var translucentCommands = [];
        var overlayCommands = [];

        var length = commands.length;
        for (var i = 0; i < length; i++) {
            var command = commands[i];
            if (command.pass === Pass.OPAQUE) {
                opaqueCommands.push(command);
            } else if (command.pass === Pass.TRANSLUCENT) {
                translucentCommands.push(command);
            } else if (command.pass === Pass.OVERLAY) {
                overlayCommands.push(command);
            }
        }

        var commandsExecuted = executeCommands(context, frameState, opaqueCommands);
        commandsExecuted += executeCommands(context, frameState, translucentCommands);
        commandsExecuted += executeCommands(context, frameState, overlayCommands);

        return commandsExecuted;
    }

    return render;
});