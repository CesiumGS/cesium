import Check from "../../Core/Check.js";
import defined from "../../Core/defined.js";
import ScreenSpaceEventType from "../../Core/ScreenSpaceEventType.js";
import MouseButton from "./MouseButton.js";

/**
 * @typedef {object} InputBinding
 * @memberof ScreenspaceInputBindings
 * @property {MouseButton} button The mouse button used for drag start/stop.
 * @property {number} [modifier] The optional keyboard modifier to register.
 */

/**
 * @typedef {object} DragInputActions
 * @memberof ScreenspaceInputBindings
 * @property {Function} start Called on drag start.
 * @property {Function} end Called on drag stop.
 * @property {Function} move Called on drag move.
 */

/**
 * @private
 * @param {MouseButton} button The mouse button.
 * @returns {ScreenSpaceEventType|undefined} The corresponding down event type.
 */
function getDownEventType(button) {
  if (button === MouseButton.LEFT) {
    return ScreenSpaceEventType.LEFT_DOWN;
  }

  if (button === MouseButton.MIDDLE) {
    return ScreenSpaceEventType.MIDDLE_DOWN;
  }

  if (button === MouseButton.RIGHT) {
    return ScreenSpaceEventType.RIGHT_DOWN;
  }

  return undefined;
}

/**
 * @private
 * @param {MouseButton} button The mouse button.
 * @returns {ScreenSpaceEventType|undefined} The corresponding down event type.
 */
function getUpEventType(button) {
  if (button === MouseButton.LEFT) {
    return ScreenSpaceEventType.LEFT_UP;
  }

  if (button === MouseButton.MIDDLE) {
    return ScreenSpaceEventType.MIDDLE_UP;
  }

  if (button === MouseButton.RIGHT) {
    return ScreenSpaceEventType.RIGHT_UP;
  }

  return undefined;
}

/**
 * @namespace
 * @alias ScreenspaceInputBindings
 */
class ScreenspaceInputBindings {
  /**
   * Registers drag input bindings on a screen space event handler.
   * @param {ScreenSpaceEventHandler} handler The screen space event handler.
   * @param {InputBinding[]} inputBindings The drag bindings to register.
   * @param {DragInputActions} dragInputActions The callbacks to invoke for drag actions.
   */
  static registerDragInputBindings(handler, inputBindings, dragInputActions) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("handler", handler);
    Check.defined("inputBindings", inputBindings);
    Check.typeOf.object("dragInputActions", dragInputActions);
    //>>includeEnd('debug');

    const moveModifiers = new Set();

    for (const binding of inputBindings) {
      const downEventType = getDownEventType(binding.button);
      const upEventType = getUpEventType(binding.button);

      if (defined(downEventType)) {
        handler.setInputAction(
          dragInputActions.start,
          downEventType,
          binding.modifier,
        );
      }

      if (defined(upEventType)) {
        handler.setInputAction(
          dragInputActions.end,
          upEventType,
          binding.modifier,
        );
      }

      moveModifiers.add(binding.modifier);
    }

    for (const modifier of moveModifiers) {
      handler.setInputAction(
        dragInputActions.move,
        ScreenSpaceEventType.MOUSE_MOVE,
        modifier,
      );
    }
  }
}

export default ScreenspaceInputBindings;
