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

/**
 * @type {Object<string, Object<string, {path: string, width: number, height: number}>>}
 * @ignore
 */
const defaultIcons = {
  mode: {
    none: { path: objectIconPath, width: 64, height: 64 },
    vertex: {
      path: "M 32 22 A 10 10 0 1 0 32 42 A 10 10 0 1 0 32 22 Z",
      width: 64,
      height: 64,
    },
    edge: { path: "M 10 28 L 54 28 L 54 36 L 10 36 Z", width: 64, height: 64 },
    face: { path: "M 32 10 L 56 52 L 8 52 Z", width: 64, height: 64 },
  },
  tool: {
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
 * @param {EditorToolbarOptions} [options] The dropdown entries.
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
   * @param {EditorToolbarOptions} [options] The dropdown entries.
   */
  constructor(container, editor, options) {
    this.#container = this.#getHostDomElement(container);
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("editor", editor);
    //>>includeEnd('debug');

    this.#viewModel = new EditorToolbarViewModel(editor, options);
    this.#createModeAndToolDropdowns();
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
   * Creates the mode and tool dropdowns.
   * @ignore
   */
  #createModeAndToolDropdowns() {
    const wrapper = this.#container.ownerDocument.createElement("div");
    wrapper.className = "cesium-editor-toolbar";
    wrapper.setAttribute("role", "group");
    wrapper.setAttribute("aria-label", "Mesh editor");
    if (this.#viewModel.modeEntries.length > 0) {
      wrapper.appendChild(this.#createDropdown("mode"));
    }
    if (this.#viewModel.toolEntries.length > 0) {
      const document = this.#container.ownerDocument;
      wrapper.appendChild(
        document.createComment(" ko if: viewModel.toolId !== undefined "),
      );
      wrapper.appendChild(this.#createDropdown("tool"));
      wrapper.appendChild(document.createComment(" /ko "));
    }
    this.#container.appendChild(wrapper);
    this.#wrapper = wrapper;
  }

  /**
   * @param {"mode"|"tool"} kind
   * @returns {HTMLSpanElement}
   * @ignore
   */
  #createDropdown(kind) {
    const dropdownContainer =
      this.#container.ownerDocument.createElement("span");
    dropdownContainer.className = `cesium-editor-toolbar-dropdown-container cesium-editor-toolbar-${kind}`;
    dropdownContainer.appendChild(this.#createDropdownToggleButton(kind));
    dropdownContainer.appendChild(this.#createDropdownEntryList(kind));
    return dropdownContainer;
  }

  /**
   * Creates the button that shows the current entry and toggles the dropdown.
   * @param {"mode"|"tool"} kind
   * @returns {HTMLButtonElement}
   * @ignore
   */
  #createDropdownToggleButton(kind) {
    const isMode = kind === "mode";
    const selected = isMode ? "selectedMode" : "selectedTool";
    const visible = isMode ? "modeDropDownVisible" : "toolDropDownVisible";
    const toggle = isMode ? "toggleModeDropDown" : "toggleToolDropDown";
    const button = this.#container.ownerDocument.createElement("button");
    button.type = "button";
    button.className = "cesium-button cesium-toolbar-button";
    button.setAttribute(
      "data-bind",
      `click: function() { viewModel.${toggle}(); },
       attr: { title: ${selected}().label, 'aria-label': ${selected}().label,
         'aria-expanded': String(viewModel.${visible}) },
       css: { 'cesium-editor-toolbar-selected': viewModel.${visible} },
       cesiumSvgPath: { path: ${selected}().iconPath,
         width: ${selected}().iconWidth, height: ${selected}().iconHeight }`,
    );
    return button;
  }

  /**
   * @param {"mode"|"tool"} kind
   * @returns {HTMLDivElement}
   * @ignore
   */
  #createDropdownEntryList(kind) {
    const isMode = kind === "mode";
    const entries = isMode ? "modeEntries" : "toolEntries";
    const id = isMode ? "modeId" : "toolId";
    const visible = isMode ? "modeDropDownVisible" : "toolDropDownVisible";
    const select = isMode ? "selectModeEntry" : "selectToolEntry";
    const document = this.#container.ownerDocument;
    const dropdown = document.createElement("div");
    dropdown.className = "cesium-editor-toolbar-dropdown";
    dropdown.setAttribute(
      "data-bind",
      `visible: viewModel.${visible}, foreach: ${entries}`,
    );
    const entryButton = document.createElement("button");
    entryButton.type = "button";
    entryButton.className = "cesium-button cesium-toolbar-button";
    entryButton.setAttribute(
      "data-bind",
      `click: function() { $parent.viewModel.${select}($data); },
       attr: { title: label, 'aria-label': label,
         'aria-pressed': String(id === $parent.viewModel.${id}) },
       css: { 'cesium-editor-toolbar-active': id === $parent.viewModel.${id} },
       ${isMode ? "" : "enable: $parent.viewModel.isToolEnabled($data),"}
       cesiumSvgPath: { path: iconPath, width: iconWidth, height: iconHeight }`,
    );
    dropdown.appendChild(entryButton);
    return dropdown;
  }

  /**
   * Applies Knockout bindings to the toolbar.
   * @ignore
   */
  #applyViewModelBindings() {
    const viewModel = this.#viewModel;
    const modeEntries = viewModel.modeEntries.map((entry) =>
      this.#withEntryIcon(entry, "mode"),
    );
    const toolEntries = viewModel.toolEntries.map((entry) =>
      this.#withEntryIcon(entry, "tool"),
    );

    knockout.applyBindings(
      {
        viewModel,
        modeEntries,
        toolEntries,
        selectedMode: () =>
          modeEntries.find((entry) => entry.id === viewModel.modeId) ??
          this.#withEntryIcon({ id: "none", label: "Custom Mode" }, "mode"),
        selectedTool: () =>
          toolEntries.find((entry) => entry.id === viewModel.toolId),
      },
      this.#wrapper,
    );
  }

  /**
   * Copies an entry, filling in a default icon and icon size.
   * @param {EditorToolbarModeEntry|EditorToolbarToolEntry|{id: string, label: string}} entry
   * @param {"mode"|"tool"} kind
   * @returns {{id: string, label: string, iconPath: string, iconWidth: number, iconHeight: number}}
   * @ignore
   */
  #withEntryIcon(entry, kind) {
    const icons = defaultIcons[kind];
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
   * Closes the dropdowns on clicks outside the toolbar.
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
        this.#viewModel.modeDropDownVisible = false;
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
