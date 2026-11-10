// @ts-check

import { Check, DeveloperError, EventHelper } from "@cesium/core";
import { createCommand, knockout } from "@cesium/widgets";
import EditMode from "../../Editor/EditMode.js";

/** @import { Command } from "@cesium/widgets"; */
/** @import MeshEditor from "../../Editor/MeshEditor.js"; */
/** @import MeshEditorTool from "../../Editor/MeshEditorTool.js"; */

/**
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 * @typedef {object} EditorToolbarModeEntry
 * @property {string} id The entry's identifier.
 * @property {string} label The tooltip text.
 * @property {EditMode} mode The mode to select.
 * @property {string} [iconPath] The SVG icon path.
 * @property {number} [iconWidth=64] The SVG view box width.
 * @property {number} [iconHeight=64] The SVG view box height.
 */

/**
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 * @typedef {object} EditorToolbarToolEntry
 * @property {string} id The entry's identifier.
 * @property {string} label The tooltip text.
 * @property {MeshEditorTool} tool The tool to select.
 * @property {string} [iconPath] The SVG icon path.
 * @property {number} [iconWidth=64] The SVG view box width.
 * @property {number} [iconHeight=64] The SVG view box height.
 */

/**
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 * @typedef {object} EditorToolbarOptions
 * @property {EditorToolbarModeEntry[]} [modes] Entries replacing the default modes.
 * @property {EditorToolbarToolEntry[]} [tools] The tool entries. The toolbar doesn't add tools to the editor, so by default it offers none.
 */

/**
 * The modes, tools, and commands displayed by an {@link EditorToolbar}.
 *
 * @alias EditorToolbarViewModel
 * @constructor
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {MeshEditor} editor The editor to control.
 * @param {EditorToolbarOptions} [options] The dropdown entries.
 */
class EditorToolbarViewModel {
  /** @type {MeshEditor} */
  #editor;

  /** @type {EditorToolbarModeEntry[]} */
  #modeEntries;

  /** @type {EditorToolbarToolEntry[]} */
  #toolEntries;

  /** @type {Command} */
  #selectModeEntry;

  /** @type {Command} */
  #selectToolEntry;

  /** @type {Command} */
  #toggleModeDropDown;

  /** @type {Command} */
  #toggleToolDropDown;

  #eventHelper = new EventHelper();

  #mode = knockout.observable(EditMode.NONE);

  /**
   * @param {MeshEditor} editor The editor to control.
   * @param {EditorToolbarOptions} [options] The dropdown entries.
   */
  constructor(editor, options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("editor", editor);
    //>>includeEnd('debug');

    this.#editor = editor;
    this.#modeEntries = options?.modes ?? this.#createModeEntries();
    this.#toolEntries = options?.tools ?? [];

    /**
     * The selected mode entry's identifier, or undefined if no entry matches.
     * Observable.
     * @type {string|undefined}
     */
    this.modeId = undefined;

    /**
     * The selected tool entry's identifier, or undefined if no entry matches.
     * Observable.
     * @type {string|undefined}
     */
    this.toolId = undefined;

    /**
     * Whether the mode dropdown is open. Observable.
     * @type {boolean}
     */
    this.modeDropDownVisible = false;

    /**
     * Whether the tool dropdown is open. Observable.
     * @type {boolean}
     */
    this.toolDropDownVisible = false;

    this.#createCommands();
    this.#updateSelectedEntriesFromEditor();
    this.#listenForEditorChanges();
  }

  /** @type {MeshEditor} */
  get editor() {
    return this.#editor;
  }

  /** @type {EditorToolbarModeEntry[]} */
  get modeEntries() {
    return this.#modeEntries;
  }

  /** @type {EditorToolbarToolEntry[]} */
  get toolEntries() {
    return this.#toolEntries;
  }

  /**
   * Selects a mode entry and closes its dropdown.
   * @type {Command}
   */
  get selectModeEntry() {
    return this.#selectModeEntry;
  }

  /**
   * Selects a supported tool entry and closes its dropdown.
   * @type {Command}
   */
  get selectToolEntry() {
    return this.#selectToolEntry;
  }

  /** @type {Command} */
  get toggleModeDropDown() {
    return this.#toggleModeDropDown;
  }

  /** @type {Command} */
  get toggleToolDropDown() {
    return this.#toggleToolDropDown;
  }

  /**
   * Whether a tool entry can be selected in the editor's current mode.
   *
   * @param {EditorToolbarToolEntry} entry The tool entry.
   * @returns {boolean} Whether the entry is enabled.
   */
  isToolEnabled(entry) {
    return entry.tool.supportsMode(this.#mode());
  }

  /**
   * Creates the default mode entries.
   * @returns {EditorToolbarModeEntry[]} The mode entries.
   * @ignore
   */
  #createModeEntries() {
    return [
      { id: "none", label: "Object Mode", mode: EditMode.NONE },
      { id: "vertex", label: "Vertex", mode: EditMode.VERTEX },
      { id: "edge", label: "Edge", mode: EditMode.EDGE },
      { id: "face", label: "Face", mode: EditMode.FACE },
    ];
  }

  /**
   * Creates observable properties and dropdown/selection commands.
   * @ignore
   */
  #createCommands() {
    knockout.track(this, [
      "modeId",
      "toolId",
      "modeDropDownVisible",
      "toolDropDownVisible",
    ]);

    this.#selectModeEntry = createCommand(
      /** @param {EditorToolbarModeEntry} entry */
      (entry) => {
        this.#editor.mode = entry.mode;
        this.modeDropDownVisible = false;
      },
    );

    this.#selectToolEntry = createCommand(
      /** @param {EditorToolbarToolEntry} entry */
      (entry) => {
        if (!this.isToolEnabled(entry)) {
          throw new DeveloperError(
            "The tool doesn't support the current mode.",
          );
        }

        this.#editor.activeTool = entry.tool;
        this.toolDropDownVisible = false;
      },
    );

    this.#toggleModeDropDown = createCommand(() => {
      this.modeDropDownVisible = !this.modeDropDownVisible;
      if (this.modeDropDownVisible) {
        this.toolDropDownVisible = false;
      }
    });

    this.#toggleToolDropDown = createCommand(() => {
      this.toolDropDownVisible = !this.toolDropDownVisible;
      if (this.toolDropDownVisible) {
        this.modeDropDownVisible = false;
      }
    });
  }

  /**
   * Reads the editor's mode and tool into observable state.
   * @ignore
   */
  #updateSelectedEntriesFromEditor() {
    const { mode, activeTool } = this.#editor;
    this.modeId = this.#modeEntries.find((entry) => entry.mode === mode)?.id;
    this.toolId = this.#toolEntries.find(
      (entry) => entry.tool === activeTool,
    )?.id;
    if (this.toolId === undefined) {
      this.toolDropDownVisible = false;
    }
    this.#mode(mode);
  }

  /**
   * Subscribes to modeChanged and activeToolChanged.
   * @ignore
   */
  #listenForEditorChanges() {
    this.#eventHelper.add(this.#editor.modeChanged, () => {
      this.#updateSelectedEntriesFromEditor();
    });
    this.#eventHelper.add(this.#editor.activeToolChanged, () => {
      this.#updateSelectedEntriesFromEditor();
    });
  }

  /**
   * Removes subscriptions to the editor.
   */
  destroy() {
    this.#eventHelper.removeAll();
  }
}

export default EditorToolbarViewModel;
