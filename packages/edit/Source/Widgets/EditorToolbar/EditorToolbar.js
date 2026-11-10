// @ts-check

import { Check, DeveloperError } from "@cesium/core";
import { knockout } from "@cesium/widgets";
import EditorToolbarViewModel from "./EditorToolbarViewModel.js";

/** @import MeshEditor from "../../Editor/MeshEditor.js"; */
/** @import { EditorToolbarOptions, EditorToolbarModeEntry, EditorToolbarToolEntry } from "./EditorToolbarViewModel.js"; */

/** @ignore */
const objectIconPath =
  "M 32 8 L 54 19 L 32 30 L 10 19 Z " +
  "M 9 20 L 31 31 L 31 57 L 9 46 Z " +
  "M 33 31 L 55 20 L 55 46 L 33 57 Z";

/** @ignore */
const editIconPath = "M 44 8 L 56 20 L 24 52 L 8 56 L 12 40 Z";

/**
 * @type {Object<string, {path: string, width: number, height: number}>}
 * @ignore
 */
const modeIcons = {
  none: { path: objectIconPath, width: 64, height: 64 },
  edit: { path: editIconPath, width: 64, height: 64 },
  vertex: {
    path: "M 32 22 A 10 10 0 1 0 32 42 A 10 10 0 1 0 32 22 Z",
    width: 64,
    height: 64,
  },
  edge: { path: "M 10 28 L 54 28 L 54 36 L 10 36 Z", width: 64, height: 64 },
  face: { path: "M 32 10 L 56 52 L 8 52 Z", width: 64, height: 64 },
};

/**
 * @type {Object<string, {path: string, width: number, height: number}>}
 * @ignore
 */
const toolIcons = {
  select: {
    path: "M 17 12 L 17 52 L 27 43 L 33 56 L 41 52 L 35 39 L 49 39 Z",
    width: 64,
    height: 64,
  },
  translate: {
    path:
      "M 32 6 L 42 18 L 36 18 L 36 28 L 46 28 L 46 22 L 58 32 L 46 42 L 46 36 " +
      "L 36 36 L 36 46 L 42 46 L 32 58 L 22 46 L 28 46 L 28 36 L 18 36 L 18 42 " +
      "L 6 32 L 18 22 L 18 28 L 28 28 L 28 18 L 22 18 Z",
    width: 64,
    height: 64,
  },
};

/**
 * Dropdowns for choosing a {@link MeshEditor}'s mode and active tool.
 * Requires <code>EditorToolbar.css</code>.
 *
 * @alias EditorToolbar
 * @constructor
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {Element|string} container The element or ID that hosts the toolbar.
 * @param {MeshEditor} editor The editor to control.
 * @param {EditorToolbarOptions} [options] The tool entries.
 */
class EditorToolbar {
  /** @type {Element} */
  #container;

  /** @type {EditorToolbarViewModel} */
  #viewModel;

  /** @type {HTMLDivElement} */
  #wrapper;

  /** @type {Array<function(): void>} */
  #removeOutsideClickListeners = [];

  /**
   * @param {Element|string} container The element or ID that hosts the toolbar.
   * @param {MeshEditor} editor The editor to control.
   * @param {EditorToolbarOptions} [options] The tool entries.
   */
  constructor(container, editor, options) {
    this.#container = this.#getHostDomElement(container);
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("editor", editor);
    //>>includeEnd('debug');

    this.#viewModel = new EditorToolbarViewModel(editor, options);
    this.#createToolbar();
    try {
      this.#applyViewModelBindings();
    } catch (error) {
      this.destroy();
      throw error;
    }
    this.#listenForOutsideClicks();
  }

  /** @type {Element} */
  get container() {
    return this.#container;
  }

  /** @type {EditorToolbarViewModel} */
  get viewModel() {
    return this.#viewModel;
  }

  /**
   * @param {Element|string} container
   * @returns {Element}
   * @ignore
   */
  #getHostDomElement(container) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("container", container);
    //>>includeEnd('debug');

