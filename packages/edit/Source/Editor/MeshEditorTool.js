// @ts-check

import { Check } from "@cesium/core";

/** @import { MeshEditor as WasmMeshEditor } from "@cesium/mesh-editor"; */
/** @import EditMode from "./EditMode.js"; */
/** @import { MeshPickHit, PointerModifiers } from "./MeshEditorInputHandler.js"; */

/**
 * @type {ResolvePicksCallback}
 * @ignore
 */
const returnPicksUnchanged = (picks) => picks;

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

    /**
     * Called when the user clicks while this is the editor's active tool,
     * before the tool handles the click. Receives what the click picked, and
     * returns what the tool should handle as picked. Use it to change what a
     * click picks, e.g. to expand a pick to a group of components. By
     * default, returns the picks unchanged.
     * <p>
     * Must be synchronous, and must not change the editor or its meshes.
     * </p>
     *
     * @type {ResolvePicksCallback}
     *
     * @example
     * // Pick every vertex with the same _GROUP_ID as the clicked vertex.
     * selectTool.resolvePicks = function (picks) {
     *   return picks.map(({ mesh, componentKeys }) => {
     *     const vertexKey = componentKeys.verts?.[0];
     *     const groupId = Cesium.defined(vertexKey)
     *       ? mesh.getVertexAttributeValue(vertexKey, "_GROUP_ID")
     *       : undefined;
     *
     *     if (!Cesium.defined(groupId)) {
     *       return { mesh, componentKeys };
     *     }
     *
     *     const verts = mesh.queryVerticesByAttribute(
     *       "_GROUP_ID",
     *       Cesium.ComparisonOperator.EQUAL,
     *       groupId,
     *     );
     *
     *     return { mesh, componentKeys: { verts } };
     *   });
     * };
     */
    this.resolvePicks = returnPicksUnchanged;
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

/**
 * Changes what a click picks. See {@link MeshEditorTool#resolvePicks}.
 *
 * @callback ResolvePicksCallback
 * @param {MeshPickHit[]} picks What the click picked, at most one per mesh. Empty if the click missed.
 * @param {PointerModifiers} modifiers The modifier keys held.
 * @returns {MeshPickHit[]|undefined} What the tool should handle as picked, at most one per mesh. An empty array is a miss. <code>undefined</code> ignores the click.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */

export default MeshEditorTool;
