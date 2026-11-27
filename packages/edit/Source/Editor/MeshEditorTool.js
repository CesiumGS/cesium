// @ts-check

import { Check } from "@cesium/core";

/** @import { MeshEditor as WasmMeshEditor } from "@cesium/mesh-editor"; */
/** @import EditMode from "./EditMode.js"; */

/**
 * <div class="notice">
 * Use a tool type's <code>addTo</code>, such as {@link TranslateTool.addTo},
 * to create a tool. Do not call the constructor directly.
 * </div>
 *
 * A tool in a {@link MeshEditor}. The base class of every tool type, such as
 * {@link SelectTool} and {@link TranslateTool}.
 *
 * @alias MeshEditorTool
 * @internalConstructor
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @example
 * const translateTool = Cesium.TranslateTool.addTo(editor);
 * editor.mode = Cesium.EditMode.VERTEX;
 * editor.activeTool = translateTool;
 * // Later, for example when the user presses Escape:
 * translateTool.cancel();
 */
class MeshEditorTool {
  /** @type {WasmMeshEditor} */
  #wasmEditor;

  /**
   * @param {object} options
   * @param {*} options.wasmEditor The wasm editor the tool is registered in.
   * @param {number} options.id The tool's ID in the wasm editor.
   */
  constructor(options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("options", options);
    Check.defined("options.wasmEditor", options.wasmEditor);
    Check.typeOf.number("options.id", options.id);
    //>>includeEnd('debug');

    this.#wasmEditor = options.wasmEditor;

    /**
     * The tool's ID in its editor's wasm.
     *
     * @type {number}
     * @ignore
     */
    this._id = options.id;
  }

  /**
   * Whether the tool can be activated in the given mode.
   *
   * @param {EditMode} mode The mode to check.
   * @returns {boolean} Whether the tool supports the mode.
   *
   * @exception {Error} The mode contains unknown components.
   */
  supportsMode(mode) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("mode", mode);
    //>>includeEnd('debug');

    return this.#wasmEditor.toolSupportsMode(this._id, mode);
  }

  /**
   * Finishes the tool's current interaction and keeps its changes. Does
   * nothing if the tool isn't active.
   */
  confirm() {
    if (this.#isActive()) {
      this.#wasmEditor.confirm();
    }
  }

  /**
   * Undoes the tool's current interaction. Does nothing if the tool isn't
   * active.
   */
  cancel() {
    if (this.#isActive()) {
      this.#wasmEditor.cancel();
    }
  }

  /**
   * Wasm confirms and cancels the active tool's interaction, whichever tool
   * that is.
   *
   * @returns {boolean} <code>true</code> if this is its editor's active tool.
   * @ignore
   */
  #isActive() {
    return this.#wasmEditor.activeTool === this._id;
  }
}

export default MeshEditorTool;
