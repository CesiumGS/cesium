import {
  defined,
  destroyObject,
  DeveloperError,
  FeatureDetection,
  getElement,
} from "@cesium/engine";
import { knockout } from "@cesium/widgets";
import EditorToolbarViewModel from "./EditorToolbarViewModel";

/** @import MeshEditor from "../../Editor/MeshEditor"; */
/** @import {EditorToolbarModeEntry, EditorToolbarToolEntry} from "./EditorToolbarViewModel"; */

const noneModeIconPath =
  // top face
  "M 32 8 L 54 19 L 32 30 L 10 19 Z " +
  // left-front face
  "M 9 20 L 31 31 L 31 57 L 9 46 Z " +
  // right-front face
  "M 33 31 L 55 20 L 55 46 L 33 57 Z";

const noneToolIconPath =
  "M162.41,59.41 L161.45,69.10 L152.08,63.29 L160.80,75.56 L158.22,85.24 " +
  "L154.66,84.27 L143.04,72.65 L132.06,62.32 S122.05,54.25 118.18,52.63 " +
  "C114.30,51.02 109.46,48.11 105.59,47.46 C101.71,46.82 96.55,46.17 " +
  "95.25,47.14 C93.96,48.11 91.06,57.15 91.06,57.15 L91.38,64.25 " +
  "L89.77,67.48 L91.06,147.88 L94.93,149.82 L99.45,187.60 L99.13,229.25 " +
  "L100.10,241.84 L100.74,243.46 L100.42,249.59 S96.22,257.02 92.99,257.99 " +
  "C89.77,258.95 83.95,258.95 80.72,258.31 C77.50,257.66 72.01,255.40 " +
  "70.07,253.14 S67.16,245.39 67.16,245.39 L69.42,240.55 L69.75,220.85 " +
  "L67.49,185.66 L69.42,150.14 L71.68,146.91 L69.75,68.45 L67.81,66.84 " +
  "L67.49,61.35 L60.06,47.46 S54.57,41.65 51.02,40.04 C47.47,38.42 " +
  "40.69,35.20 36.17,35.20 S24.87,37.46 24.87,37.46 L18.73,37.78 " +
  "L5.17,35.52 S1.94,33.58 0.65,30.35 S0.00,11.95 1.30,9.69 " +
  "C2.59,7.43 6.46,1.29 8.72,0.00 S27.77,2.91 27.77,2.91 L34.88,9.04 " +
  "S41.01,10.98 44.24,10.98 S56.19,6.14 56.19,6.14 L61.67,3.23 " +
  "L74.59,4.52 S95.25,9.04 98.81,10.01 C102.36,10.98 116.24,17.44 " +
  "120.76,19.70 S138.84,32.94 140.78,35.20 S162.09,59.73 162.41,59.41 Z";

// Single filled vertex dot, centered.
const vertexIconPath = "M 32 22 A 10 10 0 1 0 32 42 A 10 10 0 1 0 32 22 Z";

// A thick bar (edge), centered.
const edgeIconPath = "M 10 28 L 54 28 L 54 36 L 10 36 Z";

// A solid triangle (face).
const faceIconPath = "M 32 10 L 56 52 L 8 52 Z";

// Mouse cursor pointer, centered in the viewBox.
const selectIconPath =
  "M 17 12 L 17 52 L 27 43 L 33 56 L 41 52 L 35 39 L 49 39 Z";

// Four-direction translate arrow.
const translateIconPath =
  "M 32 6 L 42 18 L 36 18 L 36 28 L 46 28 L 46 22 L 58 32 L 46 42 L 46 36 " +
  "L 36 36 L 36 46 L 42 46 L 32 58 L 22 46 L 28 46 L 28 36 L 18 36 L 18 42 " +
  "L 6 32 L 18 22 L 18 28 L 28 28 L 28 18 L 22 18 Z";

/**
 * Default icons keyed by kind and entry id. Each value is `{ path, width?,
 * height? }`; width/height default to 64 (the viewBox most icons are drawn
 * in). Mode and tool both define an id of `none`, so the maps are separated
 * by kind.
 */
