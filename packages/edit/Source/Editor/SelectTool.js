// @ts-check

import { Check } from "@cesium/core";
import { SelectTool as WasmSelectTool } from "@cesium/mesh-editor";
import MeshEditorTool from "./MeshEditorTool.js";

/** @import MeshEditor from "./MeshEditor.js"; */

/**
 * <div class="notice">
 * Use {@link SelectTool.addTo} to create a tool. Do not call the constructor
 * directly.
 * </div>
 *
 * Selects vertices, edges and faces.
 *
 * @alias SelectTool
 * @internalConstructor
 * @extends MeshEditorTool
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class SelectTool extends MeshEditorTool {
  /**
   * Adds a new select tool to an editor. Each call adds a separate tool.
   *
   * @param {MeshEditor} editor The editor to add the tool to.
   * @returns {SelectTool} The new tool.
   *
   * @example
   * editor.activeTool = Cesium.SelectTool.addTo(editor);
   */
  static addTo(editor) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("editor", editor);
    //>>includeEnd('debug');

    return editor._addTool(SelectTool, WasmSelectTool.addTo);
  }
}

export default SelectTool;
