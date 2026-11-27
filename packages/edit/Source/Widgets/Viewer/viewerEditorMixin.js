// @ts-check

import { Check, DeveloperError, defined } from "@cesium/core";
import SelectTool from "../../Editor/SelectTool.js";
import TranslateTool from "../../Editor/TranslateTool.js";
import EditorCameraControls from "./EditorCameraControls.js";
import EditorCursor from "./EditorCursor.js";
import EditorGrid from "./EditorGrid.js";
import EditorOutliner from "../EditorOutliner/EditorOutliner.js";
import EditorToolbar from "../EditorToolbar/EditorToolbar.js";

/** @import { Viewer } from "@cesium/widgets"; */
/** @import MeshEditor from "../../Editor/MeshEditor.js"; */
/** @import MeshEditorTool from "../../Editor/MeshEditorTool.js"; */
/** @import { EditorToolbarOptions, EditorToolbarModeEntry, EditorToolbarToolEntry } from "../EditorToolbar/EditorToolbarViewModel.js"; */
/** @import { Command } from "@cesium/widgets"; */
/** @import { EditorGridOptions } from "./EditorGrid.js"; */

/**
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 * @typedef {object} EditorKeyBindings
 * @property {Object<string, string>} [modes] KeyboardEvent.key values mapped to mode entry IDs.
 * @property {Object<string, string>} [tools] KeyboardEvent.key values mapped to tool entry IDs.
 */

/**
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 * @typedef {object} ViewerEditorMixinOptions
 * @property {MeshEditor} editor An editor in the viewer's scene.
 * @property {EditorToolbarOptions} [toolbar] The toolbar's options, or undefined for no toolbar. Without <code>tools</code>, the toolbar offers the {@link ViewerEditorTools}.
 * @property {boolean} [outliner=false] Whether to add an outliner, showing the editor's meshes and groups.
 * @property {EditorGridOptions} [grid] The options of an {@link EditorGrid} to add to the scene, or undefined for no grid.
 * @property {EditorKeyBindings|false} [keyBindings] Replacement shortcuts, or false to disable them. Mode and tool shortcuts require a toolbar, and are shown in its tooltips.
 */

/**
 * The tools the mixin adds to the editor, exposed as <code>viewer.editorTools</code>.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 * @typedef {object} ViewerEditorTools
 * @property {SelectTool} select A select tool.
 * @property {TranslateTool} translate A translate tool.
 */

/**
 * A widget the mixin adds to the viewer, in a container of its own.
 *
 * @typedef {object} ViewerEditorWidget
 * @property {Element} container The widget's container.
 * @property {function(): void} destroy Destroys the widget.
 * @ignore
 */

/**
 * The properties the mixin defines on the viewer.
 *
 * @ignore
 */
const viewerPropertyNames = [
  "editor",
  "editorTools",
  "editorToolbar",
  "editorOutliner",
  "editorGrid",
];

/**
 * Adds default tools to the editor, and optionally an {@link EditorToolbar},
 * an {@link EditorOutliner} and an {@link EditorGrid}, and keyboard shortcuts
 * to a {@link Viewer}, exposing them as <code>viewer.editor</code>,
 * <code>viewer.editorTools</code>, <code>viewer.editorToolbar</code>,
 * <code>viewer.editorOutliner</code> and <code>viewer.editorGrid</code>.
 * Escape cancels the active tool's interaction.
 * <p>
 * Also replaces the camera's mouse input with controls that
 * leave the left button to the editor: middle-drag orbits around the active
 * meshes, or all meshes if none are active, Shift+middle-drag pans, and the
 * wheel zooms toward the pointer.
 * </p>
 *
 * @function viewerEditorMixin
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {Viewer} viewer The viewer to extend.
 * @param {ViewerEditorMixinOptions} options The editor and widget options.
 *
 * @exception {DeveloperError} options.editor must be in the viewer's scene.
 * @exception {DeveloperError} editor, editorTools, editorToolbar, editorOutliner or editorGrid is already defined by another mixin.
 * @exception {DeveloperError} A key binding refers to an unknown entry.
 *
 * @example
 * const viewer = new Cesium.Viewer("cesiumContainer");
 * const editor = await Cesium.MeshEditor.addToScene(viewer.scene);
 * viewer.extend(Cesium.viewerEditorMixin, {
 *   editor,
 *   toolbar: {},
 *   outliner: true,
 *   grid: { origin: Cesium.Cartesian3.fromDegrees(-123.07, 44.05) },
 * });
 * // With the mixin, these settings can be controlled via UI, or programmatically:
 * editor.mode = Cesium.EditMode.VERTEX;
 * editor.activeTool = viewer.editorTools.translate;
 */