const defaultIconsByKind = {
  mode: {
    none: { path: noneModeIconPath },
    vertex: { path: vertexIconPath },
    edge: { path: edgeIconPath },
    face: { path: faceIconPath },
  },
  tool: {
    none: { path: noneToolIconPath, width: 163, height: 259 },
    select: { path: selectIconPath },
    translate: { path: translateIconPath },
  },
};

/**
 * <p>A toolbar widget with two SceneModePicker-style dropdowns that drive a
 * {@link MeshEditor}'s {@link MeshEditor#mode} and {@link MeshEditor#activeTool}.</p>
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @alias EditorToolbar
 * @constructor
 *
 * @param {Element|string} container The DOM element or ID that will host the widget.
 * @param {MeshEditor} editor The editor instance to drive.
 * @param {object} [options]
 * @param {EditorToolbarModeEntry[]} [options.modes] Override the default mode dropdown entries.
 * @param {EditorToolbarToolEntry[]} [options.tools] Override the default tool dropdown entries.
 */
function EditorToolbar(container, editor, options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(container)) {
    throw new DeveloperError("container is required.");
  }
  if (!defined(editor)) {
    throw new DeveloperError("editor is required.");
  }
  //>>includeEnd('debug');

  container = getElement(container);

  const viewModel = new EditorToolbarViewModel(editor, options);
  backfillIconPaths(viewModel.modeEntries, "mode");
  backfillIconPaths(viewModel.toolEntries, "tool");

  // Computed observables for the icon currently shown on each main button.
  // Defining these on the VM here (rather than in the VM module) keeps SVG
  // concerns in the view layer.
  knockout.defineProperty(viewModel, "selectedModeIconPath", function () {
    return findEntry(viewModel.modeEntries, viewModel.modeId).iconPath;
  });
  knockout.defineProperty(viewModel, "selectedToolIconPath", function () {
    return findEntry(viewModel.toolEntries, viewModel.toolId).iconPath;
  });
  knockout.defineProperty(viewModel, "selectedModeIconWidth", function () {
    return findEntry(viewModel.modeEntries, viewModel.modeId).iconWidth ?? 64;
  });
  knockout.defineProperty(viewModel, "selectedToolIconWidth", function () {
    return findEntry(viewModel.toolEntries, viewModel.toolId).iconWidth ?? 64;
  });
  knockout.defineProperty(viewModel, "selectedModeIconHeight", function () {
    return findEntry(viewModel.modeEntries, viewModel.modeId).iconHeight ?? 64;
  });
  knockout.defineProperty(viewModel, "selectedToolIconHeight", function () {
    return findEntry(viewModel.toolEntries, viewModel.toolId).iconHeight ?? 64;
  });
  knockout.defineProperty(viewModel, "selectedModeLabel", function () {
    return findEntry(viewModel.modeEntries, viewModel.modeId).label;
  });
  knockout.defineProperty(viewModel, "selectedToolLabel", function () {
    return findEntry(viewModel.toolEntries, viewModel.toolId).label;
  });

  const wrapper = document.createElement("div");
  wrapper.className = "cesium-editor-toolbar";

  wrapper.appendChild(buildPicker("mode", viewModel));
  wrapper.appendChild(buildPicker("tool", viewModel));

  container.appendChild(wrapper);
  knockout.applyBindings(viewModel, wrapper);

  this._viewModel = viewModel;
  this._container = container;
  this._wrapper = wrapper;

  // Close any open dropdown when the user clicks outside the toolbar.
  this._closeDropDown = function (e) {
    if (!wrapper.contains(e.target)) {
      viewModel.modeDropDownVisible = false;
      viewModel.toolDropDownVisible = false;
    }
  };
  if (FeatureDetection.supportsPointerEvents()) {
    document.addEventListener("pointerdown", this._closeDropDown, true);
  } else {
    document.addEventListener("mousedown", this._closeDropDown, true);
    document.addEventListener("touchstart", this._closeDropDown, true);
  }
}

