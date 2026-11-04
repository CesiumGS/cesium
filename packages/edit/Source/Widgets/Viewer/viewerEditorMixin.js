// @ts-check

/** @import { Viewer } from "@cesium/widgets"; */
/** @import MeshEditor from "../../Editor/MeshEditor.js"; */
/** @import EditorToolbar from "../EditorToolbar/EditorToolbar.js"; */
/** @import { EditorToolbarOptions } from "../EditorToolbar/EditorToolbarViewModel.js"; */

/**
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 * @typedef {object} EditorKeyBindings
 * @property {Object<string, string>} [modes] KeyboardEvent.key values mapped to mode entry IDs.
 * @property {Object<string, string>} [tools] KeyboardEvent.key values mapped to tool entry IDs.
 */

/**
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 * @typedef {object} ViewerEditorMixinOptions
 * @property {MeshEditor} editor An editor already added to this viewer's scene.
 * @property {boolean} [toolbar=true] Whether to attach the toolbar.
 * @property {EditorToolbarOptions} [toolbarOptions] Options passed to the toolbar.
 * @property {EditorKeyBindings|false} [keyBindings] Custom entry shortcuts, or false to disable keyboard handling.
 */

/**
 * Adds a mesh editor toolbar and keyboard shortcuts to a {@link Viewer}.
 * Exposes the supplied editor as <code>viewer.editor</code> and the optional
 * toolbar as <code>viewer.editorToolbar</code>. Register meshes with the editor
 * programmatically before editing them.
 *
 * The default mode keys are 0 (Object), 1 (Vertex), 2 (Edge), and 3 (Face).
 * Tool keys are s (Select) and g (Translate). Escape cancels the active tool's
 * interaction. Shortcuts require the toolbar and are ignored in text inputs.
 *
 * @function viewerEditorMixin
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {Viewer} viewer The viewer to extend.
 * @param {ViewerEditorMixinOptions} options The editor and widget options.
 *
 * @example
 * const viewer = new Cesium.Viewer("cesiumContainer");
 * const editor = await Cesium.MeshEditor.addToScene(viewer.scene);
 * viewer.extend(Cesium.viewerEditorMixin, { editor });
 */
function viewerEditorMixin(viewer, options) {
  const toolbar = createToolbar(viewer, options);
  const removeKeyBindings = installKeyBindings(
    viewer,
    toolbar,
    options.editor,
    options.keyBindings,
  );
  defineViewerEditorProperties(viewer, options.editor, toolbar);
  installCleanup(viewer, toolbar, removeKeyBindings);
}

/**
 * Creates and attaches the optional toolbar and its container.
 *
 * @param {Viewer} viewer The viewer.
 * @param {ViewerEditorMixinOptions} options The widget options.
 * @returns {EditorToolbar|undefined} The toolbar, if enabled.
 * @ignore
 */
function createToolbar(viewer, options) {
  throw new Error("Editor toolbar attachment is not implemented.");
}

/**
 * Defines editor and editorToolbar properties on the supplied viewer so
 * application code can access the editor and toolbar through that viewer.
 *
 * @param {Viewer} viewer The viewer.
 * @param {MeshEditor} editor The editor.
 * @param {EditorToolbar|undefined} toolbar The optional toolbar.
 * @ignore
 */
function defineViewerEditorProperties(viewer, editor, toolbar) {}

/**
 * Wraps viewer destruction to clean up widgets, their container, and listeners.
 * The scene retains ownership of editor destruction.
 *
 * @param {Viewer} viewer The viewer.
 * @param {EditorToolbar|undefined} toolbar The optional toolbar.
 * @param {Function} removeKeyBindings Removes keyboard and focus listeners.
 * @ignore
 */
function installCleanup(viewer, toolbar, removeKeyBindings) {}

/**
 * Installs entry shortcuts, Escape cancellation, and iframe focus handling.
 *
 * @param {Viewer} viewer The viewer.
 * @param {EditorToolbar|undefined} toolbar The optional toolbar.
 * @param {MeshEditor} editor The editor.
 * @param {EditorKeyBindings|false} [keyBindings] Custom entry shortcuts, or false.
 * @returns {Function} Removes keyboard and focus listeners.
 * @ignore
 */
function installKeyBindings(viewer, toolbar, editor, keyBindings) {
  throw new Error("Editor key bindings are not implemented.");
}

export default viewerEditorMixin;
