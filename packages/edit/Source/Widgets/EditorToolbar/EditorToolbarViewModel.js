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
 * @param {EditorToolbarOptions} [options] The tool entries.
 */
class EditorToolbarViewModel {
  /** @type {MeshEditor} */
  #editor;

  /** @type {EditorToolbarModeEntry[]} */
  #modeEntries = [
    { id: "none", label: "Object Mode", mode: EditMode.NONE },
    { id: "vertex", label: "Vertex", mode: EditMode.VERTEX },
    { id: "edge", label: "Edge", mode: EditMode.EDGE },
    { id: "face", label: "Face", mode: EditMode.FACE },
  ];

  /** @type {EditorToolbarModeEntry[]} */
  #componentEntries = this.#modeEntries.slice(1);

  /** @type {EditorToolbarToolEntry[]} */
  #toolEntries;

  /** @type {Command} */
  #selectModeEntry;

  /** @type {Command} */
  #toggleComponentEntry;

  /** @type {Command} */
  #enterEditMode;

  /** @type {Command} */
  #exitEditMode;

  /** @type {Command} */
  #toggleEditMode;

  /** @type {Command} */
  #selectToolEntry;

  /** @type {Command} */
  #toggleToolDropDown;

  #eventHelper = new EventHelper();

  #mode = knockout.observable(EditMode.NONE);

  /** The mode Edit Mode restores. */
  #lastComponentMode = EditMode.VERTEX;

  /**
   * @param {MeshEditor} editor The editor to control.
   * @param {EditorToolbarOptions} [options] The tool entries.
   */
  constructor(editor, options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("editor", editor);
    //>>includeEnd('debug');

    this.#editor = editor;
    this.#toolEntries = options?.tools ?? [];

    /**
     * The selected mode entry's identifier, or undefined if no entry matches.
     * Observable.
     * @type {string|undefined}
     */
    this.modeId = undefined;

    /**
     * Whether the editor is in a component mode, rather than
     * {@link EditMode.NONE}. Observable.
     * @type {boolean}
     */
    this.editing = false;

    /**
     * The selected tool entry's identifier, or undefined if no entry matches.
     * Observable.
     * @type {string|undefined}
     */
    this.toolId = undefined;

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

  /**
   * The Object Mode, Vertex, Edge and Face entries.
   * @type {EditorToolbarModeEntry[]}
   */
  get modeEntries() {
    return this.#modeEntries;
  }

  /**
   * The Vertex, Edge and Face entries, shown in Edit Mode.
   * @type {EditorToolbarModeEntry[]}
   */
  get componentEntries() {
    return this.#componentEntries;
  }

  /** @type {EditorToolbarToolEntry[]} */
  get toolEntries() {
    return this.#toolEntries;
  }

  /**
   * Selects a mode entry.
   * @type {Command}
   */
  get selectModeEntry() {
    return this.#selectModeEntry;
  }

  /**
   * Adds a component entry's mode to the editor's mode, or removes it unless
   * it's the only component left, so modes like
   * <code>EditMode.VERTEX | EditMode.EDGE</code> can be combined.
   * @type {Command}
   */
  get toggleComponentEntry() {
    return this.#toggleComponentEntry;
  }

  /**
   * Leaves {@link EditMode.NONE} for the last component mode, initially
   * {@link EditMode.VERTEX}. Does nothing if already editing.
   * @type {Command}
   */
  get enterEditMode() {
    return this.#enterEditMode;
  }

  /**
   * Switches to {@link EditMode.NONE}.
   * @type {Command}
   */
  get exitEditMode() {
    return this.#exitEditMode;
  }

  /**
   * Enters or exits Edit Mode.
   * @type {Command}
   */
  get toggleEditMode() {
    return this.#toggleEditMode;
  }

  /**
   * Selects a supported tool entry and closes its dropdown.
   * @type {Command}
   */
  get selectToolEntry() {
    return this.#selectToolEntry;
  }

  /** @type {Command} */
  get toggleToolDropDown() {
    return this.#toggleToolDropDown;
  }

  /**
   * Whether the editor's mode includes a component entry's mode.
   *
   * @param {EditorToolbarModeEntry} entry The component entry.
   * @returns {boolean} Whether the entry's components are being edited.
   */
  isComponentActive(entry) {
    return (this.#mode() & entry.mode) !== 0;
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
   * Creates observable properties and commands.
   * @ignore
   */
  #createCommands() {
    knockout.track(this, [
      "modeId",
      "editing",
      "toolId",
      "toolDropDownVisible",
    ]);

    this.#selectModeEntry = createCommand(
      /** @param {EditorToolbarModeEntry} entry */
      (entry) => {
        this.#editor.mode = entry.mode;
      },
    );

    this.#toggleComponentEntry = createCommand(
      /** @param {EditorToolbarModeEntry} entry */
      (entry) => {
        const mode = this.#editor.mode ^ entry.mode;
        if (mode !== EditMode.NONE) {
          this.#editor.mode = mode;
        }
      },
    );

    this.#enterEditMode = createCommand(() => {
      if (this.#editor.mode === EditMode.NONE) {
        this.#editor.mode = this.#lastComponentMode;
      }
    });

    this.#exitEditMode = createCommand(() => {
      this.#editor.mode = EditMode.NONE;
    });

    this.#toggleEditMode = createCommand(() => {
      this.#editor.mode =
        this.#editor.mode === EditMode.NONE
          ? this.#lastComponentMode
          : EditMode.NONE;
    });

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

    this.#toggleToolDropDown = createCommand(() => {
      this.toolDropDownVisible = !this.toolDropDownVisible;
    });
  }

  /**
   * Reads the editor's mode and tool into observable state.
   * @ignore
   */
  #updateSelectedEntriesFromEditor() {
    const { mode, activeTool } = this.#editor;
    if (mode !== EditMode.NONE) {
      this.#lastComponentMode = mode;
    }
    this.modeId = this.#modeEntries.find((entry) => entry.mode === mode)?.id;
    this.editing = mode !== EditMode.NONE;
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