function viewerEditorMixin(viewer, options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("viewer", viewer);
  Check.typeOf.object("options", options);
  Check.typeOf.object("options.editor", options.editor);
  if (!viewer.scene.primitives.contains(options.editor)) {
    throw new DeveloperError(
      "options.editor must be added to the viewer's scene.",
    );
  }
  if (defined(options.grid)) {
    Check.typeOf.object("options.grid.origin", options.grid.origin);
  }
  //>>includeEnd('debug');

  for (const name of viewerPropertyNames) {
    if (viewer.hasOwnProperty(name)) {
      throw new DeveloperError(`${name} is already defined by another mixin.`);
    }
  }

  const editor = options.editor;
  /** @type {ViewerEditorTools} */
  const tools = Object.freeze({
    select: SelectTool.addTo(editor),
    translate: TranslateTool.addTo(editor),
  });
  const toolbar = createWidget(
    viewer,
    defined(options.toolbar),
    "cesium-viewer-editorToolbarContainer",
    (container) =>
      new EditorToolbar(container, editor, {
        ...options.toolbar,
        tools: options.toolbar?.tools ?? createToolEntries(tools),
      }),
  );

  let outliner;
  let removeKeyBindings;
  let cameraControls;
  let cursor;

  try {
    outliner = createWidget(
      viewer,
      options.outliner === true,
      "cesium-viewer-editorOutlinerContainer",
      (container) => new EditorOutliner(container, editor),
    );

    removeKeyBindings = installKeyBindings(
      viewer,
      toolbar,
      editor,
      options.keyBindings,
    );

    cameraControls = new EditorCameraControls(viewer, editor);
    cursor = new EditorCursor(viewer, editor, tools);
  } catch (error) {
    cameraControls?.destroy();
    removeKeyBindings?.();
    destroyWidget(outliner);
    destroyWidget(toolbar);
    throw error;
  }

  const { grid, removeGrid } = addGrid(viewer, options.grid);

  const removeDefaultTool = activateDefaultTool(editor, tools.select);

  defineViewerEditorProperties(viewer, editor, tools, toolbar, outliner, grid);

  installCleanup(
    viewer,
    [toolbar, outliner],
    removeKeyBindings,
    cameraControls,
    cursor,
    removeGrid,
    removeDefaultTool,
  );
}

/** @ignore */
const defaultKeyBindings = Object.freeze({
  modes: Object.freeze({ 0: "none", 1: "vertex", 2: "edge", 3: "face" }),
  tools: Object.freeze({ s: "select", g: "translate" }),
});

/**
 * Creates the toolbar's default tool entries.
 *
 * @param {ViewerEditorTools} tools
 * @returns {EditorToolbarToolEntry[]}
 * @ignore
 */
function createToolEntries(tools) {
  return [
    { id: "select", label: "Select", tool: tools.select },
    { id: "translate", label: "Translate", tool: tools.translate },
  ];
}

/**
 * Activates a tool if none is active, and again whenever a mode change
 * deactivates the active tool.
 *
 * @param {MeshEditor} editor
 * @param {MeshEditorTool} tool The tool to activate.
 * @returns {Function} Removes the mode listener.
 * @ignore
 */
function activateDefaultTool(editor, tool) {
  const activate = () => {
    if (!defined(editor.activeTool)) {
      editor.activeTool = tool;
    }
  };

  activate();
  return editor.modeChanged.addEventListener(activate);
}

/**
 * Creates a widget in a new container in the viewer's container.
 *
 * @template {ViewerEditorWidget} T
 * @param {Viewer} viewer
 * @param {boolean} enabled Whether to create the widget.
 * @param {string} className The container's class.
 * @param {function(HTMLDivElement): T} create Creates the widget in a container.
 * @returns {T|undefined} The widget, or undefined if it's not enabled.
 * @ignore
 */