Object.defineProperties(EditorToolbar.prototype, {
  /** @type {Element} */
  container: {
    get: function () {
      return this._container;
    },
  },
  /** @type {EditorToolbarViewModel} */
  viewModel: {
    get: function () {
      return this._viewModel;
    },
  },
});

EditorToolbar.prototype.isDestroyed = function () {
  return false;
};

EditorToolbar.prototype.destroy = function () {
  this._viewModel.destroy();

  if (FeatureDetection.supportsPointerEvents()) {
    document.removeEventListener("pointerdown", this._closeDropDown, true);
  } else {
    document.removeEventListener("mousedown", this._closeDropDown, true);
    document.removeEventListener("touchstart", this._closeDropDown, true);
  }

  knockout.cleanNode(this._wrapper);
  this._container.removeChild(this._wrapper);

  return destroyObject(this);
};

/**
 * Builds one of the two pickers (mode or tool). Both share the same DOM shape
 * and bindings; only the VM property names differ, which we drive via the
 * `kind` parameter.
 *
 * @param {"mode"|"tool"} kind
 * @param {EditorToolbarViewModel} viewModel
 * @returns {HTMLSpanElement}
 */
function buildPicker(kind, viewModel) {
  const cap = kind[0].toUpperCase() + kind.slice(1);
  const visibleProp = `${kind}DropDownVisible`;
  const idProp = `${kind}Id`;
  const iconProp = `selected${cap}IconPath`;
  const widthProp = `selected${cap}IconWidth`;
  const heightProp = `selected${cap}IconHeight`;
  const labelProp = `selected${cap}Label`;
  const entriesProp = `${kind}Entries`;
  const toggleCmd = `toggle${cap}DropDown`;
  const selectCmd = `select${cap}`;

  const picker = document.createElement("span");
  picker.className = `cesium-editor-toolbar-picker cesium-editor-toolbar-picker-${kind}`;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "cesium-button cesium-toolbar-button";
  button.setAttribute(
    "data-bind",
    `click: ${toggleCmd},
     attr: { title: ${labelProp} },
     css: { "cesium-editor-toolbar-selected": ${visibleProp} },
     cesiumSvgPath: { path: ${iconProp}, width: ${widthProp}, height: ${heightProp} }`,
  );
  picker.appendChild(button);

  const dropdown = document.createElement("div");
  dropdown.className = "cesium-editor-toolbar-dropdown";
  dropdown.setAttribute(
    "data-bind",
    `visible: ${visibleProp},
     foreach: ${entriesProp}`,
  );

  const entryButton = document.createElement("button");
  entryButton.type = "button";
  entryButton.className = "cesium-button cesium-toolbar-button";
  entryButton.setAttribute(
    "data-bind",
    `click: function() { $parent.${selectCmd}($data); },
     attr: { title: label },
     css: { "cesium-editor-toolbar-active": id === $parent.${idProp} },
     cesiumSvgPath: { path: iconPath, width: iconWidth, height: iconHeight }`,
  );
  dropdown.appendChild(entryButton);

  picker.appendChild(dropdown);
  return picker;
}

/**
 * Find an entry by id, returning the first entry as a fallback so the bindings
 * always have something to render.
 */
function findEntry(entries, id) {
  for (const entry of entries) {
    if (entry.id === id) {
      return entry;
    }
  }
  return entries[0];
}

/**
 * Fill in `iconPath`, `iconWidth`, and `iconHeight` on entries that don't
 * supply their own. Lookups use the entry id, so user-supplied entries with
 * novel ids must include an iconPath.
 *
 * @param {Array} entries
 * @param {"mode"|"tool"} kind
 */
function backfillIconPaths(entries, kind) {
  const defaults = defaultIconsByKind[kind];
  for (const entry of entries) {
    const fallback = defaults[entry.id];
    if (!defined(entry.iconPath) && defined(fallback)) {
      entry.iconPath = fallback.path;
    }
    entry.iconWidth = entry.iconWidth ?? fallback?.width ?? 64;
    entry.iconHeight = entry.iconHeight ?? fallback?.height ?? 64;
  }
}

export default EditorToolbar;
