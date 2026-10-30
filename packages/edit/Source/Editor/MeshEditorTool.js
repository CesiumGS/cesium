// @ts-check

import { DeveloperError } from "@cesium/core";

/**
 * <div class="notice">
 * Use a tool from {@link MeshEditor#tools}. Do not call the constructor
 * directly.
 * </div>
 *
 * A tool in a {@link MeshEditor}.
 *
 * @alias MeshEditorTool
 * @internalConstructor
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @example
 * editor.mode = Cesium.EditMode.VERTEX;
 * editor.activeTool = editor.tools.translate;
 * // Later, for example when the user presses Escape:
 * editor.tools.translate.cancel();
 */
class MeshEditorTool {
  /**
   * @param {object} options
   * @param {*} options.wasmEditor The wasm editor the tool is registered in.
   * @param {number} options.id The tool's ID in the wasm editor.
   */
  constructor(options) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * Finishes the tool's current interaction and keeps its changes. Does
   * nothing if the tool isn't active.
   */
  confirm() {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * Undoes the tool's current interaction. Does nothing if the tool isn't
   * active.
   */
  cancel() {
    throw new DeveloperError("Not implemented.");
  }
}

export default MeshEditorTool;
