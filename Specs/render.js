import { defined } from "../Source/Cesium.js";
import { Intersect } from "../Source/Cesium.js";
import { Pass } from "../Source/Cesium.js";
import { SceneMode } from "../Source/Cesium.js";

function executeCommands(frameState, commands) {
  let commandsExecuted = 0;
  const cullingVolume = frameState.cullingVolume;
  let occluder;
  if (frameState.mode === SceneMode.SCENE3D) {
    occluder = frameState.occluder;
  }

  const length = commands.length;
  for (let i = 0; i < length; ++i) {
    const command = commands[i];
    const boundingVolume = command.boundingVolume;
    if (defined(boundingVolume)) {
      if (
        cullingVolume.computeVisibility(boundingVolume) === Intersect.OUTSIDE ||
        (defined(occluder) && !occluder.isBoundingSphereVisible(boundingVolume))
      ) {
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

  let i;
  const renderCommands = new Array(Pass.NUMBER_OF_PASSES);
  for (i = 0; i < Pass.NUMBER_OF_PASSES; ++i) {
    renderCommands[i] = [];
  }

  const commands = frameState.commandList;
  const length = commands.length;
  for (i = 0; i < length; i++) {
    const command = commands[i];
    const pass = defined(command.pass) ? command.pass : Pass.OPAQUE;
    renderCommands[pass].push(command);
  }

  let commandsExecuted = 0;
  for (i = 0; i < Pass.NUMBER_OF_PASSES; ++i) {
    commandsExecuted += executeCommands(frameState, renderCommands[i]);
  }

  return commandsExecuted;
}
export default render;
