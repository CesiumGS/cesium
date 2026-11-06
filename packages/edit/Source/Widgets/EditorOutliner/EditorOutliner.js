// @ts-check

import { Check, DeveloperError, defined } from "@cesium/core";
import { knockout } from "@cesium/widgets";
import EditorMeshTreeProvider from "./EditorMeshTreeProvider.js";
import EditorOutlinerViewModel from "./EditorOutlinerViewModel.js";

/** @import { Command } from "@cesium/widgets"; */
/** @import MeshEditor from "../../Editor/MeshEditor.js"; */
/** @import MeshTreeProvider from "./MeshTreeProvider.js"; */
/** @import { EditorOutlinerRow } from "./EditorOutlinerViewModel.js"; */

/**
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 * @typedef {object} EditorOutlinerOptions
 * @property {MeshTreeProvider} [provider] The tree to display. Defaults to an {@link EditorMeshTreeProvider} listing every mesh in the editor.
 */

/**
 * The indentation of each level of the tree, in pixels.
 *
 * @ignore
 */
const INDENT_WIDTH = 16;

/**
 * Calls a command; its generated type isn't callable.
 *
 * @param {Command} command The command.
 * @param {...*} args The command's arguments.
 * @ignore
 */
function callCommand(command, ...args) {
  /** @type {function(...*): void} */ (/** @type {unknown} */ (command))(
    ...args,
  );
}

/**
 * @param {Element|string} container The element or its ID.
 * @returns {Element} The element.
 * @ignore
 */
function getContainerElement(container) {
  if (typeof container !== "string") {
    return container;
  }

  const element = document.getElementById(container);
  if (!defined(element)) {
    throw new DeveloperError(`Element with id "${container}" does not exist.`);
  }
  return element;
}

/**
 * A collapsible tree of a {@link MeshEditor}'s meshes. Clicking a row makes its
 * mesh the only active mesh; Ctrl- or Cmd-clicking toggles it, and
 * Shift-clicking selects a range. Clicking a row without a mesh expands or
 * collapses it. Rows whose meshes are active are highlighted, and rows that
 * can't be selected or expanded are dimmed. Requires
 * <code>EditorOutliner.css</code>.
 *
 * @alias EditorOutliner
 * @constructor
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {Element|string} container The element or ID that hosts the outliner.
 * @param {MeshEditor} editor The editor whose meshes are listed.
 * @param {EditorOutlinerOptions} [options] The outliner's options.
 */
class EditorOutliner {
  /** @type {Element} */
  #container;

  /** @type {EditorOutlinerViewModel} */
  #viewModel;

  /**
   * The provider the outliner created, which it destroys with itself.
   *
   * @type {EditorMeshTreeProvider|undefined}
   */
  #ownProvider;

  /** @type {HTMLDivElement} */
  #wrapper;

  /**
   * @param {Element|string} container The element or ID that hosts the outliner.
   * @param {MeshEditor} editor The editor whose meshes are listed.
   * @param {EditorOutlinerOptions} [options] The outliner's options.
   */
  constructor(container, editor, options) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("container", container);
    Check.typeOf.object("editor", editor);
    //>>includeEnd('debug');

    this.#container = getContainerElement(container);

    let provider = options?.provider;
    if (!defined(provider)) {
      this.#ownProvider = new EditorMeshTreeProvider(editor);
      provider = this.#ownProvider;
    }
    this.#viewModel = new EditorOutlinerViewModel(editor, provider);

    this.#wrapper = this.#createElements();
    try {
      this.#applyBindings();
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  /**
   * The element hosting the outliner.
   *
   * @type {Element}
   * @readonly
   */
  get container() {
    return this.#container;
  }

  /**
   * The outliner's view model.
   *
   * @type {EditorOutlinerViewModel}
   * @readonly
   */
  get viewModel() {
    return this.#viewModel;
  }

  /**
   * Creates the outliner's elements and adds them to the container.
   *
   * @returns {HTMLDivElement} The outliner's root element.
   * @ignore
   */
  #createElements() {
    const document = this.#container.ownerDocument;

    const wrapper = document.createElement("div");
    wrapper.className = "cesium-editor-outliner";
    wrapper.setAttribute("aria-label", "Meshes");
    wrapper.setAttribute("data-bind", "foreach: viewModel.rows");

    const row = document.createElement("div");
    row.className = "cesium-editor-outliner-row";
    row.setAttribute(
      "data-bind",
      `click: $parent.onRowClick,
       css: {
         'cesium-editor-outliner-row-active': active,
         'cesium-editor-outliner-row-disabled': !selectable && !expandable
       },
       style: { paddingLeft: $parent.indent(depth) }`,
    );

    const expander = document.createElement("span");
    expander.className = "cesium-editor-outliner-expander";
    expander.setAttribute(
      "data-bind",
      `click: $parent.onExpanderClick, clickBubble: false,
       css: {
         'cesium-editor-outliner-expandable': expandable,
         'cesium-editor-outliner-expanded': expanded
       }`,
    );

    const label = document.createElement("span");
    label.className = "cesium-editor-outliner-label";
    label.setAttribute("data-bind", "text: label, attr: { title: label }");

    row.appendChild(expander);
    row.appendChild(label);
    wrapper.appendChild(row);
    this.#container.appendChild(wrapper);
    return wrapper;
  }

  /**
   * Applies Knockout bindings to the outliner.
   *
   * @ignore
   */
  #applyBindings() {
    const viewModel = this.#viewModel;
    knockout.applyBindings(
      {
        viewModel,
        /** @param {number} depth */
        indent: (depth) => `${depth * INDENT_WIDTH}px`,
        /**
         * @param {EditorOutlinerRow} row
         * @param {MouseEvent} event
         */
        onRowClick: (row, event) => {
          if (row.selectable) {
            callCommand(viewModel.select, row, {
              toggle: event.ctrlKey || event.metaKey,
              range: event.shiftKey,
            });
          } else {
            callCommand(viewModel.toggleExpanded, row);
          }
        },
        /** @param {EditorOutlinerRow} row */
        onExpanderClick: (row) => {
          callCommand(viewModel.toggleExpanded, row);
        },
      },
      this.#wrapper,
    );
  }

  /**
   * Removes the outliner from the DOM and destroys its view model, and the
   * provider it created, if it created one.
   */
  destroy() {
    knockout.cleanNode(this.#wrapper);
    this.#wrapper.remove();
    this.#viewModel.destroy();
    this.#ownProvider?.destroy();
  }
}

export default EditorOutliner;
