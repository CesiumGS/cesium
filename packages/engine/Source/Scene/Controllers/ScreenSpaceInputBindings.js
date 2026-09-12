import Check from "../../Core/Check.js";
import defined from "../../Core/defined.js";
import ScreenSpaceEventType from "../../Core/ScreenSpaceEventType.js";
import MouseButton from "./MouseButton.js";

/**
 * @typedef {object} InputBinding
 * @memberof ScreenSpaceInputBindings
 * @property {MouseButton} button The mouse button used for drag start/stop.
 * @property {number} [modifier] The optional keyboard modifier to register.
 */

/**
 * @typedef {object} DragInputActions
 * @memberof ScreenSpaceInputBindings
 * @property {Function} [start] Called on drag start.
 * @property {Function} [end] Called on drag stop.
 * @property {Function} [change] Called on drag move.
 */

/**
 * @typedef {object} DragInputState
 * @memberof ScreenSpaceInputBindings
 * @property {boolean} isDragging True if a drag is in progress, false otherwise.
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
 */
class ScreenSpaceInputBindings {
  /**
   * Registers drag input bindings on a screen space event handler.
   * @param {ScreenSpaceEventHandler} handler The screen space event handler.
   * @param {InputBinding[]} inputBindings The drag bindings to register.
   * @param {DragInputActions} dragInputActions The callbacks to invoke for drag actions.
   * @returns {DragInputState} The drag input state.
   */
  static registerDragInputBindings(handler, inputBindings, dragInputActions) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("handler", handler);
    Check.defined("inputBindings", inputBindings);
    Check.typeOf.object("dragInputActions", dragInputActions);
    //>>includeEnd('debug');

    const changeModifiers = new Set();
    const dragInputState = {
      isDragging: false,
    };

    for (const binding of inputBindings) {
      dragInputState.isDragging = false;
      const downEventType = getDownEventType(binding.button);
      const upEventType = getUpEventType(binding.button);

      if (defined(downEventType)) {
        handler.setInputAction(
          (...e) => {
            dragInputState.isDragging = true;
            if (defined(dragInputActions.start)) {
              dragInputActions.start(...e);
            }
          },
          downEventType,
          binding.modifier,
        );
      }

      if (defined(upEventType)) {
        handler.setInputAction(
          (...e) => {
            if (dragInputState.isDragging) {
              dragInputState.isDragging = false;
              if (defined(dragInputActions.end)) {
                dragInputActions.end(...e);
              }
            }
          },
          upEventType,
          binding.modifier,
        );

        // Register a global up event to ensure that the drag end callback is called even if the mouse is released outside of the canvas or the modifier key is released before the mouse button.
        handler.setInputAction((...e) => {
          if (dragInputState.isDragging) {
            dragInputState.isDragging = false;
            if (defined(dragInputActions.end)) {
              dragInputActions.end(...e);
            }
          }
        }, upEventType);
      }

      changeModifiers.add(binding.modifier);
    }

    for (const modifier of changeModifiers) {
      handler.setInputAction(
        (...e) => {
          if (dragInputState.isDragging && defined(dragInputActions.change)) {
            dragInputActions.change(...e);
          }
        },
        ScreenSpaceEventType.MOUSE_MOVE,
        modifier,
      );
    }

    return dragInputState;
  }
}

export default ScreenSpaceInputBindings;
