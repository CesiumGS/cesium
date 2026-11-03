// @ts-check

import { Check } from "@cesium/core";
import { TranslateTool as WasmTranslateTool } from "@cesium/mesh-editor";
import MeshEditorTool from "./MeshEditorTool.js";

/** @import MeshEditor from "./MeshEditor.js"; */

/**
 * <div class="notice">
 * Use {@link TranslateTool.addTo} to create a tool. Do not call the
 * constructor directly.
 * </div>
 *
 * Moves the selection.
 *
 * @alias TranslateTool
 * @internalConstructor
 * @extends MeshEditorTool
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class TranslateTool extends MeshEditorTool {
  /**
   * Adds a new translate tool to an editor. Each call adds a separate tool.
   *
   * @param {MeshEditor} editor The editor to add the tool to.
   * @returns {TranslateTool} The new tool.
   *
   * @example
   * editor.activeTool = Cesium.TranslateTool.addTo(editor);
   */
  static addTo(editor) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("editor", editor);
    //>>includeEnd('debug');

    return editor._addTool(TranslateTool, WasmTranslateTool.addTo);
  }
}

export default TranslateTool;
