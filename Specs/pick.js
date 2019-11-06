import { BoundingRectangle } from '../Source/Cesium.js';
import { Color } from '../Source/Cesium.js';
import { defined } from '../Source/Cesium.js';
import { ClearCommand } from '../Source/Cesium.js';
import { Pass } from '../Source/Cesium.js';
import { CreditDisplay } from '../Source/Cesium.js';
import { FrameState } from '../Source/Cesium.js';
import { JobScheduler } from '../Source/Cesium.js';
import { PickFramebuffer } from '../Source/Cesium.js';

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
        var pickFramebuffer = new PickFramebuffer(context);
        var passState = pickFramebuffer.begin(rectangle);

        var oldPasses = frameState.passes;
        frameState.passes = (new FrameState(new CreditDisplay(document.createElement('div'), undefined, document.createElement('div')), new JobScheduler())).passes;
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
export default pick;
