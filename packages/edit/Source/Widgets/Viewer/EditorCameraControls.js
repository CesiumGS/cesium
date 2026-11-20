// @ts-check

import { BoundingSphere, Cartesian3, Ray, defined } from "@cesium/core";
import {
  HybridScreenSpacePanCameraController,
  KeyboardEventModifier,
  MouseButton,
  ScreenSpaceTiltOrbitCameraController,
  ScreenSpaceZoomCameraController,
} from "@cesium/engine";

/** @import { Cartesian2 } from "@cesium/core"; */
/** @import { Controller, Scene } from "@cesium/engine"; */
/** @import { Viewer } from "@cesium/widgets"; */
/** @import MeshEditor from "../../Editor/MeshEditor.js"; */

/**
 * The closest the camera gets to the point it zooms toward, and the nearest
 * depth it pans at, in meters.
 *
 * @ignore
 */
const MINIMUM_DISTANCE = 1.0;

/**
 * How far in front of the camera the pivot is before any mesh has bounds, in
 * meters.
 *
 * @ignore
 */
const DEFAULT_PIVOT_DISTANCE = 10.0;

/** @ignore */
const ORBIT_DRAG_INPUTS = Object.freeze([
  Object.freeze({ button: MouseButton.MIDDLE }),
]);

/** @ignore */
const PAN_DRAG_INPUTS = Object.freeze([
  Object.freeze({
    button: MouseButton.MIDDLE,
    modifier: KeyboardEventModifier.SHIFT,
  }),
]);

/**
 * The mouse buttons that drag the camera, whatever the modifiers.
 *
 * @type {ReadonlyArray<MouseButton>}
 * @ignore
 */
const DRAG_BUTTONS = Object.freeze([
  ...new Set(
    [...ORBIT_DRAG_INPUTS, ...PAN_DRAG_INPUTS].map((input) => input.button),
  ),
]);

const scratchRay = new Ray();
const scratchPivot = new Cartesian3();
const scratchOffset = new Cartesian3();
const scratchMeshSphere = new BoundingSphere();
const scratchSphere = new BoundingSphere();

/**
 * @callback PickWorldPosition
 * @param {Scene} scene
 * @param {Cartesian2} windowPosition
 * @param {Cartesian3} result
 * @returns {Cartesian3|undefined}
 * @ignore
 */

/**
 * Camera controls for editing: middle-drag orbits around the
 * meshes being edited, Shift+middle-drag pans, and the wheel zooms toward the
 * pointer. They stay off the left button, which the editor's tools use, and
 * replace the scene's camera controller inputs until destroyed.
 *
 * @private
 */
class EditorCameraControls {
  /**
   * The mouse buttons that drag the camera, whatever the modifiers, as
   * {@link MouseButton} values, which match <code>MouseEvent.button</code>.
   *
   * @type {ReadonlyArray<MouseButton>}
   */
  static get dragButtons() {
    return DRAG_BUTTONS;
  }

  /** @type {Viewer} */
  #viewer;

  /** @type {MeshEditor} */
  #editor;

  /** @type {Controller[]} */
  #controllers;

  /** @type {Function} */
  #removeWheelListener;

  /**
   * The camera controller's settings before these controls replaced it,
   * restored when they're destroyed.
   */
  #cameraEnableInputs;
  #cameraEnableCollisionDetection;

  /**
   * The point the current wheel zoom heads toward, picked once per wheel event
   * rather than every frame of the zoom animation: picking the meshes reads
   * back the depth buffer, which stalls the GPU, and zooming toward a fixed
   * point keeps it under the pointer anyway.
   *
   * @type {Cartesian3|undefined}
   */
  #zoomTarget;

  /**
   * The most recent pivot computed from the meshes' bounds, kept for when no
   * mesh has bounds.
   *
   * @type {Cartesian3|undefined}
   */
  #lastPivot;

  /**
   * @param {Viewer} viewer The viewer whose camera to control.
   * @param {MeshEditor} editor The editor whose meshes to orbit around.
   */
  constructor(viewer, editor) {
    this.#viewer = viewer;
    this.#editor = editor;

    const cameraController = viewer.scene.screenSpaceCameraController;
    this.#cameraEnableInputs = cameraController.enableInputs;
    this.#cameraEnableCollisionDetection =
      cameraController.enableCollisionDetection;
    cameraController.enableInputs = false;
    cameraController.enableCollisionDetection = false;

    const canvas = viewer.scene.canvas;
    const onWheel = () => {
      this.#zoomTarget = undefined;
    };

    canvas.addEventListener("wheel", onWheel, { passive: true });
    this.#removeWheelListener = () =>
      canvas.removeEventListener("wheel", onWheel);

    this.#controllers = [
      this.#createOrbitController(),
      this.#createPanController(),
      this.#createZoomController(),
    ];

