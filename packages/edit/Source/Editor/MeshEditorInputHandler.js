// @ts-check

import { Matrix4, Ray, defined } from "@cesium/core";
import {
  KeyboardEventModifier,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
} from "@cesium/engine";

/** @import { Cartesian2 } from "@cesium/core"; */
/** @import { Controller, ControllerHost, Scene, ScreenSpaceCameraController } from "@cesium/engine"; */
/** @import { MeshEditor as WasmMeshEditor, PickHit, PointerModifiers, SceneInput } from "@cesium/mesh-editor"; */
/** @import Mesh from "./Mesh.js"; */
/** @import { OverlayPickObject } from "./OverlayRenderer.js"; */

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

const scratchRay = new Ray();

/**
 * Forwards pointer input on a scene's canvas to a mesh editor.
 *
 * @private
 */
class MeshEditorInputHandler {
  /** @type {Scene} */
  #scene;

  /**
   * Kept separately because the scene drops it before destroying its
   * primitives, including the editor.
   *
   * @type {ScreenSpaceCameraController}
   */
  #cameraController;

  /**
   * Its controllers are paused along with the camera controller.
   *
   * @type {ControllerHost}
   */
  #controllerHost;

  /** @type {WasmMeshEditor} */
  #wasmEditor;

  /** @type {ReadonlySet<Mesh>} */
  #meshes;

  /** @type {ScreenSpaceEventHandler} */
  #eventHandler;

  #isCameraPaused = false;

  /**
   * The camera controller's <code>enableInputs</code> before a drag paused
   * it, restored when the drag ends.
   */
  #cameraEnableInputs = true;

  /**
   * Each controller's <code>enabled</code> before a drag paused it, restored
   * when the drag ends.
   *
   * @type {Map<Controller, boolean>}
   */
  #controllersEnabled = new Map();

  /**
   * @param {object} options
   * @param {Scene} options.scene The scene whose canvas, camera and picking to use.
   * @param {WasmMeshEditor} options.wasmEditor The wasm editor that receives pointer input.
   * @param {ReadonlySet<Mesh>} options.meshes The editor's meshes. Read only.
   */
  constructor(options) {
    this.#scene = options.scene;
    this.#cameraController = options.scene.screenSpaceCameraController;
    this.#controllerHost = options.scene.controllerHost;
    this.#wasmEditor = options.wasmEditor;
    this.#meshes = options.meshes;

    const eventHandler = new ScreenSpaceEventHandler(options.scene.canvas);

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
    if (!defined(this.#wasmEditor.activeTool)) {
      return;
    }

    const isHandled = this.#wasmEditor.pointerDown({
      modifiers,
      ray: this.#getRay(event.position),
      scene: this.#createSceneInput(),
    });

    if (isHandled) {
      this.#pauseCamera();
    }
  }

  /**
   * Sends pointer movement to the active tool, with the pointer's ray.
   *
   * @param {PointerModifiers} modifiers The modifier keys held.
   * @param {ScreenSpaceEventHandler.MotionEvent} event The movement.
   * @ignore
   */
  #onMove(modifiers, event) {
    if (!defined(this.#wasmEditor.activeTool)) {
      return;
    }

    this.#wasmEditor.pointerMove({
      modifiers,
      ray: this.#getRay(event.endPosition),
    });
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
    if (defined(this.#wasmEditor.activeTool)) {
      this.#wasmEditor.pointerUp({
        modifiers,
        ray: this.#getRay(event.position),
      });
    }

    this.#resumeCamera();
  }

  /**
   * Picks under the pointer and sends the click to the active tool.
   *
   * @param {PointerModifiers} modifiers The modifier keys held.
   * @param {ScreenSpaceEventHandler.PositionedEvent} event The click.
   * @ignore
   */
  #onClick(modifiers, event) {
    if (!defined(this.#wasmEditor.activeTool)) {
      return;
    }

    this.#wasmEditor.pointerClick({
      modifiers,
      pick: this.#pick(event.position),
      ray: this.#getRay(event.position),
    });
  }

  /**
   * Picks a component of one of the editor's meshes.
   *
   * @param {Cartesian2} position The window position to pick at.
   * @returns {PickHit | null} The picked component, or <code>null</code> if no mesh in the editor is there.
   * @ignore
   */
  #pick(position) {
    /** @type {OverlayPickObject | undefined} */
    const picked = this.#scene.pick(position);
    const mesh = /** @type {Mesh | undefined} */ (picked?.primitive);
    if (!defined(picked) || !this.#meshes.has(mesh)) {
      return null;
    }

    return {
      mesh: mesh._key,
      componentType: picked.componentType,
      index: picked.index,
    };
  }

  /**
   * @param {Cartesian2} position The window position.
   * @returns {Ray | undefined} The world-space ray through the position, or <code>undefined</code> if there's none.
   * @ignore
   */
  #getRay(position) {
    return this.#scene.camera.getPickRay(position, scratchRay);
  }

  /**
   * Describes where the active meshes are in the world, for tools that work
   * in world space.
   *
   * @returns {SceneInput} The camera's direction and the active meshes' world matrices.
   * @ignore
   */
  #createSceneInput() {
    // TODO: Each isMeshActive call crosses into wasm, and each press copies
    // every active mesh's world matrix. If this gets slow with many meshes,
    // consider having wasm keep each mesh's world matrix instead.
    const wasmEditor = this.#wasmEditor;
    const activeMeshes = [...this.#meshes].filter((mesh) =>
      wasmEditor.isMeshActive(mesh._key),
    );

    const meshKeys = new BigUint64Array(activeMeshes.length);
    const matrices = new Float64Array(activeMeshes.length * 16);
    activeMeshes.forEach((mesh, i) => {
      meshKeys[i] = mesh._key;
      matrices.set(Matrix4.toArray(mesh.source.worldMatrix), i * 16);
    });

    return {
      viewDirection: this.#scene.camera.directionWC,
      meshKeys,
      matrices,
    };
  }

  /**
   * Stops the camera reacting to the pointer during a drag: disables the
   * camera controller's inputs and the scene's controllers.
   *
   * @ignore
   */
  #pauseCamera() {
    if (this.#isCameraPaused) {
      return;
    }

    this.#isCameraPaused = true;
    this.#cameraEnableInputs = this.#cameraController.enableInputs;
    this.#cameraController.enableInputs = false;
    for (const controller of this.#controllerHost.controllers) {
      this.#controllersEnabled.set(controller, controller.enabled);
      controller.enabled = false;
    }
  }

  /**
   * Lets the camera react to the pointer again, if a drag paused it.
   *
   * @ignore
   */
  #resumeCamera() {
    if (!this.#isCameraPaused) {
      return;
    }

    this.#isCameraPaused = false;
    this.#cameraController.enableInputs = this.#cameraEnableInputs;
    for (const [controller, enabled] of this.#controllersEnabled) {
      controller.enabled = enabled;
    }
    this.#controllersEnabled.clear();
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
