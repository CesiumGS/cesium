// @ts-check

import EditMode from "../../Editor/EditMode.js";
import EditorCameraControls from "./EditorCameraControls.js";

/** @import { Viewer } from "@cesium/widgets"; */
/** @import MeshEditor from "../../Editor/MeshEditor.js"; */
/** @import MeshEditorTool from "../../Editor/MeshEditorTool.js"; */

/** @ignore */
const MODE_ATTRIBUTE = "data-cesium-edit-mode";
/** @ignore */
const TOOL_ATTRIBUTE = "data-cesium-edit-tool";
/** @ignore */
const NAVIGATING_ATTRIBUTE = "data-cesium-edit-navigating";

/**
 * Reflects the editor's state onto the canvas as data attributes, so
 * stylesheets can choose the cursor:
 * <ul>
 * <li><code>data-cesium-edit-mode</code>: the space-separated components being
 * edited, e.g. <code>"vertex edge"</code>, or <code>"none"</code>. Match one with
 * <code>~=</code>.</li>
 * <li><code>data-cesium-edit-tool</code>: the active tool's name, if it's one of
 * the given tools.</li>
 * <li><code>data-cesium-edit-navigating</code>: present while a button that
 * drags the camera, per {@link EditorCameraControls.dragButtons}, is held.</li>
 * </ul>
 *
 * @private
 */
class EditorCursor {
  /** @type {HTMLCanvasElement} */
  #canvas;

  /** @type {Function[]} */
  #removeListeners;

  /**
   * @param {Viewer} viewer The viewer whose canvas to annotate.
   * @param {MeshEditor} editor The editor whose mode and tool to reflect.
   * @param {Object<string, MeshEditorTool>} tools The tools to name, by name.
   */
  constructor(viewer, editor, tools) {
    const canvas = viewer.scene.canvas;
    this.#canvas = canvas;

    const updateMode = () =>
      canvas.setAttribute(MODE_ATTRIBUTE, getModeNames(editor.mode));

    const updateTool = () => {
      const tool = editor.activeTool;
      const name = Object.keys(tools).find((key) => tools[key] === tool);
      if (name === undefined) {
        canvas.removeAttribute(TOOL_ATTRIBUTE);
      } else {
        canvas.setAttribute(TOOL_ATTRIBUTE, name);
      }
    };

    const dragButtons = EditorCameraControls.dragButtons;

    /** @param {PointerEvent} event */
    const onPointerDown = (event) => {
      if (dragButtons.includes(event.button)) {
        canvas.setAttribute(NAVIGATING_ATTRIBUTE, "");
      }
    };

    /** @param {PointerEvent} event */
    const onPointerUp = (event) => {
      if (
        dragButtons.includes(event.button) ||
        event.type === "pointercancel"
      ) {
        canvas.removeAttribute(NAVIGATING_ATTRIBUTE);
      }
    };

    // The drag can end outside the canvas.
    const ownerDocument = canvas.ownerDocument;
    canvas.addEventListener("pointerdown", onPointerDown);
    ownerDocument.addEventListener("pointerup", onPointerUp);
    ownerDocument.addEventListener("pointercancel", onPointerUp);

    this.#removeListeners = [
      editor.modeChanged.addEventListener(updateMode),
      editor.activeToolChanged.addEventListener(updateTool),
      () => canvas.removeEventListener("pointerdown", onPointerDown),
      () => ownerDocument.removeEventListener("pointerup", onPointerUp),
      () => ownerDocument.removeEventListener("pointercancel", onPointerUp),
    ];

    updateMode();
    updateTool();
  }

  /**
   * Removes the listeners and the canvas's attributes.
   */
  destroy() {
    for (const removeListener of this.#removeListeners) {
      removeListener();
    }
    this.#canvas.removeAttribute(MODE_ATTRIBUTE);
    this.#canvas.removeAttribute(TOOL_ATTRIBUTE);
    this.#canvas.removeAttribute(NAVIGATING_ATTRIBUTE);
  }
}

/**
 * @param {number} mode An {@link EditMode} combination.
 * @returns {string} The lowercase names of its components, space-separated, or "none".
 * @ignore
 */
function getModeNames(mode) {
  const names = [];
  for (const [name, value] of Object.entries(EditMode)) {
    if (value !== EditMode.NONE && (mode & value) === value) {
      names.push(name.toLowerCase());
    }
  }
  return names.length > 0 ? names.join(" ") : "none";
}

export default EditorCursor;