function createWidget(viewer, enabled, className, create) {
  if (!enabled) {
    return undefined;
  }

  const container = document.createElement("div");
  container.className = className;
  viewer.container.appendChild(container);
  try {
    return create(container);
  } catch (error) {
    container.remove();
    throw error;
  }
}

/**
 * Destroys a widget and removes its container.
 *
 * @param {ViewerEditorWidget|undefined} widget
 * @ignore
 */
function destroyWidget(widget) {
  if (!defined(widget)) {
    return;
  }
  const container = widget.container;
  widget.destroy();
  container.remove();
}

/**
 * @param {Viewer} viewer
 * @param {MeshEditor} editor
 * @param {ViewerEditorTools} tools
 * @param {EditorToolbar|undefined} toolbar
 * @param {EditorOutliner|undefined} outliner
 * @param {EditorGrid|undefined} grid
 * @ignore
 */
function defineViewerEditorProperties(
  viewer,
  editor,
  tools,
  toolbar,
  outliner,
  grid,
) {
  Object.defineProperties(viewer, {
    editor: {
      get: () => editor,
    },
    editorTools: {
      get: () => tools,
    },
    editorToolbar: {
      get: () => toolbar,
    },
    editorOutliner: {
      get: () => outliner,
    },
    editorGrid: {
      get: () => grid,
    },
  });
}

/**
 * Cleans up before the viewer destroys the scene, which owns the editor.
 *
 * @param {Viewer} viewer
 * @param {Array<ViewerEditorWidget|undefined>} widgets
 * @param {Function} removeKeyBindings
 * @param {EditorCameraControls} cameraControls
 * @param {EditorCursor} cursor
 * @param {Function} removeGrid
 * @param {Function} removeDefaultTool
 * @ignore
 */
function installCleanup(
  viewer,
  widgets,
  removeKeyBindings,
  cameraControls,
  cursor,
  removeGrid,
  removeDefaultTool,
) {
  const destroyViewer = viewer.destroy;
  viewer.destroy = function () {
    removeDefaultTool();
    cursor.destroy();
    cameraControls.destroy();
    removeKeyBindings();
    for (const widget of widgets) {
      destroyWidget(widget);
    }
    removeGrid();
    return destroyViewer.apply(viewer, arguments);
  };
}

/**
 * Adds a grid to the viewer's scene.
 *
 * @param {Viewer} viewer
 * @param {EditorGridOptions|undefined} gridOptions
 * @returns {{grid: EditorGrid|undefined, removeGrid: Function}} The grid, if any, and a function that removes it.
 * @ignore
 */
function addGrid(viewer, gridOptions) {
  if (!defined(gridOptions)) {
    return { grid: undefined, removeGrid: () => {} };
  }

  const scene = viewer.scene;

  /** @type {EditorGrid} */
  const grid = scene.primitives.add(
    new EditorGrid({
      ...gridOptions,
      ellipsoid: gridOptions.ellipsoid ?? scene.ellipsoid,
    }),
  );

  return {
    grid,
    removeGrid: () => {
      scene.primitives.remove(grid);
    },
  };
}

/**
 * @param {Viewer} viewer
 * @param {EditorToolbar|undefined} toolbar
 * @param {MeshEditor} editor
 * @param {EditorKeyBindings|false} [keyBindings]
 * @returns {Function} Removes the listeners.
 * @ignore
 */
function installKeyBindings(viewer, toolbar, editor, keyBindings) {
  if (keyBindings === false) {
    return () => {};
  }

  const shortcuts = createShortcuts(toolbar, editor, keyBindings);

  /** @param {KeyboardEvent} event */
  function onKeyDown(event) {
    if (isShortcutCandidate(event) && shortcuts.get(event.key)?.()) {
      event.preventDefault();
    }
  }

  const ownerDocument = viewer.container.ownerDocument;
  ownerDocument.addEventListener("keydown", onKeyDown);
  const removeFocusListener = focusWindowOnPointerDown(viewer.container);

  return () => {
    ownerDocument.removeEventListener("keydown", onKeyDown);
    removeFocusListener();
  };
}