    for (const controller of this.#controllers) {
      viewer.addController(controller);
    }
  }

  /**
   * Middle-drag orbits around the pivot, picked once per drag, when it starts.
   *
   * @returns {ScreenSpaceTiltOrbitCameraController}
   * @ignore
   */
  #createOrbitController() {
    const controller = new ScreenSpaceTiltOrbitCameraController({
      dragInputs: [...ORBIT_DRAG_INPUTS],
    });
    controller.pickWorldPosition = (scene, windowPosition, result) =>
      this.#getPivot(result);

    // Damping overshoots and keeps spinning after release. Without it, the
    // camera follows the pointer exactly.
    controller.dampingEnabled = false;
    // Turns per canvas width. Negative so dragging right turns the meshes right instead of the default left.
    controller.orbitMagnitude = -1.0;
    // Half turns per canvas height.
    controller.tiltMagnitude = 2.0;
    return controller;
  }

  /**
   * Shift+middle-drag pans, picking every frame at the pointer: the pivot's
   * depth keeps the speed steady as the pointer crosses nearer and farther
   * surfaces, or misses the meshes.
   *
   * @returns {HybridScreenSpacePanCameraController}
   * @ignore
   */
  #createPanController() {
    const controller = new HybridScreenSpacePanCameraController();

    for (const panController of [
      controller.mapController,
      controller.elevatorController,
    ]) {
      // Read when the controller is added, so set before then.
      panController.dragInputs = [...PAN_DRAG_INPUTS];
      panController.pickWorldPosition = this.#pickAtPivotDepth.bind(this);
    }

    return controller;
  }

  /**
   * The wheel zooms toward the point under the pointer, or the pivot's depth
   * if nothing's there.
   *
   * @returns {ScreenSpaceZoomCameraController}
   * @ignore
   */
  #createZoomController() {
    const controller = new ScreenSpaceZoomCameraController({
      dragInputs: [],
    });

    controller.usePointerPosition = true;

    controller.pickWorldPosition = (scene, windowPosition, result) => {
      this.#zoomTarget ??=
        scene.pickPosition(windowPosition, new Cartesian3()) ??
        this.#pickAtPivotDepth(scene, windowPosition, new Cartesian3());
      return Cartesian3.clone(this.#zoomTarget, result);
    };

    // Without a minimum, each step shrinks with the distance to the target, so
    // zooming stalls at the surface instead of passing through it.
    controller.minimumZoomDistance = MINIMUM_DISTANCE;
    return controller;
  }

  /**
   * The center of the active meshes, or of all meshes if none are active.
   * Uses the meshes' bounds, which reflect any edits made to them. If no mesh
   * has bounds, it's the last such center, or before there's been one, a point
   * in front of the camera.
   *
   * @param {Cartesian3} result The object to store the pivot in.
   * @returns {Cartesian3} The pivot.
   * @ignore
   */
  #getPivot(result) {
    const editor = this.#editor;
    const meshes = editor.meshes;
    const activeMeshes = meshes.filter((mesh) => editor.isMeshActive(mesh));

    // Merges the meshes' spheres one at a time: fromBoundingSpheres ignores
    // their radii when placing the center of three or more.
    let bounds;
    for (const mesh of activeMeshes.length > 0 ? activeMeshes : meshes) {
      const box = mesh.orientedBoundingBox;
      // Undefined until a mesh is first drawn, or if it has no vertices.
      if (!defined(box)) {
        continue;
      }
      const sphere = BoundingSphere.fromOrientedBoundingBox(
        box,
        scratchMeshSphere,
      );
      bounds = defined(bounds)
        ? BoundingSphere.union(bounds, sphere, scratchSphere)
        : BoundingSphere.clone(sphere, scratchSphere);
    }

    if (defined(bounds)) {
      this.#lastPivot = Cartesian3.clone(bounds.center, this.#lastPivot);
      return Cartesian3.clone(bounds.center, result);
    }

    if (defined(this.#lastPivot)) {
      return Cartesian3.clone(this.#lastPivot, result);
    }

    const camera = this.#viewer.scene.camera;
    const offset = Cartesian3.multiplyByScalar(
      camera.directionWC,
      DEFAULT_PIVOT_DISTANCE,
      scratchOffset,
    );
    return Cartesian3.add(camera.positionWC, offset, result);
  }

  /**
   * The point under the pointer at the pivot's depth. The controllers scale
   * their movement by the distance to the point they pick, and their default
   * pick falls back to the ellipsoid, often far away or behind the camera, so
   * missing the meshes would make them jump.
   *
   * @type {PickWorldPosition}
   * @ignore
   */
  #pickAtPivotDepth(scene, windowPosition, result) {
    const ray = scene.camera.getPickRay(windowPosition, scratchRay);
    if (!defined(ray)) {
      return undefined;
    }

    const pivot = this.#getPivot(scratchPivot);
    const toPivot = Cartesian3.subtract(pivot, ray.origin, scratchOffset);
    const depth = Math.max(
      Cartesian3.dot(toPivot, ray.direction),
      MINIMUM_DISTANCE,
    );

    return Ray.getPoint(ray, depth, result);
  }

  /**
   * Removes the controls and restores the camera controller's inputs.
   */
  destroy() {
    const viewer = this.#viewer;
    for (const controller of this.#controllers) {
      viewer.removeController(controller);
    }
    this.#removeWheelListener();

    const cameraController = viewer.scene.screenSpaceCameraController;
    cameraController.enableInputs = this.#cameraEnableInputs;
    cameraController.enableCollisionDetection =
      this.#cameraEnableCollisionDetection;
  }
}

export default EditorCameraControls;
