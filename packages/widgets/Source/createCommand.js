import { defined, DeveloperError, Event } from "@cesium/engine";
import knockout from "./ThirdParty/knockout.js";

/**
 * Create a Command from a given function, for use with ViewModels.
 *
 * A Command is a function with an extra <code>canExecute</code> observable property to determine
 * whether the command can be executed.  When executed, a Command function will check the
 * value of <code>canExecute</code> and throw if false.  It also provides events for when
 * a command has been or is about to be executed.
 *
 * @function
 *
 * @param {Function} func The function to execute.
 * @param {boolean} [canExecute=true] A boolean indicating whether the function can currently be executed.
 */
function createCommand(func, canExecute) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(func)) {
    throw new DeveloperError("func is required.");
  }
  //>>includeEnd('debug');

  canExecute = canExecute ?? true;

  const beforeExecute = new Event();
  const afterExecute = new Event();

  function command() {
    //>>includeStart('debug', pragmas.debug);
    if (!command.canExecute) {
      throw new DeveloperError("Cannot execute command, canExecute is false.");
    }
    //>>includeEnd('debug');

    const commandInfo = {
      args: arguments,
      cancel: false,
    };

    let result;
    beforeExecute.raiseEvent(commandInfo);
    if (!commandInfo.cancel) {
      result = func.apply(null, arguments);
      afterExecute.raiseEvent(result);
    }
    return result;
  }

  command.canExecute = canExecute;
  knockout.track(command, ["canExecute"]);

  Object.defineProperties(command, {
    beforeExecute: {
      value: beforeExecute,
    },
    afterExecute: {
      value: afterExecute,
    },
  });

  return command;
}
export default createCommand;