/**
 * Maps KeyboardEvent.key values to actions that return whether they handled
 * the key.
 *
 * @param {EditorToolbar|undefined} toolbar
 * @param {MeshEditor} editor
 * @param {EditorKeyBindings} [keyBindings]
 * @returns {Map<string, function(): boolean>}
 * @ignore
 */
function createShortcuts(toolbar, editor, keyBindings) {
  const shortcuts = new Map();
  shortcuts.set("Escape", () => {
    const activeTool = editor.activeTool;
    activeTool?.cancel();
    return defined(activeTool);
  });

  const viewModel = toolbar?.viewModel;
  if (!defined(viewModel)) {
    return shortcuts;
  }

  // Default bindings may name entries that custom toolbar options omit.
  const requireEntries = defined(keyBindings);
  const bindings = keyBindings ?? defaultKeyBindings;
  const modeEntries = mapKeysToEntries(
    bindings.modes,
    viewModel.modeEntries,
    "mode",
    requireEntries,
  );
  const toolEntries = mapKeysToEntries(
    bindings.tools,
    viewModel.toolEntries,
    "tool",
    requireEntries,
  );

  // Earlier shortcuts win: Escape, then modes, then tools.
  /** @type {Object<string, string[]>} */
  const modeShortcuts = {};
  for (const [key, entry] of modeEntries) {
    if (!shortcuts.has(key)) {
      shortcuts.set(key, () => {
        callCommand(viewModel.selectModeEntry, entry);
        return true;
      });
      (modeShortcuts[entry.id] ??= []).push(key);
    }
  }
  /** @type {Object<string, string[]>} */
  const toolShortcuts = {};
  for (const [key, entry] of toolEntries) {
    if (!shortcuts.has(key)) {
      shortcuts.set(key, () => {
        if (!viewModel.isToolEnabled(entry)) {
          return false;
        }
        callCommand(viewModel.selectToolEntry, entry);
        return true;
      });
      (toolShortcuts[entry.id] ??= []).push(key);
    }
  }

  // Shows the shortcuts in the toolbar's tooltips.
  viewModel.modeShortcuts = modeShortcuts;
  viewModel.toolShortcuts = toolShortcuts;
  return shortcuts;
}

/**
 * Focuses the container's window on pointerdown. Clicking the canvas doesn't
 * focus its window, so keys wouldn't reach a viewer in an iframe (e.g. Sandcastle).
 *
 * @param {Element} container
 * @returns {Function} Removes the listener.
 * @ignore
 */
function focusWindowOnPointerDown(container) {
  const ownerWindow = container.ownerDocument.defaultView ?? window;
  const focusWindow = () => ownerWindow.focus();
  container.addEventListener("pointerdown", focusWindow);
  return () => container.removeEventListener("pointerdown", focusWindow);
}

/**
 * Calls a command; its generated type isn't callable.
 *
 * @param {Command} command
 * @param {EditorToolbarModeEntry|EditorToolbarToolEntry} entry
 * @ignore
 */
function callCommand(command, entry) {
  /** @type {function(*): void} */ (/** @type {unknown} */ (command))(entry);
}

/**
 * @template {EditorToolbarModeEntry|EditorToolbarToolEntry} T
 * @param {Object<string, string>|undefined} entryIdsByKey
 * @param {T[]} entries
 * @param {string} kind
 * @param {boolean} requireEntries Whether unknown IDs throw rather than being skipped.
 * @returns {Map<string, T>}
 * @ignore
 */
function mapKeysToEntries(entryIdsByKey, entries, kind, requireEntries) {
  const entriesByKey = new Map();
  for (const [key, id] of Object.entries(entryIdsByKey ?? {})) {
    const entry = entries.find((candidate) => candidate.id === id);
    if (defined(entry)) {
      entriesByKey.set(key, entry);
    } else if (requireEntries) {
      throw new DeveloperError(
        `The ${kind} key binding "${key}" refers to unknown entry "${id}".`,
      );
    }
  }
  return entriesByKey;
}

/**
 * Whether a key event is unhandled, unmodified, and outside text input.
 *
 * @param {KeyboardEvent} event
 * @returns {boolean}
 * @ignore
 */
function isShortcutCandidate(event) {
  if (
    event.defaultPrevented ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  ) {
    return false;
  }
  const target = event.target;
  if (!(target instanceof Element)) {
    return true;
  }
  return !(
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export default viewerEditorMixin;