    if (typeof container !== "string") {
      return container;
    }
    const element = document.getElementById(container);
    if (!element) {
      throw new DeveloperError(
        `Element with id "${container}" does not exist.`,
      );
    }
    return element;
  }

  /**
   * Creates the Object/Edit toggle, the component buttons and the tool
   * dropdown.
   * @ignore
   */
  #createToolbar() {
    const document = this.#container.ownerDocument;
    const wrapper = document.createElement("div");
    wrapper.className = "cesium-editor-toolbar";
    wrapper.setAttribute("role", "group");
    wrapper.setAttribute("aria-label", "Mesh editor");
    wrapper.appendChild(this.#createModeToggle());
    wrapper.appendChild(this.#createComponentButtons());
    if (this.#viewModel.toolEntries.length > 0) {
      wrapper.appendChild(
        document.createComment(" ko if: viewModel.toolId !== undefined "),
      );
      wrapper.appendChild(this.#createToolDropdown());
      wrapper.appendChild(document.createComment(" /ko "));
    }
    this.#container.appendChild(wrapper);
    this.#wrapper = wrapper;
  }

  /**
   * @param {string} binding The button's Knockout bindings.
   * @param {string} [label] A fixed tooltip and accessible name.
   * @returns {HTMLButtonElement}
   * @ignore
   */
  #createButton(binding, label) {
    const button = this.#container.ownerDocument.createElement("button");
    button.type = "button";
    button.className = "cesium-button cesium-toolbar-button";
    button.setAttribute("data-bind", binding);
    if (label) {
      button.title = label;
      button.setAttribute("aria-label", label);
    }
    return button;
  }

  /**
   * Creates the button that toggles between Object Mode and Edit Mode. It
   * shows the current mode's icon and name.
   * @returns {HTMLSpanElement}
   * @ignore
   */
  #createModeToggle() {
    const group = this.#container.ownerDocument.createElement("span");
    group.className = "cesium-editor-toolbar-group cesium-editor-toolbar-mode";
    const button = this.#createButton(
      `click: function() { viewModel.toggleEditMode(); },
       attr: { title: viewModel.editing ? 'Edit Mode' : 'Object Mode',
         'aria-pressed': String(viewModel.editing) },
       cesiumSvgPath: { path: viewModel.editing ? icons.edit.path : icons.none.path,
         width: 64, height: 64 }`,
    );
    // A toggle button's accessible name stays fixed while aria-pressed changes.
    button.setAttribute("aria-label", "Edit Mode");
    group.appendChild(button);
    return group;
  }

  /**
   * Creates the Vertex, Edge and Face buttons, shown in Edit Mode.
   * @returns {HTMLSpanElement}
   * @ignore
   */
  #createComponentButtons() {
    const group = this.#container.ownerDocument.createElement("span");
    group.className =
      "cesium-editor-toolbar-group cesium-editor-toolbar-components";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Components");
    group.setAttribute(
      "data-bind",
      "visible: viewModel.editing, foreach: componentEntries",
    );
    group.appendChild(
      this.#createButton(
        `click: function() { $parent.viewModel.selectModeEntry($data); },
         attr: { title: label, 'aria-label': label,
           'aria-pressed': String(id === $parent.viewModel.modeId) },
         css: { 'cesium-editor-toolbar-active': id === $parent.viewModel.modeId },
         cesiumSvgPath: { path: iconPath, width: iconWidth, height: iconHeight }`,
      ),
    );
    return group;
  }

  /**
   * Creates the button showing the active tool and its dropdown of tools.
   * @returns {HTMLSpanElement}
   * @ignore
   */
  #createToolDropdown() {
    const document = this.#container.ownerDocument;
    const dropdownContainer = document.createElement("span");
    dropdownContainer.className =
      "cesium-editor-toolbar-dropdown-container cesium-editor-toolbar-tool";
    dropdownContainer.appendChild(
      this.#createButton(
        `click: function() { viewModel.toggleToolDropDown(); },
         attr: { title: selectedTool().label, 'aria-label': selectedTool().label,
           'aria-expanded': String(viewModel.toolDropDownVisible) },
         css: { 'cesium-editor-toolbar-selected': viewModel.toolDropDownVisible },
         cesiumSvgPath: { path: selectedTool().iconPath,
           width: selectedTool().iconWidth, height: selectedTool().iconHeight }`,
      ),
    );

    const dropdown = document.createElement("div");
    dropdown.className = "cesium-editor-toolbar-dropdown";
    dropdown.setAttribute(
      "data-bind",
      "visible: viewModel.toolDropDownVisible, foreach: toolEntries",
    );
    dropdown.appendChild(
      this.#createButton(
        `click: function() { $parent.viewModel.selectToolEntry($data); },
         attr: { title: label, 'aria-label': label,
           'aria-pressed': String(id === $parent.viewModel.toolId) },
         css: { 'cesium-editor-toolbar-active': id === $parent.viewModel.toolId },
         enable: $parent.viewModel.isToolEnabled($data),
         cesiumSvgPath: { path: iconPath, width: iconWidth, height: iconHeight }`,
      ),
    );
    dropdownContainer.appendChild(dropdown);
    return dropdownContainer;
  }

  /**
   * Applies Knockout bindings to the toolbar.
   * @ignore
   */
  #applyViewModelBindings() {
    const viewModel = this.#viewModel;
    const componentEntries = viewModel.componentEntries.map((entry) =>
      this.#withEntryIcon(entry, modeIcons),
    );
    const toolEntries = viewModel.toolEntries.map((entry) =>
      this.#withEntryIcon(entry, toolIcons),
    );

    knockout.applyBindings(
      {
        viewModel,
        icons: modeIcons,
        componentEntries,
        toolEntries,
        selectedTool: () =>
          toolEntries.find((entry) => entry.id === viewModel.toolId),
      },
      this.#wrapper,
    );
  }

  /**
   * Copies an entry, filling in a default icon and icon size.
   * @param {EditorToolbarModeEntry|EditorToolbarToolEntry} entry
   * @param {Object<string, {path: string, width: number, height: number}>} icons The default icons by entry ID.
   * @returns {{id: string, label: string, iconPath: string, iconWidth: number, iconHeight: number}}
   * @ignore
   */
  #withEntryIcon(entry, icons) {
    const icon = Object.hasOwn(icons, entry.id) ? icons[entry.id] : undefined;
    const iconPath = "iconPath" in entry ? entry.iconPath : undefined;
    if (!iconPath && !icon) {
      throw new DeveloperError(
        `An iconPath is required for entry "${entry.id}".`,
      );
    }
    return {
      ...entry,
      iconPath: iconPath ?? icon.path,
      iconWidth:
        ("iconWidth" in entry ? entry.iconWidth : undefined) ??
        icon?.width ??
        64,
      iconHeight:
        ("iconHeight" in entry ? entry.iconHeight : undefined) ??
        icon?.height ??
        64,
    };
  }

  /**
   * Closes the tool dropdown on clicks outside the toolbar.
   * @ignore
   */
  #listenForOutsideClicks() {
    const document = this.#container.ownerDocument;
    const closeDropdowns = /** @param {Event} event */ (event) => {
      const target = event.target;
      if (
        target instanceof document.defaultView.Node &&
        !this.#wrapper.contains(target)
      ) {
        this.#viewModel.toolDropDownVisible = false;
      }
    };
    for (const type of ["pointerdown", "mousedown", "touchstart"]) {
      document.addEventListener(type, closeDropdowns, true);
      this.#removeOutsideClickListeners.push(() => {
        document.removeEventListener(type, closeDropdowns, true);
      });
    }
  }

  /**
   * Removes the toolbar from the DOM and destroys its view model.
   */
  destroy() {
    for (const removeListener of this.#removeOutsideClickListeners) {
      removeListener();
    }
    this.#removeOutsideClickListeners.length = 0;
    knockout.cleanNode(this.#wrapper);
    this.#wrapper.remove();
    this.#viewModel.destroy();
  }
}

export default EditorToolbar;
