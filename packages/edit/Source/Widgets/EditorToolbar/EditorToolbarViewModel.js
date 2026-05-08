import {
  defined,
  destroyObject,
  DeveloperError,
  EventHelper,
} from "@cesium/engine";
import { knockout, createCommand } from "@cesium/widgets";
import EditMode from "../../Editor/EditMode";
import SelectTool from "../../Tools/SelectTool";
import TranslateTool from "../../Tools/TranslateTool";

/** @import MeshEditor from "../../Editor/MeshEditor"; */
/** @import Tool from "../../Tools/Tool"; */

/**
 * @typedef {object} EditorToolbarModeEntry
 * @property {string} id Stable identifier used by the view-model and the view.
 * @property {string} label Human-readable label, shown as a tooltip.
 * @property {EditMode} mode Mode applied when the entry is selected.
 */

/**
 * @typedef {object} EditorToolbarToolEntry
 * @property {string} id Stable identifier used by the view-model and the view.
 * @property {string} label Human-readable label, shown as a tooltip.
 * @property {Tool|undefined} tool Tool instance applied when selected, or undefined to clear the active tool.
 */

const defaultModeEntries = () => [
  { id: "none", label: "Object Mode", mode: EditMode.NONE },
  { id: "vertex", label: "Vertex", mode: EditMode.VERTEX },
  { id: "edge", label: "Edge", mode: EditMode.EDGE },
  { id: "face", label: "Face", mode: EditMode.FACE },
];

const defaultToolEntries = () => [
  { id: "none", label: "Tools", tool: undefined },
  { id: "select", label: "Select", tool: new SelectTool() },
  { id: "translate", label: "Translate", tool: new TranslateTool() },
];

/**
 * The view-model for {@link EditorToolbar}. Exposes observable state for the
 * current edit mode and active tool, plus commands to change them. Mirrors the
 * pattern of {@link SceneModePickerViewModel}.
 *
 * @constructor
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {MeshEditor} editor
 * @param {object} [options]
 * @param {EditorToolbarModeEntry[]} [options.modes] Mode dropdown entries.
 * @param {EditorToolbarToolEntry[]} [options.tools] Tool dropdown entries.
 */
function EditorToolbarViewModel(editor, options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(editor)) {
    throw new DeveloperError("editor is required.");
  }
  //>>includeEnd('debug');

  options = options ?? {};

  this._editor = editor;
  this._modeEntries = options.modes ?? defaultModeEntries();
  this._toolEntries = options.tools ?? defaultToolEntries();

  const that = this;

  /**
   * The id of the currently selected mode entry. Observable.
   * @type {string}
   */
  this.modeId = idForMode(this._modeEntries, editor.mode);
  /**
   * The id of the currently selected tool entry. Observable.
   * @type {string}
   */
  this.toolId = idForTool(this._toolEntries, editor.activeTool);
  /**
   * Whether the mode dropdown is expanded. Observable.
   * @type {boolean}
   */
  this.modeDropDownVisible = false;
  /**
   * Whether the tool dropdown is expanded. Observable.
   * @type {boolean}
   */
  this.toolDropDownVisible = false;

  knockout.track(this, [
    "modeId",
    "toolId",
    "modeDropDownVisible",
    "toolDropDownVisible",
  ]);

  // Sync editor -> view model.
  this._eventHelper = new EventHelper();
  this._eventHelper.add(editor.modeChanged, (newMode) => {
    that.modeId = idForMode(that._modeEntries, newMode);
  });
  this._eventHelper.add(editor.activeToolChanged, (newTool) => {
    that.toolId = idForTool(that._toolEntries, newTool);
  });

  this._toggleModeDropDown = createCommand(() => {
    that.modeDropDownVisible = !that.modeDropDownVisible;
    if (that.modeDropDownVisible) {
      that.toolDropDownVisible = false;
    }
  });
  this._toggleToolDropDown = createCommand(() => {
    that.toolDropDownVisible = !that.toolDropDownVisible;
    if (that.toolDropDownVisible) {
      that.modeDropDownVisible = false;
    }
  });

  /**
   * Selects a mode entry by id. The editor's mode is updated, which - via
   * the modeChanged event - updates {@link EditorToolbarViewModel#modeId}.
   * @type {Command}
   */
  this.selectMode = createCommand((entry) => {
    editor.mode = entry.mode;
    that.modeDropDownVisible = false;
  });

  /**
   * Selects a tool entry by id.
   * @type {Command}
   */
  this.selectTool = createCommand((entry) => {
    editor.activeTool = entry.tool;
    that.toolDropDownVisible = false;
  });
}

Object.defineProperties(EditorToolbarViewModel.prototype, {
  editor: {
    get: function () {
      return this._editor;
    },
  },
  modeEntries: {
    get: function () {
      return this._modeEntries;
    },
  },
  toolEntries: {
    get: function () {
      return this._toolEntries;
    },
  },
  toggleModeDropDown: {
    get: function () {
      return this._toggleModeDropDown;
    },
  },
  toggleToolDropDown: {
    get: function () {
      return this._toggleToolDropDown;
    },
  },
});

EditorToolbarViewModel.prototype.isDestroyed = function () {
  return false;
};

EditorToolbarViewModel.prototype.destroy = function () {
  this._eventHelper.removeAll();
  destroyObject(this);
};

function idForMode(entries, mode) {
  for (const entry of entries) {
    if (entry.mode === mode) {
      return entry.id;
    }
  }
  return entries[0].id;
}

function idForTool(entries, tool) {
  for (const entry of entries) {
    if (entry.tool === tool) {
      return entry.id;
    }
  }
  return entries[0].id;
}

export default EditorToolbarViewModel;
