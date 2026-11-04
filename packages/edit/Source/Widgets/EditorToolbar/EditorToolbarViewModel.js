// @ts-check

/** @import { Command } from "@cesium/widgets"; */
/** @import EditMode from "../../Editor/EditMode.js"; */
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
 * @property {MeshEditorTool|undefined} tool The tool to select, or undefined to clear it.
 * @property {string} [iconPath] The SVG icon path.
 * @property {number} [iconWidth=64] The SVG view box width.
 * @property {number} [iconHeight=64] The SVG view box height.
 */

/**
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 * @typedef {object} EditorToolbarOptions
 * @property {EditorToolbarModeEntry[]} [modes] Entries replacing the default modes.
 * @property {EditorToolbarToolEntry[]} [tools] Entries replacing the default tools.
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

  /**
   * @param {MeshEditor} editor The editor to control.
   * @param {EditorToolbarOptions} [options] The dropdown entries.
   */
  constructor(editor, options) {
    this.#editor = editor;
    this.#modeEntries = options?.modes ?? this.#createModeEntries();
    this.#toolEntries = options?.tools ?? this.#createToolEntries();

    /**
     * The selected mode entry's identifier. Observable.
     * @type {string}
     */
    this.modeId = "";

    /**
     * The selected tool entry's identifier. Observable.
     * @type {string}
     */
    this.toolId = "";

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
    throw new Error("EditorToolbarViewModel.isToolEnabled is not implemented.");
  }

  /**
   * Creates the default mode entries.
   * @returns {EditorToolbarModeEntry[]} The mode entries.
   * @ignore
   */
  #createModeEntries() {
    throw new Error("EditorToolbarViewModel mode entries are not implemented.");
  }

  /**
   * Registers the default tools and creates their entries.
   * @returns {EditorToolbarToolEntry[]} The tool entries.
   * @ignore
   */
  #createToolEntries() {
    throw new Error("EditorToolbarViewModel tool entries are not implemented.");
  }

  /**
   * Creates observable properties and dropdown/selection commands.
   * @ignore
   */
  #createCommands() {}

  /**
   * Reads the editor's mode and tool into observable state.
   * @ignore
   */
  #updateSelectedEntriesFromEditor() {}

  /**
   * Subscribes to modeChanged and activeToolChanged.
   * @ignore
   */
  #listenForEditorChanges() {}

  /**
   * Removes subscriptions to the editor.
   */
  destroy() {}
}

export default EditorToolbarViewModel;
