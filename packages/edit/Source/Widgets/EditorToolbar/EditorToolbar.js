// @ts-check

import { Check, DeveloperError } from "@cesium/core";
import { knockout } from "@cesium/widgets";
import EditorToolbarIcons from "./EditorToolbarIcons.js";
import EditorToolbarViewModel from "./EditorToolbarViewModel.js";

/** @import MeshEditor from "../../Editor/MeshEditor.js"; */
/** @import { EditorToolbarOptions, EditorToolbarToolEntry } from "./EditorToolbarViewModel.js"; */
/** @import { EditorToolbarIcon, EditorToolbarComponentIcon } from "./EditorToolbarIcons.js"; */

/**
 * Buttons for choosing a {@link MeshEditor}'s mode and active tool.
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
   * Creates the tool dropdown, the Object/Edit toggle and the component
   * buttons. The tool dropdown comes first, so it doesn't move when the
   * component buttons appear.
   * @ignore
   */
  #createToolbar() {
    const document = this.#container.ownerDocument;
    const wrapper = document.createElement("div");
    wrapper.className = "cesium-editor-toolbar";
    wrapper.setAttribute("role", "group");
    wrapper.setAttribute("aria-label", "Mesh editor");
    if (this.#viewModel.toolEntries.length > 0) {
      wrapper.appendChild(
        document.createComment(" ko if: viewModel.toolId !== undefined "),
      );
      wrapper.appendChild(this.#createToolDropdown());
      wrapper.appendChild(document.createComment(" /ko "));
    }
    wrapper.appendChild(this.#createModeToggle());
    wrapper.appendChild(this.#createComponentButtons());
    this.#container.appendChild(wrapper);
    this.#wrapper = wrapper;
  }

  /**
   * @param {string} binding The button's Knockout bindings.
   * @param {string} [label] A fixed accessible name.
   * @returns {HTMLButtonElement}
   * @ignore
   */
  #createButton(binding, label) {
    const button = this.#container.ownerDocument.createElement("button");
    button.type = "button";
    button.className = "cesium-button cesium-toolbar-button";
    button.setAttribute("data-bind", binding);
    if (label) {
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
    const document = this.#container.ownerDocument;
    const group = document.createElement("span");
    group.className = "cesium-editor-toolbar-group cesium-editor-toolbar-mode";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "cesium-button cesium-editor-toolbar-mode-button";
    // The button's accessible name comes from the visible mode name.
    button.setAttribute(
      "data-bind",
      `click: function() { viewModel.toggleEditMode(); },
       attr: { title: viewModel.getModeToggleTooltip(),
         'aria-keyshortcuts': viewModel.editing
           ? keyShortcuts(viewModel.modeShortcuts.none) : null }`,
    );

    const icon = document.createElement("span");
    icon.className = "cesium-editor-toolbar-mode-icon";
    icon.setAttribute(
      "data-bind",
      `cesiumSvgPath: { path: viewModel.editing ? icons.edit.path : icons.none.path,
         width: 64, height: 64 }`,
    );
    button.appendChild(icon);

    const label = document.createElement("span");
    label.className = "cesium-editor-toolbar-mode-label";
    label.setAttribute(
      "data-bind",
      "text: viewModel.editing ? 'Edit Mode' : 'Object Mode'",
    );
    button.appendChild(label);

    group.appendChild(button);
    return group;
  }

  /**
   * Creates the Vertex, Edge and Face buttons, shown in Edit Mode. Clicking
   * one selects its mode, and Shift+clicking one adds or removes it.
   * @returns {HTMLSpanElement}
   * @ignore
   */
  #createComponentButtons() {
    const group = this.#container.ownerDocument.createElement("span");
    group.className =
      "cesium-editor-toolbar-group cesium-editor-toolbar-components";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Components");
    group.setAttribute("data-bind", "visible: viewModel.editing");
    this.#viewModel.componentEntries.forEach((entry, index) => {
      const data = `viewModel.componentEntries[${index}]`;
      const button = this.#createButton(
        `click: function(_, event) {
           if (event.shiftKey) {
             viewModel.toggleComponentEntry(${data});
           } else {
             viewModel.selectModeEntry(${data});
           }
         },
         attr: { title: viewModel.getModeTooltip(${data}),
           'aria-keyshortcuts': keyShortcuts(viewModel.modeShortcuts.${entry.id}),
           'aria-pressed': String(viewModel.isComponentActive(${data})) },
         css: {
           'cesium-editor-toolbar-active': viewModel.isComponentActive(${data}),
         }`,
        entry.label,
      );
      button.appendChild(
        this.#createComponentIcon(EditorToolbarIcons.component[entry.id]),
      );
      group.appendChild(button);
    });
    return group;
  }

  /**
   * Creates a component icon with a dimmed cube under the highlighted
   * components.
   * @param {EditorToolbarComponentIcon} icon
   * @returns {SVGSVGElement}
   * @ignore
   */
  #createComponentIcon(icon) {
    const document = this.#container.ownerDocument;
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "cesium-svgPath-svg");
    svg.setAttribute("viewBox", "0 0 64 64");
    svg.setAttribute("aria-hidden", "true");
    for (const [path, className] of [
      [icon.cube, "cesium-editor-toolbar-icon-dimmed"],
      [icon.highlight, undefined],
    ]) {
      const pathElement = document.createElementNS(svgNS, "path");
      pathElement.setAttribute("d", path);
      if (className) {
        pathElement.setAttribute("class", className);
      }
      svg.appendChild(pathElement);
    }
    return svg;
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
         attr: { title: viewModel.getToolTooltip(selectedTool()),
           'aria-label': selectedTool().label,
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
         attr: { title: $parent.viewModel.getToolTooltip($data),
           'aria-label': label,
           'aria-keyshortcuts': $parent.keyShortcuts($parent.viewModel.toolShortcuts[id]),
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
    const toolEntries = viewModel.toolEntries.map((entry) =>
      this.#withEntryIcon(entry, EditorToolbarIcons.tool),
    );

    knockout.applyBindings(
      {
        viewModel,
        icons: EditorToolbarIcons.mode,
        toolEntries,
        // Removes aria-keyshortcuts without shortcuts.
        keyShortcuts: (/** @type {string[]|undefined} */ keys) =>
          keys?.length ? keys.join(" ") : null,
        selectedTool: () =>
          toolEntries.find((entry) => entry.id === viewModel.toolId),
      },
      this.#wrapper,
    );
  }

  /**
   * Copies an entry, filling in a default icon and icon size.
   * @param {EditorToolbarToolEntry} entry
   * @param {Object<string, EditorToolbarIcon>} icons The default icons by entry ID.
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
