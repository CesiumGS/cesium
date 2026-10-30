// @ts-check

// TODO: Remove once the helpers are implemented and called.
/* eslint-disable no-unused-private-class-members */

import { DeveloperError } from "@cesium/core";
import {
  KeyboardEventModifier,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
} from "@cesium/engine";

/** @import { Cartesian2 } from "@cesium/core"; */
/** @import { Scene } from "@cesium/engine"; */
/** @import { MeshEditor as WasmMeshEditor, PointerModifiers, PointerPick, PointerScene } from "@cesium/mesh-editor"; */
/** @import Mesh from "./Mesh.js"; */
/** @import MeshEditor from "./MeshEditor.js"; */

const { SHIFT, CTRL, ALT } = KeyboardEventModifier;

/**
 * Every combination of modifier keys. ScreenSpaceEventHandler only calls the
 * action registered for exactly the keys held, so each action is registered
 * once per combination.
 *
 * @type {Array<KeyboardEventModifier[] | undefined>}
 * @ignore
 */
const MODIFIER_COMBINATIONS = [
  undefined,
  [SHIFT],
  [CTRL],
  [ALT],
  [SHIFT, CTRL],
  [SHIFT, ALT],
  [CTRL, ALT],
  [SHIFT, CTRL, ALT],
];

/**
 * Forwards pointer input on a scene's canvas to a mesh editor.
 *
 * @private
 */
class MeshEditorInputHandler {
  /** @type {ScreenSpaceEventHandler} */
  #eventHandler;

  /**
   * @param {object} options
   * @param {Scene} options.scene The scene whose canvas, camera and picking to use.
   * @param {MeshEditor} options.editor The editor whose active meshes clicks choose in EditMode.NONE.
   * @param {WasmMeshEditor} options.wasmEditor The wasm editor that receives pointer input.
   * @param {ReadonlySet<Mesh>} options.meshes The editor's meshes. Read only.
   */
  constructor(options) {
    const eventHandler = new ScreenSpaceEventHandler(options.scene.canvas);

    // Since Cesium's ScreenSpaceEventHandler only calls the action for the exact combination of modifier keys,
    // we need to register each action for every combination.
    for (const modifiers of MODIFIER_COMBINATIONS) {
      const pointerModifiers =
        MeshEditorInputHandler.#createPointerModifiers(modifiers);

      eventHandler.setInputAction(
        this.#onPress.bind(this, pointerModifiers),
        ScreenSpaceEventType.LEFT_DOWN,
        modifiers,
      );
      eventHandler.setInputAction(
        this.#onMove.bind(this, pointerModifiers),
        ScreenSpaceEventType.MOUSE_MOVE,
        modifiers,
      );
      eventHandler.setInputAction(
        this.#onRelease.bind(this, pointerModifiers),
        ScreenSpaceEventType.LEFT_UP,
        modifiers,
      );
      eventHandler.setInputAction(
        this.#onClick.bind(this, pointerModifiers),
        ScreenSpaceEventType.LEFT_CLICK,
        modifiers,
      );
    }

    this.#eventHandler = eventHandler;
  }

  /**
   * Converts Cesium's modifier keys to the wasm editor's.
   *
   * @param {KeyboardEventModifier[] | undefined} modifiers The modifier keys held.
   * @returns {PointerModifiers} The wasm editor's modifier keys.
   * @ignore
   */
  static #createPointerModifiers(modifiers = []) {
    return {
      shift: modifiers.includes(SHIFT),
      control: modifiers.includes(CTRL),
      alt: modifiers.includes(ALT),
    };
  }

  /**
   * Sends a press to the active tool, with the pointer's ray and the active
   * meshes' placements. Pauses the camera if the tool starts a drag.
   *
   * @param {PointerModifiers} modifiers The modifier keys held.
   * @param {ScreenSpaceEventHandler.PositionedEvent} event The press.
   * @ignore
   */
  #onPress(modifiers, event) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * Sends pointer movement to the active tool, with the pointer's ray.
   *
   * @param {PointerModifiers} modifiers The modifier keys held.
   * @param {ScreenSpaceEventHandler.MotionEvent} event The movement.
   * @ignore
   */
  #onMove(modifiers, event) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * Sends a release to the active tool, with the pointer's ray. Resumes the
   * camera if a drag paused it.
   *
   * @param {PointerModifiers} modifiers The modifier keys held.
   * @param {ScreenSpaceEventHandler.PositionedEvent} event The release.
   * @ignore
   */
  #onRelease(modifiers, event) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * Picks under the pointer. In EditMode.NONE, chooses the active meshes;
   * otherwise, sends the click to the active tool.
   *
   * @param {PointerModifiers} modifiers The modifier keys held.
   * @param {ScreenSpaceEventHandler.PositionedEvent} event The click.
   * @ignore
   */
  #onClick(modifiers, event) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * Picks a component of one of the editor's meshes.
   *
   * @param {Cartesian2} position The window position to pick at.
   * @returns {PointerPick | null} The picked component, or <code>null</code> if nothing the editor can select is there.
   * @ignore
   */
  #createPick(position) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * Describes where the active meshes are in the world, for tools that work
   * in world space.
   *
   * @returns {PointerScene} The camera's direction and the active meshes' world matrices.
   * @ignore
   */
  #createPointerScene() {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * In EditMode.NONE, makes the clicked mesh the only active mesh, or
   * toggles it if shift is held.
   *
   * @param {Mesh | undefined} mesh The clicked mesh, or <code>undefined</code> if no mesh was clicked.
   * @param {PointerModifiers} modifiers The modifier keys held.
   * @ignore
   */
  #chooseActiveMeshes(mesh, modifiers) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * Stops the camera reacting to the pointer during a drag.
   *
   * @ignore
   */
  #pauseCamera() {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * Lets the camera react to the pointer again, if a drag paused it.
   *
   * @ignore
   */
  #resumeCamera() {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * Stops listening to pointer input and resumes the camera.
   */
  destroy() {
    this.#resumeCamera();
    this.#eventHandler.destroy();
  }
}

export default MeshEditorInputHandler;
