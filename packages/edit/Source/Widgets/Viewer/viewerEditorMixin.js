import {
  KeyboardEventModifier,
  Color,
  defined,
  DeveloperError,
  Editable,
  Highlightable,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  wrapFunction,
} from "@cesium/engine";
import EditMode from "../../Editor/EditMode";
import MeshEditor from "../../Editor/MeshEditor";
import EditorToolbar from "../EditorToolbar/EditorToolbar";

/** @import { Viewer } from "@cesium/widgets"; */

const defaultHighlightColor = Color.YELLOW;
const defaultHighlightIntensity = 2.0;

const defaultKeyBindings = {
  modes: {
    1: "vertex",
    2: "edge",
    3: "face",
    Escape: "none",
  },
  tools: {
    g: "translate",
    s: "select",
  },
};

/**
 * A mixin which adds mesh-editing to a {@link Viewer} via a {@link MeshEditor}.
 *
 * Adds the following to the viewer:
 *  - `viewer.editor`: the {@link MeshEditor} instance.
 *  - `viewer.editorToolbar`: an {@link EditorToolbar} widget driving the editor's mode and active tool.
 *  - A LEFT_CLICK handler that toggles editing on any picked {@link Editable} primitive (and toggles a highlight if it is also {@link Highlightable}).
 *
 * The handler resolves an Editable from the picked primitive or its detail, looks up
 * (or creates) the corresponding EditableMesh on the editor, and toggles its active state.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {Viewer} viewer The viewer instance.
 * @param {object} [options]
 * @param {Color} [options.highlightColor=Color.YELLOW] Color used when highlighting an active editable.
 * @param {number} [options.highlightIntensity=2.0] Intensity used when highlighting an active editable.
 * @param {boolean} [options.toolbar=true] If true, create and attach an {@link EditorToolbar}.
 * @param {object} [options.toolbarOptions] Forwarded to the {@link EditorToolbar} constructor.
 * @param {object|false} [options.keyBindings] Keyboard shortcuts that select toolbar entries by id.
 *   Pass an object with `modes` and/or `tools` maps from {@link KeyboardEvent#key} value to entry id
 *   (e.g. `{ modes: { "1": "vertex" }, tools: { g: "translate" } }`), or `false` to disable.
 *   Bindings are ignored while focus is in a text input. Requires the toolbar (the default).
 *
 * @example
 * const viewer = new Cesium.Viewer("cesiumContainer");
 * viewer.extend(Cesium.viewerEditorMixin);
 */
function viewerEditorMixin(viewer, options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(viewer)) {
    throw new DeveloperError("viewer is required.");
  }
  //>>includeEnd('debug');

  options = options ?? {};
  const highlightColor = options.highlightColor ?? defaultHighlightColor;
  const highlightIntensity =
    options.highlightIntensity ?? defaultHighlightIntensity;

  const editor = new MeshEditor({ scene: viewer.scene });

  let toolbar;
  if (options.toolbar !== false) {
    const toolbarContainer = document.createElement("div");
    toolbarContainer.className = "cesium-viewer-editorToolbarContainer";
    viewer.container.appendChild(toolbarContainer);
    toolbar = new EditorToolbar(
      toolbarContainer,
      editor,
      options.toolbarOptions,
    );
  }

  // Tracks the highlight target chosen for each editable so toggling off can clear
  // the same primitive that was highlighted (the picked primitive isn't always the editable).
  const highlightTargets = new Map();

  function setStoredHighlightsEnabled(enabled) {
    const color = enabled ? highlightColor : undefined;
    const intensity = enabled ? highlightIntensity : undefined;

    for (const target of highlightTargets.values()) {
      target.setHighlight(color, intensity);
    }
  }

  function setHighlight(editable, picked) {
    const highlightTarget = resolveHighlightTarget(picked, editable);
    if (!defined(highlightTarget)) {
      return;
    }

    highlightTarget.setHighlight(highlightColor, highlightIntensity);
    highlightTargets.set(editable, highlightTarget);
  }

  function clearHighlight(editable) {
    const highlightTarget = highlightTargets.get(editable);
    if (!defined(highlightTarget)) {
      return;
    }

    highlightTarget.setHighlight(undefined, undefined);
    highlightTargets.delete(editable);
  }

  function forEachActiveEditable(callback) {
    for (const [editable, mesh] of editor._editables) {
      if (editor.activeMeshes.has(mesh)) {
        callback(editable);
      }
    }
  }

  function clearActiveMeshes(exceptEditable) {
    const editablesToDeactivate = [];
    forEachActiveEditable((editable) => {
      if (editable !== exceptEditable) {
        editablesToDeactivate.push(editable);
      }
    });

    for (const editable of editablesToDeactivate) {
      editor.setMeshInactive(editable);
      clearHighlight(editable);
    }
  }

  function handleViewerSelection(click, toggleOnly) {
    if (editor.mode !== EditMode.NONE) {
      return;
    }

    const picked = viewer.scene.pick(click.position);
    const editable = defined(picked) ? resolveEditable(picked) : undefined;

    if (!defined(editable)) {
      if (!toggleOnly) {
        clearActiveMeshes();
      }
      return;
    }

    if (toggleOnly) {
      const becameActive = editor.toggleMeshActive(editable);
      if (becameActive) {
        setHighlight(editable, picked);
      } else {
        clearHighlight(editable);
      }
      return;
    }

    clearActiveMeshes(editable);

    if (!editor.isMeshActive(editable)) {
      editor.toggleMeshActive(editable);
    }

    clearHighlight(editable);
    setHighlight(editable, picked);
  }

  // Highlights are a NONE-mode (selection) affordance; once the user enters an
  // edit mode, clicks belong to the active tool, so clear the highlights.
  const removeModeChangedListener = editor.modeChanged.addEventListener(
    (newMode) => {
      if (newMode === EditMode.NONE) {
        setStoredHighlightsEnabled(true);
      } else {
        setStoredHighlightsEnabled(false);
      }
    },
  );

  const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction((click) => {
    handleViewerSelection(click, false);
  }, ScreenSpaceEventType.LEFT_CLICK);
  handler.setInputAction(
    (click) => {
      handleViewerSelection(click, true);
    },
    ScreenSpaceEventType.LEFT_CLICK,
    KeyboardEventModifier.SHIFT,
  );

  const removeKeyBindings = installKeyBindings(
    viewer,
    toolbar,
    options.keyBindings,
  );

  Object.defineProperties(viewer, {
    editor: {
      get: () => editor,
    },
    editorToolbar: {
      get: () => toolbar,
    },
  });

  // Hook into the viewer's destroy chain so the editor and handler get cleaned up.
  viewer.destroy = wrapFunction(viewer, viewer.destroy, function () {
    removeModeChangedListener();
    removeKeyBindings();
    handler.destroy();
    editor.destroy();
    if (defined(toolbar)) {
      toolbar.destroy();
    }
  });
}

