// @ts-check

import { Check, defined } from "@cesium/core";
import { getElement } from "@cesium/engine";
import { knockout } from "@cesium/widgets";
import EditorMeshTreeProvider from "./EditorMeshTreeProvider.js";
import EditorOutlinerViewModel from "./EditorOutlinerViewModel.js";

/** @import { Command } from "@cesium/widgets"; */
/** @import MeshEditor from "../../Editor/MeshEditor.js"; */
/** @import MeshTreeProvider from "./MeshTreeProvider.js"; */
/** @import { EditorOutlinerRow, EditorOutlinerSelectOptions } from "./EditorOutlinerViewModel.js"; */

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
 * The view model method each navigation key calls.
 *
 * @type {Object<string, function(EditorOutlinerViewModel): void>}
 * @ignore
 */
const NAVIGATION_KEYS = {
  ArrowDown: (viewModel) => viewModel.focusNext(),
  ArrowUp: (viewModel) => viewModel.focusPrevious(),
  Home: (viewModel) => viewModel.focusFirst(),
  End: (viewModel) => viewModel.focusLast(),
  ArrowRight: (viewModel) => viewModel.expandOrFocusChild(),
  ArrowLeft: (viewModel) => viewModel.collapseOrFocusParent(),
};

/**
 * The keys that act on the focused row, as clicking it does.
 *
 * @ignore
 */
const ACTIVATE_KEYS = ["Enter", " "];

/**
 * Gives each outliner's row IDs a unique prefix.
 *
 * @ignore
 */
let nextOutlinerNumber = 0;

/**
 * @param {MouseEvent|KeyboardEvent} event A click or key press.
 * @returns {EditorOutlinerSelectOptions} The selection the event's modifier keys ask for.
 * @ignore
 */
function getSelectOptions(event) {
  return {
    toggle: event.ctrlKey || event.metaKey,
    range: event.shiftKey,
  };
}

/**
 * @param {EditorOutlinerRow} row The row.
 * @returns {boolean} Whether the row can be neither selected nor expanded.
 * @ignore
 */
function isDisabled(row) {
  return !row.selectable && !row.expandable;
}

/**
 * A collapsible tree of a {@link MeshEditor}'s meshes. Clicking a row makes its
 * mesh the only active mesh; Ctrl- or Cmd-clicking toggles it, and
 * Shift-clicking selects a range. Clicking a row without a mesh expands or
 * collapses it. Rows whose meshes are active are highlighted, and rows that
 * can't be selected or expanded are dimmed. Requires
 * <code>EditorOutliner.css</code>.
 * <p>
 * The outliner is a single tab stop. The up and down arrow keys, Home and End
 * move between rows, the right arrow key expands a row or moves to its first
 * child, and the left arrow key collapses a row or moves to its parent. Enter
 * and Space act on the focused row as clicking it does, with the same
 * modifier keys.
 * </p>
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
   * The prefix of the rows' element IDs, unique to this outliner.
   *
   * @type {string}
   */
  #rowIdPrefix = `cesium-editor-outliner-${nextOutlinerNumber++}-row-`;

  /** @type {{ dispose: function(): void }} */
  #focusSubscription;

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

    this.#container = getElement(container);

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
    this.#listenForKeyboard();
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
    wrapper.tabIndex = 0;
    wrapper.setAttribute("role", "tree");
    wrapper.setAttribute("aria-label", "Meshes");
    wrapper.setAttribute("aria-multiselectable", "true");
    wrapper.setAttribute(
      "data-bind",
      `attr: { 'aria-activedescendant': focusedRowId() },
       foreach: viewModel.rows`,
    );

    const row = document.createElement("div");
    row.className = "cesium-editor-outliner-row";
    row.setAttribute("role", "treeitem");
    row.setAttribute(
      "data-bind",
      `attr: {
         id: $parent.rowId($index()),
         'aria-level': depth + 1,
         'aria-expanded': expandable ? String(expanded) : undefined,
         'aria-selected': selectable ? String(active) : undefined,
         'aria-disabled': $parent.isDisabled($data) ? 'true' : undefined
       },
       click: $parent.onRowClick,
       css: {
         'cesium-editor-outliner-row-active': active,
         'cesium-editor-outliner-row-disabled': $parent.isDisabled($data),
         'cesium-editor-outliner-row-focused': $data === $parent.viewModel.focusedRow
       },
       style: { paddingLeft: $parent.indent(depth) }`,
    );

    const expander = document.createElement("span");
    expander.className = "cesium-editor-outliner-expander";
    expander.setAttribute("aria-hidden", "true");
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
        isDisabled,
        /** @param {number} depth */
        indent: (depth) => `${depth * INDENT_WIDTH}px`,
        /** @param {number} index */
        rowId: (index) => this.#getRowId(index),
        focusedRowId: () => {
          const index = viewModel.rows.indexOf(viewModel.focusedRow);
          return index === -1 ? undefined : this.#getRowId(index);
        },
        /**
         * @param {EditorOutlinerRow} row
         * @param {MouseEvent} event
         */
        onRowClick: (row, event) => {
          viewModel.activate(row, getSelectOptions(event));
        },
        /** @param {EditorOutlinerRow} row */
        onExpanderClick: (row) => {
          viewModel.focusedRow = row;
          callCommand(viewModel.toggleExpanded, row);
        },
      },
      this.#wrapper,
    );
  }

  /**
   * @param {number} index The index of a visible row.
   * @returns {string} The row's element ID.
   * @ignore
   */
  #getRowId(index) {
    return `${this.#rowIdPrefix}${index}`;
  }

  /**
   * Handles key presses, focuses the first row when the outliner gains focus
   * without a focused row, and scrolls the focused row into view.
   *
   * @ignore
   */
  #listenForKeyboard() {
    const wrapper = this.#wrapper;
    const viewModel = this.#viewModel;

    wrapper.addEventListener("keydown", (event) => {
      const action = this.#getKeyAction(event);
      if (defined(action)) {
        event.preventDefault();
        action();
      }
    });

    wrapper.addEventListener("focus", () => {
      if (!defined(viewModel.focusedRow)) {
        viewModel.focusFirst();
      }
    });

    this.#focusSubscription = knockout
      .getObservable(viewModel, "focusedRow")
      .subscribe(
        /** @param {EditorOutlinerRow|undefined} row */
        (row) => {
          // Rows are the wrapper's only children, in order.
          const index = viewModel.rows.indexOf(row);
          wrapper.children[index]?.scrollIntoView({ block: "nearest" });
        },
      );
  }

  /**
   * @param {KeyboardEvent} event The key press.
   * @returns {function(): void|undefined} What the key does, or <code>undefined</code> if it does nothing.
   * @ignore
   */
  #getKeyAction(event) {
    const viewModel = this.#viewModel;
    const navigate = NAVIGATION_KEYS[event.key];
    if (defined(navigate)) {
      return () => navigate(viewModel);
    }

    const row = viewModel.focusedRow;
    if (ACTIVATE_KEYS.includes(event.key) && defined(row)) {
      return () => viewModel.activate(row, getSelectOptions(event));
    }

    return undefined;
  }

  /**
   * Removes the outliner from the DOM and destroys its view model, and the
   * provider it created, if it created one.
   */
  destroy() {
    this.#focusSubscription?.dispose();
    knockout.cleanNode(this.#wrapper);
    this.#wrapper.remove();
    this.#viewModel.destroy();
    this.#ownProvider?.destroy();
  }
}

export default EditorOutliner;
