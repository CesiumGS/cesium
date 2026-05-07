import {
  defined,
  destroyObject,
  DeveloperError,
  getElement,
} from "@cesium/engine";
import EditMode from "../../Editor/EditMode";
import SelectTool from "../../Tools/SelectTool";
import TranslateTool from "../../Tools/TranslateTool";

/** @import MeshEditor from "../../Editor/MeshEditor"; */
/** @import Tool from "../../Tools/Tool"; */

/**
 * @typedef {object} EditorToolbarModeEntry
 * @property {string} text Label shown in the dropdown.
 * @property {EditMode} mode Mode applied when the entry is selected.
 */

/**
 * @typedef {object} EditorToolbarToolEntry
 * @property {string} text Label shown in the dropdown.
 * @property {Tool|undefined} tool Tool instance applied when selected, or undefined to clear the active tool.
 */

const defaultModeEntries = [
  { text: "Mode (none)", mode: EditMode.NONE },
  { text: "Vertex", mode: EditMode.VERTEX },
  { text: "Edge", mode: EditMode.EDGE },
  { text: "Face", mode: EditMode.FACE },
];

/**
 * A small toolbar widget that drives a {@link MeshEditor}'s {@link MeshEditor#mode}
 * and {@link MeshEditor#activeTool} via two dropdowns.
 *
 * The toolbar is the canonical UI for these properties; if external code mutates
 * the editor's mode or active tool, the dropdown selection will not reflect the change.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class EditorToolbar {
  /**
   * @param {Element|string} container The DOM element or element id that will host the toolbar.
   * @param {MeshEditor} editor The editor instance to drive.
   * @param {object} [options]
   * @param {EditorToolbarModeEntry[]} [options.modes] Mode dropdown entries.
   * @param {EditorToolbarToolEntry[]} [options.tools] Tool dropdown entries.
   */
  constructor(container, editor, options = {}) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(container)) {
      throw new DeveloperError("container is required.");
    }
    if (!defined(editor)) {
      throw new DeveloperError("editor is required.");
    }
    //>>includeEnd('debug');

    this._container = getElement(container);
    this._editor = editor;

    const toolbarElement = document.createElement("div");
    toolbarElement.className = "cesium-editor-toolbar";
    this._toolbarElement = toolbarElement;

    this._modeSelect = this.#buildSelect(
      options.modes ?? defaultModeEntries,
      (entry) => (editor.mode = entry.mode),
      (entry) => entry.mode === editor.mode,
    );

    toolbarElement.appendChild(this._modeSelect);

    // Tools are stateless until activated; construct each one once and reuse
    // the same instance every time the user re-selects it.
    const toolEntries = options.tools ?? [
      { text: "Tool (none)", tool: undefined },
      { text: "Select", tool: new SelectTool() },
      { text: "Translate", tool: new TranslateTool() },
    ];

    this._toolSelect = this.#buildSelect(
      toolEntries,
      (entry) => (editor.activeTool = entry.tool),
      (entry) => entry.tool === editor.activeTool,
    );
    toolbarElement.appendChild(this._toolSelect);

    this._container.appendChild(toolbarElement);
  }

  /** @type {Element} */
  get container() {
    return this._container;
  }

  /** @type {MeshEditor} */
  get editor() {
    return this._editor;
  }

  isDestroyed() {
    return false;
  }

  destroy() {
    this._container.removeChild(this._toolbarElement);
    return destroyObject(this);
  }

  #buildSelect(entries, onSelect, isInitial) {
    const select = document.createElement("select");
    select.className = "cesium-editor-toolbar-select";

    let initialIndex = 0;
    entries.forEach((entry, index) => {
      const option = document.createElement("option");
      option.textContent = entry.text;
      option.value = String(index);
      select.appendChild(option);
      if (isInitial(entry)) {
        initialIndex = index;
      }
    });

    select.selectedIndex = initialIndex;
    select.addEventListener("change", () => {
      onSelect(entries[select.selectedIndex]);
    });

    return select;
  }
}

export default EditorToolbar;