/**
 * Resolve an {@link Editable} from a pick result. The pick's primitive is checked first,
 * then `detail.primitive`, supporting both top-level editables and editables nested inside
 * a parent primitive (e.g. nodes inside a Model).
 * @param {object} picked
 * @returns {Editable|undefined}
 */
function resolveEditable(picked) {
  if (Editable.isEditable(picked.primitive)) {
    return picked.primitive;
  }
  if (defined(picked.detail) && Editable.isEditable(picked.detail.primitive)) {
    return picked.detail.primitive;
  }
  return undefined;
}

/**
 * Choose which object to apply highlight to. Prefers the picked primitive when it is
 * highlightable so that highlighting follows what the user actually clicked, falling
 * back to the editable itself.
 * @param {object} picked
 * @param {Editable} editable
 * @returns {Highlightable|undefined}
 */
function resolveHighlightTarget(picked, editable) {
  if (Highlightable.isHighlightable(picked.primitive)) {
    return picked.primitive;
  }
  if (Highlightable.isHighlightable(editable)) {
    return editable;
  }
  return undefined;
}

/**
 * Wires `keydown` listeners that route keyboard shortcuts into the toolbar's
 * view-model. Returns a function that removes the listeners.
 * @param {Viewer} viewer
 * @param {EditorToolbar|undefined} toolbar
 * @param {object|false|undefined} keyBindings
 * @returns {Function}
 */
function installKeyBindings(viewer, toolbar, keyBindings) {
  if (keyBindings === false || !defined(toolbar)) {
    return () => {};
  }

  const bindings = keyBindings ?? defaultKeyBindings;
  const viewModel = toolbar.viewModel;

  const modeBindings = buildEntryBindings(
    bindings.modes,
    viewModel.modeEntries,
  );
  const toolBindings = buildEntryBindings(
    bindings.tools,
    viewModel.toolEntries,
  );

  function onKeyDown(event) {
    if (
      event.defaultPrevented ||
      hasModifier(event) ||
      isEditableTarget(event.target)
    ) {
      return;
    }

    const modeEntry = modeBindings.get(event.key);
    if (defined(modeEntry)) {
      viewModel.selectMode(modeEntry);
      event.preventDefault();
      return;
    }

    const toolEntry = toolBindings.get(event.key);
    if (defined(toolEntry)) {
      viewModel.selectTool(toolEntry);
      event.preventDefault();
    }
  }

  // The canvas isn't focusable, so a click on it doesn't grab keyboard focus
  // for the host window (a real issue when the viewer is in an iframe like
  // Sandcastle). Focusing the window on pointerdown is enough to start
  // routing keys here without altering the canvas's own focus behavior.
  const ownerWindow = viewer.container.ownerDocument?.defaultView ?? window;
  function onPointerDown() {
    ownerWindow.focus();
  }

  viewer.container.addEventListener("pointerdown", onPointerDown);
  ownerWindow.document.addEventListener("keydown", onKeyDown);

  return () => {
    viewer.container.removeEventListener("pointerdown", onPointerDown);
    ownerWindow.document.removeEventListener("keydown", onKeyDown);
  };
}

function buildEntryBindings(keyMap, entries) {
  const bindings = new Map();
  if (!defined(keyMap)) {
    return bindings;
  }

  for (const [key, id] of Object.entries(keyMap)) {
    const entry = entries.find((e) => e.id === id);
    if (defined(entry)) {
      bindings.set(key, entry);
    }
  }
  return bindings;
}

function hasModifier(event) {
  return event.ctrlKey || event.metaKey || event.altKey;
}

function isEditableTarget(target) {
  if (!defined(target)) {
    return false;
  }
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable === true
  );
}

export default viewerEditorMixin;
